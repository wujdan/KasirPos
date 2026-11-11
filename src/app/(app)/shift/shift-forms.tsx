"use client";

import { useActionState } from "react";
import { addCashMovement, closeShift, openShift } from "@/lib/actions/shifts";
import { formatRupiah } from "@/lib/format";
import type { FormState } from "@/lib/form";

type OpenShift = { id: number; openingCash: number; expectedCash: number | null };

function Feedback({ state }: { state: FormState }) {
  if (!state.error && !state.success) return null;
  return <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${state.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{state.error ?? state.success}</p>;
}

export function ShiftForms({ shift }: { shift?: OpenShift }) {
  const [openState, openAction, opening] = useActionState(openShift, {} as FormState);
  const [closeState, closeAction, closing] = useActionState(closeShift, {} as FormState);
  if (!shift) return <form action={openAction} className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium text-slate-700">Modal awal (Rp)<input name="openingCash" type="number" min="0" max="2000000000" defaultValue="0" required className="w-56 rounded-xl border border-slate-300 px-3 py-2" /></label><button disabled={opening} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{opening ? "Membuka…" : "Buka shift"}</button><Feedback state={openState} /></form>;
  return <form action={closeAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="shiftId" value={shift.id} /><label className="grid gap-1 text-sm font-medium text-slate-700">Kas fisik saat tutup (Rp)<input name="closingCash" type="number" min="0" max="2000000000" required className="w-56 rounded-xl border border-slate-300 px-3 py-2" /></label><button disabled={closing} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{closing ? "Menutup…" : "Tutup shift"}</button><p className="w-full text-xs text-slate-500">Kas awal: {formatRupiah(shift.openingCash)}{shift.expectedCash !== null ? ` · Estimasi saldo: ${formatRupiah(shift.expectedCash)}` : ""}</p><Feedback state={closeState} /></form>;
}

export function CashMovementForm({ shiftId }: { shiftId: number }) {
  const [state, action, pending] = useActionState(addCashMovement, {} as FormState);
  return <details className="mt-5 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Catat kas masuk / keluar</summary><form action={action} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="shiftId" value={shiftId} /><label className="grid gap-1 text-xs font-medium text-slate-600">Jenis<select name="type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="IN">Kas masuk</option><option value="OUT">Kas keluar</option></select></label><label className="grid gap-1 text-xs font-medium text-slate-600">Nominal (Rp)<input name="amount" type="number" min="1" max="2000000000" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Alasan<input name="note" minLength={3} maxLength={250} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p> : null}<button disabled={pending} className="w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 sm:col-span-2">{pending ? "Mencatat…" : "Simpan pergerakan kas"}</button></form></details>;
}
