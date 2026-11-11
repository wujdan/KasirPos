# JualIn POS

Aplikasi kasir (POS) berbasis web untuk UMKM dan toko retail: transaksi, stok, pembelian, retur, shift kasir, laporan, audit, dan backup SQLite.

[![Versi](https://img.shields.io/badge/versi-0.1.0-2ea44f)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-3-003b57?logo=sqlite&logoColor=white)](https://sqlite.org)

> Aplikasi ini berjalan di server Node.js dan membutuhkan database yang dikonfigurasi. Mode offline-first Android dari rancangan awal **tidak** menjadi sifat aplikasi web ini.

**Daftar isi:** [Fitur](#fitur) · [Hak akses](#hak-akses) · [Teknologi](#teknologi) · [Prasyarat](#prasyarat) · [Instalasi](#instalasi-lokal) · [Akun demo](#akun-demo) · [Alur pertama](#alur-pemakaian-pertama) · [Perintah](#perintah) · [Struktur](#struktur-project) · [Environment](#konfigurasi-environment) · [Aturan bisnis](#aturan-bisnis-penting) · [Produksi](#build--produksi) · [Troubleshooting](#troubleshooting) · [Batasan](#batasan-yang-diketahui) · [Versi](#versi) · [Lisensi](#lisensi)

## Fitur

| Modul | Ringkasan |
| --- | --- |
| Setup awal | Membuat data toko dan akun owner pertama lewat `/setup` |
| Autentikasi | Sesi JWT pada cookie `httpOnly`, kata sandi bcrypt, peran owner/admin/kasir |
| Dashboard | Ringkasan penjualan, stok menipis, dan aktivitas terbaru |
| Kasir (POS) | Pencarian/barcode, diskon per item dan per transaksi, pajak dari pengaturan toko, bayar tunai/non-tunai, hitung kembalian |
| Struk | Struk siap cetak dari browser (print CSS), berisi info toko dan footer kustom |
| Shift kasir | Buka/tutup shift, kas awal & akhir, rekap selisih; transaksi wajib di dalam shift terbuka |
| Produk & kategori | SKU, barcode, harga jual, harga modal, stok, dan stok minimum |
| Inventori | Stock opname multi-produk dan riwayat pergerakan stok (sale, purchase, return, adjustment, opname) |
| Pembelian | Purchase order, penerimaan bertahap/parsial, dan pembatalan |
| Supplier | Data pemasok dan relasi ke pembelian |
| Pelanggan | Data pelanggan yang dapat dipilih pada transaksi POS |
| Retur | Retur parsial per item, dibatasi sisa yang belum diretur, tercatat di stok dan kas |
| Pembatalan transaksi | Void oleh owner dengan alasan, mengembalikan stok dan kas |
| Pengeluaran | Pencatatan biaya operasional dan pergerakan kas |
| Laporan | Penjualan bersih hari ini/7 hari, estimasi laba kotor, ekspor CSV |
| Pengguna | Manajemen akun dan status aktif/nonaktif |
| Audit | Jejak aktivitas penting (create/update/void/retur/backup, dll.) |
| Backup & pemulihan | Unduh SQLite tervalidasi, pulihkan dengan konfirmasi dan snapshot otomatis |

## Hak akses

| Modul | Owner | Admin | Kasir |
| --- | :---: | :---: | :---: |
| Dashboard | ✅ | ✅ | – |
| Kasir (POS) | ✅ | ✅ | ✅ |
| Shift kasir | ✅ | ✅ | ✅ |
| Transaksi (lihat) | ✅ | ✅ | ✅ |
| Retur | ✅ | ✅ | – |
| Pembatalan (void) | ✅ | – | – |
| Produk, kategori, inventori | ✅ | ✅ | – |
| Pembelian, supplier | ✅ | ✅ | – |
| Pelanggan | ✅ | ✅ | – |
| Pengeluaran, laporan | ✅ | ✅ | – |
| Pengguna | ✅ kelola | 👁 lihat | – |
| Pengaturan toko | ✅ ubah | 👁 lihat | – |
| Audit | ✅ | – | – |
| Backup & pemulihan | ✅ | – | – |

Kasir yang membuka halaman khusus manajer akan diarahkan ke `/pos`.

## Teknologi

- **Next.js 16.4** (App Router, Server Actions, Turbopack) dan **React 19.3**
- **TypeScript 5** dan **Tailwind CSS 4**
- **Prisma ORM 7** dengan driver adapter `@prisma/adapter-better-sqlite3`
- **SQLite** (satu server, satu proses)
- **jose** untuk JWT, **bcryptjs** untuk hash kata sandi
- **lucide-react** untuk ikon

## Prasyarat

- **Node.js ≥ 20.9.0** (wajib untuk Next.js 16; disarankan Node 22 atau 24 LTS)
- **npm ≥ 10**
- Build tools untuk `better-sqlite3` bila binary siap-pakai tidak tersedia:
  - **Windows:** Visual Studio Build Tools (workload "Desktop development with C++") + Python 3
  - **macOS:** `xcode-select --install`
  - **Linux:** `build-essential` dan `python3`

Cek versi:

```bash
node -v
npm -v
```

## Instalasi lokal

```bash
git clone https://github.com/wujdan/KasirPos.git
cd KasirPos
npm ci
```

`npm ci` menjalankan `postinstall` → `prisma generate`, sehingga Prisma Client dibuat di `src/generated/prisma`.

Buat file `.env` dari contoh, lalu isi `AUTH_SECRET`:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Buat secret acak (minimal 32 karakter):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Isi `.env` minimal:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="hasil-perintah-di-atas"
```

Terapkan migrasi, isi data contoh (opsional), lalu jalankan:

```bash
npx prisma migrate deploy
npx prisma db seed      # opsional: toko, 4 kategori, 14 produk
npm run dev
```

Buka `http://localhost:3000`. Jika database masih kosong, Anda akan diarahkan ke `/setup` untuk membuat toko dan akun owner pertama.

## Akun demo

Seed **tidak** membuat akun kecuali `SEED_DEMO_USERS=true`. Saat aktif, seed membuat:

| Email | Peran | Kata sandi |
| --- | --- | --- |
| `owner@jualin.id` | Owner | `DEMO_OWNER_PASSWORD` |
| `admin@jualin.id` | Admin | `DEMO_ADMIN_PASSWORD` |
| `kasir@jualin.id` | Kasir | `DEMO_CASHIER_PASSWORD` |

Ketiga kata sandi wajib diisi, minimal 10 karakter, dan sebaiknya berbeda. Jangan aktifkan opsi ini pada lingkungan yang dapat diakses publik.

## Alur pemakaian pertama

1. **Setup** (`/setup`) — isi nama toko, alamat, telepon, dan akun owner.
2. **Login** — masuk dengan akun owner tersebut.
3. **Produk & kategori** — tambahkan barang, atau jalankan `npx prisma db seed` untuk data contoh.
4. **Buka shift** (`/shift`) — transaksi POS ditolak jika belum ada shift terbuka.
5. **Kasir** (`/pos`) — pilih produk, atur diskon, pilih tunai/non-tunai, simpan, lalu cetak struk.
6. **Tutup shift** — isi kas akhir; selisih dihitung otomatis.
7. **Laporan & backup** — tinjau ringkasan, ekspor CSV, dan unduh backup SQLite secara berkala.

## Perintah

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan (`http://localhost:3000`) |
| `npm run dev -- -p 3001` | Pengembangan pada port lain |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npx prisma generate` | Membuat ulang Prisma Client ke `src/generated/prisma` |
| `npx prisma migrate deploy` | Menerapkan migrasi yang tersedia (produksi/CI) |
| `npx prisma migrate dev` | Membuat & menerapkan migrasi baru saat mengubah schema (development) |
| `npx prisma db seed` | Mengisi data contoh (toko, kategori, produk, akun demo opsional) |
| `npx prisma validate` | Memeriksa validitas `prisma/schema.prisma` |

Prisma CLI membaca konfigurasi dari `prisma7.config.ts` (schema, folder migrasi, perintah seed, dan `DATABASE_URL` dari `.env`).

## Struktur project

```text
.
├─ prisma/
│  ├─ migrations/              # 6 migrasi SQL (init → penerimaan pembelian parsial)
│  ├─ schema.prisma            # Model, enum, dan relasi
│  └─ seed.ts                  # Toko, 4 kategori, 14 produk, akun demo opsional
├─ public/                     # Aset statis
├─ src/
│  ├─ app/
│  │  ├─ (app)/                # Halaman setelah login (layout + sidebar)
│  │  │  ├─ pos/               # Kasir
│  │  │  ├─ transaksi/         # Riwayat, detail, struk, retur, void
│  │  │  ├─ pembelian/         # Purchase order & penerimaan bertahap
│  │  │  ├─ inventori/         # Stock opname
│  │  │  ├─ laporan/           # Ringkasan & ekspor CSV
│  │  │  ├─ backup/            # Unduh & pulihkan SQLite
│  │  │  └─ produk/ kategori/ supplier/ pelanggan/ pengeluaran/
│  │  │     shift/ pengguna/ pengaturan/ audit/
│  │  ├─ login/                # Halaman masuk
│  │  ├─ setup/                # Setup toko & owner pertama
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/sidebar.tsx   # Navigasi responsif + filter peran
│  ├─ lib/
│  │  ├─ actions/              # Server Actions per domain (sales, purchases, returns, ...)
│  │  ├─ auth.ts               # Sesi JWT, guard requireUser/requireManager, hash
│  │  ├─ auth-shared.ts        # Tipe sesi, label peran, isManager
│  │  ├─ db.ts                 # Prisma Client + adapter better-sqlite3
│  │  ├─ audit.ts              # Helper pencatatan audit
│  │  ├─ pos.ts                # Tipe & perhitungan keranjang
│  │  ├─ sqlite-path.ts        # Resolusi path DB untuk backup
│  │  ├─ format.ts             # Format Rupiah & tanggal
│  │  ├─ form.ts               # Tipe state form
│  │  └─ version.ts            # Versi aplikasi dari package.json
│  └─ generated/prisma/        # Prisma Client hasil generate (gitignored)
├─ prisma7.config.ts           # Konfigurasi Prisma CLI
├─ next.config.ts              # serverExternalPackages + Tailwind via Turbopack
├─ CHANGELOG.md
├─ LICENSE
├─ .env.example
└─ package.json
```

## Konfigurasi environment

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | URL berkas SQLite, mis. `file:./dev.db`. Path relatif dihitung dari direktori kerja proses. Hanya `file:` yang didukung fitur backup. |
| `AUTH_SECRET` | Ya | Minimal 32 karakter, acak dan unik. Dipakai menandatangani JWT; aplikasi menolak nilai yang terlalu pendek. |
| `SEED_DEMO_USERS` | Tidak | Set `true` untuk membuat tiga akun demo saat seed. |
| `DEMO_OWNER_PASSWORD` | Kondisional | Wajib bila `SEED_DEMO_USERS=true`, minimal 10 karakter. |
| `DEMO_ADMIN_PASSWORD` | Kondisional | Sama seperti di atas. |
| `DEMO_CASHIER_PASSWORD` | Kondisional | Sama seperti di atas. |
| `NODE_ENV` | Otomatis | `production` mengaktifkan cookie sesi `Secure` (butuh HTTPS). |

## Aturan bisnis penting

- **Shift wajib.** Penjualan dan pengembalian tunai hanya bisa dilakukan saat kasir memiliki shift berstatus `OPEN`.
- **Stok divalidasi di server.** Kuantitas melebihi stok ditolak, dan setiap perubahan stok mencatat `StockMovement` (sebelum → sesudah).
- **Perhitungan transaksi.** Diskon per item dibatasi nilai bruto item; diskon transaksi dibatasi subtotal; pajak dihitung dari subtotal setelah diskon sesuai `taxPercent` toko. Pembayaran non-tunai tidak menghasilkan kembalian.
- **Retur.** Hanya owner/admin, hanya untuk transaksi `COMPLETED`, kuantitas dibatasi sisa yang belum diretur. Pengembalian tunai dicatat sebagai kas keluar; pengembalian non-tunai harus diproses di penyedia pembayaran.
- **Pembatalan (void).** Hanya owner, wajib alasan 5–250 karakter, hanya untuk transaksi tanpa retur, dan hanya selama shift asal masih terbuka. Stok dikembalikan dan kas tunai dicatat keluar.
- **Backup.** Unduhan SQLite melewati pemeriksaan integritas. Pemulihan hanya menerima skema terbaru, maksimal 100 MB, membutuhkan konfirmasi teks `PULIHKAN`, dan membuat snapshot database sebelum data aktif diganti.

## Build & produksi

```bash
npm ci                  # sekaligus prisma generate
npm run build
npx prisma migrate deploy
npm run start           # default port 3000
```

Checklist produksi:

- Set `DATABASE_URL` ke lokasi yang dapat ditulis proses Node.js, di volume **persisten**.
- Set `AUTH_SECRET` unik dan acak (≥ 32 karakter). Jangan gunakan nilai contoh.
- Sajikan melalui HTTPS (reverse proxy seperti Nginx/Caddy) agar cookie `Secure` aktif.
- Jalankan migrasi **sebelum** menjalankan versi aplikasi yang membutuhkan skema baru.
- Jadwalkan backup SQLite, dan gunakan fitur backup aplikasi atau snapshot filesystem—jangan menyalin berkas saat database sedang ditulis.
- Jalankan **satu** proses aplikasi per berkas SQLite. Untuk banyak instance atau kasir serentak, evaluasi database server (PostgreSQL/MySQL) dan strategi sinkronisasi.

### Contoh Docker

Kerangka single-stage berikut cukup untuk satu server. Volume mount diperlukan agar database tidak hilang saat container dibuat ulang.

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/data
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

```bash
docker build -t jualin-pos .
docker run -d --name jualin -p 3000:3000 \
  -e DATABASE_URL="file:./data/dev.db" \
  -e AUTH_SECRET="secret-acak-minimal-32-karakter" \
  -v jualin-data:/app/data \
  jualin-pos
```

> **Jangan deploy ke Vercel/serverless.** SQLite dan `better-sqlite3` membutuhkan filesystem persisten dan proses Node.js yang berjalan lama.

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `AUTH_SECRET must be set to at least 32 characters` | `.env` belum diisi atau secret terlalu pendek. Buat secret baru dengan perintah `crypto` di atas. |
| `Cannot find module '@/generated/prisma/client'` | Prisma Client belum dibuat. Jalankan `npx prisma generate` (atau `npm ci` ulang). |
| `better-sqlite3` gagal saat `npm ci` (`node-gyp`) | Build tools belum ada. Pasang VS Build Tools + Python 3 (Windows), Xcode CLT (macOS), atau `build-essential` (Linux), lalu `npm rebuild better-sqlite3`. |
| `The table ... does not exist` / `no such table` | Migrasi belum diterapkan. Jalankan `npx prisma migrate deploy`. |
| `Environment variable not found: DATABASE_URL` | `.env` tidak ada atau tidak terbaca. Pastikan file berada di root project dan berisi `DATABASE_URL`. |
| Transaksi ditolak: "Buka shift kasir sebelum memulai transaksi." | Buka shift lebih dulu di `/shift`. |
| Halaman `/setup` dialihkan ke `/login` | Sudah ada pengguna di database. Masuk dengan akun yang ada, atau gunakan akun demo hasil seed. |
| Restore gagal: "Ketik PULIHKAN..." | Konfirmasi harus persis `PULIHKAN`. |
| Restore ditolak: ukuran melebihi 100 MB | Batas unggahan backup adalah 100 MB. |
| `EADDRINUSE` port 3000 | Port dipakai proses lain. Jalankan `npm run dev -- -p 3001` atau hentikan proses lama. |
| `database is locked` | Ada lebih dari satu proses menulis ke berkas SQLite yang sama. Hentikan instance lain; jangan menjalankan beberapa proses pada satu database. |
| Perubahan `schema.prisma` tidak berpengaruh | Buat migrasi baru dengan `npx prisma migrate dev`, bukan hanya `generate`. |

## Batasan yang diketahui

- **Satu toko per instalasi** dan **satu berkas SQLite**; belum ada multi-cabang atau multi-tenant.
- **Tidak ada mode offline** di browser; aplikasi membutuhkan koneksi ke server.
- **Printer thermal langsung belum didukung** — struk dicetak melalui dialog cetak browser.
- **Pembayaran non-tunai belum terintegrasi** ke payment gateway; hanya dicatat sebagai metode pembayaran.
- **Belum ada test otomatis** (tidak ada script `test`); verifikasi dilakukan manual dan dengan `npm run lint` + `npm run build`.
- Antarmuka berbahasa Indonesia dan mata uang bawaan `IDR`.

Rencana lengkap dan aturan bisnis terperinci ada di [Rancangan Sistem JualIn POS](./Rancangan_Sistem_JualIn_POS.md).

## Kontribusi

1. Buat branch baru: `git checkout -b fitur/nama-fitur`.
2. Jalankan `npm run lint` dan `npm run build` sebelum commit.
3. Jangan commit `.env`, `*.db`, `node_modules`, atau `src/generated/prisma`.
4. Ajukan pull request dengan deskripsi perubahan dan langkah pengujiannya.

## Versi

Versi aplikasi saat ini **0.1.0**, diambil dari `package.json` dan ditampilkan di footer sidebar. Riwayat perubahan lengkap ada di [CHANGELOG.md](./CHANGELOG.md).

Proyek mengikuti [Semantic Versioning](https://semver.org/lang/id/):

- **MAJOR** — perubahan yang tidak kompatibel, mis. skema database yang memerlukan migrasi destruktif.
- **MINOR** — fitur baru yang tetap kompatibel.
- **PATCH** — perbaikan bug atau penyesuaian kecil.

Saat merilis versi baru: perbarui `version` di `package.json`, tambahkan entri di `CHANGELOG.md`, lalu buat tag Git `vX.Y.Z`.

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE) © 2026 Wujdan.
