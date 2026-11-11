"use server";

import { revalidatePath } from "next/cache";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/form";

export async function createCustomer(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user || !isManager(user.role)) return { error: "Hanya owner atau admin yang dapat mengelola pelanggan." };
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim();
  if (name.length < 2 || name.length > 120) return { error: "Nama pelanggan harus berisi 2–120 karakter." };
  if (phone.length > 40 || email.length > 120 || note.length > 250) return { error: "Data pelanggan terlalu panjang." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { name, phone, email, note } });
      await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "CUSTOMER", entityId: customer.id, details: { name, phone } });
    });
  } catch { return { error: "Pelanggan gagal disimpan." }; }
  revalidatePath("/pelanggan");
  revalidatePath("/pos");
  return { success: "Pelanggan berhasil ditambahkan." };
}

export async function toggleCustomerActive(formData: FormData) {
  const user = await getSession();
  if (!user || !isManager(user.role)) return;
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return;
  const target = await prisma.customer.findUnique({ where: { id }, select: { active: true } });
  if (!target) return;
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: { active: !target.active } });
    await recordAudit(tx, { userId: user.id, action: target.active ? "DEACTIVATE" : "ACTIVATE", entity: "CUSTOMER", entityId: id });
  });
  revalidatePath("/pelanggan");
  revalidatePath("/pos");
}
