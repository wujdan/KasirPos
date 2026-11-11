"use client";

import { useActionState } from "react";
import { updateStore } from "@/lib/actions/products";
import type { FormState } from "@/lib/form";

type Store = { name: string; address: string; phone: string; taxPercent: number; receiptFooter: string };

export function StoreSettingsForm({ store }: { store: Store }) {
  const [state, action, pending] = useActionState(updateStore, {} as FormState);
  return <form action={action} className="grid max-w-2xl gap-4"><label className="grid gap-1 text-sm font-medium text-slate-700">Nama toko<input name="name" defaultValue={store.name} required maxLength={120} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Alamat<input name="address" defaultValue={store.address} maxLength={250} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Nomor telepon<input name="phone" defaultValue={store.phone} maxLength={40} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Pajak transaksi (%)<input name="taxPercent" type="number" min="0" max="100" defaultValue={store.taxPercent} required className="rounded-xl border border-slate-300 px-3 py-2.5" /><span className="text-xs font-normal text-slate-500">Perubahan berlaku pada transaksi berikutnya.</span></label><label className="grid gap-1 text-sm font-medium text-slate-700">Pesan bawah struk<textarea name="receiptFooter" defaultValue={store.receiptFooter} rows={3} maxLength={250} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label>{state.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}{state.success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</p> : null}<button disabled={pending} className="w-fit rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan pengaturan"}</button></form>;
}
