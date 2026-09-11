# Phase.md — Roadmap Pengembangan
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

---

## Phase 0 — Setup & Fondasi
**Tujuan:** proyek siap jalan sebelum fitur bisnis dikerjakan.
- Inisialisasi Next.js + Tailwind + shadcn/ui.
- Setup PostgreSQL + ORM (Prisma/Drizzle) + koneksi `.env`.
- Setup struktur folder sesuai `memory.md`.
- Implementasi `globals.css` / design token dari `design.md`.
- Setup layout dasar: Sidebar (desktop) + Bottom Nav (mobile) + Topbar (shell kosong).

## Phase 1 — Autentikasi & Kerangka Dashboard
**Tujuan:** bisa login dan melihat shell dashboard sesuai role.
- Skema tabel `users`, seed 1 akun super_admin awal.
- Halaman Login.
- Middleware proteksi route + role guard.
- Halaman Dashboard (statis dulu / dummy data) — layout stat card, chart, tabel sesuai `design.md`.
- Logout.

## Phase 2 — Master Data (CRUD Dasar)
**Tujuan:** data pendukung transaksi tersedia.
- CRUD Kategori.
- CRUD Brand.
- CRUD Supplier.
- CRUD Pelanggan.
- CRUD Produk (termasuk upload gambar, harga modal & jual, stok awal, min_stock).
- Terapkan permission: harga modal disembunyikan dari role `admin`.

## Phase 3 — Stok & Transaksi Penjualan
**Tujuan:** inti operasional toko berjalan.
- Modul Stok Masuk (dari supplier) → generate `stock_movement`.
- Modul Penyesuaian Stok.
- Kartu Stok per produk (riwayat pergerakan).
- Form Transaksi Penjualan (multi-item, hitung otomatis, validasi stok).
- Pembatalan transaksi + pengembalian stok.
- Riwayat & detail transaksi.
- Update dashboard dengan data nyata (omzet, transaksi, low stock).

## Phase 4 — Laporan
**Tujuan:** owner bisa mengambil keputusan berbasis data.
- Laporan Penjualan (filter tanggal, export Excel/PDF).
- Laporan Stok (termasu nilai stok, low stock list).
- Laporan Laba-Rugi (super_admin only).
- Laporan Produk Terlaris.

## Phase 5 — Manajemen User & Pengaturan
**Tujuan:** kontrol administratif oleh super admin.
- CRUD akun admin (super_admin only): tambah, nonaktifkan, ubah role.
- Pengaturan profil toko (nama, alamat, logo).
- Pengaturan default `min_stock` global (opsional).

## Phase 6 — Polish, Responsif, & Testing
**Tujuan:** siap dipakai harian dengan pengalaman mulus di HP & desktop.
- Review penuh tampilan mobile (bottom nav, card list, drawer form) vs desktop.
- Perbaikan UX: loading state, empty state, error handling, toast notification konsisten.
- Testing manual alur penuh: tambah produk → stok masuk → transaksi → laporan.
- Optimasi query (index DB untuk kolom yang sering difilter: `product.sku`, `sales.created_at`, dll).
- Review keamanan (role guard di semua endpoint, validasi server-side).

## Phase 7 — Deployment
**Tujuan:** aplikasi live dan bisa dipakai toko.
- Setup environment production (hosting Next.js + PostgreSQL, mis. Vercel + Supabase/Railway/Neon).
- Migrasi database production + seed akun super_admin awal.
- Backup strategy sederhana (backup DB berkala).
- Dokumentasi singkat cara pakai untuk admin toko (opsional user manual).

---

## Catatan Prioritas
Urutan Phase 1 → 3 adalah **jalur kritis (MVP)**: tanpa ini, toko belum bisa
mencatat transaksi harian. Phase 4–7 penting tapi bisa menyusul setelah MVP
dipakai berjalan sebentar untuk validasi kebutuhan nyata di lapangan.
