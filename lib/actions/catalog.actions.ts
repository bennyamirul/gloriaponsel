"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { CatalogFormValues, CatalogSchema } from "@/lib/validations/catalog.schema";

export interface CatalogItem {
  id: string;
  name: string;
  code: string;
  hasImei: boolean;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetCatalogsParams {
  query?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_CATALOGS = [
  {
    id: "cat-phone",
    name: "Handphone",
    code: "phone",
    hasImei: true,
    displayOrder: 1,
    description: "Perangkat smartphone dengan nomor IMEI 15 digit dan stok satuan per-unit.",
  },
  {
    id: "cat-tablet",
    name: "Tablet",
    code: "tablet",
    hasImei: true,
    displayOrder: 2,
    description: "Perangkat tablet (iPad, Galaxy Tab, dll.) dengan nomor IMEI/Serial dan stok satuan.",
  },
  {
    id: "cat-smartwatch",
    name: "SmartWatch",
    code: "smartwatch",
    hasImei: true,
    displayOrder: 3,
    description: "Perangkat jam tangan pintar (Apple Watch, Galaxy Watch, dll.) dengan serial/IMEI.",
  },
  {
    id: "cat-accessory",
    name: "Aksesoris",
    code: "accessory",
    hasImei: false,
    displayOrder: 4,
    description: "Aksesoris pelengkap HP/gadget (charger, case, tempered glass, dll.) tanpa IMEI dengan kuantitas stok.",
  },
];

/**
 * Pastikan tabel catalogs ada dan kolom has_imei / display_order tersedia
 */
async function ensureCatalogTableExists() {
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
      \`updated_at\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`catalogs_code_key\`(\`code\`),
      INDEX \`catalogs_is_active_idx\`(\`is_active\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  // Tambahkan kolom jika belum ada (antisipasi versi tabel sebelumnya)
  try {
    await db.$executeRawUnsafe(`ALTER TABLE \`catalogs\` ADD COLUMN \`has_imei\` BOOLEAN NOT NULL DEFAULT true;`);
  } catch {}
  try {
    await db.$executeRawUnsafe(`ALTER TABLE \`catalogs\` ADD COLUMN \`display_order\` INT NOT NULL DEFAULT 0;`);
  } catch {}

  // Seed default 4 kategori jika tabel masih kosong
  const existingCount = await db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as cnt FROM \`catalogs\``);
  if (Number(existingCount[0]?.cnt || 0) === 0) {
    for (const cat of DEFAULT_CATALOGS) {
      await db.$executeRawUnsafe(
        `INSERT INTO \`catalogs\` (\`id\`, \`name\`, \`code\`, \`has_imei\`, \`description\`, \`display_order\`, \`is_active\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3))
         ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`)`,
        cat.id,
        cat.name,
        cat.code,
        cat.hasImei ? 1 : 0,
        cat.description,
        cat.displayOrder
      );
    }
  }
}

/**
 * Mengambil daftar master katalog kategori produk toko (Untuk Manajemen Owner)
 */
export async function getCatalogs(params?: GetCatalogsParams) {
  const user = await requireAuth();
  await ensureCatalogTableExists();

  const { query, page = 1, limit = 50 } = params || {};
  const skip = (page - 1) * limit;

  try {
    let whereClauses: string[] = ["1=1"];
    const sqlArgs: any[] = [];

    if (query && query.trim() !== "") {
      const q = `%${query.trim()}%`;
      whereClauses.push("(`name` LIKE ? OR `code` LIKE ? OR `description` LIKE ?)");
      sqlArgs.push(q, q, q);
    }

    const whereSql = whereClauses.join(" AND ");
    const countResult = await db.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM \`catalogs\` WHERE ${whereSql}`,
      ...sqlArgs
    );
    const totalCount = Number(countResult[0]?.cnt || 0);

    const rawItems = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM \`catalogs\` WHERE ${whereSql} ORDER BY \`display_order\` ASC, \`name\` ASC LIMIT ? OFFSET ?`,
      ...sqlArgs,
      limit,
      skip
    );

    const catalogs: CatalogItem[] = rawItems.map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      hasImei: Boolean(c.has_imei ?? c.hasImei ?? true),
      description: c.description || null,
      displayOrder: Number(c.display_order ?? c.displayOrder ?? 0),
      isActive: Boolean(c.is_active ?? c.isActive ?? true),
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      updatedAt: c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString(),
    }));

    return {
      catalogs,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentUserRole: user.role,
    };
  } catch (error: any) {
    console.error("getCatalogs error:", error);
    return {
      catalogs: [],
      total: 0,
      page: 1,
      totalPages: 1,
      currentUserRole: user.role,
    };
  }
}

/**
 * Mengambil daftar katalog yang aktif untuk form produk dan filter
 */
