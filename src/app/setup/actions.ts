"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";

export async function setupOwner(_state: FormState, formData: FormData): Promise<FormState> {
  const storeName = String(formData.get("storeName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (storeName.length < 2 || storeName.length > 120) return { error: "Nama toko harus berisi 2–120 karakter." };
  if (name.length < 2 || name.length > 100) return { error: "Nama owner harus berisi 2–100 karakter." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };
  if (password.length < 10 || password.length > 128) return { error: "Kata sandi harus minimal 10 karakter." };
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      if (await tx.user.count()) throw new Error("ALREADY_SETUP");
      const existingStore = await tx.store.findFirst();
      const store = existingStore
        ? await tx.store.update({ where: { id: existingStore.id }, data: { name: storeName } })
        : await tx.store.create({ data: { name: storeName } });
      const owner = await tx.user.create({ data: { name, email, passwordHash, role: "OWNER" } });
      await recordAudit(tx, { userId: owner.id, action: "INITIAL_SETUP", entity: "STORE", entityId: store.id, details: { ownerEmail: email } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SETUP") return { error: "Aplikasi sudah disiapkan. Silakan masuk." };
    return { error: "Setup gagal. Periksa apakah email sudah digunakan, lalu coba lagi." };
  }
  redirect("/login?setup=success");
}
