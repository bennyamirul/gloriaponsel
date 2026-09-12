import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type RoleType = "super_admin" | "admin";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: RoleType;
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
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as RoleType,
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
  return verifyToken(token);
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
 * Helper guard lapis server action/API: memastikan user memiliki role yang diizinkan
 */
export async function requireRole(allowedRoles: RoleType[]): Promise<UserSession> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Akses Ditolak: Anda tidak memiliki izin untuk melakukan aksi ini.");
  }
  return user;
}
