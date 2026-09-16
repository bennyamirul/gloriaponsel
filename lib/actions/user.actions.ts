"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  CreateUserSchema,
  CreateUserFormValues,
  UpdateUserRoleSchema,
  ResetPasswordSchema,
} from "@/lib/validations/user.schema";

/**
 * Mengambil seluruh data user (Owner / Super Admin Only)
 */
export async function getUsers() {
  await requireRole(["owner", "super_admin"]);

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { sales: true },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username || u.email?.split("@")[0] || u.name || "user",
    name: u.name || u.username || "User",
    email: u.email || "-",
    role: u.role,
    isActive: u.isActive,
    totalSalesCount: u._count.sales,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

/**
 * Membuat user baru hanya dengan username, password, dan role (Owner Only)
 */
export async function createUser(values: CreateUserFormValues) {
  await requireRole(["owner", "super_admin"]);

  const validated = CreateUserSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const { username, password, role } = validated.data;
  const cleanUsername = username.toLowerCase().trim();

  try {
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanUsername },
        ],
      },
    });

    if (existing) {
      return { error: "Username sudah digunakan oleh akun lain." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        username: cleanUsername,
        name: cleanUsername,
        email: null,
        passwordHash,
        role,
        isActive: true,
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("createUser error:", error);
    return { error: error.message || "Gagal membuat pengguna baru." };
  }
}

/**
 * Mengaktifkan atau menonaktifkan akun user (Lockout Prevention)
 */
export async function toggleUserStatus(userId: string) {
  await requireRole(["owner", "super_admin"]);

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return { error: "Pengguna tidak ditemukan." };
    }

    // Proteksi: cegah menonaktifkan owner terakhir
    const isTargetOwner = targetUser.role === "owner" || targetUser.role === "super_admin";
    if (isTargetOwner && targetUser.isActive) {
      const activeOwnerCount = await db.user.count({
        where: {
          role: { in: ["owner", "super_admin"] },
          isActive: true,
        },
      });

      if (activeOwnerCount <= 1) {
        return {
          error: "Operasi ditolak: Anda tidak dapat menonaktifkan Owner terakhir di sistem.",
        };
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { isActive: !targetUser.isActive },
    });

    revalidatePath("/users");
    return { success: true, newStatus: !targetUser.isActive };
  } catch (error: any) {
    console.error("toggleUserStatus error:", error);
    return { error: error.message || "Gagal mengubah status akun." };
  }
}

/**
 * Mengubah role pengguna dengan proteksi lockout Owner
 */
export async function updateUserRole(
  userId: string,
  newRole: "owner" | "admin_kasir" | "staff_gudang" | "super_admin" | "admin" | "staff_keuangan"
) {
  await requireRole(["owner", "super_admin"]);

  const validated = UpdateUserRoleSchema.safeParse({ userId, role: newRole });
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return { error: "Pengguna tidak ditemukan." };
    }

    const isCurrentOwner = targetUser.role === "owner" || targetUser.role === "super_admin";
    const isNewRoleOwner = newRole === "owner" || newRole === "super_admin";

    // Proteksi: jika user saat ini adalah owner dan diturunkan role-nya
    if (isCurrentOwner && !isNewRoleOwner) {
      const activeOwnerCount = await db.user.count({
        where: {
          role: { in: ["owner", "super_admin"] },
          isActive: true,
        },
      });

      if (activeOwnerCount <= 1) {
        return {
          error: "Operasi ditolak: Anda tidak dapat menurunkan role Owner terakhir di sistem.",
        };
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("updateUserRole error:", error);
    return { error: error.message || "Gagal mengubah role pengguna." };
  }
}

/**
 * Reset password akun user oleh Owner
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  await requireRole(["owner", "super_admin"]);

  const validated = ResetPasswordSchema.safeParse({ userId, newPassword });
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Password tidak valid" };
  }

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return { error: "Pengguna tidak ditemukan." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  } catch (error: any) {
    console.error("resetUserPassword error:", error);
    return { error: error.message || "Gagal mereset password pengguna." };
  }
}

export interface UserDetailWithSales {
  user: {
    id: string;
    username?: string | null;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    todayCount: number;
    todayTotal: number;
    monthCount: number;
    monthTotal: number;
    allTimeCount: number;
    allTimeTotal: number;
  };
  recentSales: Array<{
    id: string;
    invoiceNo: string;
    customerName: string;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    itemCount: number;
  }>;
}

/**
 * Mengambil detail profil user serta riwayat transaksi (Hari Ini, Bulan Ini, Terakhir)
 */
export async function getUserDetailWithSales(userId: string) {
  await requireRole(["owner", "super_admin"]);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return { error: "Pengguna tidak ditemukan." };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [todaySales, monthSales, allTimeSales, recentSalesRaw] = await Promise.all([
    db.sale.findMany({
      where: {
        cashierId: userId,
        status: "completed",
        createdAt: { gte: startOfToday },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        cashierId: userId,
        status: "completed",
        createdAt: { gte: startOfMonth },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        cashierId: userId,
        status: "completed",
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: { cashierId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    }),
  ]);

  const recentSales = recentSalesRaw.map((s) => ({
    id: s.id,
    invoiceNo: s.invoiceNo,
    customerName: s.customerName || "Pelanggan Umum",
    total: Number(s.total),
    paymentMethod: s.paymentMethod,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    itemCount: s.items.reduce((acc: number, it: any) => acc + it.qty, 0),
  }));

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username || "User",
        email: user.email || "-",
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      stats: {
        todayCount: todaySales.length,
        todayTotal: todaySales.reduce((acc, s) => acc + Number(s.total), 0),
        monthCount: monthSales.length,
        monthTotal: monthSales.reduce((acc, s) => acc + Number(s.total), 0),
        allTimeCount: allTimeSales.length,
        allTimeTotal: allTimeSales.reduce((acc, s) => acc + Number(s.total), 0),
      },
      recentSales,
    },
  };
}

