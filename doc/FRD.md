# FRD.md — Functional Requirements Document
## Aplikasi Manajemen Toko Handphone (Admin Dashboard)

---

## 1. Modul & Entitas Data

### 1.1 Users (Admin & Super Admin)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID | PK |
| name | string | |
| email | string, unique | dipakai login |
| password_hash | string | bcrypt/argon2 |
| role | enum(`super_admin`,`admin`) | |
| is_active | boolean | untuk nonaktifkan tanpa hapus |
| created_at, updated_at | timestamp | |

### 1.2 Categories (Kategori)
id, name, description, created_at

### 1.3 Brands
id, name, logo_url (opsional), created_at

### 1.4 Products (Produk)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID | |
| name | string | |
| brand_id | FK → brands | |
| category_id | FK → categories | |
| sku | string, unique | |
| variant | string | mis. "8/256 Hitam" (opsional, atau tabel terpisah `product_variants` jika perlu granular) |
| purchase_price | decimal | harga modal — **sensitif, hanya super admin** |
| selling_price | decimal | harga jual |
| stock | integer | stok saat ini (denormalized, disinkron dari stock_movements) |
| min_stock | integer | ambang batas "low stock" |
| image_url | string | |
| description | text | |
| is_active | boolean | |
| created_at, updated_at | timestamp | |

### 1.5 Suppliers
id, name, phone, address, created_at

### 1.6 Customers (Pelanggan — data saja, tanpa login)
id, name, phone, address (opsional), created_at

### 1.7 Stock Movements (Riwayat Stok)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID | |
| product_id | FK | |
| type | enum(`in`,`out`,`adjustment`) | |
| quantity | integer | positif untuk in, negatif untuk out/adjustment turun |
| reference_type | enum(`purchase`,`sale`,`manual`) | |
| reference_id | UUID nullable | id transaksi/purchase terkait |
| note | text | alasan (khusus adjustment) |
| created_by | FK → users | |
| created_at | timestamp | |

### 1.8 Purchases (Stok Masuk dari Supplier) — opsional, bisa disederhanakan jadi stock_movement type=in
id, supplier_id, invoice_no, purchase_date, created_by, items[] (product_id, qty, unit_cost)

### 1.9 Sales / Transactions (Transaksi Penjualan)
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID | |
| invoice_no | string, unique | auto-generate |
| customer_id | FK nullable | null = pelanggan umum |
| subtotal | decimal | |
| discount | decimal | |
| total | decimal | |
| payment_method | enum(`cash`,`transfer`,`edc`,`qris`) | |
| status | enum(`completed`,`cancelled`) | |
| cashier_id | FK → users | admin yang input |
| created_at | timestamp | |

### 1.10 Sale Items (Detail Transaksi)
id, sale_id (FK), product_id (FK), qty, unit_price, unit_cost (snapshot untuk laba), subtotal

---

## 2. Matriks Hak Akses (Permission Matrix)

| Modul/Aksi | Admin | Super Admin |
|---|---|---|
| Login/Logout | ✔ | ✔ |
| Dashboard overview | ✔ (tanpa data laba) | ✔ (lengkap) |
| CRUD Produk/Kategori/Brand/Supplier/Pelanggan | ✔ | ✔ |
| Lihat harga modal produk | ✘ (disembunyikan/disamarkan) | ✔ |
| Input transaksi penjualan | ✔ | ✔ |
| Batalkan transaksi | ✔ (transaksi milik sendiri, hari yang sama) | ✔ (semua) |
| Stok masuk / adjustment | ✔ | ✔ |
| Laporan penjualan & stok | ✔ | ✔ |
| Laporan laba-rugi | ✘ | ✔ |
| Kelola akun admin (tambah/nonaktifkan/ubah role) | ✘ | ✔ |
| Pengaturan profil toko | ✘ | ✔ |

> Catatan: batasan "Admin tidak lihat harga modal/laba" bersifat konfigurasi
> bisnis — jika owner toko menginginkan admin melihat semua, tinggal ubah
> permission ini; default mengikuti prinsip *least privilege*.

---

## 3. Spesifikasi Fungsional per Modul

### 3.1 Autentikasi
- Login via email + password (NextAuth/Auth.js Credentials Provider, atau custom JWT + httpOnly cookie).
- Middleware Next.js memproteksi semua route `/dashboard/**` — redirect ke `/login` jika belum auth.
- Role-based guard: route/menu tertentu (mis. `/dashboard/users`, `/dashboard/reports/profit`) hanya render untuk `super_admin`.
- Session timeout wajar (mis. 8 jam) dengan refresh token/sliding session.

