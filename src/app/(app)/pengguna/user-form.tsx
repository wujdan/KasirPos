"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions/users";
import type { FormState } from "@/lib/form";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, {} as FormState);
  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-slate-600">Nama lengkap<input name="name" required minLength={2} maxLength={100} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Kata sandi awal<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Peran<select name="role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="CASHIER">Kasir</option><option value="ADMIN">Admin</option></select></label>{state.error ? <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p> : null}{state.success ? <p className="sm:col-span-2 text-sm text-emerald-700">{state.success}</p> : null}<button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Menyimpan…" : "Buat akun"}</button></form>;
}
