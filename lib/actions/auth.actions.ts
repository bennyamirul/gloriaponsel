"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, removeSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server Action untuk proses autentikasi login
 */
export async function loginAction(values: LoginFormValues): Promise<ActionResult> {
  const validated = LoginSchema.safeParse(values);
  if (!validated.success) {
    return {
      error: validated.error.errors[0]?.message || "Input tidak valid",
    };
  }

  const { email, password } = validated.data;

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { error: "Email atau kata sandi salah." };
    }

    if (!user.isActive) {
      return {
        error: "Akun Anda dinonaktifkan. Silakan hubungi Super Admin toko.",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: "Email atau kata sandi salah." };
    }

    // Set HTTP-only session cookie
    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return { success: true };
  } catch (err) {
    console.error("Login error:", err);
    return {
      error: "Terjadi kesalahan koneksi sistem. Pastikan database aktif.",
    };
  }
}

/**
 * Server Action untuk logout
 */
export async function logoutAction() {
  await removeSession();
  redirect("/login");
}
