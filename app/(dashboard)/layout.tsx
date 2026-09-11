import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In Phase 1, user session will be injected here via Auth.js
  return (
    <DashboardShell title="Dashboard Toko" userRole="super_admin" userName="Owner Toko">
      {children}
    </DashboardShell>
  );
}
