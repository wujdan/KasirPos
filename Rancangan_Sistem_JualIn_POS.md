# JualIn POS --- Rancangan Sistem Kasir Point of Sale

> **Keputusan implementasi (2026-11):** Proyek ini dilanjutkan sebagai aplikasi web Next.js, bukan aplikasi Flutter Android. Implementasi memakai TypeScript, Next.js App Router, Prisma ORM 7, dan SQLite pada satu server. Rancangan Flutter, Drift, Riverpod, printer perangkat, dan offline-first di bawah adalah usulan awal yang tidak menggambarkan teknologi aplikasi web saat ini. Persyaratan bisnis (kasir, inventori, hak akses, laporan, backup) tetap menjadi acuan; kebutuhan perangkat dan distribusi harus disesuaikan untuk web.

## 1. Gambaran Umum

**JualIn POS** adalah rancangan aplikasi kasir (*Point of Sale*) untuk
UMKM dan toko retail. Sistem dirancang dengan alur operasional yang
profesional, mulai dari konfigurasi toko, pengelolaan pengguna,
transaksi penjualan, inventori, pembelian, hingga laporan.

Arah pengembangan awal: - Platform: Android - Framework: Flutter -
Bahasa: Dart - Arsitektur: Clean Architecture - Pendekatan:
Offline-first - Database lokal: SQLite dengan Drift - State management:
Riverpod - Printer: Thermal 58 mm dan 80 mm - Barcode: Kamera perangkat
atau scanner eksternal - Backup: Ekspor dan pemulihan berkas lokal

> **Catatan arsitektur:** Rancangan awal mengutamakan satu perangkat per
> toko agar dapat berjalan tanpa server dan biaya berlangganan. Struktur
> aplikasi sebaiknya tetap disiapkan agar sinkronisasi multi-perangkat
> dapat ditambahkan pada fase berikutnya. Sinkronisasi cloud atau
> antarperangkat bukan bagian otomatis dari mode offline.

## 2. Tujuan Sistem

1.  Mempermudah proses transaksi penjualan.
2.  Mengelola produk, harga, kategori, dan stok.
3.  Mencatat pembelian barang dari supplier.
4.  Mengontrol kas dan pergantian shift kasir.
5.  Menyediakan laporan penjualan dan operasional.
6.  Membatasi akses berdasarkan peran pengguna.
7.  Menjaga data tetap tersedia ketika tidak ada koneksi internet.
8.  Menyediakan mekanisme backup dan restore untuk mengurangi risiko
    kehilangan data.

## 3. Modul Utama

  Modul                  Fungsi
  ---------------------- --------------------------------------------------
  Setup Toko             Mengatur identitas dan konfigurasi toko
  Dashboard              Menampilkan ringkasan aktivitas toko
  Autentikasi            Login dan pengelolaan sesi pengguna
  Pengguna & Hak Akses   Mengelola akun dan izin berdasarkan peran
  Kasir / POS            Melayani transaksi penjualan
  Produk                 Mengelola produk, kategori, harga, dan barcode
  Inventori              Mengelola stok dan riwayat pergerakannya
  Pembelian              Mencatat pembelian dan penerimaan barang
  Supplier               Mengelola pemasok
  Pelanggan              Mengelola data pelanggan
  Pengeluaran            Mencatat biaya operasional
  Shift Kasir            Mengelola kas masuk, kas keluar, dan tutup shift
  Laporan                Menampilkan laporan penjualan, stok, dan kas
  Pengaturan             Mengatur pajak, struk, printer, dan preferensi
  Backup & Restore       Mencadangkan dan memulihkan data

## 4. Alur Operasional Sistem

### 4.1 Setup Awal Toko

``` text
INSTALL / BUKA APLIKASI
          |
          v
     SETUP TOKO
          |
          +--> Nama toko
          +--> Alamat dan nomor telepon
          +--> Logo toko
          +--> Mata uang dan pajak
          +--> Format nomor transaksi
          |
          v
     BUAT AKUN OWNER
          |
          v
  PENGATURAN PERANGKAT
          |
          +--> Printer thermal
          +--> Ukuran kertas struk
          +--> Barcode scanner (opsional)
          |
          v
       DASHBOARD
```

