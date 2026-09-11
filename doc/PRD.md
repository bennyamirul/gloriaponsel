# PRD.md — Product Requirements Document
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

---

## 1. Ringkasan Produk

Web app internal (bukan publik) untuk mengelola operasional toko handphone:
produk, stok, transaksi, pelanggan, dan laporan. Dibangun dengan Next.js,
Tailwind CSS, shadcn/ui, dan PostgreSQL. Hanya bisa diakses setelah login
sebagai **Admin** atau **Super Admin**.

---

## 2. Peran Pengguna (User Roles)

### Super Admin (Owner)
- Akses penuh ke seluruh modul.
- Satu-satunya role yang bisa: kelola akun admin, lihat laporan laba-rugi &
  harga modal, ubah pengaturan sistem/toko.

### Admin (Staff/Kasir)
- Kelola produk, kategori, supplier, pelanggan (CRUD).
- Input transaksi penjualan.
- Kelola stok masuk/keluar.
- Lihat laporan operasional (penjualan, stok) — **tanpa** melihat harga modal/laba jika dibatasi (lihat FRD untuk permission matrix detail; default: admin bisa lihat laporan penjualan tapi tidak laporan laba-rugi).

> Tidak ada role/akun untuk pelanggan.

---

## 3. Daftar Fitur (User Stories)

### 3.1 Autentikasi
- Sebagai Admin/Super Admin, saya bisa login dengan email & password agar bisa mengakses dashboard.
- Sebagai Admin/Super Admin, saya bisa logout.
- Sebagai user yang lupa password, saya bisa reset password (opsional fase 2, minimal: super admin bisa reset password admin lain).

### 3.2 Dashboard (Overview)
- Sebagai user login, saya melihat ringkasan: total omzet hari ini/bulan ini,
  jumlah transaksi, produk terlaris, stok menipis, grafik tren penjualan.

### 3.3 Manajemen Produk
- Sebagai Admin, saya bisa menambah/mengubah/menghapus data produk HP & aksesoris
  (nama, brand, kategori, spesifikasi singkat, varian warna/storage, harga beli,
  harga jual, stok awal, foto).
- Sebagai Admin, saya bisa melihat daftar produk dengan filter kategori/brand & pencarian.

### 3.4 Kategori & Brand
- Sebagai Admin, saya bisa CRUD kategori (misal: Smartphone, Aksesoris, Sparepart) dan brand (Samsung, iPhone, Xiaomi, dll).

### 3.5 Supplier
- Sebagai Admin, saya bisa CRUD data supplier (untuk keperluan stok masuk).

### 3.6 Pelanggan
- Sebagai Admin, saya bisa mencatat data pelanggan (nama, no HP) saat transaksi,
  atau memilih pelanggan yang sudah ada, atau transaksi tanpa data pelanggan ("umum").

### 3.7 Transaksi Penjualan
- Sebagai Admin, saya bisa membuat transaksi baru: pilih produk (bisa lebih dari 1
  item), jumlah, harga otomatis terisi (bisa diubah untuk diskon), pilih metode
  pembayaran (tunai/transfer/EDC/QRIS-manual), sistem menghitung total otomatis.
- Sebagai Admin, saya bisa melihat riwayat transaksi & detail per transaksi.
- Sebagai Admin, saya bisa membatalkan transaksi (stok dikembalikan otomatis).

### 3.8 Manajemen Stok
- Sebagai Admin, saya bisa mencatat stok masuk (barang dari supplier).
- Sebagai Admin, saya bisa melakukan penyesuaian stok (stok opname/koreksi) dengan alasan.
- Sebagai Admin/Super Admin, saya mendapat notifikasi/badge untuk produk dengan stok di bawah ambang batas (low stock).

### 3.9 Laporan
- Sebagai Admin, saya bisa melihat & export laporan penjualan (harian/bulanan/rentang tanggal).
- Sebagai Admin, saya bisa melihat laporan stok (stok saat ini, kartu stok per produk).
- Sebagai Super Admin, saya bisa melihat laporan laba-rugi (omzet, HPP, laba kotor).
- Sebagai Super Admin/Admin, saya bisa melihat laporan produk terlaris.

### 3.10 Manajemen User (Super Admin only)
- Sebagai Super Admin, saya bisa menambah/menonaktifkan/mengubah role akun admin.

### 3.11 Pengaturan
- Sebagai Super Admin, saya bisa mengatur profil toko (nama, alamat, logo) yang muncul di struk/laporan cetak (opsional PDF export).

---

## 4. Kebutuhan Non-Fungsional

- **Responsif**: mobile-first, optimal di layar HP (admin sering input transaksi dari HP di kasir) dan nyaman di desktop (untuk owner cek laporan).
- **Keamanan**: password di-hash (bcrypt/argon2), proteksi route berbasis role (middleware Next.js), validasi input di server (Zod) selain di client.
- **Performa**: dashboard & tabel memakai pagination/lazy load agar tetap cepat walau data besar.
- **Auditability**: log perubahan stok & transaksi tercatat dengan timestamp & user pelaku.
- **Ketersediaan**: target uptime wajar untuk skala toko tunggal (tidak perlu high-availability kompleks di MVP).

---

## 5. Asumsi & Batasan
Mengikuti BRD.md — 1 toko, tanpa pelanggan login, tanpa payment gateway,
tanpa multi-cabang di fase awal.
