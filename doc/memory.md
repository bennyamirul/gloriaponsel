# memory.md — Project Memory / Context Log
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

> File ini adalah "ingatan" proyek — ringkasan keputusan, konvensi, dan
> asumsi penting, agar siapa pun (termasuk AI assistant seperti Claude Code)
> yang melanjutkan pekerjaan di sesi berbeda tidak kehilangan konteks.

---

## 1. Ringkasan Proyek

Aplikasi **internal admin dashboard** untuk toko handphone. Bukan e-commerce.
Tidak ada akun/transaksi customer — semua transaksi diinput manual oleh admin.
Login hanya untuk 2 role: `admin` dan `super_admin`.

## 2. Tech Stack (Keputusan Final)

- Framework: **Next.js** (App Router)
- Styling: **Tailwind CSS**
- UI Components: **shadcn/ui**
- Database: **PostgreSQL**
- ORM (rekomendasi, konfirmasi ke user): **Prisma** atau **Drizzle ORM**
- Auth (rekomendasi): **Auth.js (NextAuth) Credentials Provider** atau custom JWT + httpOnly cookie
- Form & validasi: **React Hook Form + Zod**
- Chart: **Recharts**
- Tabel data: **TanStack Table**

## 3. Keputusan Bisnis Kunci

- Tidak ada storefront publik / katalog untuk pelanggan.
- Pelanggan hanya data pasif (nama, no HP) dicatat saat transaksi oleh admin.
- Harga modal & laporan laba-rugi **hanya** boleh dilihat `super_admin`.
- Stok otomatis berkurang saat transaksi disimpan, otomatis kembali saat transaksi dibatalkan.
- Produk yang sudah pernah bertransaksi tidak dihapus permanen — dinonaktifkan (`is_active=false`) demi integritas histori.
- Ambang batas "low stock" per produk (`min_stock`), default bisa diatur di Settings.

## 4. Konvensi Proyek (untuk dijaga konsisten selama development)

- Struktur folder disarankan:
  ```
  /app
    /(auth)/login
    /(dashboard)/dashboard
    /(dashboard)/products
    /(dashboard)/categories
    /(dashboard)/brands
    /(dashboard)/suppliers
    /(dashboard)/customers
    /(dashboard)/sales
    /(dashboard)/stock
    /(dashboard)/reports
    /(dashboard)/users        <- super_admin only
    /(dashboard)/settings     <- super_admin only
  /components/ui              <- shadcn generated
  /components/...              <- komponen custom (StatCard, DataTable, dll)
  /lib                         <- helper (auth, db, validators)
  /prisma (atau /drizzle)      <- schema DB
  ```
- Semua angka uang: tipe `decimal`/`numeric` di DB, jangan `float`.
- Semua ID pakai UUID.
- Proteksi role dilakukan di 2 lapis: middleware (route) **dan** query-level
  (jangan andalkan hanya sembunyikan UI — API juga wajib cek role).
- Penamaan file/komponen: PascalCase untuk komponen React, kebab-case untuk route folder.
- Warna & style ikuti `design.md` — jangan menambah warna baru tanpa update dokumen tsb.

## 5. Asumsi yang Masih Perlu Dikonfirmasi ke User

- [ ] Apakah 1 produk perlu tabel varian terpisah (`product_variants`) untuk
      kombinasi warna/storage, atau cukup 1 baris produk = 1 varian (lebih simpel)?
- [ ] Apakah butuh cetak struk (PDF/print) di MVP atau bisa menyusul?
- [ ] Apakah admin boleh menghapus transaksi (bukan hanya cancel) — default: TIDAK, hanya cancel.
- [ ] Berapa banyak akun admin diperkirakan (untuk pertimbangan UI manajemen user)?
- [ ] Apakah perlu multi-cabang di masa depan (mempengaruhi desain skema DB sejak awal, mis. tambah `store_id`)?

## 6. Log Keputusan (Decision Log)