Pengaturan awal minimal: - Nama, alamat, dan nomor telepon toko. - Logo
toko (opsional). - Mata uang. - Pengaturan pajak, termasuk pilihan
nonaktif. - Format nomor transaksi. - Ukuran kertas struk. - Pengaturan
printer. - Akun owner pertama.

### 4.2 Login dan Hak Akses

Sistem menggunakan konsep **Role-Based Access Control (RBAC)**.

  -----------------------------------------------------------------------
  Peran                               Hak akses utama
  ----------------------------------- -----------------------------------
  Owner                               Seluruh konfigurasi, pengguna,
                                      transaksi, stok, laporan, dan
                                      backup

  Admin                               Mengelola operasional sesuai izin
                                      yang diberikan owner

  Kasir                               Membuka shift, melakukan transaksi,
                                      mencetak struk, dan melihat riwayat
                                      yang diizinkan
  -----------------------------------------------------------------------

Alur login:

``` text
LOGIN
  |
  v
VALIDASI AKUN
  |
  v
BACA ROLE DAN IZIN
  |
  +------ OWNER -----> Dashboard Owner
  |
  +------ ADMIN -----> Dashboard Admin
  |
  +------ KASIR -----> Halaman Kasir
```

Prinsip keamanan: - Kata sandi disimpan dalam bentuk hash, bukan teks
biasa. - Setiap tindakan sensitif divalidasi berdasarkan izin. - Kasir
tidak boleh mengubah harga modal atau menghapus transaksi tanpa izin. -
Aktivitas penting dicatat dalam audit log. - Penguncian sesi dapat
diterapkan ketika aplikasi tidak aktif.

### 4.3 Alur Transaksi Penjualan (POS)

``` text
KASIR LOGIN
     |
     v
BUKA SHIFT KASIR
     |
     v
HALAMAN TRANSAKSI
     |
     v
PILIH / SCAN PRODUK
     |
     v
MASUKKAN KE KERANJANG
     |
     v
ATUR QTY / DISKON
     |
     v
HITUNG SUBTOTAL, PAJAK, DAN TOTAL
     |
     v
PILIH METODE PEMBAYARAN
     |
     +----------------------+
     |                      |
     v                      v
    TUNAI                NON-TUNAI
     |                      |
     v                      v
INPUT NOMINAL          INPUT NOMINAL
     |                      |
     +----------+-----------+
                |
                v
      VALIDASI PEMBAYARAN
                |
                v
       SIMPAN TRANSAKSI
                |
                v
         KURANGI STOK
                |
                v
          CETAK STRUK
                |
                v
       TRANSAKSI SELESAI
```

Fitur halaman POS: - Pencarian produk berdasarkan nama atau kode. -
Pemindaian barcode melalui kamera atau scanner eksternal. - Keranjang
belanja. - Pengubahan kuantitas. - Diskon per produk dan diskon
transaksi. - Perhitungan pajak sesuai konfigurasi. - Catatan
transaksi. - Pembayaran tunai dan non-tunai. - Perhitungan uang
kembalian. - Cetak atau cetak ulang struk sesuai izin. - Riwayat
transaksi.

**Aturan integritas transaksi:** - Simpan header penjualan, detail item,
pembayaran, dan pergerakan stok dalam satu database transaction. - Jika
salah satu proses gagal, seluruh proses transaksi dibatalkan
(*rollback*). - Nomor transaksi harus unik. - Harga dan nama produk yang
terjual disimpan sebagai snapshot pada detail transaksi agar riwayat
tidak berubah ketika data produk diedit. - Transaksi yang sudah selesai
tidak dihapus langsung; koreksi dilakukan melalui pembatalan atau retur
dengan jejak audit. - Cegah stok menjadi negatif sesuai kebijakan toko.

