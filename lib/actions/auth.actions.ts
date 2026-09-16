"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, removeSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginSchema, LoginFormValues } from "@/lib/validations/auth.schema";

export type { LoginFormValues };

export interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server Action untuk proses autentikasi login
 */
export async function loginAction(
  valuesOrFormData: LoginFormValues | FormData
): Promise<ActionResult> {
  let values: LoginFormValues;
  let callbackUrl = "/dashboard";

  if (valuesOrFormData instanceof FormData) {
    values = {
      username: (valuesOrFormData.get("username") as string) || "",
      password: (valuesOrFormData.get("password") as string) || "",
    };
    callbackUrl = (valuesOrFormData.get("callbackUrl") as string) || "/dashboard";
  } else {
    values = valuesOrFormData;
  }

  const validated = LoginSchema.safeParse(values);
  if (!validated.success) {
    return {
      error: validated.error.errors[0]?.message || "Input tidak valid",
    };
  }

  const { username, password } = validated.data;
  const identifier = username.toLowerCase().trim();

  try {
    const user = await db.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return { error: "Username atau kata sandi salah." };
    }

    if (!user.isActive) {
      return {
        error: "Akun Anda dinonaktifkan. Silakan hubungi Owner toko.",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: "Username atau kata sandi salah." };
    }

    // Set HTTP-only session cookie
    await createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    if (valuesOrFormData instanceof FormData) {
      redirect(callbackUrl);
    }

    return { success: true };
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
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
