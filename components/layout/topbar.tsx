"use client";

import { useState } from "react";
import Image from "next/image";
import { logoutAction } from "@/lib/actions/auth.actions";
import { Search, Bell, Smartphone, PanelLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopbarProps {
  title?: string;
  userName?: string;
  userRole?: string;
  isSidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({
  title = "Dashboard",
  userName = "Owner Toko",
  userRole = "super_admin",
  isSidebarExpanded = true,
  onToggleSidebar,
}: TopbarProps) {
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
          Super Admin
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
        Admin
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-8 backdrop-blur-md transition-all">
      {/* Left: Desktop Toggle, Mobile Brand & Page Title */}
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground"
            title={isSidebarExpanded ? "Kecilkan Sidebar" : "Buka Sidebar"}
            aria-label="Toggle Sidebar"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </Button>
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm border border-border md:hidden overflow-hidden shrink-0">
          <Image
            src="/logoGP.png"
            alt="Gloria Ponsel"
            width={32}
            height={32}
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      {/* Middle: Desktop Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari transaksi, produk, atau SKU..."
            className="w-full bg-muted/60 pl-10 pr-4 text-sm focus:bg-background"
          />
        </div>
      </div>

      {/* Right: Actions (Notification, Mobile Search Toggle, User Dropdown) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Search Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden text-muted-foreground"
          onClick={() => setIsSearchOpenMobile(!isSearchOpenMobile)}
          aria-label="Cari"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full p-1 transition hover:bg-muted focus:outline-none">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {userName}
                </span>
                <span className="text-[11px] capitalize text-muted-foreground">
                  {userRole.replace("_", " ")}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <div className="pt-1">{getRoleBadge(userRole)}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/settings";
                }
              }}
            >
              Pengaturan Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
              onClick={async () => {
                await logoutAction();
              }}
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Overlay Bar */}
      {isSearchOpenMobile && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-card p-3 shadow-md md:hidden animate-in slide-in-from-top-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari transaksi, produk, SKU..."
              className="w-full bg-muted pl-9 text-sm"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