### 4.4 Alur Manajemen Stok

``` text
                 INVENTORI
                     |
        +------------+-------------+
        |            |             |
        v            v             v
    PEMBELIAN     PENJUALAN    PENYESUAIAN
        |            |             |
        v            v             v
     STOK (+)     STOK (-)     STOK (+/-)
        |            |             |
        +------------+-------------+
                     |
                     v
                KARTU STOK
                     |
                     v
          RIWAYAT PERGERAKAN STOK
```

Jenis pergerakan stok: 1. **Stock In** --- barang masuk. 2. **Sales**
--- barang keluar karena penjualan. 3. **Purchase Return** --- barang
dikembalikan ke supplier. 4. **Sales Return** --- barang dikembalikan
pelanggan. 5. **Stock Adjustment** --- koreksi stok dengan alasan. 6.
**Stock Opname** --- pencocokan stok fisik dengan catatan sistem.

Setiap pergerakan stok wajib menyimpan: - Produk. - Kuantitas masuk atau
keluar. - Stok sebelum dan sesudah perubahan. - Jenis dan referensi
transaksi. - Waktu perubahan. - Pengguna yang melakukan. - Catatan atau
alasan.

### 4.5 Alur Pembelian Barang

``` text
BUAT PEMBELIAN
      |
      v
PILIH SUPPLIER
      |
      v
INPUT PRODUK, QTY, DAN HARGA BELI
      |
      v
HITUNG TOTAL PEMBELIAN
      |
      v
SIMPAN SEBAGAI DRAFT
      |
      v
KONFIRMASI PENERIMAAN BARANG
      |
      v
STATUS MENJADI RECEIVED
      |
      v
STOK BERTAMBAH
      |
      v
RIWAYAT PEMBELIAN
```

Status pembelian: - **Draft** --- masih disusun dan belum memengaruhi
stok. - **Received** --- barang telah diterima dan stok bertambah. -
**Cancelled** --- pembelian dibatalkan dan tidak memengaruhi stok.

Jika barang diterima sebagian, sistem dapat dikembangkan dengan fitur
penerimaan parsial. Stok hanya bertambah sesuai kuantitas yang
benar-benar diterima.

### 4.6 Alur Shift Kasir

``` text
KASIR MEMULAI SHIFT
        |
        v
INPUT MODAL AWAL
        |
        v
MELAKUKAN TRANSAKSI
        |
        v
CATAT KAS MASUK / KELUAR
        |
        v
AJUKAN TUTUP SHIFT
        |
        v
HITUNG UANG FISIK
        |
        v
BANDINGKAN DENGAN SALDO SISTEM
        |
        v
HITUNG SELISIH
        |
        v
SIMPAN LAPORAN SHIFT
        |
        v
SHIFT DITUTUP
```

Ringkasan shift: - Modal awal. - Total penjualan tunai. - Total
penjualan non-tunai. - Pengeluaran kas. - Pemasukan kas lain. -
Pengembalian dana atau retur. - Saldo kas yang diharapkan. - Uang fisik
hasil penghitungan. - Selisih kas. - Nama kasir dan waktu shift.

Rumus dasar kas yang diharapkan perlu ditetapkan konsisten, misalnya:

`Kas yang diharapkan = modal awal + penerimaan tunai - pengeluaran tunai - pengembalian tunai`

Pembayaran non-tunai tidak dihitung sebagai uang fisik di laci kas.

### 4.7 Retur dan Pembatalan

Retur dan pembatalan perlu menjadi alur tersendiri agar laporan
penjualan dan stok tetap akurat.

-   Retur harus merujuk pada transaksi penjualan asal.
-   Sistem mencatat item dan kuantitas yang diretur.
-   Pengembalian stok ditentukan berdasarkan kondisi barang dan
    kebijakan toko.
-   Pengembalian uang dicatat pada pembayaran atau pergerakan kas.
-   Pembatalan transaksi selesai memerlukan izin khusus dan alasan.
-   Semua tindakan dicatat pada audit log.

