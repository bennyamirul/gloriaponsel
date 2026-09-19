-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'admin_kasir', 'staff_gudang', 'super_admin', 'admin', 'staff_keuangan') NOT NULL DEFAULT 'admin_kasir',
    `role_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_id_idx`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `brand_name` VARCHAR(191) NULL,
    `category_name` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NOT NULL,
    `imei` VARCHAR(191) NULL,
    `product_type` VARCHAR(191) NOT NULL DEFAULT 'phone',
    `catalog_id` VARCHAR(191) NULL,
    `capacity` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `completeness` VARCHAR(191) NULL,
    `retail_supplier` VARCHAR(191) NULL,
    `grade` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `entry_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `variant` VARCHAR(191) NULL,
    `purchase_price` DECIMAL(15, 2) NOT NULL,
    `selling_price` DECIMAL(15, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `min_stock` INTEGER NOT NULL DEFAULT 5,
    `image_url` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `rejection_reason` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    UNIQUE INDEX `products_imei_key`(`imei`),
    INDEX `products_is_active_idx`(`is_active`),
    INDEX `products_stock_idx`(`stock`),
    INDEX `products_imei_idx`(`imei`),
    INDEX `products_product_type_idx`(`product_type`),
    INDEX `products_catalog_id_idx`(`catalog_id`),
    INDEX `products_status_idx`(`status`),
    INDEX `products_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `type` ENUM('in', 'out', 'adjustment') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reference_type` ENUM('purchase', 'sale', 'manual') NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_product_id_idx`(`product_id`),
    INDEX `stock_movements_created_at_idx`(`created_at`),
    INDEX `stock_movements_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_no` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `additional_fee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `additional_fee_note` TEXT NULL,
    `warranty_days` INTEGER NOT NULL DEFAULT 0,
    `warranty_expiry` DATETIME(3) NULL,
    `commission` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `commission_proof_url` VARCHAR(191) NULL,
    `payment_proof_url` VARCHAR(191) NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `payment_method` ENUM('cash', 'transfer', 'edc', 'qris') NOT NULL,
    `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
    `cashier_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_invoice_no_key`(`invoice_no`),
    INDEX `sales_created_at_idx`(`created_at`),
    INDEX `sales_invoice_no_idx`(`invoice_no`),
    INDEX `sales_status_idx`(`status`),
    INDEX `sales_cashier_id_idx`(`cashier_id`),
    INDEX `sales_customer_name_idx`(`customer_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `id` VARCHAR(191) NOT NULL,
    `sale_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `unit_cost` DECIMAL(15, 2) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `warranty_days` INTEGER NOT NULL DEFAULT 0,
    `warranty_expiry` DATETIME(3) NULL,
    `is_returned` BOOLEAN NOT NULL DEFAULT false,
    `return_reason` VARCHAR(191) NULL,
    `returned_at` DATETIME(3) NULL,

    INDEX `sale_items_sale_id_idx`(`sale_id`),
    INDEX `sale_items_product_id_idx`(`product_id`),
    INDEX `sale_items_is_returned_idx`(`is_returned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_settings` (
    `id` VARCHAR(191) NOT NULL,
    `store_name` VARCHAR(191) NOT NULL DEFAULT 'Gloria Ponsel',
    `phone` VARCHAR(191) NULL DEFAULT '081234567890',
    `address` VARCHAR(191) NULL DEFAULT 'Jl. Telekomunikasi No. 1, Jakarta',
    `logo_url` VARCHAR(191) NULL,
    `receipt_footer` VARCHAR(191) NULL DEFAULT 'Terima kasih atas kunjungan Anda!
Barang yang sudah dibeli tidak dapat ditukar.',
    `default_min_stock` INTEGER NOT NULL DEFAULT 5,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `daily_expenses_date_idx`(`date`),
    INDEX `daily_expenses_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `monthly_expenses_month_year_idx`(`month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `target_role` ENUM('owner', 'admin_kasir', 'staff_gudang', 'super_admin', 'admin', 'staff_keuangan') NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_target_role_idx`(`target_role`),
    INDEX `notifications_is_read_idx`(`is_read`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_cashier_id_fkey` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_expenses` ADD CONSTRAINT `daily_expenses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_expenses` ADD CONSTRAINT `monthly_expenses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert Seed Accounts (Password: Password123!)
INSERT INTO `users` (`id`, `username`, `name`, `email`, `password_hash`, `role`, `role_id`, `is_active`, `created_at`, `updated_at`)
VALUES
('b3b919c2-6085-4af9-8d5c-031cf2a6ac53', 'owner', 'Owner Gloria Ponsel', 'owner@gloriaponsel.com', '$2b$10$KTywIrqrlY97QSB.Jo3rleLW8qf/sGA.WzIJzeQZ/5Qa0AzyF3BOC', 'owner', 'role-owner', 1, NOW(3), NOW(3)),
('3178a9a3-5cbb-40e1-80ce-e9e9efbb194f', 'kasir', 'Staff Marketing (Kasir)', 'kasir@gloriaponsel.com', '$2b$10$KTywIrqrlY97QSB.Jo3rleLW8qf/sGA.WzIJzeQZ/5Qa0AzyF3BOC', 'admin_kasir', 'role-admin-kasir', 1, NOW(3), NOW(3)),
('7cb5794f-8590-47d4-9bcc-b56224fe940f', 'gudang', 'Staff Admin (Gudang)', 'gudang@gloriaponsel.com', '$2b$10$KTywIrqrlY97QSB.Jo3rleLW8qf/sGA.WzIJzeQZ/5Qa0AzyF3BOC', 'staff_gudang', 'role-staff-gudang', 1, NOW(3), NOW(3)),
('546054f2-e7fe-4808-ae3d-17dd33edd83a', 'keuangan', 'Staff Keuangan', 'keuangan@gloriaponsel.com', '$2b$10$KTywIrqrlY97QSB.Jo3rleLW8qf/sGA.WzIJzeQZ/5Qa0AzyF3BOC', 'staff_keuangan', 'role-staff-keuangan', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`), `role_id` = VALUES(`role_id`);

-- Insert Default Store Setting
INSERT INTO `store_settings` (`id`, `store_name`, `phone`, `address`, `logo_url`, `receipt_footer`, `default_min_stock`, `updated_at`)
VALUES
('default-setting', 'Gloria Ponsel', '081234567890', 'Jl. Telekomunikasi No. 1, Jakarta', '/logoGP.png', 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.', 5, NOW(3))
ON DUPLICATE KEY UPDATE `store_name` = VALUES(`store_name`);

-- CreateTable roles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `permissions` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert Default Roles
INSERT INTO `roles` (`id`, `name`, `code`, `description`, `created_at`, `updated_at`)
VALUES
('role-owner', 'Owner', 'owner', 'Pemilik toko dengan hak akses penuh ke seluruh modul, laporan keuangan, pengaturan, dan persetujuan barang.', NOW(3), NOW(3)),
('role-admin-kasir', 'Admin Kasir', 'admin_kasir', 'Staf kasir/marketing yang bertugas melayani transaksi penjualan POS, melihat produk ready & harga jual, serta bukti pembayaran.', NOW(3), NOW(3)),
('role-staff-gudang', 'Staff Admin', 'staff_gudang', 'Staf gudang/admin yang bertugas menginput stok barang masuk, menentukan grade produk, dan mencetak barcode SKU.', NOW(3), NOW(3)),
('role-staff-keuangan', 'Staff Keuangan', 'staff_keuangan', 'Staf keuangan yang bertugas mengelola pengeluaran harian, laporan penjualan, dan laporan keuangan toko.', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- CreateTable catalogs (Master Kategori / Jenis Produk)
CREATE TABLE IF NOT EXISTS `catalogs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `has_imei` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalogs_code_key`(`code`),
    INDEX `catalogs_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert Default Catalogs (Handphone, Tablet, SmartWatch, Aksesoris)
INSERT INTO `catalogs` (`id`, `name`, `code`, `has_imei`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`)
VALUES
('cat-phone', 'Handphone', 'phone', true, 'Perangkat smartphone dengan nomor IMEI 15 digit dan stok satuan per-unit.', 1, true, NOW(3), NOW(3)),
('cat-tablet', 'Tablet', 'tablet', true, 'Perangkat tablet (iPad, Galaxy Tab, dll.) dengan nomor IMEI/Serial number dan stok satuan per-unit.', 2, true, NOW(3), NOW(3)),
('cat-smartwatch', 'SmartWatch', 'smartwatch', true, 'Perangkat jam tangan pintar (Apple Watch, Galaxy Watch, dll.) dengan serial/IMEI dan stok satuan.', 3, true, NOW(3), NOW(3)),
('cat-accessory', 'Aksesoris', 'accessory', false, 'Aksesoris pelengkap HP/gadget (charger, case, tempered glass, dll.) tanpa IMEI dengan kuantitas stok.', 4, true, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
