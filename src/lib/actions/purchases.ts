"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseInteger } from "@/lib/format";
import type { FormState } from "@/lib/form";

async function manager() {
  const user = await getSession();
  return user && isManager(user.role) ? user : null;
}

export async function createPurchase(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await manager();
  if (!user) return { error: "Akses ditolak." };
  const productId = parseInteger(formData.get("productId"), -1);
  const qty = parseInteger(formData.get("qty"), -1);
  const unitCost = parseInteger(formData.get("unitCost"), -1);
  const supplierRaw = String(formData.get("supplierId") ?? "");
  const supplierId = supplierRaw ? Number(supplierRaw) : null;
  const note = String(formData.get("note") ?? "").trim();
  if (productId < 1 || qty < 1 || qty > 1_000_000 || unitCost < 0 || unitCost > 2_000_000_000) return { error: "Produk, jumlah, atau harga beli tidak valid." };
  if (supplierId !== null && (!Number.isSafeInteger(supplierId) || supplierId < 1)) return { error: "Supplier tidak valid." };
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Produk tidak ditemukan." };
  const total = qty * unitCost;
  if (!Number.isSafeInteger(total) || total > 2_000_000_000) return { error: "Nilai pembelian melebihi batas yang didukung." };
  const number = `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(8).toString("hex").toUpperCase()}`;
  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({ data: { number, supplierId, userId: user.id, total, note: note || null, items: { create: [{ productId, productName: product.name, sku: product.sku, qty, unitCost, subtotal: total }] } } });
      await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "PURCHASE", entityId: purchase.id, details: { number, total, status: "DRAFT" } });
    });
  } catch { return { error: "Pembelian gagal disimpan." }; }
  revalidatePath("/pembelian");
  return { success: `Draft pembelian ${number} berhasil dibuat.` };
}

export async function receivePurchase(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await manager();
  if (!user) return { error: "Akses ditolak." };
  const purchaseId = Number(formData.get("purchaseId"));
  if (!Number.isSafeInteger(purchaseId) || purchaseId < 1) return { error: "Pembelian tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: { include: { product: true } } } });
      if (!purchase || (purchase.status !== "DRAFT" && purchase.status !== "PARTIALLY_RECEIVED")) throw new Error("PURCHASE_NOT_OPEN");
      const receipts = purchase.items.flatMap((item) => {
        const raw = String(formData.get(`qty-${item.id}`) ?? "").trim();
        if (!raw) return [];
        const qty = parseInteger(raw, -1);
        const remaining = item.qty - item.receivedQty;
        if (qty === 0) return [];
        if (qty < 1 || qty > remaining || item.product.stock + qty > 2_000_000_000) throw new Error("INVALID_RECEIPT");
        return [{ item, qty }];
      });
      if (!receipts.length) throw new Error("EMPTY_RECEIPT");
      for (const { item, qty } of receipts) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: qty }, cost: item.unitCost } });
        await tx.purchaseItem.update({ where: { id: item.id }, data: { receivedQty: { increment: qty } } });
        await tx.stockMovement.create({ data: { productId: item.productId, type: "PURCHASE", qty, stockBefore: item.product.stock, stockAfter: item.product.stock + qty, reference: purchase.number, userId: user.id, note: "Penerimaan pembelian bertahap" } });
      }
      const receiptMap = new Map(receipts.map(({ item, qty }) => [item.id, qty]));
      const fullyReceived = purchase.items.every((item) => item.receivedQty + (receiptMap.get(item.id) ?? 0) === item.qty);
      await tx.purchase.update({ where: { id: purchase.id }, data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedAt: purchase.receivedAt ?? new Date() } });
      await recordAudit(tx, { userId: user.id, action: "RECEIVE", entity: "PURCHASE", entityId: purchase.id, details: { number: purchase.number, total: purchase.total, status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedCount: receipts.length, receivedQuantities: JSON.stringify(receipts.map(({ item, qty }) => ({ productId: item.productId, qty }))) } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPTY_RECEIPT") return { error: "Masukkan jumlah yang diterima minimal untuk satu produk." };
    if (error instanceof Error && error.message === "INVALID_RECEIPT") return { error: "Jumlah yang diterima melebihi sisa pesanan atau batas stok." };
    if (error instanceof Error && error.message === "PURCHASE_NOT_OPEN") return { error: "Pembelian sudah selesai atau ditutup." };
    return { error: "Penerimaan gagal disimpan. Muat ulang halaman." };
  }
  revalidatePath("/pembelian");
  revalidatePath("/produk");
  revalidatePath("/pos");
  revalidatePath("/laporan");
  return { success: "Penerimaan pembelian berhasil dicatat." };
}

export async function cancelPurchase(formData: FormData) {
  const user = await manager();
  if (!user) return;
  const purchaseId = Number(formData.get("purchaseId"));
  if (!Number.isSafeInteger(purchaseId) || purchaseId < 1) return;
  const purchase = await prisma.purchase.findFirst({ where: { id: purchaseId, status: { in: ["DRAFT", "PARTIALLY_RECEIVED"] } } });
  if (!purchase) return;
  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({ where: { id: purchaseId }, data: { status: "CANCELLED" } });
    await recordAudit(tx, { userId: user.id, action: "CANCEL", entity: "PURCHASE", entityId: purchase.id, details: { number: purchase.number, note: "Sisa pesanan tidak dilanjutkan" } });
  });
  revalidatePath("/pembelian");
}
