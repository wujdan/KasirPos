import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { CashMovementForm, ShiftForms } from "./shift-forms";

export const metadata = { title: "Shift Kasir - JualIn POS" };

export default async function ShiftPage() {
  const user = await requireUser();
  const [openShift, shifts] = await Promise.all([
    prisma.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" }, orderBy: { openedAt: "desc" } }),
    prisma.cashShift.findMany({ where: { userId: user.id }, orderBy: { openedAt: "desc" }, take: 20 }),
  ]);

  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-emerald-600">Operasional</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Shift kasir</h1><p className="mt-1 text-sm text-slate-500">Catat modal awal dan cocokkan kas saat pergantian shift.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{openShift ? "Shift sedang berjalan" : "Buka shift baru"}</h2>
      {openShift ? <div className="mt-4"><p className="text-sm text-slate-600">Dibuka {formatDateTime(openShift.openedAt)} · Modal {formatRupiah(openShift.openingCash)}</p><ShiftForms shift={openShift} /><CashMovementForm shiftId={openShift.id} /></div> : <ShiftForms />}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Riwayat shift</h2><div className="divide-y divide-slate-100">{shifts.length ? shifts.map((shift) => <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><div><p className="font-semibold text-slate-800">{formatDateTime(shift.openedAt)}{shift.closedAt ? ` – ${formatDateTime(shift.closedAt)}` : " – Berlangsung"}</p><p className="mt-1 text-xs text-slate-500">Modal {formatRupiah(shift.openingCash)}{shift.expectedCash !== null ? ` · Seharusnya ${formatRupiah(shift.expectedCash)}` : ""}</p></div>{shift.difference !== null ? <span className={`font-semibold ${shift.difference === 0 ? "text-emerald-600" : "text-amber-600"}`}>Selisih {formatRupiah(shift.difference)}</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Terbuka</span>}</div>) : <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada riwayat shift.</p>}</div></section>
  </div>;
}
