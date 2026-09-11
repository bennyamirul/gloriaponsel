# BRD.md — Business Requirements Document
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

---

## 1. Latar Belakang

Toko handphone membutuhkan sistem internal untuk mencatat data produk, stok,
transaksi penjualan, dan menghasilkan laporan bisnis, menggantikan pencatatan
manual (buku/Excel) yang rawan salah hitung dan sulit dipantau owner.

Aplikasi ini **bukan** e-commerce/toko online untuk pelanggan umum. Aplikasi
ini adalah **sistem internal (back-office)** yang hanya diakses oleh admin dan
super admin toko.

---

## 2. Tujuan Bisnis

1. Mempercepat & merapikan pencatatan transaksi penjualan harian.
2. Memberikan visibilitas stok barang secara real-time (mencegah stok kosong/menumpuk).
3. Menyediakan laporan penjualan, laba-rugi, dan stok untuk pengambilan
   keputusan owner (super admin).
4. Mengurangi human error dalam perhitungan harga, diskon, dan stok.
5. Membatasi akses data sensitif (harga modal, laporan keuangan) hanya untuk
   pihak berwenang (super admin).

---

## 3. Pemangku Kepentingan (Stakeholders)

| Peran | Kepentingan |
|---|---|
| **Super Admin** (Owner/Pemilik toko) | Melihat seluruh laporan, mengatur akun admin, kontrol penuh sistem |
| **Admin** (Kasir/Staff toko) | Input transaksi harian, kelola stok & data produk, lihat laporan operasional |
| **Pelanggan** | Tidak memiliki akun; hanya menjadi *data* (nama, no. HP) yang dicatat admin saat transaksi |
| **Developer** | Membangun & memelihara sistem sesuai dokumen ini |

---

## 4. Ruang Lingkup (Scope)

### Termasuk (In-Scope)
- Dashboard admin (ringkasan bisnis)
- CRUD master data: Produk (HP & aksesoris), Kategori/Brand, Supplier, Pelanggan
- Input transaksi penjualan **oleh admin** (bukan customer self-service)
- Manajemen stok (stok masuk dari supplier, stok keluar dari penjualan, penyesuaian stok)
- Laporan: Penjualan, Stok, Laba-Rugi, Produk terlaris
- Manajemen user (khusus super admin): tambah/nonaktifkan akun admin
- Autentikasi & otorisasi berbasis role (Super Admin, Admin)
- Tampilan responsif (mobile & desktop)

### Tidak Termasuk (Out-of-Scope)
- Toko online / katalog publik untuk pelanggan
- Akun & login untuk pelanggan
- Pembayaran online (payment gateway) — pencatatan pembayaran cukup manual (tunai/transfer/EDC, dicatat sebagai metode saja)
- Multi-cabang/multi-gudang (dapat jadi pengembangan fase berikutnya)
- Aplikasi mobile native (cukup web responsif)
- Integrasi marketplace (Tokopedia/Shopee, dll.)

---

## 5. Aturan Bisnis Utama (Business Rules)

1. Hanya user dengan role **Admin** atau **Super Admin** yang bisa login; tidak ada registrasi mandiri (akun dibuat oleh Super Admin).
2. Setiap transaksi penjualan **wajib** mengurangi stok produk terkait secara otomatis.
3. Stok tidak boleh minus — sistem harus mencegah/mem-warning penjualan melebihi stok tersedia.
4. Harga jual & harga modal disimpan per produk untuk keperluan hitung laba per transaksi.
5. Data pelanggan bersifat opsional per transaksi (bisa "pelanggan umum" tanpa detail, atau dicatat nama/no HP untuk histori).
6. Hanya **Super Admin** yang dapat melihat laporan laba-rugi (data margin/modal) dan mengelola akun admin lain.
7. Setiap perubahan stok (masuk/keluar/adjustment) harus tercatat dalam log riwayat (audit trail sederhana).
8. Transaksi yang sudah disimpan idealnya tidak dihapus permanen — gunakan status "dibatalkan" agar histori & stok tetap konsisten (opsional, ditegaskan di FRD).

---

## 6. Indikator Keberhasilan (Success Metrics)

- Waktu input 1 transaksi < 1 menit oleh admin.
- Selisih stok fisik vs sistem mendekati 0% setelah 1 bulan pemakaian.
- Owner dapat melihat laporan omzet/laba bulanan tanpa bantuan developer/Excel manual.
- Tidak ada insiden akses data sensitif oleh role yang tidak berwenang.

---

## 7. Asumsi & Batasan

- Digunakan oleh 1 toko (1 lokasi), bukan multi-cabang di fase awal.
- Jumlah user admin diperkirakan kecil (1–10 akun).
- Koneksi internet tersedia stabil di lokasi toko (aplikasi web, bukan offline-first).
- Tidak ada kewajiban integrasi pajak/e-Faktur di fase awal.
