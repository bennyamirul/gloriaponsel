"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Smartphone,
  Layers,
  Tag,
  Truck,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Produk", href: "/products", icon: Package },
  { label: "Transaksi", href: "/sales", icon: ShoppingCart },
  { label: "Manajemen Stok", href: "/stock", icon: Boxes },
  { label: "Laporan", href: "/reports", icon: BarChart3 },
  { label: "Kategori", href: "/categories", icon: Layers },
  { label: "Brand", href: "/brands", icon: Tag },
  { label: "Supplier", href: "/suppliers", icon: Truck },
  { label: "Pelanggan", href: "/customers", icon: UserCheck },
  { label: "Manajemen User", href: "/users", icon: Users, superAdminOnly: true },
  { label: "Pengaturan", href: "/settings", icon: Settings, superAdminOnly: true },
];

export function Sidebar({ userRole = "super_admin" }: { userRole?: string }) {
  const pathname = usePathname();

  const filteredItems = mainNavItems.filter(
    (item) => !item.superAdminOnly || userRole === "super_admin"
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-20 flex-col items-center justify-between border-r border-slate-800 bg-[var(--sidebar-bg)] py-6 shadow-xl">
      {/* Brand Logo */}
      <div className="flex flex-col items-center gap-1">
        <Link
          href="/dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
          title="Toko Handphone"
        >
          <Smartphone className="h-6 w-6" />
        </Link>
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-1">
          Admin
        </span>
      </div>

      {/* Navigation Icons (Scrollable if many items) */}
      <nav className="flex flex-1 flex-col items-center gap-2 py-6 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white",
                isActive &&
                  "bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/40"
              )}
              title={item.label}
            >
              <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "text-indigo-400")} />
              
              {/* Tooltip on hover */}
              <div className="absolute left-16 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-md group-hover:block whitespace-nowrap border border-slate-800 pointer-events-none">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Action: Logout */}
      <div className="flex flex-col items-center pt-2">
        <button
          onClick={() => {
            // Logout logic will be plugged in Phase 1
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }}
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all"
          title="Keluar"
        >
          <LogOut className="h-5 w-5" />
          <div className="absolute left-16 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-rose-300 shadow-md group-hover:block whitespace-nowrap border border-slate-800 pointer-events-none">
            Keluar
          </div>
        </button>
      </div>
    </aside>
  );
}
