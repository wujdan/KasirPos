"use client";

import { useActionState } from "react";
import { createCustomer } from "@/lib/actions/customers";
import type { FormState } from "@/lib/form";

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, {} as FormState);
  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="grid gap-1 text-xs font-medium text-slate-600">Nama pelanggan<input name="name" minLength={2} maxLength={120} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    <label className="grid gap-1 text-xs font-medium text-slate-600">Nomor telepon<input name="phone" maxLength={40} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    <label className="grid gap-1 text-xs font-medium text-slate-600">Email<input name="email" type="email" maxLength={120} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    <label className="grid gap-1 text-xs font-medium text-slate-600">Catatan<input name="note" maxLength={250} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p> : null}
    <button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Menyimpan…" : "Tambah pelanggan"}</button>
  </form>;
}
