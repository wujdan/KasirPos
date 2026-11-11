# Changelog

Semua perubahan penting pada proyek ini dicatat di berkas ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [0.1.0] - 2026-11-11

### Ditambahkan

- Setup awal toko dan akun owner pertama.
- Autentikasi JWT pada cookie `httpOnly` dengan peran owner, admin, dan kasir.
- Dashboard ringkasan penjualan, laba kotor, dan stok menipis.
- Kasir (POS) dengan pencarian/barcode, diskon per item dan transaksi, pajak, pembayaran tunai/non-tunai, dan struk cetak browser.
- Shift kasir: buka/tutup, kas awal dan akhir, rekap selisih.
- Produk, kategori, supplier, dan pelanggan.
- Inventori dengan stock opname multi-produk dan riwayat pergerakan stok.
- Pembelian dengan penerimaan bertahap dan pembatalan.
- Retur parsial dan pembatalan transaksi (void) oleh owner.
- Pengeluaran dan pergerakan kas.
- Laporan penjualan bersih, estimasi laba kotor, dan ekspor CSV.
- Manajemen pengguna dan status aktif/nonaktif.
- Audit log aktivitas penting.
- Backup SQLite tervalidasi dan pemulihan dengan konfirmasi serta snapshot otomatis.
- Migrasi Prisma awal hingga dukungan penerimaan pembelian parsial.

[Unreleased]: https://github.com/wujdan/KasirPos/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/wujdan/KasirPos/releases/tag/v0.1.0