export async function getActiveCatalogs(): Promise<CatalogItem[]> {
  try {
    await ensureCatalogTableExists();
    const rawItems = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM \`catalogs\` WHERE \`is_active\` = 1 ORDER BY \`display_order\` ASC, \`name\` ASC`
    );

    return rawItems.map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      hasImei: Boolean(c.has_imei ?? c.hasImei ?? true),
      description: c.description || null,
      displayOrder: Number(c.display_order ?? c.displayOrder ?? 0),
      isActive: true,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      updatedAt: c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("getActiveCatalogs error:", error);
    return DEFAULT_CATALOGS.map((c) => ({
      ...c,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Menambahkan kategori katalog baru (Khusus Owner)
 */
export async function createCatalog(values: CatalogFormValues) {
  await requireRole(["owner", "super_admin", "staff_gudang"]);
  await ensureCatalogTableExists();

  const validated = CatalogSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const data = validated.data;
  const id = `cat-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT \`id\` FROM \`catalogs\` WHERE \`code\` = ? LIMIT 1`,
      data.code
    );
    if (existing && existing.length > 0) {
      return { error: `Kode unik "${data.code}" sudah digunakan.` };
    }

    await db.$executeRawUnsafe(
      `INSERT INTO \`catalogs\` (\`id\`, \`name\`, \`code\`, \`has_imei\`, \`description\`, \`display_order\`, \`is_active\`, \`created_at\`, \`updated_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      id,
      data.name,
      data.code,
      data.hasImei ? 1 : 0,
      data.description || null,
      data.displayOrder || 0,
      data.isActive ? 1 : 0
    );

    revalidatePath("/catalogs");
    revalidatePath("/products");
    return { success: true, message: `Katalog kategori "${data.name}" berhasil ditambahkan.` };
  } catch (error: any) {
    console.error("createCatalog error:", error);
    return { error: error?.message || "Gagal menambahkan data katalog." };
  }
}

/**
 * Memperbarui kategori katalog (Khusus Owner)
 */
export async function updateCatalog(id: string, values: CatalogFormValues) {
  await requireRole(["owner", "super_admin", "staff_gudang"]);
  await ensureCatalogTableExists();

  const validated = CatalogSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const data = validated.data;

  try {
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT \`id\` FROM \`catalogs\` WHERE \`code\` = ? AND \`id\` != ? LIMIT 1`,
      data.code,
      id
    );
    if (existing && existing.length > 0) {
      return { error: `Kode unik "${data.code}" sudah digunakan oleh kategori lain.` };
    }

    await db.$executeRawUnsafe(
      `UPDATE \`catalogs\` 
       SET \`name\` = ?, \`code\` = ?, \`has_imei\` = ?, \`description\` = ?, \`display_order\` = ?, \`is_active\` = ?, \`updated_at\` = NOW(3)
       WHERE \`id\` = ?`,
      data.name,
      data.code,
      data.hasImei ? 1 : 0,
      data.description || null,
      data.displayOrder || 0,
      data.isActive ? 1 : 0,
      id
    );

    revalidatePath("/catalogs");
    revalidatePath("/products");
    return { success: true, message: `Katalog kategori "${data.name}" berhasil diperbarui.` };
  } catch (error: any) {
    console.error("updateCatalog error:", error);
    return { error: error?.message || "Gagal memperbarui katalog." };
  }
}

/**
 * Mengubah status aktif katalog (Khusus Owner & Staff Admin)
 */
export async function toggleCatalogStatus(id: string, currentStatus: boolean) {
  await requireRole(["owner", "super_admin", "staff_gudang"]);
  await ensureCatalogTableExists();

  try {
    const newStatus = !currentStatus;
    await db.$executeRawUnsafe(
      `UPDATE \`catalogs\` SET \`is_active\` = ?, \`updated_at\` = NOW(3) WHERE \`id\` = ?`,
      newStatus ? 1 : 0,
      id
    );

    revalidatePath("/catalogs");
    revalidatePath("/products");
    return { success: true, newStatus };
  } catch (error: any) {
    console.error("toggleCatalogStatus error:", error);
    return { error: error?.message || "Gagal mengubah status katalog." };
  }
}

/**
 * Menghapus kategori katalog (Khusus Owner)
 */
export async function deleteCatalog(id: string) {
  await requireRole(["owner", "super_admin"]);
  await ensureCatalogTableExists();

  const protectedCodes = ["phone", "tablet", "smartwatch", "accessory"];

  try {
    const checkItem = await db.$queryRawUnsafe<any[]>(
      `SELECT \`code\`, \`name\` FROM \`catalogs\` WHERE \`id\` = ? LIMIT 1`,
      id
    );
    if (!checkItem || checkItem.length === 0) {
      return { error: "Kategori katalog tidak ditemukan." };
    }

    if (protectedCodes.includes(checkItem[0].code)) {
      return {
        error: `Kategori dasar "${checkItem[0].name}" tidak dapat dihapus. Anda dapat menonaktifkannya jika tidak digunakan.`,
      };
    }

    await db.$executeRawUnsafe(`DELETE FROM \`catalogs\` WHERE \`id\` = ?`, id);
    revalidatePath("/catalogs");
    revalidatePath("/products");
    return { success: true, message: "Kategori katalog berhasil dihapus." };
  } catch (error: any) {
    console.error("deleteCatalog error:", error);
    return { error: error?.message || "Gagal menghapus katalog." };
  }
}