| Tanggal | Keputusan | Alasan |
|---|---|---|
| Fase awal | Tidak ada login customer | Sesuai arahan user — transaksi 100% diinput admin |
| Fase awal | Admin dibatasi tidak lihat laba-rugi | Prinsip least privilege, data sensitif untuk owner saja |
| Fase awal | Desain diadaptasi dari referensi dashboard fintech/crypto | User upload gambar sebagai acuan UI kit |
| Phase 0 | Next.js 15 App Router + React 19 + Tailwind v3 + Radix UI + Lucide React | Stack modern dengan performa tinggi & integrasi shadcn/ui stabil |
| Phase 0 | Root folder tanpa `src/` (`app/`, `components/`, `lib/`, `prisma/`) | Menjaga konsistensi struktur folder yang ditentukan di `memory.md` |
| Phase 0 | Responsive Layout: Desktop Sidebar (fixed 80px) + Mobile BottomNav + Sheet Drawer | Menjamin mobile-first UX untuk kasir di HP & owner di desktop |
| Phase 0 | Prisma Client singleton di `lib/db.ts` | Mencegah exhaust connection pool saat Next.js hot-reload di dev mode |
| Phase 1 | JWT via `jose` + `bcryptjs` dengan httpOnly Cookie (8 jam) | Sesuai FRD 3.1, kompatibel Edge runtime Next.js 15 tanpa masalah peer dependency |
| Phase 1 | Proteksi 2 lapis: Edge `middleware.ts` & Server Action `requireRole()` | Menjamin keamanan tidak hanya di level UI, rute `/users` & `/settings` terkunci untuk admin |
| Phase 1 | Default seed: `owner@tokohp.com` & `kasir@tokohp.com` (`Password123!`) | Akun siap pakai untuk memvalidasi permission matrix operasional kasir vs owner |
| Phase 1 | Dynamic Stat Card Laba Kotor vs Produk Aktif di Dashboard | Memenuhi aturan bisnis: harga modal & laba HANYA untuk role super_admin |
| Phase 2 | 1 Baris Produk = 1 SKU unit dengan field `variant` opsional | Lebih simpel, cepat untuk scanning kasir dan kartu stok MVP |
| Phase 2 | Sanitasi `purchasePrice` di Server Action untuk non-super_admin | Mencegah staf kasir mengintip harga modal lewat Network tab browser |
| Phase 2 | Desktop Table ↔ Mobile Card List per item | Kepatuhan mutlak design.md: tidak menggunakan tabel scroll horizontal |
| Phase 2 | Form Produk panjang menggunakan shadcn `Sheet` Drawer | UX nyaman di mobile (slide-up full) dan desktop (slide-over panel) |
| Phase 3 | ACID `db.$transaction` untuk Penjualan & Pergerakan Stok | Mencegah race condition stok dan desinkronisasi antara sale & inventory |
| Phase 3 | Generator Invoice Otomatis `INV-YYYYMMDD-XXXX` | Standar penomoran faktur unik per hari yang rapi dan mudah dicari |
| Phase 3 | Aturan Batalkan Transaksi: Kasir hanya transaksi hari ini, Owner kapan saja | Melindungi integritas audit histori penjualan toko |
| Phase 3 | Kartu Stok dengan Saldo Berjalan (Running Balance) | Menampilkan debit (masuk), kredit (keluar), dan saldo sisa secara kronologis |
| Phase 3 | Dashboard Terintegrasi Data Riil + Recharts AreaChart | Menampilkan omzet, transaksi, low stock alert, laba kotor role-restricted, dan tren 7 hari |
| Phase 4 | Laporan Laba-Rugi (P&L) Super Admin Only 2-Layer Guard | Menjamin kerahasiaan margin keuntungan toko dari staf kasir |
| Phase 4 | Valuasi Stok: Masking Nilai Modal untuk Non-Super Admin | Staf kasir hanya melihat jumlah fisik & nilai jual, bukan modal HPP inventaris |
| Phase 4 | Ekspor CSV dengan UTF-8 BOM (`\uFEFF`) & Print Preview | Kompatibilitas instan dengan Microsoft Excel Indonesia tanpa dependensi berat |
| Phase 4 | Agregasi Produk Terlaris berdasarkan Unit & Omzet | Fleksibilitas analisis performa barang cepat laku (fast-moving) vs penghasil omzet |

## 7. Status Dokumen Lain

- `BRD.md` — selesai draft awal
- `PRD.md` — selesai draft awal
- `FRD.md` — selesai draft awal (skema data & API perlu direview saat mulai coding)
- `design.md` — selesai draft awal (adaptasi dari gambar referensi)
- `Phase.md` / `Task.md` — selesai draft awal, breakdown detail per task menyusul saat mulai sprint

> Update bagian ini setiap kali ada perubahan scope/keputusan penting supaya
> dokumen lain (PRD/FRD/Phase/Task) bisa disesuaikan mengikuti.
