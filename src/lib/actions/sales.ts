"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { CreateSaleInput, SaleResult } from "@/lib/pos";

class SaleError extends Error {}

function invoiceNumber(date: Date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `INV-${yy}${mm}${dd}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function createSale(input: CreateSaleInput): Promise<SaleResult> {
  const user = await getSession();
  if (!user) {
    return { ok: false, error: "Sesi Anda berakhir. Silakan login ulang." };
  }

  if (!input || typeof input !== "object" || !Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Keranjang masih kosong." };
  }
  if (input.items.length > 100) {
    return { ok: false, error: "Data transaksi tidak valid." };
  }

  const merged = new Map<number, { productId: number; qty: number; discount: number }>();
  for (const item of input.items) {
    if (!item || typeof item !== "object") return { ok: false, error: "Item transaksi tidak valid." };
    const productId = Number(item.productId);
    const qty = Math.trunc(Number(item.qty));
    const discount = Math.max(0, Math.trunc(Number(item.discount) || 0));

    if (!Number.isSafeInteger(productId) || productId < 1 || qty <= 0 || qty > 1_000_000) {
      return { ok: false, error: "Item transaksi tidak valid." };
    }

    const current = merged.get(productId);
    if (current) {
      current.qty += qty;
      current.discount += discount;
    } else {
      merged.set(productId, { productId, qty, discount });
    }
  }

  const transactionDiscount = Math.max(0, Math.trunc(Number(input.discount) || 0));
  const paid = Math.max(0, Math.trunc(Number(input.paid) || 0));
  if (!Number.isSafeInteger(paid) || paid > 2_000_000_000 || !Number.isSafeInteger(transactionDiscount)) {
    return { ok: false, error: "Nominal transaksi tidak valid." };
  }
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 250)) {
    return { ok: false, error: "Catatan transaksi terlalu panjang." };
  }
  if (input.paymentMethod !== "CASH" && input.paymentMethod !== "NON_CASH") {
    return { ok: false, error: "Metode pembayaran tidak valid." };
  }
  const paymentMethod = input.paymentMethod === "NON_CASH" ? "NON_CASH" : "CASH";
  const customerId = input.customerId == null ? null : Number(input.customerId);
  if (customerId !== null && (!Number.isSafeInteger(customerId) || customerId < 1)) {
    return { ok: false, error: "Pelanggan tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({
        where: { userId: user.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });
      if (!shift) throw new SaleError("Buka shift kasir sebelum memulai transaksi.");
      const store = await tx.store.findFirst();
      if (customerId !== null) {
        const customer = await tx.customer.findFirst({ where: { id: customerId, active: true }, select: { id: true } });
        if (!customer) throw new SaleError("Pelanggan tidak tersedia.");
      }
      const taxPercent = store?.taxPercent ?? 0;

      const ids = [...merged.keys()];
      const products = await tx.product.findMany({
        where: { id: { in: ids }, active: true },
      });
      if (products.length !== ids.length) {
        throw new SaleError("Ada produk yang tidak tersedia atau sudah nonaktif.");
      }

      const lines = merged.size
        ? [...merged.values()].map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            if (item.qty > product.stock) {
              throw new SaleError(
                `Stok ${product.name} tidak cukup. Tersisa ${product.stock}.`,
              );
            }
            const gross = product.price * item.qty;
            if (!Number.isSafeInteger(gross)) throw new SaleError("Nilai transaksi melebihi batas yang didukung.");
            const lineDiscount = Math.min(item.discount, gross);
            const subtotal = gross - lineDiscount;
            return {
              product,
              qty: item.qty,
              discount: lineDiscount,
              price: product.price,
              subtotal,
            };
          })
        : [];

      const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const discount = Math.min(transactionDiscount, subtotal);
      const taxable = subtotal - discount;
      const tax = Math.round((taxable * taxPercent) / 100);
      const total = taxable + tax;
      if (!Number.isSafeInteger(total) || total > 2_000_000_000) {
        throw new SaleError("Total transaksi melebihi batas yang didukung.");
      }

      if (paymentMethod === "CASH" && paid < total) {
        throw new SaleError("Nominal pembayaran kurang dari total belanja.");
      }

      const change = paymentMethod === "CASH" ? paid - total : 0;
      const now = new Date();
      const invoiceNo = invoiceNumber(now);

      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          userId: user.id,
          shiftId: shift.id,
          customerId,
          subtotal,
          discount,
          tax,
          total,
          paid: paymentMethod === "CASH" ? paid : total,
          change,
          paymentMethod,
          note: input.note?.trim() || null,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              productName: line.product.name,
              sku: line.product.sku,
              price: line.price,
              cost: line.product.cost,
              qty: line.qty,
              discount: line.discount,
              subtotal: line.subtotal,
            })),
          },
        },
      });

      for (const line of lines) {
        await tx.product.update({
          where: { id: line.product.id },
          data: { stock: { decrement: line.qty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.product.id,
            type: "SALE",
            qty: -line.qty,
            stockBefore: line.product.stock,
            stockAfter: line.product.stock - line.qty,
            reference: invoiceNo,
            userId: user.id,
          },
        });
      }

      await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "SALE", entityId: sale.id, details: { invoiceNo, total } });

      return { saleId: sale.id, invoiceNo, total, change };
    });

    revalidatePath("/");
    revalidatePath("/pos");
    revalidatePath("/produk");
    revalidatePath("/transaksi");
    revalidatePath("/pelanggan");
    revalidatePath("/laporan");

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof SaleError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "Transaksi gagal disimpan. Silakan coba lagi.",
    };
  }
}

export async function voidSale(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const user = await getSession();
  if (!user || user.role !== "OWNER") return { error: "Hanya owner yang dapat membatalkan transaksi." };
  const saleId = Number(formData.get("saleId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isSafeInteger(saleId) || saleId < 1) return { error: "Transaksi tidak valid." };
  if (reason.length < 5 || reason.length > 250) return { error: "Alasan pembatalan wajib diisi (5–250 karakter)." };
  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true, shift: true, returns: { select: { id: true } } } });
      if (!sale || sale.status !== "COMPLETED") throw new Error("SALE_NOT_COMPLETED");
      if (sale.returns.length) throw new Error("SALE_HAS_RETURNS");
      if (!sale.shift || sale.shift.status !== "OPEN") throw new Error("SHIFT_NOT_OPEN");
      for (const item of sale.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        await tx.product.update({ where: { id: product.id }, data: { stock: { increment: item.qty } } });
        await tx.stockMovement.create({ data: { productId: product.id, type: "RETURN", qty: item.qty, stockBefore: product.stock, stockAfter: product.stock + item.qty, reference: sale.invoiceNo, note: `Pembatalan transaksi: ${reason}`, userId: user.id } });
      }
      if (sale.paymentMethod === "CASH") {
        await tx.cashMovement.create({ data: { shiftId: sale.shift.id, type: "OUT", amount: sale.total, note: `Pengembalian pembatalan ${sale.invoiceNo}` } });
      }
      await tx.sale.update({ where: { id: sale.id }, data: { status: "VOID", note: [sale.note, `Dibatalkan: ${reason}`].filter(Boolean).join(" · ") } });
      await recordAudit(tx, { userId: user.id, action: "VOID", entity: "SALE", entityId: sale.id, details: { invoiceNo: sale.invoiceNo, total: sale.total, reason } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SALE_NOT_COMPLETED") return { error: "Transaksi tidak ditemukan atau sudah dibatalkan." };
    if (error instanceof Error && error.message === "SALE_HAS_RETURNS") return { error: "Transaksi dengan retur tidak dapat dibatalkan penuh. Proses koreksi lanjutan melalui retur." };
    if (error instanceof Error && error.message === "SHIFT_NOT_OPEN") return { error: "Pembatalan hanya bisa dilakukan saat shift asal masih terbuka." };
    return { error: "Pembatalan gagal. Muat ulang halaman dan coba lagi." };
  }
  revalidatePath("/transaksi");
  revalidatePath(`/transaksi/${saleId}`);
  revalidatePath("/produk");
  revalidatePath("/pos");
  revalidatePath("/shift");
  revalidatePath("/laporan");
  revalidatePath("/");
  return { success: "Transaksi dibatalkan, stok dikembalikan, dan jejak kas dicatat." };
}
