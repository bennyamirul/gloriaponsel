"use client";

import { useState, useEffect } from "react";
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
  Printer,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Wallet,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Operasional",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: [
          "owner",
          "admin_kasir",
          "staff_gudang",
          "staff_keuangan",
          "super_admin",
          "admin",
        ],
      },
      {
        label: "Transaksi",
        href: "/sales",
        icon: ShoppingCart,
        roles: ["owner", "admin_kasir", "staff_gudang", "super_admin", "admin"],
        children: [
          {
            label: "Transaksi Penjualan",
            href: "/sales",
            icon: ShoppingCart,
            roles: ["owner", "admin_kasir", "super_admin", "admin"],
          },
          {
            label: "Riwayat Transaksi",
            href: "/sales/history",
            icon: Layers,
            roles: [
              "owner",
              "admin_kasir",
              "staff_gudang",
              "super_admin",
              "admin",
            ],
          },
        ],
      },
      {
        label: "Laporan",
        href: "/reports/sales",
        icon: BarChart3,
        roles: ["owner", "super_admin", "staff_keuangan"],
        children: [
          {
            label: "Laporan Penjualan",
            href: "/reports/sales",
            icon: TrendingUp,
            roles: ["owner", "super_admin", "staff_keuangan"],
          },
          {
            label: "Pengeluaran Harian",
            href: "/reports/expenses",
            icon: Wallet,
            roles: ["owner", "super_admin", "staff_keuangan"],
          },
          {
            label: "Laporan Keuangan",
            href: "/reports/financial",
            icon: Receipt,
            roles: ["owner", "super_admin", "staff_keuangan"],
          },
        ],
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        label: "Data Produk",
        href: "/products",
        icon: Package,
        roles: ["owner", "staff_gudang", "super_admin"],
      },
      {
        label: "Cetak Barcode SKU",
        href: "/products/barcode",
        icon: Printer,
        roles: ["owner", "staff_gudang", "super_admin"],
      },
    ],
  },
  {
    title: "Administrasi",
    items: [
      {
        label: "Manajemen User",
        href: "/users",
        icon: Users,
        roles: ["owner", "super_admin"],
      },
      {
        label: "Pengaturan Toko",
        href: "/settings",
        icon: Settings,
        roles: ["owner", "super_admin"],
      },
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
  userRole = "owner",
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

  const getRoleLabel = (role: string) => {
    if (role === "owner" || role === "super_admin") return "Owner";
    if (role === "staff_gudang") return "Staff Admin";
    if (role === "staff_keuangan") return "Staff Keuangan";
    return "Staff Marketing";
  };

  // State untuk collapsible sub-menu (buka/tutup)
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    return {
      Transaksi: true,
      Laporan: true,
    };
  });

  // Sinkronisasi otomatis agar sub-menu tetap terbuka jika halaman anak sedang aktif
  useEffect(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          );
          if (isChildActive) {
            setOpenSubmenus((prev) => ({
              ...prev,
              [item.label]: true,
            }));
          }
        }
      }
    }
  }, [pathname]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Filter sections and items based on role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.roles && !item.roles.includes(userRole)) return false;
        if (item.children) {
          return item.children.some(
            (c) => !c.roles || c.roles.includes(userRole),
          );
        }
        return true;
      }),
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
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
                const hasChildren = item.children && item.children.length > 0;
                const isSubmenuOpen = hasChildren ? !!openSubmenus[item.label] : false;
                const isChildActive = hasChildren && item.children!.some(
                  (child) => pathname === child.href || pathname.startsWith(child.href + "/")
                );
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                if (hasChildren) {
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.label)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left",
                          isChildActive || isActive
                            ? "bg-[#055b5a]/40 text-white font-semibold shadow-xs"
                            : "text-teal-100/70 hover:text-white hover:bg-[#073332]"
                        )}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isChildActive || isActive ? "text-teal-300" : "text-teal-200/70"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            isSubmenuOpen ? "rotate-0 text-white" : "-rotate-90 text-teal-400/60"
                          )}
                        />
                      </button>

                      {isSubmenuOpen && (
                        <div className="ml-5 pl-2.5 border-l border-teal-800/80 mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.children!
                            .filter(
                              (child) =>
                                !child.roles || child.roles.includes(userRole),
                            )
                            .map((child) => {
                              const ChildIcon = child.icon;
                              const childActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition",
                                    childActive
                                      ? "bg-[#055b5a] text-white font-bold shadow-xs"
                                      : "text-teal-200/70 hover:bg-[#073332] hover:text-white",
                                  )}
                                >
                                  <ChildIcon className="h-3.5 w-3.5" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-[#055b5a] text-white font-semibold shadow-sm"
                          : "text-teal-100/70 hover:text-white hover:bg-[#073332]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-teal-200/70",
                        )}
                      />
                      <span className="truncate flex-1">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: User Profile Card & Logout */}
        <div className="p-3 border-t border-[#083b3a] bg-[#021716]/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#021716] border border-[#083b3a]">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition group/profile"
              title="Buka Pengaturan Profil"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#055b5a] text-xs font-bold text-white shadow-xs group-hover/profile:ring-1 group-hover/profile:ring-teal-400">
                {getInitials(userName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-teal-100 truncate leading-tight group-hover/profile:text-white">
                  {userName}
                </span>
                <span className="text-[10px] font-medium text-teal-300/80 truncate">
                  {getRoleLabel(userRole)}
                </span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-teal-200/70 hover:text-rose-300 hover:bg-rose-950/40 transition ml-1"
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
          className="flex h-10 w-10 items-center justify-center transition hover:scale-105"
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
      </div>

      {/* Navigation Icons (Scrollable) */}
      <nav className="flex flex-1 flex-col items-center gap-1.5 py-4 overflow-y-auto no-scrollbar">
        {visibleSections.flatMap((section) =>
          section.items.map((item) => {
            const Icon = item.icon;
            const targetHref = item.children
              ? item.children.find((c) => !c.roles || c.roles.includes(userRole))?.href || item.href
              : item.href;
            const isChildActive = item.children?.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + "/")
            );
            const isActive =
              pathname === item.href ||
              isChildActive ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={targetHref}
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl text-teal-200/70 transition-all duration-150 hover:bg-[#073332] hover:text-white",
                  isActive &&
                    "bg-[#055b5a] text-white ring-1 ring-[#055b5a] font-semibold shadow-xs",
                )}
                title={item.label}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-teal-200/70",
                  )}
                />

                {/* Tooltip on hover */}
                <div className="absolute left-14 z-50 hidden rounded-md bg-[#021716] px-2.5 py-1 text-xs font-medium text-white shadow-md group-hover:block whitespace-nowrap border border-[#083b3a] pointer-events-none">
                  {item.label}
                </div>
              </Link>
            );
          }),
        )}
      </nav>

      {/* Bottom Action: Profile & Logout */}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <Link
          href="/profile"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-teal-200/70 hover:bg-[#073332] hover:text-white transition-all"
          title="Pengaturan Profil"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#055b5a] text-[11px] font-bold text-white shadow-xs">
            {getInitials(userName)}
          </div>
          <div className="absolute left-14 z-50 hidden rounded-md bg-[#021716] px-2.5 py-1 text-xs font-medium text-teal-100 shadow-md group-hover:block whitespace-nowrap border border-[#083b3a] pointer-events-none">
            Pengaturan Profil
          </div>
        </Link>

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
