"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth.actions";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Operasional",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Kasir POS", href: "/sales", icon: ShoppingCart },
      { label: "Manajemen Stok", href: "/stock", icon: Boxes },
      { label: "Laporan", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Produk", href: "/products", icon: Package },
      { label: "Kategori", href: "/categories", icon: Layers },
      { label: "Brand", href: "/brands", icon: Tag },
      { label: "Supplier", href: "/suppliers", icon: Truck },
      { label: "Pelanggan", href: "/customers", icon: UserCheck },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { label: "Manajemen User", href: "/users", icon: Users, superAdminOnly: true },
      { label: "Pengaturan Toko", href: "/settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  userRole = "super_admin",
  userName = "Owner Toko",
  isExpanded = true,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await logoutAction();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Filter sections and items based on role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.superAdminOnly || userRole === "super_admin"
      ),
    }))
    .filter((section) => section.items.length > 0);

  // EXPANDED SIDEBAR (w-64)
  if (isExpanded) {
    return (
      <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-64 flex-col justify-between border-r border-[#083b3a] bg-[#031e1d] transition-all duration-300 ease-in-out shadow-xl">
        {/* Header: Logo + Store Name + Collapse Button */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[#083b3a]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group transition"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-md shadow-emerald-950/40 overflow-hidden">
              <Image
                src="/logoGP.png"
                alt="Gloria Ponsel"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight text-white leading-none">
                Gloria Ponsel
              </span>
              <span className="text-[11px] font-medium text-teal-300/80 mt-1">
                Admin Dashboard
              </span>
            </div>
          </Link>

          {onToggle && (
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-teal-200/70 hover:text-white hover:bg-[#073332] transition"
              title="Kecilkan Sidebar"
              aria-label="Kecilkan Sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-teal-400/80 mb-1.5">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-[#055b5a] text-white font-semibold shadow-sm"
                        : "text-teal-100/70 hover:text-white hover:bg-[#073332]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-white" : "text-teal-200/70"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: User Profile Card & Logout */}
        <div className="p-3 border-t border-[#083b3a] bg-[#021716]/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#021716] border border-[#083b3a]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#055b5a] text-xs font-bold text-white shadow-xs">
                {getInitials(userName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-teal-100 truncate leading-tight">
                  {userName}
                </span>
                <span className="text-[10px] capitalize text-teal-300/80 truncate">
                  {userRole.replace("_", " ")}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-teal-200/70 hover:text-rose-300 hover:bg-rose-950/40 transition"
              title="Keluar Akun"
              aria-label="Keluar Akun"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // COLLAPSED SIDEBAR (w-20)
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-20 flex-col items-center justify-between border-r border-[#083b3a] bg-[#031e1d] py-4 transition-all duration-300 ease-in-out shadow-xl">
      {/* Brand Logo & Expand Button */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-0.5 shadow-md shadow-emerald-950/40 transition hover:scale-105 overflow-hidden"
          title="Gloria Ponsel"
        >
          <Image
            src="/logoGP.png"
            alt="Gloria Ponsel"
            width={36}
            height={36}
            className="h-full w-full object-contain"
            priority
          />
        </Link>

        {onToggle && (
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-teal-200/70 hover:text-white hover:bg-[#073332] transition"
            title="Buka Sidebar"
            aria-label="Buka Sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Icons (Scrollable) */}
      <nav className="flex flex-1 flex-col items-center gap-1.5 py-4 overflow-y-auto no-scrollbar">
        {visibleSections.flatMap((section) =>
          section.items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl text-teal-200/70 transition-all duration-150 hover:bg-[#073332] hover:text-white",
                  isActive &&
                    "bg-[#055b5a] text-white ring-1 ring-[#055b5a] font-semibold shadow-xs"
                )}
                title={item.label}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-teal-200/70"
                  )}
                />

                {/* Tooltip on hover */}
                <div className="absolute left-14 z-50 hidden rounded-md bg-[#021716] px-2.5 py-1 text-xs font-medium text-white shadow-md group-hover:block whitespace-nowrap border border-[#083b3a] pointer-events-none">
                  {item.label}
                </div>
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom Action: Logout */}
      <div className="flex flex-col items-center pt-2">
        <button
          onClick={handleLogout}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-teal-200/70 hover:bg-rose-950/40 hover:text-rose-400 transition-all"
          title="Keluar"
        >
          <LogOut className="h-4.5 w-4.5" />
          <div className="absolute left-14 z-50 hidden rounded-md bg-[#021716] px-2.5 py-1 text-xs font-medium text-rose-300 shadow-md group-hover:block whitespace-nowrap border border-[#083b3a] pointer-events-none">
            Keluar
          </div>
        </button>
      </div>
    </aside>
  );
}
