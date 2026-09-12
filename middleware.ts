import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "default-secret-key-for-phone-store-2026-secure"
);

// Rute yang hanya boleh diakses oleh Super Admin
const SUPER_ADMIN_ONLY_ROUTES = [
  "/users",
  "/settings",
  "/reports",
  "/products",
  "/categories",
  "/brands",
  "/suppliers",
];

// Daftar prefix rute internal dashboard
const PROTECTED_ROUTES = [
  "/dashboard",
  "/products",
  "/sales",
  "/stock",
  "/reports",
  "/categories",
  "/brands",
  "/suppliers",
  "/customers",
  "/users",
  "/settings",
  "/profile",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let sessionUser: { id: string; name: string; email: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = {
        id: payload.id as string,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      };
    } catch {
      sessionUser = null;
    }
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 1. Jika rute terlindung dan user belum login -> Redirect ke /login
  if (isProtectedRoute && !sessionUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika user sudah login dan mengakses halaman /login -> Redirect ke /dashboard
  if (pathname === "/login" && sessionUser) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Role-Based Route Guard (Lapis 1):
  // User non-super_admin (admin biasa) dilarang mengakses rute khusus Super Admin
  if (sessionUser && sessionUser.role !== "super_admin") {
    const isSuperAdminOnly = SUPER_ADMIN_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isSuperAdminOnly) {
      // Redirect ke dashboard dengan indikator denied
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("access_denied", "true");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
