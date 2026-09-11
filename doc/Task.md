# Task.md — Breakdown Task per Phase
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

> Checklist ini turunan langsung dari `Phase.md`. Centang saat selesai.
> Tambahkan sub-task baru di bawah task terkait jika ditemukan saat development.

---

## Phase 0 — Setup & Fondasi
- [x] Init project Next.js (App Router, TypeScript)
- [x] Install & konfigurasi Tailwind CSS
- [x] Install & init shadcn/ui + komponen dasar (Button, Card, Input, Table, Dialog, Sheet, Badge, Avatar, DropdownMenu, Form, Sonner)
- [x] Setup PostgreSQL lokal + ORM (Prisma/Drizzle) + `.env` (`DATABASE_URL`)
- [x] Buat schema awal & migrasi kosong (tabel akan diisi bertahap tiap phase)
- [x] Definisikan CSS variable warna/tipografi sesuai `design.md`
- [x] Buat komponen layout: `<Sidebar />`, `<BottomNav />`, `<Topbar />`, `<DashboardShell />`
- [x] Setup ikon (`lucide-react`)

## Phase 1 — Autentikasi & Kerangka Dashboard
- [x] Buat tabel `users` (migrasi) + enum role
- [x] Seed 1 akun `super_admin` default
- [x] Setup Auth.js/JWT: login credentials, hash password (bcrypt/argon2)
- [x] Halaman `/login` (form email+password, error handling)
- [x] Middleware proteksi `(dashboard)/**` — redirect ke login jika belum auth
- [x] Role guard helper (`requireRole(["super_admin"])`) untuk dipakai di halaman/API tertentu
- [x] Halaman `/dashboard` shell: stat card placeholder, chart placeholder, tabel placeholder
- [x] Tombol logout (clear session)
- [x] Layout responsif: sidebar (desktop) ↔ bottom nav (mobile) sudah berfungsi switch

## Phase 2 — Master Data
- [x] Tabel & CRUD `categories` (list, tambah, edit, hapus/nonaktifkan)
- [x] Tabel & CRUD `brands`
- [x] Tabel & CRUD `suppliers`
- [x] Tabel & CRUD `customers`
- [x] Tabel `products` lengkap (relasi brand & category, upload gambar, harga modal/jual, stok awal, min_stock)
- [x] Form tambah/edit produk (validasi Zod: harga > 0, nama wajib, dll)
- [x] List produk: search, filter kategori/brand, pagination
- [x] Sembunyikan kolom harga modal untuk role `admin` (UI + API)
- [x] Versi mobile: form produk pakai `Sheet` full-screen, list produk pakai card list

## Phase 3 — Stok & Transaksi Penjualan
- [x] Tabel `stock_movements`
- [x] Halaman "Stok Masuk": pilih supplier, input item + qty + harga beli → insert movement `in` + update `products.stock`
- [x] Halaman "Penyesuaian Stok": pilih produk, qty/selisih, alasan wajib → movement `adjustment`
- [x] Halaman "Kartu Stok" per produk (riwayat + saldo berjalan)
- [x] Badge/alert low stock di list produk & dashboard
- [x] Tabel `sales` & `sale_items`
- [x] Form transaksi: cari produk (autocomplete), keranjang sementara, hitung subtotal/diskon/total
- [x] Validasi qty ≤ stok tersedia (real-time saat input)
- [x] Simpan transaksi → generate invoice_no, kurangi stok, insert movement `out`
- [x] Halaman riwayat transaksi + detail transaksi
- [x] Fitur batalkan transaksi → status `cancelled` + movement pengembalian stok
- [x] Dashboard: hubungkan stat card & chart ke data nyata (omzet, jumlah transaksi, low stock)

## Phase 4 — Laporan
- [x] Laporan Penjualan (filter rentang tanggal, breakdown per produk/kategori)
- [x] Export laporan penjualan ke Excel/PDF
- [x] Laporan Stok (stok saat ini + nilai stok, khusus nilai untuk super_admin)
- [x] Laporan Laba-Rugi (super_admin only): omzet − HPP
- [x] Laporan Produk Terlaris (ranking qty/omzet per rentang waktu)
- [x] Guard akses: sembunyikan menu/laporan laba-rugi dari role `admin`

## Phase 5 — Manajemen User & Pengaturan
- [ ] Halaman list akun admin (super_admin only)
- [ ] Form tambah admin baru (generate password sementara / kirim manual)
- [ ] Nonaktifkan/aktifkan akun admin
- [ ] Ubah role user (dengan proteksi: tidak bisa nonaktifkan super_admin terakhir)
- [ ] Halaman Pengaturan Profil Toko (nama, alamat, logo)
- [ ] Pengaturan default `min_stock` global (opsional)

## Phase 6 — Polish, Responsif, & Testing
- [ ] Review semua halaman di breakpoint mobile (bottom nav, drawer form, card list) — bandingkan dengan `design.md`
- [ ] Loading state & skeleton di semua tabel/list
- [ ] Empty state (mis. "Belum ada produk") di semua list
- [ ] Toast konsisten untuk semua aksi sukses/gagal
- [ ] Uji alur end-to-end: tambah produk → stok masuk → transaksi → cek laporan
- [ ] Tambah index DB pada kolom yang sering difilter (`sku`, `sales.created_at`, `stock_movements.product_id`)
- [ ] Audit ulang semua endpoint API — pastikan role guard konsisten (tidak hanya di UI)

## Phase 7 — Deployment
- [ ] Setup hosting (mis. Vercel untuk Next.js)
- [ ] Setup PostgreSQL production (mis. Supabase/Neon/Railway)
- [ ] Jalankan migrasi + seed akun super_admin production
- [ ] Konfigurasi environment variables production
- [ ] Setup backup database berkala
- [ ] (Opsional) Tulis panduan singkat pemakaian untuk staff toko
