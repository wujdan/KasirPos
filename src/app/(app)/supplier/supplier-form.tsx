"use client";

import { useActionState } from "react";
import { createSupplier } from "@/lib/actions/suppliers";
import type { FormState } from "@/lib/form";

export function SupplierForm() {
  const [state, action, pending] = useActionState(createSupplier, {} as FormState);
  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="name" required minLength={2} maxLength={120} placeholder="Nama supplier" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input name="contact" maxLength={120} placeholder="Nama kontak" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input name="phone" maxLength={40} placeholder="Nomor telepon" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input name="address" maxLength={250} placeholder="Alamat" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />{state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p> : null}<button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Menyimpan…" : "Tambah supplier"}</button></form>;
}
