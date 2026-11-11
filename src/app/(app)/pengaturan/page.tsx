import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StoreSettingsForm } from "./settings-form";

export const metadata = { title: "Pengaturan - JualIn POS" };

export default async function SettingsPage() {
  const user = await requireManager();
  const store = await prisma.store.findFirst();
  if (!store) return <div className="rounded-2xl bg-white p-6">Data toko belum tersedia. Jalankan proses inisialisasi database terlebih dahulu.</div>;
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Konfigurasi</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Pengaturan toko</h1><p className="mt-1 text-sm text-slate-500">Informasi toko dan aturan pajak untuk struk dan transaksi baru.</p></header>{user.role === "OWNER" ? <><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><StoreSettingsForm store={store} /></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Cadangan data</h2><p className="mt-1 text-sm text-slate-500">Unduh salinan SQLite yang telah lolos pemeriksaan integritas.</p><a href="/backup" className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Unduh backup database</a><p className="mt-3 text-xs text-slate-400">Simpan berkas di lokasi aman. Pemulihan tersedia di halaman Backup dengan konfirmasi teks dan snapshot otomatis sebelum data diganti.</p></section></> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Hanya owner yang dapat mengubah pengaturan toko.</p>}</div>;
}
