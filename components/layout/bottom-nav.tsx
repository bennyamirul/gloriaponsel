"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth.actions";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  MoreHorizontal,
  Layers,
  Users,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Printer,
  TrendingUp,
  Wallet,
  Receipt,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface BottomNavProps {
  userRole?: string;
}

interface DrawerMenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DrawerSection {
  title: string;
  items: DrawerMenuItem[];
}

export function BottomNav({ userRole = "super_admin" }: BottomNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isOwner = userRole === "owner" || userRole === "super_admin";
  const isWarehouse = userRole === "staff_gudang";
  const isCashier = userRole === "admin_kasir" || userRole === "admin";
  const isFinance = userRole === "staff_keuangan";

  const getRoleLabel = (role: string) => {
    if (role === "owner" || role === "super_admin") return "Owner";
    if (role === "staff_gudang") return "Staff Admin";
    if (role === "staff_keuangan") return "Staff Keuangan";
    return "Staff Marketing";
  };

  // 1. Tentukan menu navigasi utama (Bottom Navigation Bar) sesuai hak akses role
  let mainTabs: { label: string; href: string; icon: React.ElementType }[] = [];

  if (isOwner) {
    mainTabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Produk", href: "/products", icon: Package },
      { label: "Kasir", href: "/sales", icon: ShoppingCart },
      { label: "Laporan", href: "/reports/sales", icon: BarChart3 },
    ];
  } else if (isWarehouse) {
    // Staff Admin: Dashboard, Produk, Katalog, Cetak Barcode SKU
    mainTabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Produk", href: "/products", icon: Package },
      { label: "Katalog", href: "/catalogs", icon: BookOpen },
      { label: "Barcode", href: "/products/barcode", icon: Printer },
    ];
  } else if (isCashier) {
    // Staff Marketing / Kasir: Dashboard, Kasir POS, Produk Ready, Riwayat Transaksi
    mainTabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Kasir", href: "/sales", icon: ShoppingCart },
      { label: "Produk", href: "/products", icon: Package },
      { label: "Riwayat", href: "/sales/history", icon: Layers },
    ];
  } else if (isFinance) {
    // Staff Keuangan: Dashboard, Laporan Penjualan, Pengeluaran Harian, Laporan Keuangan
    mainTabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Penjualan", href: "/reports/sales", icon: TrendingUp },
      { label: "Pengeluaran", href: "/reports/expenses", icon: Wallet },
      { label: "Keuangan", href: "/reports/financial", icon: Receipt },
    ];
  } else {
    mainTabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Profil", href: "/profile", icon: User },
    ];
  }

  // 2. Tentukan menu tambahan di dalam Drawer ("Lainnya") yang rapi dan terkelompok
  const drawerSections: DrawerSection[] = [];

  if (isOwner) {
    drawerSections.push(
      {
        title: "Operasional",
        items: [
          { label: "Riwayat Transaksi", href: "/sales/history", icon: Layers },
          { label: "Pengeluaran Harian", href: "/reports/expenses", icon: Wallet },
          { label: "Laporan Keuangan", href: "/reports/financial", icon: Receipt },
        ],
      },
      {
        title: "Master Data",
        items: [
          { label: "Katalog Produk", href: "/catalogs", icon: BookOpen },
          { label: "Cetak Barcode SKU", href: "/products/barcode", icon: Printer },
        ],
      },
      {
        title: "Administrasi",
        items: [
          { label: "Manajemen User", href: "/users", icon: Users },
          { label: "Role & Hak Akses", href: "/roles", icon: ShieldCheck },
          { label: "Pengaturan Toko", href: "/settings", icon: Settings },
        ],
      }
    );
  } else if (isWarehouse) {
    drawerSections.push({
      title: "Operasional",
      items: [
        { label: "Riwayat Transaksi", href: "/sales/history", icon: Layers },
      ],
    });
  } else if (isFinance) {
    drawerSections.push({
      title: "Laporan & Keuangan",
      items: [
        { label: "Laporan Penjualan", href: "/reports/sales", icon: TrendingUp },
        { label: "Pengeluaran Harian", href: "/reports/expenses", icon: Wallet },
        { label: "Laporan Keuangan", href: "/reports/financial", icon: Receipt },
      ],
    });
  }

  // Tambahkan grup Pengaturan Akun untuk semua role
  drawerSections.push({
    title: "Akun & Preferensi",
    items: [
      { label: "Pengaturan Profil", href: "/profile", icon: User },
    ],
  });

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-md md:hidden shadow-lg">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-2.5 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-indigo-600 font-bold"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-indigo-600")} />
              <span className="text-[11px] leading-none">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-2.5 text-xs font-medium text-muted-foreground transition-colors",
                isMoreOpen && "text-indigo-600"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[11px] leading-none">Lainnya</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-6">
            <SheetHeader className="pb-3 border-b border-border text-left">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-bold">Menu Navigasi</SheetTitle>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-0.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50"
                >
                  {getRoleLabel(userRole)}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-4 pt-3 max-h-[60vh] overflow-y-auto">
              {drawerSections.map((section, idx) => (
                <div key={idx} className="space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                    {section.title}
                  </p>
                  <div className="flex flex-col gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-xl p-2.5 text-sm font-medium text-foreground hover:bg-muted transition",
                            isActive && "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                                isActive && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs sm:text-sm">{item.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                onClick={async () => {
                  setIsMoreOpen(false);
                  await logoutAction();
                }}
                className="flex items-center gap-3 rounded-xl p-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold">Keluar Akun</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}

