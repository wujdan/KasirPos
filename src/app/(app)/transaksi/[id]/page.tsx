import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { PrintReceipt } from "./print-receipt";
import { VoidSaleForm } from "./void-sale-form";
import { ReturnForm } from "./return-form";

export const metadata = { title: "Detail Transaksi - JualIn POS" };

export default async function TransactionDetailPage({ params }: PageProps<"/transaksi/[id]">) {
  const user = await requireUser();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [sale, store] = await Promise.all([
    prisma.sale.findUnique({ where: { id }, include: { user: { select: { name: true } }, customer: { select: { name: true, phone: true } }, shift: { select: { status: true } }, items: { orderBy: { id: "asc" }, include: { returns: { select: { qty: true } } } }, returns: { include: { items: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } }),
    prisma.store.findFirst(),
  ]);
  if (!sale || (!isManager(user.role) && sale.userId !== user.id)) notFound();
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="no-print flex items-center justify-between"><Link href="/transaksi" className="text-sm font-medium text-emerald-700 hover:underline">Kembali ke transaksi</Link><PrintReceipt /></div>
    {sale.status === "VOID" ? <p className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Transaksi ini telah dibatalkan.</p> : null}
    {user.role === "OWNER" && sale.status === "COMPLETED" && sale.shift?.status === "OPEN" && sale.returns.length === 0 ? <VoidSaleForm saleId={sale.id} /> : null}
    {isManager(user.role) && sale.status === "COMPLETED" ? <ReturnForm saleId={sale.id} items={sale.items.map((item) => ({ id: item.id, name: item.productName, sku: item.sku, qty: item.qty, returnedQty: item.returns.reduce((sum, returned) => sum + returned.qty, 0), stockable: item.productId !== null }))} /> : null}
    {sale.returns.length ? <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Riwayat retur</h2><div className="mt-3 divide-y divide-slate-100">{sale.returns.map((returned) => <article key={returned.id} className="py-3 text-sm"><p className="flex flex-wrap justify-between gap-2 font-medium"><span>{returned.number} · {returned.user.name}</span><span>{formatRupiah(returned.amount)}</span></p><p className="mt-1 text-xs text-slate-500">{formatDateTime(returned.createdAt)} · {returned.reason}</p><p className="mt-1 text-xs text-slate-600">{returned.items.map((item) => `${item.productName} × ${item.qty}${item.restocked ? " (stok masuk)" : ""}`).join(", ")}</p></article>)}</div></section> : null}
    <article className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {sale.customer ? <p className="mb-3 text-center text-xs text-slate-500">Pelanggan: {sale.customer.name}{sale.customer.phone ? ` · ${sale.customer.phone}` : ""}</p> : null}
      <header className="border-b border-dashed border-slate-300 pb-5 text-center"><h1 className="text-xl font-bold text-slate-900">{store?.name ?? "JualIn POS"}</h1>{store?.address ? <p className="mt-1 text-sm text-slate-500">{store.address}</p> : null}{store?.phone ? <p className="text-sm text-slate-500">{store.phone}</p> : null}<p className="mt-4 font-mono text-sm font-semibold">{sale.invoiceNo}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(sale.createdAt)} · {sale.user.name}</p></header>
      <div className="space-y-3 border-b border-dashed border-slate-300 py-5">{sale.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><div><p className="font-medium text-slate-800">{item.productName}</p><p className="text-xs text-slate-500">{item.qty} × {formatRupiah(item.price)}{item.discount ? ` · Diskon ${formatRupiah(item.discount)}` : ""}</p></div><p className="font-semibold">{formatRupiah(item.subtotal)}</p></div>)}</div>
      <div className="ml-auto max-w-xs space-y-2 py-5 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatRupiah(sale.subtotal)}</span></div>{sale.discount ? <div className="flex justify-between text-slate-500"><span>Diskon transaksi</span><span>-{formatRupiah(sale.discount)}</span></div> : null}<div className="flex justify-between text-slate-500"><span>Pajak</span><span>{formatRupiah(sale.tax)}</span></div><div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span>{formatRupiah(sale.total)}</span></div><div className="flex justify-between text-slate-600"><span>{sale.paymentMethod === "CASH" ? "Tunai" : "Non-tunai"}</span><span>{formatRupiah(sale.paid)}</span></div>{sale.change ? <div className="flex justify-between text-slate-600"><span>Kembalian</span><span>{formatRupiah(sale.change)}</span></div> : null}</div>
      {sale.note ? <p className="border-t border-dashed border-slate-300 pt-4 text-sm text-slate-600">Catatan: {sale.note}</p> : null}<footer className="mt-4 border-t border-dashed border-slate-300 pt-4 text-center text-sm text-slate-600">{store?.receiptFooter ?? "Terima kasih telah berbelanja"}</footer>
    </article>
  </div>;
}
