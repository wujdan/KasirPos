"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getSession, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";

export async function createSupplier(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user || !isManager(user.role)) return { error: "Akses ditolak." };
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (name.length < 2 || name.length > 120) return { error: "Nama supplier harus berisi 2–120 karakter." };
  try {
    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({ data: { name, contact, phone, address } });
      await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "SUPPLIER", entityId: supplier.id, details: { name } });
    });
  }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Supplier sudah terdaftar." };
    return { error: "Supplier gagal disimpan." };
  }
  revalidatePath("/supplier");
  revalidatePath("/pembelian");
  return { success: "Supplier berhasil ditambahkan." };
}
