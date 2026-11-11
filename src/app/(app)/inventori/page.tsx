import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { StockCountForm } from "./stock-count-form";

export const metadata = { title: "Inventori - JualIn POS" };

const movementLabel: Record<string, string> = { SALE: "Penjualan", PURCHASE: "Pembelian", ADJUSTMENT: "Penyesuaian", RETURN: "Retur", OPNAME: "Stock opname" };

export default async function InventoryPage() {
  await requireManager();
  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({ include: { product: { select: { name: true, sku: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, stock: true }, take: 500 }),
  ]);
  return <div className="space-y-5"><header><p className="text-sm font-medium text-emerald-600">Stok</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Inventori dan stock opname</h1><p className="mt-1 text-sm text-slate-500">Catat hasil hitung fisik; setiap selisih memiliki jejak sebelum dan sesudah.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Catat hasil stock opname</h2><StockCountForm products={products} /></section><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Produk</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3 text-right">Perubahan</th><th className="px-5 py-3 text-right">Saldo</th><th className="px-5 py-3">Referensi / catatan</th><th className="px-5 py-3">Petugas</th></tr></thead><tbody className="divide-y divide-slate-100">{movements.length ? movements.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDateTime(movement.createdAt)}</td><td className="px-5 py-4"><p className="font-medium">{movement.product.name}</p><p className="text-xs text-slate-400">{movement.product.sku}</p></td><td className="px-5 py-4">{movementLabel[movement.type] ?? movement.type}</td><td className={`px-5 py-4 text-right font-semibold ${movement.qty >= 0 ? "text-emerald-700" : "text-red-600"}`}>{movement.qty > 0 ? "+" : ""}{movement.qty}</td><td className="px-5 py-4 text-right text-slate-600">{movement.stockBefore} → {movement.stockAfter}</td><td className="px-5 py-4 text-slate-500">{movement.reference ?? "—"}{movement.note ? <p className="mt-1 text-xs">{movement.note}</p> : null}</td><td className="px-5 py-4 text-slate-500">{movement.user?.name ?? "—"}</td></tr>) : <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Belum ada pergerakan stok.</td></tr>}</tbody></table></div></section><p className="text-xs text-slate-400">Menampilkan 100 pergerakan stok terbaru.</p></div>;
}
