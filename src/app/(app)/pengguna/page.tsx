import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CreateUserForm } from "./user-form";
import { toggleUserActive } from "@/lib/actions/users";

export const metadata = { title: "Pengguna - JualIn POS" };

export default async function UsersPage() {
  const actor = await requireManager();
  const users = await prisma.user.findMany({ where: actor.role === "ADMIN" ? { role: "CASHIER" } : {}, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
  return <div className="space-y-6"><header><p className="text-sm font-medium text-emerald-600">Akses</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Pengguna</h1><p className="mt-1 text-sm text-slate-500">Kelola akun dan status akses tim toko.</p></header>{actor.role === "OWNER" ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Tambah pengguna</h2><CreateUserForm /></section> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Admin memiliki akses lihat. Hanya owner yang dapat mengubah akun pengguna.</p>}<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Peran</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Dibuat</th>{actor.role === "OWNER" ? <th className="px-5 py-3">Aksi</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-semibold">{user.name}</td><td className="px-5 py-4 text-slate-600">{user.email}</td><td className="px-5 py-4">{user.role === "OWNER" ? "Owner" : user.role === "ADMIN" ? "Admin" : "Kasir"}</td><td className="px-5 py-4">{user.active ? "Aktif" : "Nonaktif"}</td><td className="px-5 py-4 text-slate-500">{formatDate(user.createdAt)}</td>{actor.role === "OWNER" ? <td className="px-5 py-3">{user.id === actor.id ? <span className="text-xs text-slate-400">Akun Anda</span> : <form action={toggleUserActive}><input type="hidden" name="id" value={user.id} /><button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium">{user.active ? "Nonaktifkan" : "Aktifkan"}</button></form>}</td> : null}</tr>)}</tbody></table></div></section></div>;
}
