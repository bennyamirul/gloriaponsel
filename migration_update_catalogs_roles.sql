-- ==============================================================================
-- SKRIP UPDATE AMAN GLORIA PONSEL (RUMAHWEB / CPANEL PHPMYADMIN)
-- Skrip ini 100% AMAN:
-- 1. TIDAK menghapus tabel lama (tidak ada DROP TABLE)
-- 2. Data produk, penjualan, dan user yang sudah ada TIDAK AKAN HILANG
-- 3. Menambahkan tabel `roles` dan `catalogs`
-- 4. Menghubungkan produk ke `catalog_id` dan user ke `role_id`
-- ==============================================================================

-- 1. Buat Tabel roles jika belum ada
CREATE TABLE IF NOT EXISTS `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `permissions` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Isi data default roles jika belum ada
INSERT INTO `roles` (`id`, `name`, `code`, `description`, `created_at`, `updated_at`)
VALUES
('role-owner', 'Owner', 'owner', 'Pemilik toko dengan hak akses penuh ke seluruh modul, laporan keuangan, pengaturan, dan persetujuan barang.', NOW(3), NOW(3)),
('role-admin-kasir', 'Admin Kasir', 'admin_kasir', 'Staf kasir/marketing yang bertugas melayani transaksi penjualan POS, melihat produk ready & harga jual, serta bukti pembayaran.', NOW(3), NOW(3)),
('role-staff-gudang', 'Staff Admin', 'staff_gudang', 'Staf gudang/admin yang bertugas menginput stok barang masuk, menentukan grade produk, dan mencetak barcode SKU.', NOW(3), NOW(3)),
('role-staff-keuangan', 'Staff Keuangan', 'staff_keuangan', 'Staf keuangan yang bertugas mengelola pengeluaran harian, laporan penjualan, dan laporan keuangan toko.', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Buat Tabel catalogs jika belum ada
CREATE TABLE IF NOT EXISTS `catalogs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `has_imei` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `catalogs_code_key`(`code`),
    INDEX `catalogs_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Isi 4 Kategori Default Katalog (Handphone, Tablet, SmartWatch, Aksesoris)
INSERT INTO `catalogs` (`id`, `name`, `code`, `has_imei`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`)
VALUES
('cat-phone', 'Handphone', 'phone', 1, 'Perangkat smartphone dengan nomor IMEI 15 digit dan stok satuan per-unit.', 1, 1, NOW(3), NOW(3)),
('cat-tablet', 'Tablet', 'tablet', 1, 'Perangkat tablet (iPad, Galaxy Tab, dll.) dengan nomor IMEI/Serial number dan stok satuan per-unit.', 2, 1, NOW(3), NOW(3)),
('cat-smartwatch', 'SmartWatch', 'smartwatch', 1, 'Perangkat jam tangan pintar (Apple Watch, Galaxy Watch, dll.) dengan serial/IMEI dan stok satuan.', 3, 1, NOW(3), NOW(3)),
('cat-accessory', 'Aksesoris', 'accessory', 0, 'Aksesoris pelengkap HP/gadget (charger, case, tempered glass, dll.) tanpa IMEI dengan kuantitas stok.', 4, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `has_imei` = VALUES(`has_imei`),
    `display_order` = VALUES(`display_order`);

-- 5. Tambah kolom catalog_id pada tabel products (Aman)
SET @exist_catalog_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'catalog_id'
);
SET @sql_products := IF(@exist_catalog_id = 0, 'ALTER TABLE `products` ADD COLUMN `catalog_id` VARCHAR(191) NULL, ADD INDEX `products_catalog_id_idx` (`catalog_id`);', 'SELECT "Column catalog_id already exists";');
PREPARE stmt_products FROM @sql_products;
EXECUTE stmt_products;
DEALLOCATE PREPARE stmt_products;

-- Update produk lama agar terhubung ke ID katalog
UPDATE `products`
SET `catalog_id` = CASE
    WHEN `product_type` IN ('phone', 'handphone') THEN 'cat-phone'
    WHEN `product_type` = 'tablet' THEN 'cat-tablet'
    WHEN `product_type` = 'smartwatch' THEN 'cat-smartwatch'
    WHEN `product_type` IN ('accessory', 'aksesoris') THEN 'cat-accessory'
    ELSE 'cat-phone'
END
WHERE `catalog_id` IS NULL OR `catalog_id` = '';

-- 6. Tambah kolom role_id pada tabel users (Aman)
SET @exist_role_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'
);
SET @sql_users := IF(@exist_role_id = 0, 'ALTER TABLE `users` ADD COLUMN `role_id` VARCHAR(191) NULL, ADD INDEX `users_role_id_idx` (`role_id`);', 'SELECT "Column role_id already exists";');
PREPARE stmt_users FROM @sql_users;
EXECUTE stmt_users;
DEALLOCATE PREPARE stmt_users;

-- Update akun user agar terhubung ke ID role masing-masing
UPDATE `users`
SET `role_id` = CASE
    WHEN `role` = 'owner' OR `username` = 'owner' THEN 'role-owner'
    WHEN `role` = 'admin_kasir' OR `username` = 'kasir' THEN 'role-admin-kasir'
    WHEN `role` = 'staff_gudang' OR `username` = 'gudang' THEN 'role-staff-gudang'
    WHEN `role` = 'staff_keuangan' OR `username` = 'keuangan' THEN 'role-staff-keuangan'
    WHEN `role` = 'super_admin' THEN 'role-owner'
    ELSE 'role-admin-kasir'
END
WHERE `role_id` IS NULL OR `role_id` = '';

-- 7. Tambah kolom created_by pada tabel products secara aman
SET @exist_created_by := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'created_by'
);
SET @sql_created_by := IF(@exist_created_by = 0, 'ALTER TABLE `products` ADD COLUMN `created_by` VARCHAR(191) NULL, ADD INDEX `products_created_by_idx` (`created_by`);', 'SELECT "Column created_by already exists";');
PREPARE stmt_created_by FROM @sql_created_by;
EXECUTE stmt_created_by;
DEALLOCATE PREPARE stmt_created_by;

-- Update produk lama agar terhubung ke ID user pembuatnya dari stock movement
UPDATE `products` p
SET `created_by` = COALESCE(
    (SELECT sm.created_by FROM `stock_movements` sm WHERE sm.product_id = p.id AND sm.type = 'in' ORDER BY sm.created_at ASC LIMIT 1),
    (SELECT u.id FROM `users` u WHERE u.username = 'gudang' OR u.role = 'staff_gudang' LIMIT 1),
    (SELECT u.id FROM `users` u WHERE u.username = 'owner' OR u.role = 'owner' LIMIT 1)
)
WHERE `created_by` IS NULL OR `created_by` = '';

-- 8. Tambah kolom is_barcode_printed dan barcode_printed_at pada tabel products secara aman
SET @exist_barcode_printed := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_barcode_printed'
);
SET @sql_barcode_printed := IF(@exist_barcode_printed = 0, 'ALTER TABLE `products` ADD COLUMN `is_barcode_printed` BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN `barcode_printed_at` DATETIME(3) NULL, ADD INDEX `products_is_barcode_printed_idx` (`is_barcode_printed`);', 'SELECT "Column is_barcode_printed already exists";');
PREPARE stmt_barcode_printed FROM @sql_barcode_printed;
EXECUTE stmt_barcode_printed;
DEALLOCATE PREPARE stmt_barcode_printed;

-- Selesai! Seluruh data lama produk, user, relasi katalog/role/pembuat, dan riwayat cetak barcode tetap 100% aman dan terhubung.
