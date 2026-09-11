"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  MoreHorizontal,
  Boxes,
  Layers,
  Tag,
  Truck,
  UserCheck,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

export function BottomNav({ userRole = "super_admin" }: BottomNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Produk", href: "/products", icon: Package },
    { label: "Kasir", href: "/sales", icon: ShoppingCart },
    { label: "Laporan", href: "/reports", icon: BarChart3 },
  ];

  const drawerMenuItems = [
    { label: "Manajemen Stok", href: "/stock", icon: Boxes },
    { label: "Kategori Produk", href: "/categories", icon: Layers },
    { label: "Brand Handphone", href: "/brands", icon: Tag },
    { label: "Data Supplier", href: "/suppliers", icon: Truck },
    { label: "Data Pelanggan", href: "/customers", icon: UserCheck },
    ...(userRole === "super_admin"
      ? [
          { label: "Manajemen User (Admin)", href: "/users", icon: Users },
          { label: "Pengaturan Toko", href: "/settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-md md:hidden">
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
                "flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-indigo-600 font-semibold"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-indigo-600")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium text-muted-foreground transition-colors",
                isMoreOpen && "text-indigo-600"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Lainnya</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-6">
            <SheetHeader className="pb-4 border-b border-border text-left">
              <SheetTitle className="text-base font-bold">Menu Tambahan</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 pt-4 max-h-[60vh] overflow-y-auto">
              {drawerMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl p-3 text-sm font-medium text-foreground hover:bg-muted transition",
                      isActive && "bg-indigo-50 text-indigo-700 font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                          isActive && "bg-indigo-100 text-indigo-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}

              <div className="my-2 border-t border-border" />

              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  if (typeof window !== "undefined") {
                    window.location.href = "/login";
                  }
                }}
                className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <LogOut className="h-4 w-4" />
                </div>
                <span>Keluar Akun</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
