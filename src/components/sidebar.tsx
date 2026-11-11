"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Truck,
  ClipboardList,
  Boxes,
  ShieldCheck,
  LogOut,
  Package,
  Users,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  ContactRound,
  Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { isManager, roleLabel, type SessionUser } from "@/lib/auth-shared";

const navItems: { href: string; label: string; icon: LucideIcon; managerOnly: boolean; ownerOnly?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, managerOnly: true },
  { href: "/pos", label: "Kasir", icon: ShoppingCart, managerOnly: false },
  { href: "/shift", label: "Shift Kasir", icon: Store, managerOnly: false },
  { href: "/produk", label: "Produk", icon: Package, managerOnly: true },
  { href: "/pembelian", label: "Pembelian", icon: ClipboardList, managerOnly: true },
  { href: "/inventori", label: "Inventori", icon: Boxes, managerOnly: true },
  { href: "/supplier", label: "Supplier", icon: Truck, managerOnly: true },
  { href: "/pelanggan", label: "Pelanggan", icon: ContactRound, managerOnly: true },
  { href: "/kategori", label: "Kategori", icon: Tags, managerOnly: true },
  { href: "/pengguna", label: "Pengguna", icon: Users, managerOnly: true },
  { href: "/pengeluaran", label: "Pengeluaran", icon: CircleDollarSign, managerOnly: true },
  { href: "/transaksi", label: "Transaksi", icon: ReceiptText, managerOnly: false },
  { href: "/laporan", label: "Laporan", icon: BarChart3, managerOnly: true },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, managerOnly: true, ownerOnly: true },
  { href: "/audit", label: "Audit", icon: ShieldCheck, managerOnly: true, ownerOnly: true },
  { href: "/backup", label: "Backup", icon: Database, managerOnly: true, ownerOnly: true },
];

function NavLinks({ user, mobile }: { user: SessionUser; mobile?: boolean }) {
  const pathname = usePathname();
  const items = navItems.filter(
    (item) => (!item.managerOnly || isManager(user.role)) && (!item.ownerOnly || user.role === "OWNER"),
  );

  if (mobile) {
    return (
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user, version }: { user: SessionUser; version: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/pos" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">
              J
            </span>
            <span className="font-bold text-slate-900">JualIn POS</span>
            <span className="text-[10px] font-medium text-slate-400">v{version}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </form>
        </div>
        <NavLinks user={user} mobile />
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-base font-black text-white">
            J
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">
              JualIn POS
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Store className="h-3 w-3" />
              Point of Sale
            </p>
          </div>
        </div>

        <NavLinks user={user} />

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Keluar"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">JualIn POS v{version}</p>
        </div>
      </aside>
    </>
  );
}
