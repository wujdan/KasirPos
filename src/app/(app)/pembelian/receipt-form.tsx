"use client";

import { useActionState } from "react";
import { receivePurchase } from "@/lib/actions/purchases";
import type { FormState } from "@/lib/form";

type Item = { id: number; productName: string; qty: number; receivedQty: number };

export function PurchaseReceiptForm({ purchaseId, items }: { purchaseId: number; items: Item[] }) {
  const [state, action, pending] = useActionState(receivePurchase, {} as FormState);
  return <form action={action} className="flex flex-wrap items-end gap-3">
    <input type="hidden" name="purchaseId" value={purchaseId} />
    {items.filter((item) => item.receivedQty < item.qty).map((item) => <label key={item.id} className="grid gap-1 text-xs text-slate-600">Terima {item.productName}<input name={`qty-${item.id}`} type="number" min="0" max={item.qty - item.receivedQty} placeholder={`sisa ${item.qty - item.receivedQty}`} className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>)}
    <button disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan penerimaan"}</button>
    {state.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}{state.success ? <p className="w-full text-sm text-emerald-700">{state.success}</p> : null}
  </form>;
}
