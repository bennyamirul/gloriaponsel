"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  permissions?: string[] | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ROLES = [
  {
    id: "role-owner",
    name: "Owner",
    code: "owner",
    description:
      "Pemilik toko dengan hak akses penuh ke seluruh modul, laporan keuangan, pengaturan, dan persetujuan barang.",
    permissions: [
      "Semua Modul",
      "Persetujuan Unit Masuk",
      "Laporan Laba & Keuangan",
      "Manajemen User & Role",
      "Master Data & Katalog",
      "Pengaturan Toko",
    ],
  },
  {
    id: "role-admin-kasir",
    name: "Admin Kasir",
    code: "admin_kasir",
    description:
      "Staf kasir/marketing yang bertugas melayani transaksi penjualan POS, melihat produk ready & harga jual, serta bukti pembayaran.",
    permissions: [
      "Dashboard Operasional",
      "Transaksi Penjualan (POS)",
      "Riwayat Penjualan",
      "Data Produk (Ready & Harga Jual)",
      "Unggah Bukti Pembayaran",
    ],
  },
  {
    id: "role-staff-gudang",
    name: "Staff Admin",
    code: "staff_gudang",
    description:
      "Staf gudang/admin yang bertugas menginput stok barang masuk, menentukan grade produk, dan mencetak barcode SKU.",
    permissions: [
      "Dashboard Operasional",
      "Input Barang Masuk & Grade",
      "Riwayat Transaksi Toko",
      "Cetak Barcode SKU",
      "Perbaiki Data Ditolak",
    ],
  },
  {
    id: "role-staff-keuangan",
    name: "Staff Keuangan",
    code: "staff_keuangan",
    description:
      "Staf keuangan yang bertugas mengelola pengeluaran harian, laporan penjualan, dan laporan keuangan toko.",
    permissions: [
      "Dashboard Operasional",
      "Laporan Penjualan",
      "Pengeluaran Harian",
      "Laporan Keuangan",
    ],
  },
];

/**
 * Mengambil daftar role dari tabel roles dan menghitung jumlah pengguna per role
 */
