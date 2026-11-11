"use client";

import { useState } from "react";

export function RestoreForm() {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (confirmation !== "PULIHKAN") {
      setMessage("Ketik PULIHKAN untuk mengonfirmasi.");
      return;
    }
    if (!window.confirm("Data database saat ini akan diganti oleh backup. Snapshot database saat ini akan disimpan otomatis. Lanjutkan?")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/backup/restore", { method: "POST", body: new FormData(form) });
      setMessage(await response.text());
    } catch {
      setMessage("Permintaan pemulihan gagal. Periksa koneksi dan coba lagi.");
    } finally {
      setPending(false);
      setConfirmation("");
      form.reset();
    }
  }

  return <form onSubmit={submit} className="mt-4 space-y-3">
    <label className="grid gap-1 text-xs font-medium text-slate-600">Berkas backup SQLite (.db)<input name="backup" type="file" accept=".db,application/vnd.sqlite3" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
    <label className="grid gap-1 text-xs font-medium text-slate-600">Ketik PULIHKAN untuk konfirmasi<input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="off" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    <p className="text-xs text-amber-800">Backup harus berasal dari skema JualIn terbaru dan berukuran maksimal 100 MB. Sistem menyimpan snapshot sebelum pemulihan di folder database.</p>
    <button disabled={pending || confirmation !== "PULIHKAN"} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Memulihkan…" : "Pulihkan database"}</button>
    {message ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p> : null}
  </form>;
}
