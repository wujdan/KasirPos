import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Package,
  ReceiptText,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatRupiah,
  startOfDay,
} from "@/lib/format";

export const metadata = { title: "Dashboard - JualIn POS" };

function price(value: number) {
  return formatRupiah(value);
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "CASHIER") redirect("/pos");

  const today = startOfDay();
  const weekStart = startOfDay();
  weekStart.setDate(weekStart.getDate() - 6);

  const [todayAgg, todayItems, todayReturns, weekSales, weekReturns, lowStockCandidates, recentSales, payments, topProducts] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.saleItem.findMany({
        where: { sale: { status: "COMPLETED", createdAt: { gte: today } } },
        select: {
          qty: true,
          subtotal: true,
          cost: true,
        },
      }),
      prisma.saleReturn.findMany({
        where: { createdAt: { gte: today } },
        include: { sale: { select: { paymentMethod: true } }, items: { include: { saleItem: { select: { cost: true } } } } },
      }),
      prisma.sale.findMany({
        where: { status: "COMPLETED", createdAt: { gte: weekStart } },
        select: { createdAt: true, total: true },
      }),
      prisma.saleReturn.findMany({ where: { createdAt: { gte: weekStart } }, select: { createdAt: true, amount: true } }),
      prisma.product.findMany({
        where: { active: true },
        orderBy: { stock: "asc" },
        select: { id: true, name: true, sku: true, stock: true, minStock: true },
      }),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true } }, _count: { select: { items: true } } },
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { status: "COMPLETED", createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.saleItem.groupBy({
        by: ["productName"],
        where: { sale: { status: "COMPLETED", createdAt: { gte: weekStart } } },
        _sum: { qty: true, subtotal: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 5,
      }),
    ]);

  const totalToday = (todayAgg._sum.total ?? 0) - todayReturns.reduce((sum, returned) => sum + returned.amount, 0);
  const countToday = todayAgg._count;
  const average = countToday > 0 ? Math.round(totalToday / countToday) : 0;

  const grossProfit = todayItems.reduce(
    (sum, item) =>
      sum + item.subtotal - item.cost * item.qty,
    0,
  );
  const netGrossProfit = grossProfit - todayReturns.reduce((sum, returned) => sum + returned.items.reduce((lineSum, item) => lineSum + item.amount - (item.restocked ? item.saleItem.cost * item.qty : 0), 0), 0);

  const lowStock = lowStockCandidates
    .filter((product) => product.stock <= product.minStock)
    .slice(0, 6);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const key = date.toDateString();
    const total = weekSales
      .filter((sale) => sale.createdAt.toDateString() === key)
      .reduce((sum, sale) => sum + sale.total, 0);
    const refunds = weekReturns.filter((returned) => returned.createdAt.toDateString() === key).reduce((sum, returned) => sum + returned.amount, 0);
    return { date, total: total - refunds };
  });
  const maxDay = Math.max(...days.map((day) => day.total), 1);

  const cashTotal =
    (payments.find((item) => item.paymentMethod === "CASH")?._sum.total ?? 0) - todayReturns.filter((returned) => returned.sale.paymentMethod === "CASH").reduce((sum, returned) => sum + returned.amount, 0);
  const nonCashTotal =
    (payments.find((item) => item.paymentMethod === "NON_CASH")?._sum.total ?? 0) - todayReturns.filter((returned) => returned.sale.paymentMethod === "NON_CASH").reduce((sum, returned) => sum + returned.amount, 0);
  const paymentTotal = cashTotal + nonCashTotal;

  const stats = [
    {
      label: "Penjualan bersih hari ini",
      value: price(totalToday),
      hint: `${formatNumber(countToday)} transaksi`,
      icon: Wallet,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Rata-rata transaksi",
      value: price(average),
      hint: "Nilai belanja per transaksi",
      icon: ReceiptText,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Laba kotor setelah retur",
      value: price(netGrossProfit),
      hint: "Estimasi sebelum biaya operasional",
      icon: TrendingUp,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Produk stok menipis",
      value: `${formatNumber(lowStock.length)} produk`,
      hint: lowStock.length ? "Perlu segera ditambah" : "Semua stok aman",
      icon: TriangleAlert,
      tone: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-600">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Selamat datang, {user.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan aktivitas toko Anda hari ini.
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Buka Kasir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <span className={`rounded-xl p-2 ${stat.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Penjualan 7 hari terakhir</h2>
              <p className="text-xs text-slate-500">Total nilai transaksi per hari</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {price(days.reduce((sum, day) => sum + day.total, 0))}
            </span>
          </div>

          <div className="mt-6 flex h-52 items-end gap-2 sm:gap-4">
            {days.map((day) => {
              const height = Math.max(4, Math.round((day.total / maxDay) * 100));
              const isToday = day.date.toDateString() === new Date().toDateString();
              return (
                <div key={day.date.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-400">
                    {day.total > 0 ? formatNumber(Math.round(day.total / 1000)) + "k" : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isToday ? "bg-emerald-500" : "bg-emerald-200"
                      }`}
                      style={{ height: `${height}%` }}
                      title={price(day.total)}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {formatDateShort(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Metode pembayaran</h2>
          <p className="text-xs text-slate-500">Komposisi transaksi hari ini</p>

          <div className="mt-5 space-y-4">
            {[
              { label: "Tunai", value: cashTotal, icon: Banknote, color: "bg-emerald-500" },
              { label: "Non-tunai", value: nonCashTotal, icon: ReceiptText, color: "bg-sky-500" },
            ].map((item) => {
              const percent = paymentTotal > 0 ? Math.round((item.value / paymentTotal) * 100) : 0;
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {price(item.value)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-400">{percent}%</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total hari ini</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{price(paymentTotal)}</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Transaksi terbaru</h2>
            <Link
              href="/transaksi"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                Belum ada transaksi.
              </p>
            ) : (
              recentSales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/transaksi/${sale.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {sale.invoiceNo}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateTime(sale.createdAt)} · {sale.user.name} ·{" "}
                        {sale._count.items} item
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {price(sale.total)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {sale.paymentMethod === "CASH" ? "Tunai" : "Non-tunai"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Stok menipis</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">Semua stok dalam kondisi aman.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">{product.sku}</p>
                  </div>
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                    {product.stock} / min {product.minStock}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/produk"
            className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Kelola produk <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">Produk terlaris minggu ini</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Belum ada penjualan minggu ini.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topProducts.map((product, index) => (
              <div key={product.productName} className="rounded-xl border border-slate-100 p-3">
                <span className="text-xs font-bold text-emerald-600">#{index + 1}</span>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {product.productName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(product._sum.qty ?? 0)} terjual
                </p>
                <p className="text-xs font-medium text-slate-700">
                  {price(product._sum.subtotal ?? 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
