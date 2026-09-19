import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ensureDbSchema } from "@/lib/db";

export type RoleType =
  | "owner"
  | "admin_kasir"
  | "staff_gudang"
  | "super_admin"
  | "admin"
  | "staff_keuangan";

export interface UserSession {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  role: RoleType;
  roleId?: string | null;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "default-secret-key-for-phone-store-2026-secure"
);

export const AUTH_COOKIE_NAME = "auth_token";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 jam sesuai FRD.md

/**
 * Membuat JWT token dengan payload sesi user
 */
export async function signToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(JWT_SECRET);
}

/**
 * Verifikasi token JWT dan mengembalikan payload jika valid
 */
export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: (payload.username as string) || null,
      name: (payload.name as string) || null,
      email: (payload.email as string) || null,
      role: payload.role as RoleType,
      roleId: (payload.roleId as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Mengatur cookie session httpOnly setelah login berhasil
 */
export async function createSession(user: UserSession): Promise<void> {
  const token = await signToken(user);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // Diizinkan untuk akses IP lokal HTTP (Wi-Fi) di smartphone
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Mengambil session user aktif dari cookie (untuk Server Components & Server Actions)
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;

  try {
    ensureDbSchema().catch(() => {});

    const dbUser = await db.user.findUnique({
      where: { id: verified.id },
      select: { id: true, username: true, name: true, email: true, role: true, isActive: true },
    });

    let roleId: string | null = verified.roleId || null;
    try {
      const uRaw = await db.$queryRawUnsafe<any[]>(
        "SELECT `role_id` FROM `users` WHERE `id` = ? OR `username` = ? LIMIT 1",
        verified.id,
        verified.username || ""
      );
      if (uRaw?.[0]?.role_id) roleId = uRaw[0].role_id;
    } catch {}

    const defaultRoleId =
      verified.role === "owner" || verified.role === "super_admin"
        ? "role-owner"
        : verified.role === "staff_gudang"
          ? "role-staff-gudang"
          : verified.role === "staff_keuangan"
            ? "role-staff-keuangan"
            : "role-admin-kasir";

    if (dbUser && dbUser.isActive) {
      return {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as RoleType,
        roleId: roleId || defaultRoleId,
      };
    }

    // Jika ID di cookie tidak ditemukan di DB, coba cari berdasarkan username
    if (verified.username) {
      const dbUserByUsername = await db.user.findUnique({
        where: { username: verified.username },
        select: { id: true, username: true, name: true, email: true, role: true, isActive: true },
      });

      if (dbUserByUsername && dbUserByUsername.isActive) {
        return {
          id: dbUserByUsername.id,
          username: dbUserByUsername.username,
          name: dbUserByUsername.name,
          email: dbUserByUsername.email,
          role: dbUserByUsername.role as RoleType,
          roleId: roleId || defaultRoleId,
        };
      }
    }

    // Fallback: cari berdasarkan email
    if (verified.email) {
      const dbUserByEmail = await db.user.findUnique({
        where: { email: verified.email },
        select: { id: true, username: true, name: true, email: true, role: true, isActive: true },
      });

      if (dbUserByEmail && dbUserByEmail.isActive) {
        return {
          id: dbUserByEmail.id,
          username: dbUserByEmail.username,
          name: dbUserByEmail.name,
          email: dbUserByEmail.email,
          role: dbUserByEmail.role as RoleType,
          roleId: roleId || defaultRoleId,
        };
      }
    }

    return null;
  } catch {
    return verified;
  }
}

/**
 * Menghapus cookie session (logout)
 */
export async function removeSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Helper guard lapis server action/API: memastikan user sudah login
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Helper pengecekan peran: mendukung alias backward compatibility
 * - "owner" setara dengan "super_admin"
 * - "admin_kasir" setara dengan "admin"
 */
export function isRoleAllowed(userRole: RoleType, allowedRoles: RoleType[]): boolean {
  if (allowedRoles.includes(userRole)) return true;
  if (
    (userRole === "super_admin" && allowedRoles.includes("owner")) ||
    (userRole === "owner" && allowedRoles.includes("super_admin"))
  ) {
    return true;
  }
  if (
    (userRole === "admin" && allowedRoles.includes("admin_kasir")) ||
    (userRole === "admin_kasir" && allowedRoles.includes("admin"))
  ) {
    return true;
  }
  return false;
}

export function isOwner(role: RoleType): boolean {
  return role === "owner" || role === "super_admin";
}

export function isCashier(role: RoleType): boolean {
  return role === "admin_kasir" || role === "admin";
}

export function isWarehouse(role: RoleType): boolean {
  return role === "staff_gudang";
}

/**
 * Helper guard lapis server action/API: memastikan user memiliki role yang diizinkan
 */
export async function requireRole(allowedRoles: RoleType[]): Promise<UserSession> {
  const user = await requireAuth();
  if (!isRoleAllowed(user.role, allowedRoles)) {
    throw new Error("Akses Ditolak: Anda tidak memiliki izin untuk melakukan aksi ini.");
  }
  return user;
}
