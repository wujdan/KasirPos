"use client";

import { useActionState } from "react";
import { recordStockCount } from "@/lib/actions/inventory";
import type { FormState } from "@/lib/form";

type Product = { id: number; name: string; sku: string; stock: number };

export function StockCountForm({ products }: { products: Product[] }) {
  const [state, action, pending] = useActionState(recordStockCount, {} as FormState);
  return <form action={action} className="mt-4 space-y-4">
    <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Produk</th><th className="px-3 py-2 text-right">Stok tercatat</th><th className="px-3 py-2">Jumlah fisik</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id}><td className="px-3 py-2"><input type="hidden" name="productId" value={product.id} /><p className="font-medium text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.sku}</p></td><td className="px-3 py-2 text-right text-slate-500">{product.stock}</td><td className="px-3 py-2"><input name={`countedStock-${product.id}`} type="number" min="0" max="2000000000" aria-label={`Jumlah fisik ${product.name}`} className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm" /></td></tr>)}</tbody></table>
    </div>
    <p className="text-xs text-slate-500">Isi jumlah fisik pada produk yang dihitung. Kolom kosong akan dilewati.</p>
    <label className="grid gap-1 text-xs font-medium text-slate-600">Alasan / referensi<input name="note" minLength={3} maxLength={250} required placeholder="Contoh: opname rak A, 10 November" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    <button disabled={pending || products.length === 0} className="w-fit rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan hasil opname"}</button>
  </form>;
}
