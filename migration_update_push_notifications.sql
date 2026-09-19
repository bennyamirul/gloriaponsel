-- ==============================================================================
-- SKRIP UPDATE AMAN: WEB PUSH NOTIFICATIONS GLORIA PONSEL
-- Skrip ini 100% AMAN:
-- 1. TIDAK menghapus tabel lama (tidak ada DROP TABLE)
-- 2. Data produk, penjualan, dan user TIDAK AKAN HILANG
-- 3. Membuat tabel `push_subscriptions` untuk menyimpan perangkat HP yang aktif
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `push_subscriptions_user_id_idx` (`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
