"use client";

import { useActionState } from "react";
import { voidSale } from "@/lib/actions/sales";

export function VoidSaleForm({ saleId }: { saleId: number }) {
  const [state, action, pending] = useActionState(voidSale, {});
  return <details className="no-print rounded-2xl border border-red-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-red-700">Batalkan transaksi dan kembalikan stok</summary><p className="mt-2 text-xs text-slate-500">Pembatalan hanya tersedia selama shift asal masih terbuka. Transaksi tunai akan mencatat pengembalian pada kas shift.</p><form action={action} className="mt-3 space-y-3"><input type="hidden" name="saleId" value={saleId} /><label className="grid gap-1 text-xs font-medium text-slate-600">Alasan pembatalan<textarea name="reason" minLength={5} maxLength={250} required rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}<button disabled={pending} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Memproses…" : "Konfirmasi pembatalan"}</button></form></details>;
}
