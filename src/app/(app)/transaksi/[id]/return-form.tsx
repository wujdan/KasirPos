"use client";

import { useActionState } from "react";
import { createSaleReturn } from "@/lib/actions/returns";

type ReturnableItem = { id: number; name: string; sku: string; qty: number; returnedQty: number; stockable: boolean };

export function ReturnForm({ saleId, items }: { saleId: number; items: ReturnableItem[] }) {
  const [state, action, pending] = useActionState(createSaleReturn, {} as { error?: string; success?: string });
  const eligible = items.filter((item) => item.qty > item.returnedQty);
  if (!eligible.length) return <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Semua produk pada transaksi ini sudah diretur.</p>;
  return <form action={action} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
    <input type="hidden" name="saleId" value={saleId} />
    <div><h2 className="font-semibold text-amber-950">Proses retur parsial</h2><p className="mt-1 text-xs text-amber-800">Pengembalian dihitung proporsional dari total transaksi. Uang tunai dicatat sebagai kas keluar pada shift terbuka.</p></div>
    <div className="space-y-2">{eligible.map((item) => <div key={item.id} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_110px_auto] sm:items-center"><div><p className="text-sm font-medium text-slate-800">{item.name}</p><p className="text-xs text-slate-500">{item.sku} · sisa dapat diretur {item.qty - item.returnedQty} dari {item.qty}</p></div><label className="grid gap-1 text-xs text-slate-600">Jumlah<input name={`qty-${item.id}`} type="number" min="1" max={item.qty - item.returnedQty} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{item.stockable ? <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name={`restock-${item.id}`} defaultChecked className="h-4 w-4 accent-emerald-600" />Masukkan kembali ke stok</label> : <span className="text-xs text-slate-400">Produk terhapus, stok tidak dapat diperbarui</span>}</div>)}</div>
    <label className="grid gap-1 text-xs font-medium text-slate-700">Alasan retur<input name="reason" minLength={5} maxLength={250} required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Contoh: barang rusak saat dibuka" /></label>
    <label className="grid gap-1 text-xs font-medium text-slate-700">Catatan<input name="note" maxLength={250} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
    {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-800">{state.success}</p> : null}
    <button disabled={pending} className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan retur"}</button>
  </form>;
}