## 5. Rancangan Dashboard

Dashboard menampilkan informasi sesuai peran pengguna.

### Ringkasan utama

-   Total penjualan hari ini.
-   Jumlah transaksi hari ini.
-   Rata-rata nilai transaksi.
-   Estimasi keuntungan kotor.
-   Jumlah produk aktif.
-   Produk dengan stok menipis.

### Grafik dan daftar

-   Grafik penjualan harian, mingguan, dan bulanan.
-   Produk terlaris.
-   Komposisi metode pembayaran.
-   Transaksi terbaru.
-   Peringatan stok minimum.
-   Ringkasan shift yang sedang berjalan.

> Keuntungan kotor bukan otomatis laba bersih. Perhitungan laba bersih
> harus memperhitungkan biaya operasional, biaya lain, dan aturan
> akuntansi yang digunakan.

## 6. Rancangan Database Awal

  Tabel                Fungsi
  -------------------- --------------------------------------------
  stores               Identitas toko
  users                Akun pengguna
  roles                Definisi peran
  permissions          Daftar izin
  role_permissions     Relasi peran dan izin
  categories           Kategori produk
  products             Data produk, SKU, barcode, harga, dan stok
  suppliers            Data supplier
  customers            Data pelanggan
  purchases            Header pembelian
  purchase_items       Detail pembelian
  sales                Header penjualan
  sale_items           Detail item penjualan
  payments             Pembayaran transaksi
  expenses             Pengeluaran operasional
  stock_movements      Riwayat pergerakan stok
  stock_opnames        Header stock opname
  stock_opname_items   Detail stock opname
  sales_returns        Header retur penjualan
  sales_return_items   Detail retur penjualan
  cash_shifts          Data shift kasir
  cash_movements       Pergerakan uang kas
  audit_logs           Riwayat aktivitas penting
  settings             Konfigurasi aplikasi

Catatan desain database: - Gunakan primary key yang konsisten dan indeks
untuk kolom pencarian. - Gunakan foreign key untuk menjaga relasi
data. - Gunakan tipe numerik yang aman untuk nominal uang; hindari
perhitungan uang menggunakan floating point. - Simpan waktu transaksi
secara konsisten. - Terapkan database transaction untuk operasi yang
mengubah beberapa tabel sekaligus. - Pertimbangkan soft delete untuk
data master yang sudah pernah digunakan dalam transaksi. - Jangan
mengandalkan satu kolom stok tanpa riwayat; perubahan stok harus dapat
ditelusuri melalui stock movements.

## 7. Rekomendasi Teknologi

  Komponen           Teknologi                    Alasan
  ------------------ ---------------------------- ----------------------------------------
  Framework          Flutter                      Satu basis kode untuk aplikasi
  Bahasa             Dart                         Bahasa utama Flutter
  Database lokal     SQLite                       Penyimpanan lokal dan offline
  Database access    Drift                        Query terstruktur dan dukungan migrasi
  State management   Riverpod                     Pengelolaan state yang terorganisasi
  Arsitektur         Clean Architecture           Memisahkan UI, domain, dan data
  Printer            ESC/POS                      Mendukung printer thermal kompatibel
  Barcode            Kamera / scanner eksternal   Mempercepat input produk
  Ekspor             PDF / CSV atau Excel         Membagikan laporan dan backup

## 8. Struktur Folder yang Disarankan

Contoh struktur berbasis fitur dan lapisan:

``` text
lib/
├── app/
│   ├── app.dart
│   ├── router.dart
│   └── theme/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── utils/
│   ├── services/
│   └── widgets/
├── database/
│   ├── app_database.dart
│   ├── tables/
│   └── migrations/
├── features/
│   ├── onboarding/
│   ├── authentication/
│   ├── dashboard/
│   ├── users/
│   ├── products/
│   ├── categories/
│   ├── pos/
│   ├── sales/
│   ├── inventory/
│   ├── purchases/
│   ├── suppliers/
│   ├── customers/
│   ├── expenses/
│   ├── cash_shifts/
│   ├── reports/
│   ├── printer/
│   ├── settings/
│   └── backup/
└── main.dart
```

