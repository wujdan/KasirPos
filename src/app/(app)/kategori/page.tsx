import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCategory } from "@/lib/actions/products";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Kategori - JualIn POS" };

export default async function CategoriesPage() {
  await requireManager();
  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Katalog</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Kategori produk</h1><p className="mt-1 text-sm text-slate-500">Kelompokkan produk agar mudah dicari di halaman kasir.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Tambah kategori</h2><CategoryForm action={createCategory} /></section><section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{categories.length ? categories.map((category) => <div key={category.id} className="flex items-center justify-between px-5 py-4"><p className="font-semibold text-slate-800">{category.name}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{category._count.products} produk</span></div>) : <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada kategori.</p>}</section></div>;
}
