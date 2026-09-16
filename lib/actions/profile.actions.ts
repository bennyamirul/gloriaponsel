"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, createSession } from "@/lib/auth";
import {
  UpdateProfileSchema,
  UpdateProfileValues,
  ChangePasswordSchema,
  ChangePasswordValues,
} from "@/lib/validations/user.schema";

export interface ProfileData {
  id: string;
  username?: string | null;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  salesStats?: {
    todayCount: number;
    todayTotal: number;
    monthCount: number;
    monthTotal: number;
    allTimeCount: number;
  };
}

/**
 * Mengambil informasi profil lengkap user yang sedang login
 */
export async function getProfileData(): Promise<ProfileData | null> {
  const sessionUser = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  let salesStats = undefined;
  if (user.role === "admin" || user.role === "admin_kasir") {
    const [todaySales, monthSales, allTimeCount] = await Promise.all([
      db.sale.findMany({
        where: {
          cashierId: user.id,
          status: "completed",
          createdAt: { gte: startOfToday },
        },
        select: { total: true },
      }),
      db.sale.findMany({
        where: {
          cashierId: user.id,
          status: "completed",
          createdAt: { gte: startOfMonth },
        },
        select: { total: true },
      }),
      db.sale.count({
        where: {
          cashierId: user.id,
          status: "completed",
        },
      }),
    ]);

    salesStats = {
      todayCount: todaySales.length,
      todayTotal: todaySales.reduce((acc, s) => acc + Number(s.total), 0),
      monthCount: monthSales.length,
      monthTotal: monthSales.reduce((acc, s) => acc + Number(s.total), 0),
      allTimeCount,
    };
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username || "Pengguna",
    email: user.email || "",
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    salesStats,
  };
}

/**
 * Memperbarui nama dan email profil user yang sedang login
 */
export async function updateProfile(values: { name: string; username?: string }) {
  const sessionUser = await requireAuth();

  const validated = UpdateProfileSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data profil tidak valid." };
  }

  const { name, username } = validated.data;

  try {
    // Jika username diubah, validasi keunikan username
    if (username && username.trim().toLowerCase() !== (sessionUser.username || "").toLowerCase()) {
      const existing = await db.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: sessionUser.id },
        },
      });
      if (existing) {
        return {
          error: `Username "${username.trim()}" sudah digunakan oleh akun lain. Silakan pilih username lain.`,
        };
      }
    }

    const updatedUser = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        name: name.trim(),
        ...(username ? { username: username.trim() } : {}),
      },
    });

    // Update sesi cookie langsung agar nama & username baru aktif tanpa harus re-login
    await createSession({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/users");

    return {
      success: true,
      message: "Profil Anda berhasil diperbarui.",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name || updatedUser.username || "Pengguna",
        email: updatedUser.email || "",
      },
    };
  } catch (error: any) {
    console.error("updateProfile error:", error);
    return { error: error?.message || "Gagal memperbarui profil." };
  }
}

/**
 * Mengubah kata sandi user yang sedang login
 */
export async function changePassword(values: ChangePasswordValues) {
  const sessionUser = await requireAuth();

  const validated = ChangePasswordSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input password tidak valid." };
  }

  const { currentPassword, newPassword } = validated.data;

  try {
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return { error: "Pengguna tidak ditemukan." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return { error: "Kata sandi saat ini tidak cocok." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: "Kata sandi berhasil diubah.",
    };
  } catch (error: any) {
    console.error("changePassword error:", error);
    return { error: error?.message || "Gagal mengubah kata sandi." };
  }
}
