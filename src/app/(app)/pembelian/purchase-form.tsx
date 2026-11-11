"use client";

import { useActionState } from "react";
import { createPurchase } from "@/lib/actions/purchases";
import type { FormState } from "@/lib/form";

type Supplier = { id: number; name: string };
type Product = { id: number; name: string; sku: string; cost: number };

export function PurchaseForm({ suppliers, products }: { suppliers: Supplier[]; products: Product[] }) {
  const [state, action, pending] = useActionState(createPurchase, {} as FormState);
  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Produk<select name="productId" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-600">Supplier<select name="supplierId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Tanpa supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-600">Jumlah<input name="qty" type="number" min="1" max="1000000" defaultValue="1" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Harga beli / unit<input name="unitCost" type="number" min="0" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">Catatan<input name="note" maxLength={250} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{state.error ? <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700 sm:col-span-2 lg:col-span-5">{state.success}</p> : null}<button disabled={pending || products.length === 0} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-5">{pending ? "Menyimpan…" : "Simpan draft pembelian"}</button></form>;
}
