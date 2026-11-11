"use client";

import { useActionState } from "react";
import { createExpense } from "@/lib/actions/expenses";
import type { FormState } from "@/lib/form";

export function ExpenseForm() {
  const [state, action, pending] = useActionState(createExpense, {} as FormState);
  return <form action={action} className="mt-4 space-y-3"><label className="grid gap-1 text-xs font-medium text-slate-600">Nama pengeluaran<input name="title" required maxLength={120} placeholder="Contoh: listrik" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Nominal (Rp)<input name="amount" type="number" min="1" max="2000000000" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Catatan<textarea name="note" maxLength={250} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}<button disabled={pending} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan pengeluaran"}</button></form>;
}
