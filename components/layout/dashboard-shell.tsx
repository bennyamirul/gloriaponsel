"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";

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
  const [isExpanded, setIsExpanded] = useState(true);

  // Restore user's sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_expanded");
      if (saved !== null) {
        setIsExpanded(saved === "true");
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_expanded", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar (Collapsible / Expandable) */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        isExpanded={isExpanded}
        onToggle={toggleSidebar}
      />

      {/* Main Container with dynamic transition padding */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isExpanded ? "md:pl-64" : "md:pl-20"
        )}
      >
        {/* Sticky Topbar */}
        <Topbar
          title={title}
          userRole={userRole}
          userName={userName}
          isSidebarExpanded={isExpanded}
          onToggleSidebar={toggleSidebar}
        />

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
