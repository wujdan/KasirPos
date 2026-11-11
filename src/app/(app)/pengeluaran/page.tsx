import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { ExpenseForm } from "./expense-form";

export const metadata = { title: "Pengeluaran - JualIn POS" };

export default async function ExpensesPage() {
  await requireManager();
  const expenses = await prisma.expense.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Keuangan</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Pengeluaran</h1><p className="mt-1 text-sm text-slate-500">Catat biaya operasional toko.</p></header><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">100 catatan terakhir</h2><p className="text-sm font-semibold text-slate-700">{formatRupiah(total)}</p></div><div className="divide-y divide-slate-100">{expenses.length ? expenses.map((expense) => <div key={expense.id} className="flex justify-between gap-4 px-5 py-4"><div><p className="font-medium text-slate-800">{expense.title}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(expense.createdAt)}{expense.note ? ` · ${expense.note}` : ""}</p></div><p className="whitespace-nowrap font-semibold text-slate-800">{formatRupiah(expense.amount)}</p></div>) : <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada pengeluaran.</p>}</div></section><section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Catat pengeluaran</h2><ExpenseForm /></section></div></div>;
}
