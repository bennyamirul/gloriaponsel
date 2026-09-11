"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  userRole?: string;
  userName?: string;
}

export function DashboardShell({
  children,
  title = "Dashboard",
  userRole = "super_admin",
  userName = "Owner Toko",
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar (Fixed left ~80px) */}
      <Sidebar userRole={userRole} />

      {/* Main Container */}
      <div className="flex flex-col md:pl-20 min-h-screen transition-all duration-300">
        {/* Sticky Topbar */}
        <Topbar title={title} userRole={userRole} userName={userName} />

        {/* Content Area with responsive padding and mobile bottom nav clearance */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Fixed bottom) */}
      <BottomNav userRole={userRole} />
    </div>
  );
}
