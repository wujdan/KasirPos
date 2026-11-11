import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { toggleCustomerActive } from "@/lib/actions/customers";
import { CustomerForm } from "./customer-form";

export const metadata = { title: "Pelanggan - JualIn POS" };

export default async function CustomersPage() {
  await requireManager();
  const customers = await prisma.customer.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], take: 500, include: { _count: { select: { sales: true } } } });
  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-emerald-600">Relasi toko</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Pelanggan</h1><p className="mt-1 text-sm text-slate-500">Simpan kontak pelanggan dan hubungkan dengan transaksi POS.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Tambah pelanggan</h2><CustomerForm /></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{customers.length ? customers.map((customer) => <article key={customer.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-900">{customer.name}{!customer.active ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">Nonaktif</span> : null}</p><p className="mt-1 text-xs text-slate-500">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "Tidak ada kontak"} · {customer._count.sales} transaksi · dibuat {formatDate(customer.createdAt)}</p>{customer.note ? <p className="mt-1 text-xs text-slate-500">{customer.note}</p> : null}</div><form action={toggleCustomerActive}><input type="hidden" name="id" value={customer.id} /><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{customer.active ? "Nonaktifkan" : "Aktifkan"}</button></form></article>) : <p className="px-5 py-12 text-center text-sm text-slate-400">Belum ada pelanggan.</p>}</div></section>
    <p className="text-xs text-slate-400">Menampilkan maksimal 500 pelanggan. Data pelanggan terkait transaksi tetap tersimpan saat dinonaktifkan.</p>
  </div>;
}
