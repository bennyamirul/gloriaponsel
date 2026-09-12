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
 * Mengambil seluruh data user (Super Admin Only)
 */
export async function getUsers() {
  await requireRole(["super_admin"]);

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
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
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    totalSalesCount: u._count.sales,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

/**
 * Membuat user admin/kasir baru (Super Admin Only)
 */
export async function createUser(values: CreateUserFormValues) {
  await requireRole(["super_admin"]);

  const validated = CreateUserSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const { name, email, password, role } = validated.data;

  try {
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return { error: "Email sudah terdaftar untuk pengguna lain." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
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
 * Mengaktifkan atau menonaktifkan akun admin (Lockout Prevention)
 */
export async function toggleUserStatus(userId: string) {
  const currentUser = await requireRole(["super_admin"]);

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return { error: "Pengguna tidak ditemukan." };
    }

    // Proteksi: cegah menonaktifkan super admin terakhir
    if (targetUser.role === "super_admin" && targetUser.isActive) {
      const activeSuperAdminCount = await db.user.count({
        where: { role: "super_admin", isActive: true },
      });

      if (activeSuperAdminCount <= 1) {
        return {
          error: "Operasi ditolak: Anda tidak dapat menonaktifkan Super Admin terakhir di sistem.",
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
 * Mengubah role pengguna (Admin <-> Super Admin) dengan proteksi lockout
 */
export async function updateUserRole(userId: string, newRole: "admin" | "super_admin") {
  await requireRole(["super_admin"]);

  const validated = UpdateUserRoleSchema.safeParse({ userId, role: newRole });
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return { error: "Pengguna tidak ditemukan." };
    }

    // Proteksi: jika user saat ini adalah super_admin dan diturunkan ke admin
    if (targetUser.role === "super_admin" && newRole === "admin") {
      const activeSuperAdminCount = await db.user.count({
        where: { role: "super_admin", isActive: true },
      });

      if (activeSuperAdminCount <= 1) {
        return {
          error: "Operasi ditolak: Anda tidak dapat menurunkan role Super Admin terakhir di sistem.",
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
 * Reset password akun user oleh Super Admin
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  await requireRole(["super_admin"]);

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
    name: string;
    email: string;
    role: "super_admin" | "admin";
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
  await requireRole(["super_admin"]);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
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
        customer: { select: { name: true } },
        items: true,
      },
    }),
  ]);

  const recentSales = recentSalesRaw.map((s) => ({
    id: s.id,
    invoiceNo: s.invoiceNo,
    customerName: s.customer?.name || "Pelanggan Umum",
    total: Number(s.total),
    paymentMethod: s.paymentMethod,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
  }));

  return {
    success: true,
    data: {
      user: {
        ...user,
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

