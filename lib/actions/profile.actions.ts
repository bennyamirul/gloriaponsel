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
  name: string;
  email: string;
  role: "super_admin" | "admin";
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

  let salesStats: ProfileData["salesStats"] = undefined;

  if (user.role === "admin") {
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
    name: user.name,
    email: user.email,
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
export async function updateProfile(values: UpdateProfileValues) {
  const sessionUser = await requireAuth();

  const validated = UpdateProfileSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data profil tidak valid." };
  }

  const { name, email } = validated.data;
  const formattedEmail = email.toLowerCase().trim();

  try {
    // Cek email jika diubah apakah sudah dipakai user lain
    if (formattedEmail !== sessionUser.email.toLowerCase()) {
      const existing = await db.user.findUnique({
        where: { email: formattedEmail },
      });

      if (existing && existing.id !== sessionUser.id) {
        return { error: "Alamat email sudah digunakan oleh pengguna lain." };
      }
    }

    const updatedUser = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        name: name.trim(),
        email: formattedEmail,
      },
    });

    // Update sesi cookie langsung agar nama baru aktif tanpa harus re-login
    await createSession({
      id: updatedUser.id,
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
        name: updatedUser.name,
        email: updatedUser.email,
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
