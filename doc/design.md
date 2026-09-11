# design.md — UI Kit & Design System
## Toko Handphone — Admin Dashboard

---

## 1. Referensi Desain

Gambar referensi yang diberikan menunjukkan dashboard bergaya *fintech/crypto*
dengan ciri khas:

- Sidebar gelap (navy/hitam) berisi ikon-ikon navigasi saja (tanpa label),
  dengan logo di atas dan tombol logout di bawah.
- Topbar berisi search bar, ikon notifikasi, dan profile dropdown (avatar + nama).
- Stat card / summary card berbentuk rounded-2xl dengan latar pastel
  berbeda-beda (biru muda, hijau muda, kuning muda) untuk membedakan tiap metrik.
- Card "Portfolio" berisi grafik area/line chart dengan tooltip nilai.
- Tabel data dengan avatar/icon bulat di setiap baris, kolom "Change" berwarna
  hijau (naik) — pola ini akan diadaptasi menjadi hijau (untung/stok aman) dan
  merah (rugi/stok menipis).
- Banner promosi di pojok kanan bawah dengan background gelap dan CTA button.
- Container dashboard dibungkus dalam "frame" rounded besar (efek tablet/mockup)
  — ini murni gaya presentasi, **tidak** perlu ditiru di produk asli.

Elemen-elemen ini akan diadaptasi (bukan dijiplak) untuk konteks **toko
handphone**: warna disesuaikan brand, konten card diganti sesuai data
penjualan/stok/laporan.

---

## 2. Prinsip Desain

1. **Clean & data-focused** — dashboard admin, prioritas keterbacaan data.
2. **Mobile-first** — semua layout dirancang dari mobile dulu, baru di-scale ke desktop.
3. **Konsisten** — spacing grid 4px/8px, radius konsisten (lg = 12px, xl = 16px).
4. **Aksesibel** — kontras warna minimum WCAG AA, ukuran tap target ≥ 40px di mobile.
5. **Cepat dipahami** — status pakai warna + ikon, bukan warna saja (colorblind-friendly).

---

## 3. Palet Warna

| Token | Hex (contoh) | Penggunaan |
|---|---|---|
| `--primary` | `#4F46E5` (indigo) | Tombol utama, link aktif, ikon sidebar aktif |
| `--primary-foreground` | `#FFFFFF` | Teks di atas primary |
| `--sidebar-bg` | `#111827` | Background sidebar (dark navy) |
| `--background` | `#F8FAFC` | Background halaman |
| `--card` | `#FFFFFF` | Background card |
| `--muted` | `#F1F5F9` | Background input, hover row |
| `--border` | `#E2E8F0` | Border card/table |
| `--success` | `#16A34A` | Stok aman, profit naik, badge sukses |
| `--success-bg` | `#DCFCE7` | Background pastel stat card "profit" |
| `--danger` | `#DC2626` | Stok habis, transaksi gagal |
| `--danger-bg` | `#FEE2E2` | Background pastel stat card "peringatan" |
| `--warning` | `#D97706` | Stok menipis (low stock) |
| `--warning-bg` | `#FEF3C7` | Background pastel stat card "low stock" |
| `--info-bg` | `#DBEAFE` | Background pastel stat card "revenue/omzet" |
| `--purple-bg` | `#F3E8FF` | Background pastel stat card "transaksi" |

> Warna pastel dipakai bergantian di 3–4 stat card teratas dashboard, mengikuti
> pola pada gambar referensi (tiap card punya warna latar berbeda agar mudah
> dibedakan sekilas).

---

## 4. Tipografi

- Font: **Inter** atau **Geist Sans** (via `next/font`)
- H1: 24–28px / bold — judul halaman
- H2: 18–20px / semibold — judul card/section
- Body: 14px / regular — teks umum, isi tabel
- Caption/label: 12px / medium, warna `text-muted-foreground` — label kecil, timestamp

---

## 5. Layout

### Desktop (≥1024px)
- Sidebar ikon tetap (fixed, lebar ±80px), warna gelap, ikon aktif diberi
  highlight rounded background `--primary` transparan.
- Topbar sticky di atas konten: search, notifikasi, profile.
- Konten utama: grid card (1 baris = 3–4 stat card), lalu chart + tabel
  berdampingan atau bertumpuk, padding 24px.

### Tablet (768–1023px)
- Sidebar bisa collapse jadi ikon saja (tanpa label) tetap terlihat.
- Grid stat card menjadi 2 kolom.

### Mobile (<768px)
- Sidebar berubah jadi **bottom navigation bar** (4–5 ikon utama: Dashboard,
  Produk, Transaksi, Laporan, Lainnya) — pola umum aplikasi admin di HP.
  Menu tambahan (Master data lain, Pengaturan, Logout) masuk ke drawer "Lainnya".
- Topbar disederhanakan: judul halaman + ikon notifikasi + avatar kecil.
  Search dipindah jadi tombol ikon yang expand jadi input saat ditekan.
- Stat card ditumpuk 1 kolom penuh, bisa di-scroll horizontal untuk hemat tempat
  (carousel snap) jika card > 2.
- Tabel data **tidak** memakai scroll horizontal sebagai solusi utama — diubah
  jadi **list of card** per baris (nama produk + thumbnail + harga + stok di
  satu card ringkas), dengan tap untuk detail.
- Form tambah/edit data dibuka full-screen (bukan modal kecil) menggunakan
  shadcn `Sheet` / `Drawer` dari bawah.

---

## 6. Komponen (mapping ke shadcn/ui)

| Elemen UI | Komponen shadcn/ui | Catatan |
|---|---|---|
| Sidebar navigasi | Custom component + `NavigationMenu` | Ikon dari `lucide-react` |
| Bottom nav (mobile) | Custom fixed bar | Hanya render di breakpoint mobile |
| Stat card | `Card` + `Badge` | Badge untuk trend naik/turun (%) |
| Grafik penjualan | `recharts` (Line/Area/Bar) dibungkus `Card` | |
| Tabel data (desktop) | `Table` (tanstack-table) + `Badge` status | Sorting, pagination |
| List card (mobile) | Custom card list | Alternatif tabel di layar sempit |
| Form input | `Form` + `Input` + `Select` + `Textarea` + `Calendar` (date) | React Hook Form + Zod |
| Modal (desktop) | `Dialog` | Konfirmasi hapus, form singkat |
| Drawer (mobile) | `Sheet` | Form panjang, filter |
| Notifikasi toast | `Sonner` | Sukses/gagal aksi |
| Dropdown profil | `DropdownMenu` + `Avatar` | |
| Search | `Input` dengan ikon | Debounced |
| Upload gambar produk | Custom + `Input type=file` + preview | Drag & drop di desktop |
| Filter tanggal laporan | `Popover` + `Calendar` (range) | |
| Badge status stok | `Badge` variant success/warning/danger | |
| Pagination | Custom / shadcn pattern | |

---

## 7. Breakpoints (Tailwind default)

`sm: 640px` · `md: 768px` · `lg: 1024px` · `xl: 1280px`

Aturan: sidebar → bottom nav terjadi di breakpoint `< md`. Tabel → card list
terjadi di `< md`. Grid stat card 4→2→1 kolom mengikuti `xl / md / base`.

---

## 8. Tema

Default: **light theme**. Struktur warna disiapkan sebagai CSS variable
(`globals.css`) agar dark mode bisa ditambahkan belakangan tanpa refactor besar
(gunakan strategi `class` Tailwind, opsional untuk fase selanjutnya, bukan MVP).
