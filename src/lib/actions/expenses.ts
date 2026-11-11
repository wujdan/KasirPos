"use server";

import { revalidatePath } from "next/cache";
import { getSession, isManager } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseInteger } from "@/lib/format";
import type { FormState } from "@/lib/form";

export async function createExpense(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getSession();
  if (!user || !isManager(user.role)) return { error: "Hanya owner atau admin yang dapat mencatat pengeluaran." };
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const amount = parseInteger(formData.get("amount"), -1);
  if (title.length < 2 || title.length > 120) return { error: "Nama pengeluaran harus berisi 2–120 karakter." };
  if (amount < 1 || amount > 2_000_000_000) return { error: "Nominal pengeluaran tidak valid." };
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({ data: { title, amount, note: note || null } });
    const shift = await tx.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" }, orderBy: { openedAt: "desc" } });
    if (shift) await tx.cashMovement.create({ data: { shiftId: shift.id, type: "OUT", amount, note: `Pengeluaran: ${title}` } });
    await recordAudit(tx, { userId: user.id, action: "CREATE", entity: "EXPENSE", entityId: expense.id, details: { title, amount } });
  });
  revalidatePath("/pengeluaran");
  revalidatePath("/shift");
  revalidatePath("/laporan");
  return { success: "Pengeluaran berhasil dicatat." };
}
