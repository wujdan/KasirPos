import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { notFound } from "next/navigation";

export const metadata = { title: "Audit Aktivitas - JualIn POS" };

export default async function AuditPage() {
  const user = await requireUser();
  if (user.role !== "OWNER") notFound();
  const logs = await prisma.auditLog.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return <div className="space-y-5"><header><p className="text-sm font-medium text-emerald-600">Keamanan</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Audit aktivitas</h1><p className="mt-1 text-sm text-slate-500">Catatan login dan perubahan operasional terbaru.</p></header><section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{logs.length ? logs.map((log) => <div key={log.id} className="flex flex-wrap justify-between gap-3 px-5 py-4"><div><p className="font-medium text-slate-800">{log.action} · {log.entity}{log.entityId ? ` #${log.entityId}` : ""}</p><p className="mt-1 text-xs text-slate-500">{log.user?.name ?? "Pengguna tidak aktif"}{log.user?.email ? ` (${log.user.email})` : ""}{log.details ? ` · ${log.details}` : ""}</p></div><time className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(log.createdAt)}</time></div>) : <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada aktivitas.</p>}</section><p className="text-xs text-slate-400">Menampilkan 200 aktivitas terbaru.</p></div>;
}
