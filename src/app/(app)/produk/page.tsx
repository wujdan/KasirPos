import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { ProductForm } from "./product-form";
import { toggleProductActive } from "@/lib/actions/products";

export const metadata = { title: "Produk - JualIn POS" };

export default async function ProductsPage() {
  await requireManager();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Katalog</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Produk</h1><p className="mt-1 text-sm text-slate-500">Kelola harga, kategori, dan stok produk.</p></header><details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold text-slate-900">Tambah produk</summary><ProductForm categories={categories} /></details><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Produk</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3 text-right">Harga</th><th className="px-5 py-3 text-right">Stok</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{products.length ? products.map((product) => <tr key={product.id}><td className="px-5 py-4"><p className="font-semibold text-slate-800">{product.name}</p><p className="text-xs text-slate-500">{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</p></td><td className="px-5 py-4 text-slate-600">{product.category?.name ?? "Umum"}</td><td className="px-5 py-4 text-right font-medium">{formatRupiah(product.price)}</td><td className={`px-5 py-4 text-right font-semibold ${product.stock <= product.minStock ? "text-amber-600" : "text-slate-700"}`}>{product.stock} <span className="text-xs font-normal text-slate-400">/ min {product.minStock}</span></td><td className="px-5 py-4">{product.active ? "Aktif" : "Nonaktif"}</td><td className="px-5 py-3"><div className="flex gap-2"><details><summary className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium">Ubah</summary><div className="absolute z-10 mt-2 w-[min(90vw,600px)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><ProductForm product={product} categories={categories} /></div></details><form action={toggleProductActive}><input type="hidden" name="id" value={product.id} /><button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium">{product.active ? "Nonaktifkan" : "Aktifkan"}</button></form></div></td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Belum ada produk.</td></tr>}</tbody></table></div></section></div>;
}
