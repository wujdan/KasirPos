"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getSession, isRestoreInProgress } from "@/lib/auth";
import type { FormState } from "@/lib/form";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isRestoreInProgress()) return { error: "Pemulihan database sedang berlangsung. Coba lagi sebentar." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "Email atau kata sandi salah." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Email atau kata sandi salah." };
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entity: "AUTH" } });

  redirect(user.role === "CASHIER" ? "/pos" : "/");
}

export async function logout() {
  const user = await getSession();
  if (user) await prisma.auditLog.create({ data: { userId: user.id, action: "LOGOUT", entity: "AUTH" } });
  await destroySession();
  redirect("/login");
}
