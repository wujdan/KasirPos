import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { RestoreForm } from "./restore-form";

export const metadata = { title: "Backup dan Pemulihan - JualIn POS" };

export default async function BackupPage() {
  const user = await requireUser();
  if (user.role !== "OWNER") notFound();
  return <div className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-sm font-medium text-emerald-600">Pemeliharaan</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Backup dan pemulihan</h1><p className="mt-1 text-sm text-slate-500">Buat snapshot SQLite dan pulihkan data dari backup JualIn yang tervalidasi.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Unduh backup</h2><p className="mt-1 text-sm text-slate-500">Snapshot dibuat konsisten dan diperiksa integritasnya sebelum diunduh.</p><a href="/backup/download" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Unduh database SQLite</a></section>
    <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-red-900">Pulihkan database</h2><p className="mt-1 text-sm text-slate-600">Pemulihan mengganti seluruh data aktif dengan isi backup. Pastikan semua kasir berhenti bertransaksi terlebih dahulu.</p><RestoreForm /></section>
  </div>;
}
