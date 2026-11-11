"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { FormState } from "@/lib/form";

export async function createUser(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getSession();
  if (!actor || actor.role !== "OWNER") return { error: "Hanya owner yang dapat membuat akun pengguna." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  if (name.length < 2 || name.length > 100) return { error: "Nama harus berisi 2–100 karakter." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };
  if (password.length < 10 || password.length > 128) return { error: "Kata sandi minimal 10 karakter." };
  if (role !== "ADMIN" && role !== "CASHIER") return { error: "Peran pengguna tidak valid." };
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { name, email, passwordHash, role } });
      await recordAudit(tx, { userId: actor.id, action: "CREATE", entity: "USER", entityId: created.id, details: { email, role } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Email tersebut sudah terdaftar." };
    return { error: "Pengguna gagal dibuat." };
  }
  revalidatePath("/pengguna");
  return { success: "Pengguna berhasil dibuat." };
}

export async function toggleUserActive(formData: FormData) {
  const actor = await getSession();
  if (!actor || !isManager(actor.role)) return;
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1 || id === actor.id) return;
  const target = await prisma.user.findUnique({ where: { id }, select: { active: true, role: true } });
  if (!target || actor.role !== "OWNER") return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { active: !target.active } });
    await recordAudit(tx, { userId: actor.id, action: target.active ? "DEACTIVATE" : "ACTIVATE", entity: "USER", entityId: id });
  });
  revalidatePath("/pengguna");
}
