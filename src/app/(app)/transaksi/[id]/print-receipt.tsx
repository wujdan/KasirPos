"use client";

import { Printer } from "lucide-react";

export function PrintReceipt() {
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Printer className="h-4 w-4" />Cetak struk</button>;
}
