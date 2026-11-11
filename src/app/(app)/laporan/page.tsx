import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah, startOfDay } from "@/lib/format";

export const metadata = { title: "Laporan - JualIn POS" };

export default async function ReportsPage() {
  await requireManager();
  const today = startOfDay();
  const week = new Date(today);
  week.setDate(week.getDate() - 6);
  const [todaySales, todayReturns, weekSales, weekReturns, products, lowStock, shifts] = await Promise.all([
    prisma.sale.findMany({ where: { status: "COMPLETED", createdAt: { gte: today } }, include: { items: true } }),
    prisma.saleReturn.findMany({ where: { createdAt: { gte: today } }, include: { sale: { select: { paymentMethod: true } }, items: { include: { saleItem: { select: { cost: true } } } } } }),
    prisma.sale.aggregate({ where: { status: "COMPLETED", createdAt: { gte: week } }, _sum: { total: true }, _count: true }),
    prisma.saleReturn.aggregate({ where: { createdAt: { gte: week } }, _sum: { amount: true } }),
    prisma.product.aggregate({ where: { active: true }, _sum: { stock: true }, _count: true }),
    prisma.product.findMany({ where: { active: true }, orderBy: { stock: "asc" }, take: 100 }),
    prisma.cashShift.findMany({ where: { openedAt: { gte: today } }, include: { user: { select: { name: true } } }, orderBy: { openedAt: "desc" }, take: 20 }),
  ]);
  const revenue = todaySales.reduce((sum, sale) => sum + sale.total, 0) - todayReturns.reduce((sum, returned) => sum + returned.amount, 0);
  const grossProfit = todaySales.reduce((sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.subtotal - item.cost * item.qty, 0), 0) - todayReturns.reduce((sum, returned) => sum + returned.items.reduce((lineSum, item) => lineSum + item.amount - (item.restocked ? item.saleItem.cost * item.qty : 0), 0), 0);
  const stockAlerts = lowStock.filter((product) => product.stock <= product.minStock);
  const cash = todaySales.filter((sale) => sale.paymentMethod === "CASH").reduce((sum, sale) => sum + sale.total, 0) - todayReturns.filter((returned) => returned.sale.paymentMethod === "CASH").reduce((sum, returned) => sum + returned.amount, 0);
  const nonCash = todaySales.filter((sale) => sale.paymentMethod === "NON_CASH").reduce((sum, sale) => sum + sale.total, 0) - todayReturns.filter((returned) => returned.sale.paymentMethod === "NON_CASH").reduce((sum, returned) => sum + returned.amount, 0);
  const stats = [{ label: "Penjualan bersih hari ini", value: formatRupiah(revenue) }, { label: "Transaksi hari ini", value: String(todaySales.length) }, { label: "Laba kotor estimasi", value: formatRupiah(grossProfit) }, { label: "Penjualan bersih 7 hari", value: formatRupiah((weekSales._sum.total ?? 0) - (weekReturns._sum.amount ?? 0)) }];
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-emerald-600">Analitik</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Laporan operasional</h1><p className="mt-1 text-sm text-slate-500">Ringkasan penjualan bersih setelah retur dan kondisi stok.</p></div><a href="/laporan/export" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Unduh CSV hari ini</a></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => <section key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p></section>)}</div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Metode pembayaran hari ini</h2><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span className="text-slate-500">Tunai</span><strong>{formatRupiah(cash)}</strong></p><p className="flex justify-between"><span className="text-slate-500">Non-tunai</span><strong>{formatRupiah(nonCash)}</strong></p><p className="flex justify-between border-t pt-3"><span className="text-slate-500">Produk aktif</span><strong>{products._count} produk · {products._sum.stock ?? 0} unit stok</strong></p></div><p className="mt-4 text-xs text-slate-400">Laba kotor adalah estimasi dari harga modal yang tersimpan pada saat penjualan, sebelum biaya operasional.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Produk perlu restok</h2>{stockAlerts.length ? <div className="mt-4 divide-y divide-slate-100">{stockAlerts.slice(0, 10).map((product) => <p key={product.id} className="flex justify-between py-2 text-sm"><span>{product.name}</span><span className="font-semibold text-amber-700">{product.stock} / min {product.minStock}</span></p>)}</div> : <p className="mt-4 text-sm text-slate-500">Tidak ada produk di bawah stok minimum.</p>}</section>
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Shift hari ini</h2><div className="divide-y divide-slate-100">{shifts.length ? shifts.map((shift) => <div key={shift.id} className="flex justify-between gap-3 px-5 py-3 text-sm"><span>{shift.user.name} · {shift.status === "OPEN" ? "Berlangsung" : "Ditutup"}</span><span className="text-slate-500">{shift.expectedCash === null ? "Belum ditutup" : `Ekspektasi ${formatRupiah(shift.expectedCash)} · Selisih ${formatRupiah(shift.difference ?? 0)}`}</span></div>) : <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada shift hari ini.</p>}</div></section>
  </div>;
}
