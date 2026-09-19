import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

let isSynced = false;

/**
 * Memastikan tabel dan kolom baru yang diperlukan sudah tersedia di MySQL
 * secara otomatis tanpa menyebabkan 500 server exception jika skrip SQL belum dijalankan manual.
 */
export async function ensureDbSchema() {
  if (isSynced) return;
  try {
    // 1. Pastikan tabel roles ada
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`roles\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`description\` TEXT NULL,
        \`permissions\` JSON NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`roles_code_key\`(\`code\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 2. Pastikan tabel catalogs ada
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`catalogs\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`has_imei\` BOOLEAN NOT NULL DEFAULT true,
        \`description\` TEXT NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`is_active\` BOOLEAN NOT NULL DEFAULT true,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`catalogs_code_key\`(\`code\`),
        INDEX \`catalogs_is_active_idx\`(\`is_active\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 3. Kolom-kolom baru di products
    try { await db.$executeRawUnsafe("ALTER TABLE `products` ADD COLUMN `is_barcode_printed` BOOLEAN NOT NULL DEFAULT FALSE;"); } catch {}
    try { await db.$executeRawUnsafe("ALTER TABLE `products` ADD COLUMN `barcode_printed_at` DATETIME(3) NULL;"); } catch {}
    try { await db.$executeRawUnsafe("ALTER TABLE `products` ADD COLUMN `catalog_id` VARCHAR(191) NULL;"); } catch {}
    try { await db.$executeRawUnsafe("ALTER TABLE `products` ADD COLUMN `created_by` VARCHAR(191) NULL;"); } catch {}

    // 4. Kolom baru di users
    try { await db.$executeRawUnsafe("ALTER TABLE `users` ADD COLUMN `role_id` VARCHAR(191) NULL;"); } catch {}

    isSynced = true;
  } catch (err) {
    console.warn("ensureDbSchema warning:", err);
  }
}

export default db;