export async function getRoles(): Promise<RoleItem[]> {
  await requireRole(["owner", "super_admin"]);

  try {
    // Pastikan tabel roles ada (MySQL)
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`roles\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`description\` TEXT NULL,
        \`permissions\` JSON NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`roles_code_key\`(\`code\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // Ambil data roles dari tabel
    let rawRoles: any[] = [];
    try {
      if ((db as any).roleDefinition) {
        rawRoles = await (db as any).roleDefinition.findMany({
          orderBy: { createdAt: "asc" },
        });
      } else {
        rawRoles = await db.$queryRawUnsafe(`SELECT * FROM \`roles\` ORDER BY \`created_at\` ASC`);
      }
    } catch {
      rawRoles = await db.$queryRawUnsafe(`SELECT * FROM \`roles\` ORDER BY \`created_at\` ASC`);
    }

    // Auto-seed default roles jika belum ada
    if (!rawRoles || rawRoles.length === 0) {
      for (const def of DEFAULT_ROLES) {
        const permsJson = JSON.stringify(def.permissions);
        await db.$executeRawUnsafe(
          `INSERT INTO \`roles\` (\`id\`, \`name\`, \`code\`, \`description\`, \`permissions\`, \`created_at\`, \`updated_at\`)
           VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))
           ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);`,
          def.id,
          def.name,
          def.code,
          def.description,
          permsJson
        );
      }
      rawRoles = await db.$queryRawUnsafe(`SELECT * FROM \`roles\` ORDER BY \`created_at\` ASC`);
    }

    // Hitung jumlah user per role
    const users = await db.user.findMany({
      select: { role: true },
    });

    const countMap: Record<string, number> = {};
    for (const u of users) {
      const r = u.role as string;
      countMap[r] = (countMap[r] || 0) + 1;
      if (r === "super_admin") {
        countMap["owner"] = (countMap["owner"] || 0) + 1;
      }
      if (r === "admin") {
        countMap["admin_kasir"] = (countMap["admin_kasir"] || 0) + 1;
      }
    }

    return rawRoles.map((r: any) => {
      let permissionsList: string[] = [];
      if (r.permissions) {
        if (Array.isArray(r.permissions)) {
          permissionsList = r.permissions;
        } else if (typeof r.permissions === "string") {
          try {
            permissionsList = JSON.parse(r.permissions);
          } catch {
            permissionsList = [r.permissions];
          }
        }
      } else {
        const matchedDef = DEFAULT_ROLES.find((d) => d.code === r.code);
        permissionsList = matchedDef?.permissions || [];
      }

      return {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        permissions: permissionsList,
        userCount: countMap[r.code] || 0,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
      };
    });
  } catch (error: any) {
    console.error("getRoles error:", error);
    return DEFAULT_ROLES.map((r) => ({
      ...r,
      userCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Tambah role baru (Khusus Owner)
 */
export async function createRole(data: {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
}) {
  await requireRole(["owner", "super_admin"]);

  if (!data.name?.trim() || !data.code?.trim()) {
    return { error: "Nama dan kode role wajib diisi." };
  }

  const cleanCode = data.code.trim().toLowerCase().replace(/\s+/g, "_");
  const id = `role-${cleanCode}-${Date.now().toString().slice(-4)}`;
  const permsJson = JSON.stringify(data.permissions || []);

  try {
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT \`id\` FROM \`roles\` WHERE \`code\` = ? LIMIT 1`,
      cleanCode
    );
    if (existing && existing.length > 0) {
      return { error: `Kode role "${cleanCode}" sudah ada.` };
    }

    await db.$executeRawUnsafe(
      `INSERT INTO \`roles\` (\`id\`, \`name\`, \`code\`, \`description\`, \`permissions\`, \`created_at\`, \`updated_at\`)
       VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      id,
      data.name.trim(),
      cleanCode,
      data.description?.trim() || null,
      permsJson
    );

    revalidatePath("/roles");
    return { success: true, message: `Role "${data.name}" berhasil ditambahkan.` };
  } catch (error: any) {
    console.error("createRole error:", error);
    return { error: error?.message || "Gagal membuat role baru." };
  }
}

/**
 * Update deskripsi / nama role (Khusus Owner)
 */
export async function updateRole(
  id: string,
  data: {
    name: string;
    description?: string;
    permissions?: string[];
  }
) {
  await requireRole(["owner", "super_admin"]);

  if (!data.name?.trim()) {
    return { error: "Nama role tidak boleh kosong." };
  }

  try {
    const permsJson = JSON.stringify(data.permissions || []);
    await db.$executeRawUnsafe(
      `UPDATE \`roles\` SET \`name\` = ?, \`description\` = ?, \`permissions\` = ?, \`updated_at\` = NOW(3) WHERE \`id\` = ?`,
      data.name.trim(),
      data.description?.trim() || null,
      permsJson,
      id
    );

    revalidatePath("/roles");
    return { success: true, message: "Data role berhasil diperbarui." };
  } catch (error: any) {
    console.error("updateRole error:", error);
    return { error: error?.message || "Gagal memperbarui role." };
  }
}

/**
 * Hapus role kustom (Khusus Owner, peran sistem tidak dapat dihapus)
 */
export async function deleteRole(id: string) {
  await requireRole(["owner", "super_admin"]);

  const SYSTEM_ROLE_IDS = ["role-owner", "role-admin-kasir", "role-staff-gudang", "role-staff-keuangan"];
  if (SYSTEM_ROLE_IDS.includes(id)) {
    return { error: "Role sistem bawaan tidak dapat dihapus." };
  }

  try {
    await db.$executeRawUnsafe(`DELETE FROM \`roles\` WHERE \`id\` = ?`, id);
    revalidatePath("/roles");
    return { success: true, message: "Role berhasil dihapus." };
  } catch (error: any) {
    console.error("deleteRole error:", error);
    return { error: error?.message || "Gagal menghapus role." };
  }
}
