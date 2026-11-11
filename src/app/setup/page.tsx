import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Setup Awal - JualIn POS" };

export default async function SetupPage() {
  if (await getSession()) redirect("/");
  if (await prisma.user.count()) redirect("/login");
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"><section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl sm:p-10"><p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Setup awal</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Siapkan toko Anda</h1><p className="mt-2 text-sm text-slate-500">Buat informasi toko dan akun owner pertama. Akun ini mendapat akses penuh.</p><SetupForm /></section></main>;
}
