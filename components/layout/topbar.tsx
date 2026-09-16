"use client";

import { useState } from "react";
import Image from "next/image";
import { logoutAction } from "@/lib/actions/auth.actions";
import { PanelLeft } from "lucide-react";
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
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

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

  const getRoleLabel = (role: string) => {
    if (role === "super_admin" || role === "owner") return "Owner";
    if (role === "staff_gudang") return "Staff Admin";
    if (role === "staff_keuangan") return "Staff Keuangan";
    return "Staff Marketing";
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
        <div className="flex h-8 w-8 items-center justify-center md:hidden shrink-0">
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

      {/* Right: Actions (Notification, User Dropdown) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications Dropdown */}
        <NotificationDropdown userRole={userRole} />

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
                <span className="text-[11px] text-muted-foreground">
                  {getRoleLabel(userRole)}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Role: {getRoleLabel(userRole)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile" className="cursor-pointer">
                Pengaturan Profil
              </a>
            </DropdownMenuItem>
            {(userRole === "owner" || userRole === "super_admin") && (
              <DropdownMenuItem asChild>
                <a href="/settings" className="cursor-pointer">
                  Pengaturan Toko
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
              onClick={async () => {
                await logoutAction();
              }}
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
