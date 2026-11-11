import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { PurchaseForm } from "./purchase-form";
import { cancelPurchase } from "@/lib/actions/purchases";
import { PurchaseReceiptForm } from "./receipt-form";

export const metadata = { title: "Pembelian - JualIn POS" };

export default async function PurchasesPage() {
  await requireManager();
  const [purchases, suppliers, products] = await Promise.all([
    prisma.purchase.findMany({ include: { supplier: { select: { name: true } }, user: { select: { name: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, cost: true } }),
  ]);
  const statusText = { DRAFT: "Draft", PARTIALLY_RECEIVED: "Diterima sebagian", RECEIVED: "Diterima lengkap", CANCELLED: "Ditutup" };
  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-emerald-600">Inventori</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Pembelian barang</h1><p className="mt-1 text-sm text-slate-500">Terima barang bertahap. Stok bertambah hanya sejumlah yang benar-benar diterima.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Buat draft pembelian</h2><PurchaseForm suppliers={suppliers} products={products} /></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{purchases.length ? purchases.map((purchase) => {
      const canReceive = purchase.status === "DRAFT" || purchase.status === "PARTIALLY_RECEIVED";
      return <article key={purchase.id} className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="font-semibold text-slate-900">{purchase.number} <span className={`ml-2 rounded-full px-2 py-1 text-[11px] ${purchase.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700" : purchase.status === "DRAFT" || purchase.status === "PARTIALLY_RECEIVED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{statusText[purchase.status]}</span></p><p className="mt-1 text-xs text-slate-500">{formatDateTime(purchase.createdAt)} · {purchase.supplier?.name ?? "Tanpa supplier"} · {purchase.user.name}</p><p className="mt-1 text-sm text-slate-700">{formatRupiah(purchase.total)} nilai pesanan</p></div></div>
        {purchase.items.map((item) => <div key={item.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{item.productName} ({item.sku})</span><span className="text-slate-600">Diterima {item.receivedQty} / {item.qty} · {formatRupiah(item.unitCost)} / unit</span></div>)}
        {canReceive ? <div className="mt-3 flex flex-wrap items-end gap-3"><PurchaseReceiptForm purchaseId={purchase.id} items={purchase.items} /><form action={cancelPurchase}><input type="hidden" name="purchaseId" value={purchase.id} /><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{purchase.status === "DRAFT" ? "Batalkan" : "Tutup sisa pesanan"}</button></form></div> : null}
      </article>;
    }) : <p className="px-5 py-12 text-center text-sm text-slate-400">Belum ada pembelian.</p>}</div></section>
  </div>;
}