Setiap fitur dapat memiliki: - `data/` --- repository implementation,
data source, dan model. - `domain/` --- entity, repository contract, dan
use case. - `presentation/` --- halaman, widget, controller, dan
provider.

Struktur ini adalah pedoman awal; tidak perlu membuat seluruh folder
kosong sebelum fiturnya mulai dikerjakan.

## 9. Keamanan, Backup, dan Keandalan

Hal-hal yang harus disiapkan sejak awal: 1. Hash kata sandi menggunakan
algoritma yang sesuai. 2. Validasi izin pada setiap operasi sensitif. 3.
Audit log untuk perubahan harga, stok, transaksi, dan pengguna. 4.
Database transaction untuk transaksi penjualan, pembelian, dan retur. 5.
Migrasi database yang teruji ketika versi aplikasi diperbarui. 6. Backup
manual dan pengingat backup berkala. 7. Restore dengan validasi berkas
dan konfirmasi pengguna. 8. Jangan menimpa backup terakhir sebelum
backup baru berhasil dibuat. 9. Uji pemulihan data, bukan hanya proses
pembuatan backup. 10. Pertimbangkan enkripsi backup karena berkas dapat
berisi data bisnis.

## 10. Tahapan Pengembangan

  Fase   Pekerjaan                                      Prioritas
  ------ ---------------------------------------------- -----------------------
  1      Setup project, struktur folder, dan database   Wajib
  2      Setup toko dan autentikasi                     Wajib
  3      Role dan permission                            Wajib
  4      Kategori dan produk                            Wajib
  5      POS dan transaksi penjualan                    Wajib
  6      Pergerakan dan pengelolaan stok                Wajib
  7      Printer thermal dan struk                      Wajib
  8      Shift kasir dan pergerakan kas                 Wajib
  9      Dashboard dan laporan dasar                    Wajib
  10     Pembelian dan supplier                         Penting
  11     Pelanggan dan pengeluaran                      Penting
  12     Retur, pembatalan, dan stock opname            Penting
  13     Backup dan restore                             Wajib sebelum rilis
  14     Pengujian, optimasi, dan distribusi            Wajib
  15     Sinkronisasi multi-perangkat                   Pengembangan lanjutan

## 11. Kriteria Pengujian Minimum

Sebelum aplikasi digunakan di toko, pastikan skenario berikut berhasil:

-   Toko dapat disiapkan dan akun owner dibuat.
-   Pengguna hanya dapat mengakses fitur sesuai izin.
-   Produk dapat dicari melalui nama, SKU, dan barcode.
-   Transaksi tunai menghitung uang kembalian dengan benar.
-   Transaksi non-tunai tercatat dengan metode pembayaran yang tepat.
-   Stok berkurang tepat satu kali setelah penjualan berhasil.
-   Kegagalan penyimpanan tidak meninggalkan transaksi atau stok
    setengah jadi.
-   Pembelian berstatus draft tidak menambah stok.
-   Pembelian yang diterima menambah stok sesuai kuantitas.
-   Retur dan pembatalan memperbarui catatan stok dan kas secara benar.
-   Tutup shift menampilkan selisih kas yang akurat.
-   Struk dapat dicetak pada printer yang didukung.
-   Backup dapat dibuat dan dipulihkan.
-   Aplikasi tetap dapat melakukan transaksi tanpa internet.
-   Pembaruan aplikasi tidak merusak data yang sudah ada.

## 12. Keputusan Produk yang Perlu Ditetapkan