### 3.2 Dashboard
- Card: Omzet hari ini, Omzet bulan ini, Jumlah transaksi hari ini, Jumlah produk stok menipis.
- Chart: tren penjualan 7/30 hari (line/bar chart).
- Tabel: 5 transaksi terbaru, 5 produk terlaris bulan ini.
- Data laba/margin hanya tampil untuk `super_admin`.

### 3.3 Produk
- List dengan pencarian (nama/SKU), filter kategori & brand, pagination.
- Form tambah/edit dengan validasi: nama wajib, harga jual > 0, harga jual ≥ harga modal (warning jika tidak), upload 1 gambar utama.
- Nonaktifkan produk (`is_active=false`) alih-alih hapus permanen jika sudah pernah bertransaksi (jaga integritas histori transaksi).

### 3.4 Kategori, Brand, Supplier, Pelanggan
- CRUD standar (list, tambah, edit, hapus/nonaktifkan) dengan validasi nama unik per tabel.

### 3.5 Transaksi Penjualan
- Form transaksi: cari produk (autocomplete), tambah ke keranjang sementara (multi-item), tampilkan stok tersedia real-time, hitung subtotal/diskon/total otomatis.
- Validasi: qty tidak boleh melebihi stok tersedia.
- Setelah simpan: buat record `sales` + `sale_items`, dan buat `stock_movement` type `out` untuk tiap item, kurangi `products.stock`.
- Pembatalan transaksi: ubah status jadi `cancelled`, buat `stock_movement` type `in` (pengembalian) sebesar qty yang dibatalkan.
- Cetak/Export struk sederhana (PDF) — opsional fase lanjutan.

### 3.6 Stok
- Halaman "Stok Masuk": pilih supplier, tanggal, daftar produk + qty + harga beli → generate `stock_movement` type `in`.
- Halaman "Penyesuaian Stok": pilih produk, qty baru/selisih, alasan wajib diisi → `stock_movement` type `adjustment`.
- Halaman "Kartu Stok" per produk: riwayat semua pergerakan stok (in/out/adjustment) dengan saldo berjalan.
- Badge/alert "Low Stock" muncul di dashboard & halaman produk jika `stock <= min_stock`.

### 3.7 Laporan
- **Laporan Penjualan**: filter rentang tanggal, total omzet, jumlah transaksi, breakdown per produk/kategori, export ke Excel/PDF.
- **Laporan Stok**: stok saat ini semua produk, nilai stok (qty × harga modal — super admin only), produk low stock.
- **Laporan Laba-Rugi** (super admin only): omzet − HPP (harga modal × qty terjual) = laba kotor, per rentang tanggal.
- **Produk Terlaris**: ranking produk berdasarkan qty terjual/omzet dalam rentang waktu tertentu.

### 3.8 Manajemen User (Super Admin)
- List admin, tambah admin baru (nama, email, password sementara, role), nonaktifkan/aktifkan akun, ubah role.
- Super admin tidak bisa menghapus dirinya sendiri / menonaktifkan akun super admin terakhir (mencegah lockout).

### 3.9 Pengaturan
- Profil toko: nama, alamat, no telepon, logo — dipakai di header laporan/struk cetak.
- Pengaturan ambang batas default `min_stock` (opsional global setting).

---

## 4. Garis Besar API Endpoint (REST, contoh)

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/dashboard/summary

GET    /api/products            POST /api/products
GET    /api/products/:id        PATCH /api/products/:id     DELETE /api/products/:id

GET    /api/categories          POST /api/categories ...
GET    /api/brands              POST /api/brands ...
GET    /api/suppliers           POST /api/suppliers ...
GET    /api/customers           POST /api/customers ...

GET    /api/sales               POST /api/sales
GET    /api/sales/:id           PATCH /api/sales/:id/cancel

GET    /api/stock-movements
POST   /api/stock-movements/in
POST   /api/stock-movements/adjustment

GET    /api/reports/sales?from=&to=
GET    /api/reports/stock
GET    /api/reports/profit?from=&to=      (super_admin only)
GET    /api/reports/best-sellers?from=&to=

GET    /api/users               POST /api/users              (super_admin only)
PATCH  /api/users/:id           (super_admin only)

GET    /api/settings/store      PATCH /api/settings/store    (super_admin only)
```

Semua endpoint (kecuali `/api/auth/login`) wajib memvalidasi sesi & role via
middleware sebelum diproses.

---

## 5. Validasi & Aturan Data Penting

- Email user unik, format valid.
- SKU produk unik.
- `stock` tidak boleh negatif — cek di level aplikasi & idealnya constraint DB (`CHECK (stock >= 0)`).
- Transaksi harus memiliki minimal 1 item.
- `discount ≤ subtotal`.
- Semua angka uang disimpan sebagai `decimal`/`numeric` (bukan float) di PostgreSQL untuk presisi.
