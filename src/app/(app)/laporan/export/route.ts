import { getSession, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Keep exported numbers numeric (including negative values), while neutralizing
  // spreadsheet formulas in user-controlled text such as product names and notes.
  if (typeof value === "string" && /^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isManager(user.role)) return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const rawFrom = url.searchParams.get("from");
  const rawTo = url.searchParams.get("to");
  const validDate = (value: string | null) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()) && new Date(`${value}T00:00:00`).toISOString().slice(0, 10) === value;
  if (!validDate(rawFrom) || !validDate(rawTo)) return new Response("Format tanggal harus YYYY-MM-DD dan tanggal harus valid.", { status: 400 });
  const start = rawFrom ? new Date(`${rawFrom}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = rawTo ? new Date(`${rawTo}T23:59:59.999`) : new Date(new Date().setHours(23, 59, 59, 999));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end || end.getTime() - start.getTime() > 366 * 86_400_000) return new Response("Rentang tanggal tidak valid atau melebihi 366 hari.", { status: 400 });
  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end } }, include: { user: { select: { name: true } }, items: { select: { productName: true, sku: true, qty: true, price: true, discount: true, subtotal: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.saleReturn.findMany({ where: { createdAt: { gte: start, lte: end } }, include: { sale: { include: { user: { select: { name: true } } } }, items: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const rows: unknown[][] = [["Invoice", "Waktu", "Kasir", "Status", "Metode", "Produk", "SKU", "Jumlah", "Harga", "Diskon item", "Subtotal item", "Subtotal transaksi", "Diskon transaksi", "Pajak", "Total", "Dibayar", "Kembalian", "Nomor retur", "Nilai retur"]];
  for (const sale of sales) {
    for (const item of sale.items) rows.push([sale.invoiceNo, sale.createdAt.toISOString(), sale.user.name, sale.status, sale.paymentMethod, item.productName, item.sku, item.qty, item.price, item.discount, item.subtotal, sale.subtotal, sale.discount, sale.tax, sale.total, sale.paid, sale.change]);
    if (!sale.items.length) rows.push([sale.invoiceNo, sale.createdAt.toISOString(), sale.user.name, sale.status, sale.paymentMethod, "", "", 0, 0, 0, 0, sale.subtotal, sale.discount, sale.tax, sale.total, sale.paid, sale.change]);
  }
  for (const returned of returns) {
    for (const item of returned.items) rows.push([returned.sale.invoiceNo, returned.createdAt.toISOString(), returned.sale.user.name, "RETURN", returned.sale.paymentMethod, item.productName, item.sku, -item.qty, 0, 0, -item.amount, 0, 0, 0, 0, 0, 0, returned.number, -item.amount]);
  }
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="jualin-penjualan-${localDate(start)}-${localDate(end)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
