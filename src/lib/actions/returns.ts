"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

function refundThrough(total: number, itemSubtotal: number, itemQty: number, cumulativeQty: number, saleSubtotal: number) {
  if (!saleSubtotal || !itemSubtotal) return 0;
  return Number((BigInt(total) * BigInt(itemSubtotal) * BigInt(cumulativeQty)) / (BigInt(saleSubtotal) * BigInt(itemQty)));
}

export async function createSaleReturn(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const user = await getSession();
  if (!user || !isManager(user.role)) return { error: "Hanya owner atau admin yang dapat memproses retur." };
  const saleId = Number(formData.get("saleId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isSafeInteger(saleId) || saleId < 1) return { error: "Transaksi tidak valid." };
  if (reason.length < 5 || reason.length > 250 || note.length > 250) return { error: "Alasan retur wajib berisi 5–250 karakter; catatan maksimal 250 karakter." };

  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: { include: { returns: { select: { qty: true } } } } } });
  if (!sale || sale.status !== "COMPLETED") return { error: "Retur hanya bisa dibuat untuk transaksi selesai." };
  type ReturnLine = { invalid: true } | { invalid: false; item: (typeof sale.items)[number]; qty: number; alreadyReturned: number; amount: number; restock: boolean };
  const returnLines: ReturnLine[] = [];
  for (const item of sale.items) {
    const rawQty = String(formData.get(`qty-${item.id}`) ?? "").trim();
    if (!rawQty) continue;
    if (!/^\d+$/.test(rawQty)) { returnLines.push({ invalid: true }); continue; }
    const qty = Number(rawQty);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1_000_000) { returnLines.push({ invalid: true }); continue; }
    const alreadyReturned = item.returns.reduce((sum, entry) => sum + entry.qty, 0);
    if (alreadyReturned + qty > item.qty) { returnLines.push({ invalid: true }); continue; }
    const amount = refundThrough(sale.total, item.subtotal, item.qty, alreadyReturned + qty, sale.subtotal)
      - refundThrough(sale.total, item.subtotal, item.qty, alreadyReturned, sale.subtotal);
    returnLines.push({ invalid: false, item, qty, alreadyReturned, amount, restock: item.productId !== null && formData.get(`restock-${item.id}`) === "on" });
  }
  if (!returnLines.length) return { error: "Isi kuantitas minimal satu produk yang diretur." };
  if (returnLines.some((line) => line.invalid)) return { error: "Jumlah retur melebihi sisa produk yang dapat diretur atau tidak valid." };
  const validLines = returnLines.filter((line) => !line.invalid);
  const amount = validLines.reduce<number>((sum, line) => sum + line.amount, 0);
  if (!Number.isSafeInteger(amount) || amount < 0) return { error: "Nilai pengembalian tidak valid." };
  const shift = sale.paymentMethod === "CASH"
    ? await prisma.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" }, orderBy: { openedAt: "desc" } })
    : null;
  if (sale.paymentMethod === "CASH" && !shift) return { error: "Buka shift kasir untuk mencatat pengembalian uang tunai." };
  const number = `RET-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`;

  try {
    await prisma.$transaction(async (tx) => {
      const latestSale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: { include: { returns: { select: { qty: true } } } } } });
      if (!latestSale || latestSale.status !== "COMPLETED") throw new Error("SALE_NOT_COMPLETED");
      const latestQty = new Map(latestSale.items.map((item) => [item.id, item.returns.reduce((sum, entry) => sum + entry.qty, 0)]));
      for (const line of validLines) {
        if (latestQty.get(line.item.id) !== line.alreadyReturned) throw new Error("RETURN_CONFLICT");
      }
      const created = await tx.saleReturn.create({ data: {
        number, saleId, userId: user.id, shiftId: shift?.id ?? null, amount, reason, note,
        items: { create: validLines.map((line) => ({ saleItemId: line.item.id, productId: line.item.productId, productName: line.item.productName, sku: line.item.sku, qty: line.qty, amount: line.amount, restocked: line.restock })) },
      } });
      for (const line of validLines) {
        if (!line.restock || !line.item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: line.item.productId } });
        if (!product) continue;
        await tx.product.update({ where: { id: product.id }, data: { stock: { increment: line.qty } } });
        await tx.stockMovement.create({ data: { productId: product.id, type: "RETURN", qty: line.qty, stockBefore: product.stock, stockAfter: product.stock + line.qty, reference: number, note: `Retur ${sale.invoiceNo}: ${reason}`, userId: user.id } });
      }
      if (sale.paymentMethod === "CASH" && shift && amount > 0) {
        const openShift = await tx.cashShift.findFirst({ where: { id: shift.id, userId: user.id, status: "OPEN" } });
        if (!openShift) throw new Error("SHIFT_NOT_OPEN");
        await tx.cashMovement.create({ data: { shiftId: shift.id, type: "OUT", amount, note: `Pengembalian ${number} untuk ${sale.invoiceNo}` } });
      }
      await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "SALE_RETURN", entityId: created.id, details: { number, invoiceNo: sale.invoiceNo, amount, reason, itemCount: validLines.length } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SALE_NOT_COMPLETED") return { error: "Transaksi sudah tidak dapat diretur." };
    if (error instanceof Error && error.message === "RETURN_CONFLICT") return { error: "Data retur berubah. Muat ulang halaman sebelum mencoba lagi." };
    if (error instanceof Error && error.message === "SHIFT_NOT_OPEN") return { error: "Shift kasir sudah ditutup. Muat ulang halaman." };
    return { error: "Retur gagal disimpan. Muat ulang halaman dan coba lagi." };
  }
  revalidatePath(`/transaksi/${saleId}`);
  revalidatePath("/transaksi");
  revalidatePath("/produk");
  revalidatePath("/inventori");
  revalidatePath("/laporan");
  revalidatePath("/shift");
  revalidatePath("/");
  return { success: `Retur ${number} tersimpan sebesar Rp${amount.toLocaleString("id-ID")}. Pengembalian non-tunai perlu diproses melalui penyedia pembayaran.` };
}
