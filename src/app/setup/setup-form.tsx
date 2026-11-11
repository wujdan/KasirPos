"use client";

import { useActionState } from "react";
import { setupOwner } from "./actions";
import type { FormState } from "@/lib/form";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwner, {} as FormState);
  return <form action={action} className="mt-6 space-y-4"><label className="grid gap-1 text-sm font-medium text-slate-700">Nama toko<input name="storeName" required minLength={2} maxLength={120} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Nama owner<input name="name" required minLength={2} maxLength={100} autoComplete="name" className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Kata sandi<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="rounded-xl border border-slate-300 px-3 py-2.5" /><span className="text-xs font-normal text-slate-500">Gunakan minimal 10 karakter.</span></label>{state.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}<button disabled={pending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyiapkan…" : "Buat toko dan akun owner"}</button></form>;
}