Konfigurasi awal yang direkomendasikan:

  Komponen           Rekomendasi awal
  ------------------ ------------------------------------------
  Nama aplikasi      JualIn POS
  Platform awal      Android
  Framework          Flutter
  Database           SQLite + Drift
  Mode operasional   Offline-first
  Perangkat          Satu perangkat per toko untuk tahap awal
  Pengguna           Owner, Admin, Kasir
  Printer            Thermal 58 mm dan 80 mm
  Barcode            Kamera dan scanner eksternal
  Backup             Ekspor dan restore lokal
  Target pengguna    UMKM dan toko retail

### Pilihan arsitektur penggunaan

1.  **Single Device** --- satu perangkat untuk satu toko; owner, admin,
    dan kasir memakai akun masing-masing pada perangkat yang sama.
2.  **Multi Device** --- beberapa perangkat dalam satu toko berbagi data
    secara terkoordinasi.
3.  **Hybrid** --- tetap dapat bekerja offline dan melakukan
    sinkronisasi ketika koneksi tersedia.

**Rekomendasi:** mulai dengan Single Device offline-first, tetapi
rancang pemisahan lapisan data dan identitas toko agar opsi Hybrid dapat
dikembangkan tanpa membongkar seluruh aplikasi. Sinkronisasi membutuhkan
rancangan konflik data, identitas transaksi, keamanan, dan infrastruktur
tambahan.

## 13. Langkah Implementasi Berikutnya

Urutan pekerjaan teknis yang disarankan:

1.  Finalisasi kebutuhan dan aturan bisnis.
2.  Tetapkan skema database dan relasi.
3.  Buat project Flutter dan konfigurasi dependensi.
4.  Implementasikan database serta migrasi.
5.  Buat setup toko, login, dan role.
6.  Bangun modul produk.
7.  Bangun transaksi POS dengan pengujian integritas database.
8.  Tambahkan inventori, shift, laporan, dan printer.
9.  Tambahkan backup/restore dan pengujian menyeluruh.

Dokumen ini menjadi **blueprint awal JualIn POS**. Detail seperti pajak,
diskon, stok negatif, retur, metode pembayaran, dan sinkronisasi perlu
difinalisasi sebagai aturan bisnis sebelum implementasi penuh.

## 14. Status Implementasi Web

Bagian ini mencatat implementasi pada repository, tanpa menghapus target bisnis blueprint.

- **Sudah tersedia:** setup toko dan owner pertama; login berbasis sesi; peran owner/admin/kasir; produk dan kategori; POS, pembayaran, snapshot harga modal, stok dan kartu stok; opname multi-produk dengan audit; pelanggan pada POS; retur parsial dengan perhitungan refund, opsi restok, catatan kas dan audit; transaksi dan cetak struk browser; pembelian draft dengan penerimaan bertahap; supplier; shift, kas masuk/keluar, pengeluaran; dashboard dan laporan setelah retur; ekspor CSV; backup dan pemulihan SQLite melalui UI dengan validasi integritas dan snapshot sebelum pemulihan; pengguna; audit aktivitas.
- **Batas saat ini:** satu toko per basis data; satu produk per draft pembelian; pembatalan hanya dapat dilakukan owner saat shift asal masih terbuka dan tidak tersedia setelah transaksi memiliki retur; retur tunai memerlukan shift terbuka, sedangkan refund non-tunai diproses di penyedia pembayaran; pembayaran non-tunai masih satu metode agregat; pemulihan hanya menerima backup skema terbaru dan ukuran maksimal 100 MB; tidak ada printer thermal langsung, barcode kamera, maupun operasi offline pada browser.
- **Belum tersedia:** printer thermal langsung, barcode kamera, mode offline, sinkronisasi multi-perangkat, retur melalui integrasi penyedia pembayaran, dan lembar opname tersimpan sebagai sesi terjadwal.

### Urutan pengerjaan lanjutan

1. Uji pemulihan backup pada salinan database sebelum dipakai di toko dan simpan snapshot sebelum pemulihan.
2. Evaluasi batas SQLite terhadap jumlah kasir dan beban yang ditargetkan.
3. Jika diperlukan, rancang izin granular, penerimaan parsial pembelian dengan pelunasan supplier, serta integrasi printer dan pembayaran.
