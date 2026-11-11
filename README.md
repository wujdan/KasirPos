# JualIn POS

Aplikasi kasir berbasis web untuk UMKM dan toko retail. Proyek ini menggunakan Next.js App Router, TypeScript, React, Prisma ORM 7, dan SQLite. Aplikasi berjalan pada server Node.js dan membutuhkan koneksi ke database yang dikonfigurasi; mode offline-first Android dari rancangan awal tidak menjadi sifat aplikasi web ini.

## Teknologi

- Next.js 16 dan React 19
- TypeScript, Tailwind CSS 4
- Prisma ORM 7 dengan adapter `better-sqlite3`
- SQLite untuk instalasi satu server
- JWT sesi pada cookie `httpOnly`, `jose`, dan kata sandi bcrypt

## Menjalankan secara lokal

1. Pasang Node.js versi LTS dan dependency proyek dengan `npm ci`.
2. Buat `.env` lokal dengan isi berikut:

   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="isi-dengan-secret-acak-minimal-32-karakter"
   ```

3. Terapkan migrasi dengan `npx prisma migrate deploy`.
4. (Opsional) Isi toko dan katalog contoh dengan `npx prisma db seed`. Seed tidak membuat akun pengguna secara default.
5. Jalankan `npm run dev`, buka `http://localhost:3000`, lalu ikuti setup toko untuk membuat akun owner pertama.

Untuk akun demo lokal, set `SEED_DEMO_USERS=true` dan isi `DEMO_OWNER_PASSWORD`, `DEMO_ADMIN_PASSWORD`, serta `DEMO_CASHIER_PASSWORD` dengan kata sandi berbeda (minimal 10 karakter) sebelum menjalankan seed. Jangan aktifkan opsi ini pada lingkungan yang dapat diakses publik.

## Perintah

- `npm run dev` — server pengembangan
- `npm run build` — build produksi
- `npm run start` — server produksi
- `npm run lint` — ESLint
- `npx prisma migrate deploy` — menerapkan migrasi yang tersedia
- `npx prisma generate` — menghasilkan Prisma Client ke `src/generated/prisma`
- `npx prisma db seed` — mengisi data contoh

## Modul aplikasi

- Setup toko dan owner pertama
- Autentikasi dan peran owner, admin, kasir
- Dashboard, POS, produk, kategori, dan pengaturan toko
- Riwayat transaksi dan struk siap cetak dari browser
- Shift kasir, pengeluaran, dan laporan dasar
- Pengguna dan status akun

Pembelian dengan penerimaan bertahap, supplier, pelanggan yang terhubung ke transaksi POS, retur parsial, opname multi-produk, pergerakan kas, audit aktivitas, pembatalan transaksi terbatas, ekspor CSV bersih setelah retur, serta backup dan pemulihan SQLite tervalidasi sudah tersedia. Printer thermal langsung dan operasi offline browser tidak tersedia pada arsitektur web ini. Rencana lengkap dan aturan bisnis ada di [Rancangan Sistem JualIn POS](./Rancangan_Sistem_JualIn_POS.md).

Retur hanya dapat dibuat owner/admin untuk transaksi selesai. Pengembalian tunai memerlukan shift kasir yang sedang terbuka dan dicatat sebagai kas keluar; pengembalian non-tunai tetap perlu diproses di penyedia pembayaran. Kuantitas retur dibatasi sisa barang yang belum diretur. Pemulihan backup hanya menerima skema terbaru, membutuhkan konfirmasi `PULIHKAN`, dibatasi 100 MB, dan membuat snapshot database sebelum mengganti data aktif.

## Konfigurasi produksi

- Set `DATABASE_URL` ke lokasi database yang dapat ditulis oleh proses Node.js.
- Set `AUTH_SECRET` unik dan acak dengan panjang minimal 32 karakter. Aplikasi menolak secret yang tidak memenuhi syarat.
- Gunakan volume penyimpanan persisten dan siapkan backup SQLite terjadwal. Jangan menyalin berkas database ketika sedang ditulis tanpa prosedur snapshot yang aman.
- Terapkan migrasi sebelum menjalankan versi aplikasi yang membutuhkan skema baru.
- Gunakan HTTPS agar cookie sesi `Secure` aktif.

SQLite sesuai untuk satu proses aplikasi dan satu server. Untuk beberapa instance atau banyak kasir serentak, evaluasi database server dan strategi sinkronisasi sebelum deployment.
