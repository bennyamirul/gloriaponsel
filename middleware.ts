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
  if (sessionUser) {
    const role = sessionUser.role;
    const isOwner = role === "owner" || role === "super_admin";
    const isWarehouse = role === "staff_gudang";
    const isCashier = role === "admin_kasir" || role === "admin";
    const isFinance = role === "staff_keuangan";

    if (!isOwner) {
      if (isWarehouse) {
        // Staff Admin (Staff Gudang) diizinkan mengakses: /dashboard, /products, /stock, /sales/history, /profile
        const isAllowedForWarehouse =
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/products") ||
          pathname.startsWith("/stock") ||
          pathname.startsWith("/sales/history") ||
          pathname.startsWith("/profile");

        if (!isAllowedForWarehouse && isProtectedRoute) {
          const dashboardUrl = new URL("/dashboard", request.url);
          dashboardUrl.searchParams.set("access_denied", "true");
          return NextResponse.redirect(dashboardUrl);
        }
      } else if (isCashier) {
        // Staff Marketing (Admin Kasir) diizinkan mengakses: /dashboard, /sales, /customers, /profile
        const isAllowedForCashier =
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/sales") ||
          pathname.startsWith("/customers") ||
          pathname.startsWith("/profile");

        if (!isAllowedForCashier && isProtectedRoute) {
          const dashboardUrl = new URL("/dashboard", request.url);
          dashboardUrl.searchParams.set("access_denied", "true");
          return NextResponse.redirect(dashboardUrl);
        }
      } else if (isFinance) {
        // Staff Keuangan hanya diizinkan mengakses: /dashboard, /reports/sales, /reports/expenses, /reports/financial, /profile
        const isAllowedForFinance =
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/reports/sales") ||
          pathname.startsWith("/reports/expenses") ||
          pathname.startsWith("/reports/financial") ||
          pathname.startsWith("/profile");

        if (!isAllowedForFinance && isProtectedRoute) {
          const dashboardUrl = new URL("/dashboard", request.url);
          dashboardUrl.searchParams.set("access_denied", "true");
          return NextResponse.redirect(dashboardUrl);
        }
      } else {
        // Role tidak dikenal / fallback: batasi akses selain dashboard & profile
        if (isProtectedRoute && !pathname.startsWith("/dashboard") && !pathname.startsWith("/profile")) {
          const dashboardUrl = new URL("/dashboard", request.url);
          dashboardUrl.searchParams.set("access_denied", "true");
          return NextResponse.redirect(dashboardUrl);
        }
      }
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
