import Link from "next/link";
import { requireUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const metadata = { title: "Transaksi - JualIn POS" };

export default async function TransactionsPage() {
  const user = await requireUser();
  const sales = await prisma.sale.findMany({
    where: isManager(user.role) ? {} : { userId: user.id },
    include: { user: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return <div className="space-y-5"><header><p className="text-sm font-medium text-emerald-600">Penjualan</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Riwayat transaksi</h1><p className="mt-1 text-sm text-slate-500">100 transaksi terbaru{!isManager(user.role) ? " milik Anda" : " seluruh kasir"}.</p></header><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Kasir</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Pembayaran</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{sales.length ? sales.map((sale) => <tr key={sale.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold"><Link className="text-emerald-700 hover:underline" href={`/transaksi/${sale.id}`}>{sale.invoiceNo}</Link></td><td className="px-5 py-4 text-slate-600">{formatDateTime(sale.createdAt)}</td><td className="px-5 py-4 text-slate-600">{sale.user.name}</td><td className="px-5 py-4 text-slate-600">{sale._count.items}</td><td className="px-5 py-4 text-slate-600">{sale.paymentMethod === "CASH" ? "Tunai" : "Non-tunai"}</td><td className="px-5 py-4 text-right font-semibold">{formatRupiah(sale.total)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sale.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{sale.status === "COMPLETED" ? "Selesai" : "Dibatalkan"}</span></td></tr>) : <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Belum ada transaksi.</td></tr>}</tbody></table></div></section></div>;
}
