"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";

export function CategoryForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return <form action={formAction} className="mt-3 flex flex-wrap gap-2"><input name="name" required maxLength={80} placeholder="Contoh: Minuman" className="min-w-64 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" /><button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Tambah"}</button>{state.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}{state.success ? <p className="w-full text-sm text-emerald-700">{state.success}</p> : null}</form>;
}
