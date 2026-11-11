import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SupplierForm } from "./supplier-form";

export const metadata = { title: "Supplier - JualIn POS" };

export default async function SuppliersPage() {
  await requireManager();
  const suppliers = await prisma.supplier.findMany({ include: { _count: { select: { purchases: true } } }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Inventori</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Supplier</h1><p className="mt-1 text-sm text-slate-500">Simpan informasi pemasok barang toko.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Tambah supplier</h2><SupplierForm /></section><section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{suppliers.length ? suppliers.map((supplier) => <div key={supplier.id} className="flex flex-wrap justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-800">{supplier.name}</p><p className="mt-1 text-xs text-slate-500">{[supplier.contact, supplier.phone, supplier.address].filter(Boolean).join(" · ") || "Belum ada kontak"}</p></div><span className="text-xs text-slate-500">{supplier._count.purchases} pembelian</span></div>) : <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada supplier.</p>}</section></div>;
}
