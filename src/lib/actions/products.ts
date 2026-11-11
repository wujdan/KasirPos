"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseInteger } from "@/lib/format";
import type { FormState } from "@/lib/form";

async function guard() {
  const user = await getSession();
  if (!user) return { error: "Sesi Anda berakhir. Silakan login ulang." } as const;
  if (!isManager(user.role)) {
    return { error: "Hanya owner atau admin yang dapat mengubah data." } as const;
  }
  return { user } as const;
}

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function saveProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await guard();
  if ("error" in access) return { error: access.error };

  const idRaw = clean(formData.get("id"));
  const id = idRaw ? Number(idRaw) : null;
  if (idRaw && (!Number.isSafeInteger(id) || Number(id) < 1)) return { error: "ID produk tidak valid." };
  const name = clean(formData.get("name"));
  const skuInput = clean(formData.get("sku"));
  const barcodeInput = clean(formData.get("barcode"));
  const categoryRaw = clean(formData.get("categoryId"));
  const categoryId = categoryRaw ? Number(categoryRaw) : null;
  if (categoryRaw && (!Number.isSafeInteger(categoryId) || Number(categoryId) < 1)) return { error: "Kategori tidak valid." };
  const price = parseInteger(formData.get("price"), -1);
  const cost = parseInteger(formData.get("cost"), -1);
  const stock = parseInteger(formData.get("stock"), -1);
  const minStock = parseInteger(formData.get("minStock"), 0);
  const stockReason = clean(formData.get("stockReason"));

  if (!name) return { error: "Nama produk wajib diisi." };
  if (price < 0) return { error: "Harga jual tidak boleh negatif." };
  if (price > 2_000_000_000) return { error: "Harga jual melebihi batas yang didukung." };
  if (cost < 0) return { error: "Harga modal tidak boleh negatif." };
  if (cost > 2_000_000_000) return { error: "Harga modal melebihi batas yang didukung." };
  if (stock < 0) return { error: "Stok tidak boleh negatif." };
  if (minStock < 0) return { error: "Stok minimum tidak boleh negatif." };

  const barcode = barcodeInput || null;
  const sku = skuInput || `PRD-${Date.now().toString(36).toUpperCase()}`;

  try {
    await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.product.findUnique({ where: { id } });
        if (!existing) throw new Error("NOT_FOUND");
        if (stock !== existing.stock && stockReason.length < 3) throw new Error("STOCK_REASON_REQUIRED");

        await tx.product.update({
          where: { id },
          data: {
            name,
            sku,
            barcode,
            categoryId,
            price,
            cost,
            stock,
            minStock,
          },
        });

        const diff = stock - existing.stock;
        if (diff !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: id,
              type: "ADJUSTMENT",
              qty: diff,
              stockBefore: existing.stock,
              stockAfter: stock,
              reference: "EDIT-PRODUK",
              note: stockReason,
              userId: access.user.id,
            },
          });
        }
        await recordAudit(tx, { userId: access.user.id, action: "UPDATE", entity: "PRODUCT", entityId: id, details: { name, sku, stockChange: diff } });
        return;
      }

      const created = await tx.product.create({
        data: {
          name,
          sku,
          barcode,
          categoryId,
          price,
          cost,
          stock,
          minStock,
        },
      });

      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "ADJUSTMENT",
            qty: stock,
            stockBefore: 0,
            stockAfter: stock,
            reference: "STOK-AWAL",
            note: "Stok awal produk",
            userId: access.user.id,
          },
        });
      }
      await recordAudit(tx, { userId: access.user.id, action: "CREATE", entity: "PRODUCT", entityId: created.id, details: { name, sku, stock } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { error: "Produk tidak ditemukan." };
    }
    if (error instanceof Error && error.message === "STOCK_REASON_REQUIRED") {
      return { error: "Isi alasan penyesuaian stok (minimal 3 karakter)." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "SKU atau barcode sudah dipakai produk lain." };
    }
    return { error: "Gagal menyimpan produk." };
  }

  revalidatePath("/produk");
  revalidatePath("/pos");
  redirect("/produk");
}

export async function toggleProductActive(formData: FormData) {
  const access = await guard();
  if ("error" in access) return;

  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isSafeInteger(id) || id < 1) return;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { active: !product.active } });
    await recordAudit(tx, { userId: access.user.id, action: product.active ? "DEACTIVATE" : "ACTIVATE", entity: "PRODUCT", entityId: id });
  });

  revalidatePath("/produk");
  revalidatePath("/pos");
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await guard();
  if ("error" in access) return { error: access.error };

  const name = clean(formData.get("name"));
  if (!name) return { error: "Nama kategori wajib diisi." };

  try {
    await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({ data: { name } });
      await recordAudit(tx, { userId: access.user.id, action: "CREATE", entity: "CATEGORY", entityId: category.id, details: { name } });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Kategori dengan nama tersebut sudah ada." };
    }
    return { error: "Gagal menyimpan kategori." };
  }

  revalidatePath("/kategori");
  revalidatePath("/produk");
  return { success: "Kategori berhasil ditambahkan." };
}

export async function updateStore(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await guard();
  if ("error" in access) return { error: access.error };

  const name = clean(formData.get("name"));
  const address = clean(formData.get("address"));
  const phone = clean(formData.get("phone"));
  const taxPercent = parseInteger(formData.get("taxPercent"), -1);
  const receiptFooter = clean(formData.get("receiptFooter"));

  if (!name) return { error: "Nama toko wajib diisi." };
  if (taxPercent < 0 || taxPercent > 100) {
    return { error: "Pajak harus di antara 0 sampai 100 persen." };
  }

  if (access.user.role !== "OWNER") return { error: "Hanya owner yang dapat mengubah pengaturan toko." };
  const store = await prisma.store.findFirst();
  if (!store) return { error: "Data toko tidak ditemukan." };

  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: store.id }, data: { name, address, phone, taxPercent, receiptFooter } });
    await recordAudit(tx, { userId: access.user.id, action: "UPDATE", entity: "STORE", entityId: store.id, details: { name, taxPercent } });
  });

  revalidatePath("/");
  revalidatePath("/pos");
  revalidatePath("/pengaturan");
  return { success: "Pengaturan toko berhasil disimpan." };
}
