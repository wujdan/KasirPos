import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "Masuk - JualIn POS" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "CASHIER" ? "/pos" : "/");
  const hasUsers = (await prisma.user.count()) > 0;
  if (!hasUsers) redirect("/setup");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-emerald-600 p-10 text-white lg:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">
              J
            </div>
            <h1 className="mt-10 text-3xl font-bold leading-tight">
              JualIn POS
            </h1>
            <p className="mt-3 max-w-sm text-emerald-50/90">
              Kelola penjualan, stok, dan laporan toko Anda dalam satu aplikasi
              kasir yang cepat dan rapi.
            </p>
          </div>

          <div className="space-y-3 text-sm text-emerald-50/90">
            <p className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                ✓
              </span>
              Transaksi cepat dengan pencarian dan barcode
            </p>
            <p className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                ✓
              </span>
              Stok berkurang otomatis dan tercatat
            </p>
            <p className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                ✓
              </span>
              Riwayat transaksi dan struk siap cetak
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              Selamat datang
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Masuk ke akun Anda
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gunakan akun owner, admin, atau kasir yang sudah terdaftar.
            </p>
          </div>

          <LoginForm />

        </div>
      </div>
    </main>
  );
}
