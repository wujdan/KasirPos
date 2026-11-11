"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Clock3,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { createSale } from "@/lib/actions/sales";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PosCartItem, PosProduct } from "@/lib/pos";

type Category = { id: number; name: string };
type Customer = { id: number; name: string; phone: string };

type ReceiptState = {
  saleId: number;
  invoiceNo: string;
  total: number;
  paid: number;
  change: number;
  method: "CASH" | "NON_CASH";
};

export function PosClient({
  products,
  categories,
  taxPercent,
  storeName,
  cashier,
  hasOpenShift,
  customers,
}: {
  products: PosProduct[];
  categories: Category[];
  taxPercent: number;
  storeName: string;
  cashier: { id: number; name: string };
  hasOpenShift: boolean;
  customers: Customer[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [trxDiscount, setTrxDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<"CASH" | "NON_CASH">("CASH");
  const [paidInput, setPaidInput] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory =
        categoryId === "all" || product.categoryId === categoryId;
      if (!matchCategory) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, query, categoryId]);

  const gross = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const lineDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const subtotal = Math.max(0, gross - lineDiscount);
  const discount = Math.min(trxDiscount, subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * taxPercent) / 100);
  const total = taxable + tax;

  const paid = Math.max(0, Number.parseInt(paidInput || "0", 10) || 0);
  const change = method === "CASH" ? Math.max(0, paid - total) : 0;
  const canPay =
    cart.length > 0 && hasOpenShift && !pending && (method === "NON_CASH" || paid >= total);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F2" && cart.length > 0 && !paymentOpen) {
        event.preventDefault();
        openPayment();
      }
      if (event.key === "Escape") {
        setPaymentOpen(false);
        setReceipt(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function addProduct(product: PosProduct) {
    if (product.stock <= 0) return;
    setError("");
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          setError(`Stok ${product.name} hanya ${product.stock}.`);
          return current;
        }
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          qty: 1,
          discount: 0,
          stock: product.stock,
        },
      ];
    });
  }

  function changeQty(productId: number, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) return item;
          const next = Math.min(item.stock, item.qty + delta);
          return { ...item, qty: next };
        })
        .filter((item) => item.qty > 0),
    );
  }

  function setQty(productId: number, value: string) {
    const parsed = Number.parseInt(value, 10);
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                qty: Number.isFinite(parsed)
                  ? Math.min(item.stock, Math.max(1, parsed))
                  : 1,
              }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  }

  function setLineDiscount(productId: number, value: string) {
    const parsed = Number.parseInt(value || "0", 10) || 0;
    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              discount: Math.min(
                item.price * item.qty,
                Math.max(0, parsed),
              ),
            }
          : item,
      ),
    );
  }

  function removeItem(productId: number) {
    setCart((current) =>
      current.filter((item) => item.productId !== productId),
    );
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const term = query.trim().toLowerCase();
    if (!term) return;
    const exact = products.find(
      (product) =>
        (product.barcode ?? "").toLowerCase() === term ||
        product.sku.toLowerCase() === term ||
        product.name.toLowerCase() === term,
    );
    if (exact) {
      addProduct(exact);
      setQuery("");
    }
  }

  function openPayment() {
    if (cart.length === 0 || !hasOpenShift) return;
    setError("");
    setReceipt(null);
    setMethod("CASH");
    setPaidInput(String(total));
    setPaymentOpen(true);
  }

  function submitPayment() {
    if (!canPay) return;
    setError("");
    startTransition(async () => {
      const result = await createSale({
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          discount: item.discount,
        })),
        discount: trxDiscount,
        paymentMethod: method,
        paid: method === "CASH" ? paid : total,
        note,
        customerId: customerId ? Number(customerId) : null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setReceipt({
        saleId: result.saleId,
        invoiceNo: result.invoiceNo,
        total: result.total,
        paid: method === "CASH" ? paid : result.total,
        change: result.change,
        method,
      });
      setCart([]);
      setTrxDiscount(0);
      setNote("");
      setCustomerId("");
      setPaidInput("");
      setPaymentOpen(false);
      router.refresh();
      searchRef.current?.focus();
    });
  }

  const quickAmounts = useMemo(() => {
    if (total <= 0) return [];
    const options = new Set<number>();
    options.add(total);
    options.add(Math.ceil(total / 10000) * 10000);
    options.add(Math.ceil(total / 50000) * 50000);
    options.add(Math.ceil(total / 100000) * 100000);
    return [...options].sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-600">{storeName}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Kasir
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kasir: {cashier.name}
            {taxPercent > 0 ? ` · Pajak ${taxPercent}%` : " · Tanpa pajak"}
          </p>
        </div>
        <p className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:block">
          Tekan <span className="font-semibold text-slate-700">F2</span> untuk
          pembayaran
        </p>
      </div>

      {error && !paymentOpen ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!hasOpenShift ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Buka shift kasir sebelum menerima pembayaran.</span><Link href="/shift" className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white">Buka shift</Link></div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Cari nama produk, SKU, atau scan barcode lalu Enter..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryId("all")}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  categoryId === "all"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    categoryId === category.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {filtered.length === 0 ? (
              <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-400">
                Produk tidak ditemukan.
              </p>
            ) : (
              filtered.map((product) => {
                const inCart =
                  cart.find((item) => item.productId === product.id)?.qty ?? 0;
                const disabled = product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={disabled}
                    className={`flex flex-col items-start rounded-2xl border bg-white p-3.5 text-left shadow-sm transition ${
                      disabled
                        ? "cursor-not-allowed border-slate-200 opacity-50"
                        : "border-slate-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {product.categoryName ?? "Umum"}
                      </span>
                      {inCart > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                          {inCart}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {product.sku}
                    </p>
                    <div className="mt-2 flex w-full items-end justify-between">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatRupiah(product.price)}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          product.stock <= 5 ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        stok {product.stock}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                Keranjang
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {formatNumber(cart.reduce((sum, item) => sum + item.qty, 0))}
                </span>
              </p>
              {cart.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Kosongkan
                </button>
              ) : null}
            </div>

            <div className="max-h-[42vh] space-y-3 overflow-y-auto px-4 py-3 xl:max-h-[38vh]">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">
                    Keranjang masih kosong.
                  </p>
                  <p className="text-xs text-slate-400">
                    Pilih produk di sebelah kiri.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatRupiah(item.price)} · stok {item.stock}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => changeQty(item.productId, -1)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          value={item.qty}
                          onChange={(event) =>
                            setQty(item.productId, event.target.value)
                          }
                          className="w-9 bg-transparent text-center text-xs font-semibold text-slate-700 outline-none"
                          inputMode="numeric"
                        />
                        <button
                          type="button"
                          onClick={() => changeQty(item.productId, 1)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {formatRupiah(item.price * item.qty - item.discount)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Diskon item</span>
                      <div className="flex flex-1 items-center rounded-md border border-slate-200 bg-white px-2 py-1">
                        <span className="text-slate-400">Rp</span>
                        <input
                          value={item.discount || ""}
                          onChange={(event) =>
                            setLineDiscount(item.productId, event.target.value)
                          }
                          placeholder="0"
                          inputMode="numeric"
                          className="w-full bg-transparent pl-1 text-right text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 px-4 py-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Diskon transaksi</span>
                <div className="ml-auto flex w-28 items-center rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="text-slate-400">Rp</span>
                  <input
                    value={trxDiscount || ""}
                    onChange={(event) =>
                      setTrxDiscount(
                        Math.max(
                          0,
                          Number.parseInt(event.target.value || "0", 10) || 0,
                        ),
                      )
                    }
                    placeholder="0"
                    inputMode="numeric"
                    className="w-full bg-transparent pl-1 text-right text-xs font-medium text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Diskon</span>
                    <span className="font-medium text-red-500">
                      -{formatRupiah(discount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-500">
                  <span>Pajak ({taxPercent}%)</span>
                  <span className="font-medium text-slate-700">
                    {formatRupiah(tax)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-base">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="font-bold text-emerald-600">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={openPayment}
                disabled={cart.length === 0 || !hasOpenShift}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Banknote className="h-4 w-4" />
                Bayar {formatRupiah(total)}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {paymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pembayaran</h2>
                <p className="text-xs text-slate-500">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} item ·{" "}
                  {cashier.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-900 px-5 py-4 text-white">
              <p className="text-xs text-slate-300">Total tagihan</p>
              <p className="mt-1 text-3xl font-bold">{formatRupiah(total)}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod("CASH");
                  setPaidInput(String(total));
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  method === "CASH"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Tunai
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("NON_CASH");
                  setPaidInput(String(total));
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  method === "NON_CASH"
                    ? "border-sky-600 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Non-tunai
              </button>
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}

            {method === "CASH" ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Uang diterima
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-slate-300 px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                    <span className="text-sm text-slate-400">Rp</span>
                    <input
                      value={paidInput}
                      onChange={(event) =>
                        setPaidInput(event.target.value.replace(/[^\d]/g, ""))
                      }
                      inputMode="numeric"
                      autoFocus
                      className="w-full bg-transparent px-2 text-right text-lg font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setPaidInput(String(amount))}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {amount === total ? "Uang pas" : formatNumber(amount)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <span className="text-sm font-medium text-emerald-700">
                    Kembalian
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatRupiah(change)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-700">
                Pembayaran non-tunai dianggap diterima penuh sebesar total
                tagihan.
              </p>
            )}

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Pelanggan (opsional)</label>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">Pelanggan umum</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Catatan (opsional)
              </label>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: pesanan meja 3"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitPayment}
                disabled={!canPay}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {pending ? "Menyimpan..." : "Konfirmasi Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {receipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Pembayaran berhasil
            </h2>
            <p className="text-sm text-slate-500">{receipt.invoiceNo}</p>

            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold text-slate-800">
                  {formatRupiah(receipt.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {receipt.method === "CASH" ? "Tunai" : "Non-tunai"}
                </span>
                <span className="font-semibold text-slate-800">
                  {formatRupiah(receipt.paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kembalian</span>
                <span className="font-semibold text-emerald-600">
                  {formatRupiah(receipt.change)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Transaksi baru
              </button>
              <Link
                href={`/transaksi/${receipt.saleId}?print=1`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4" />
                Cetak struk
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
