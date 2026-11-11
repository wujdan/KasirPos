"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseInteger } from "@/lib/format";
import type { FormState } from "@/lib/form";

export async function openShift(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  const openingCash = parseInteger(formData.get("openingCash"), -1);
  if (openingCash < 0 || openingCash > 2_000_000_000) return { error: "Modal awal tidak valid." };

  const existing = await prisma.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" } });
  if (existing) return { error: "Anda masih memiliki shift yang terbuka." };
  try {
    await prisma.$transaction(async (tx) => {
      const stillOpen = await tx.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" } });
      if (stillOpen) throw new Error("OPEN_SHIFT_EXISTS");
      const shift = await tx.cashShift.create({ data: { userId: user.id, openingCash } });
      await recordAudit(tx, { userId: user.id, action: "OPEN", entity: "CASH_SHIFT", entityId: shift.id, details: { openingCash } });
    });
  } catch {
    return { error: "Shift sudah terbuka atau gagal dibuat. Muat ulang halaman." };
  }
  revalidatePath("/shift");
  revalidatePath("/pos");
  return { success: "Shift berhasil dibuka." };
}

export async function closeShift(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  const shiftId = parseInteger(formData.get("shiftId"), -1);
  const closingCash = parseInteger(formData.get("closingCash"), -1);
  if (shiftId < 1 || closingCash < 0 || closingCash > 2_000_000_000) return { error: "Jumlah kas fisik tidak valid." };

  try {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({ where: { id: shiftId, userId: user.id, status: "OPEN" } });
      if (!shift) throw new Error("SHIFT_NOT_OPEN");
      const sales = await tx.sale.aggregate({ where: { shiftId, status: "COMPLETED", paymentMethod: "CASH" }, _sum: { total: true } });
      const movements = await tx.cashMovement.findMany({ where: { shiftId } });
      const movementTotal = movements.reduce((sum, movement) => sum + (movement.type === "IN" ? movement.amount : -movement.amount), 0);
      const expectedCash = shift.openingCash + (sales._sum.total ?? 0) + movementTotal;
      await tx.cashShift.update({ where: { id: shift.id }, data: { status: "CLOSED", closingCash, expectedCash, difference: closingCash - expectedCash, closedAt: new Date() } });
      await recordAudit(tx, { userId: user.id, action: "CLOSE", entity: "CASH_SHIFT", entityId: shift.id, details: { closingCash, expectedCash, difference: closingCash - expectedCash } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_NOT_OPEN") return { error: "Shift tidak ditemukan atau sudah ditutup." };
    return { error: "Shift gagal ditutup. Muat ulang halaman dan coba lagi." };
  }
  revalidatePath("/shift");
  revalidatePath("/pos");
  return { success: "Shift berhasil ditutup." };
}

export async function addCashMovement(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  const shiftId = parseInteger(formData.get("shiftId"), -1);
  const amount = parseInteger(formData.get("amount"), -1);
  const type = String(formData.get("type") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (shiftId < 1 || amount < 1 || amount > 2_000_000_000 || (type !== "IN" && type !== "OUT")) return { error: "Data pergerakan kas tidak valid." };
  if (note.length < 3 || note.length > 250) return { error: "Alasan wajib diisi (3–250 karakter)." };
  try {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({ where: { id: shiftId, userId: user.id, status: "OPEN" } });
      if (!shift) throw new Error("SHIFT_NOT_OPEN");
      const movement = await tx.cashMovement.create({ data: { shiftId, type, amount, note } });
      await recordAudit(tx, { userId: user.id, action: type, entity: "CASH_MOVEMENT", entityId: movement.id, details: { amount, note, shiftId } });
    });
  } catch {
    return { error: "Gagal mencatat pergerakan kas. Pastikan shift masih terbuka." };
  }
  revalidatePath("/shift");
  return { success: "Pergerakan kas berhasil dicatat." };
}
