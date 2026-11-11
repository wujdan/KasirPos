"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseInteger } from "@/lib/format";
import type { FormState } from "@/lib/form";

export async function recordStockCount(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user || !isManager(user.role)) return { error: "Hanya owner atau admin yang dapat melakukan stock opname." };
  const productIds = formData.getAll("productId").map((value) => parseInteger(value, -1));
  const note = String(formData.get("note") ?? "").trim();
  if (!productIds.length || productIds.length > 500 || productIds.some((id) => id < 1) || new Set(productIds).size !== productIds.length) return { error: "Daftar produk stock opname tidak valid." };
  if (note.length < 3 || note.length > 250) return { error: "Alasan stock opname wajib diisi (3–250 karakter)." };
  const counts = productIds.flatMap((productId) => {
    const raw = String(formData.get(`countedStock-${productId}`) ?? "").trim();
    if (!raw) return [];
    const countedStock = parseInteger(raw, -1);
    return [{ productId, countedStock }];
  });
  if (!counts.length) return { error: "Masukkan jumlah fisik minimal satu produk." };
  if (counts.some(({ countedStock }) => countedStock < 0 || countedStock > 2_000_000_000)) return { error: "Jumlah fisik harus bilangan bulat antara 0 dan 2 miliar." };
  const reference = `OPN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  try {
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: counts.map((count) => count.productId) } } });
      if (products.length !== counts.length) throw new Error("PRODUCT_NOT_FOUND");
      for (const count of counts) {
        const product = products.find((candidate) => candidate.id === count.productId)!;
        const difference = count.countedStock - product.stock;
        if (difference === 0) continue;
        await tx.product.update({ where: { id: product.id }, data: { stock: count.countedStock } });
        const movement = await tx.stockMovement.create({ data: { productId: product.id, type: "OPNAME", qty: difference, stockBefore: product.stock, stockAfter: count.countedStock, reference, note, userId: user.id } });
        await recordAudit(tx, { userId: user.id, action: "COUNT", entity: "STOCK_OPNAME", entityId: movement.id, details: { productId: product.id, before: product.stock, counted: count.countedStock, difference, note, reference } });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return { error: "Produk tidak ditemukan." };
    return { error: "Stock opname gagal disimpan." };
  }
  revalidatePath("/inventori");
  revalidatePath("/produk");
  revalidatePath("/pos");
  revalidatePath("/");
  return { success: `Stock opname ${reference} berhasil dicatat untuk ${counts.length} produk.` };
}
