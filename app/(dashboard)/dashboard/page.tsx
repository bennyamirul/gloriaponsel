import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/actions/dashboard.actions";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { AdminPerformanceSection } from "@/components/dashboard/admin-performance-section";
import { CashierDashboard } from "@/components/dashboard/cashier-dashboard";
import { WarehouseDashboard } from "@/components/dashboard/warehouse-dashboard";
import { FinanceDashboard } from "@/components/dashboard/finance-dashboard";
import { OwnerRecentSales } from "@/components/dashboard/owner-recent-sales";
import { ShopeeMarketTrendsCard } from "@/components/dashboard/shopee-market-trends";
import { getFinanceDashboardData } from "@/lib/actions/dashboard.actions";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ArrowRight,
  Clock,
  Receipt,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: {
  searchParams?: Promise<{ access_denied?: string }>;
}) {
  const [user, summary] = await Promise.all([
    getCurrentUser(),
    getDashboardSummary(),
  ]);

  const searchParams = await props.searchParams;
  const isAccessDenied = searchParams?.access_denied === "true";
  const userRole = user?.role || "admin_kasir";
  const isOwner = userRole === "owner" || userRole === "super_admin";
  const isWarehouse = userRole === "staff_gudang";
  const isFinance = userRole === "staff_keuangan";

  const todayDateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // 1. Jika user adalah Staff Gudang (Staff Admin), tampilkan Dashboard Gudang & Logistik
  if (isWarehouse) {
    return (
      <WarehouseDashboard
        user={{
          id: user?.id || "",
          name: user?.name || user?.username || "Staff Admin",
          username: user?.username,
          role: userRole,
        }}
        todayDateStr={todayDateStr}
        data={summary.warehouseData}
      />
    );
  }

  // 2. Jika user adalah Staff Keuangan, tampilkan Dashboard Finansial & Highlight Laporan
  if (isFinance) {
    const financeData = await getFinanceDashboardData();
    return (
      <FinanceDashboard
        user={{
          id: user?.id || "",
          name: user?.name || user?.username || "Staff Keuangan",
          username: user?.username,
          role: userRole,
        }}
        todayDateStr={todayDateStr}
        data={financeData}
      />
    );
  }

  // 3. Jika user adalah Staff Marketing (admin_kasir), tampilkan Dashboard Kasir khusus
  if (!isOwner) {
    return (
      <CashierDashboard
        user={{
          id: user?.id || "",
          name: user?.name || user?.username || "Staff Marketing",
          email: user?.email || "",
          role: userRole,
        }}
        initialData={summary.cashierData}
        initialMonth={summary.initialMonth}
        initialYear={summary.initialYear}
        initialPeriodName={summary.currentMonthName}
        availableYears={summary.availableYears}
        todayDateStr={todayDateStr}
      />
    );
  }

  const avgTransaction =
    summary.transactionsTodayCount > 0
      ? summary.omzetToday / summary.transactionsTodayCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Access Denied Banner if unauthorized route accessed */}
      {isAccessDenied && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-rose-800 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Akses Terbatas</p>
            <p className="text-xs text-rose-700">
              Anda tidak memiliki hak akses untuk membuka halaman tersebut.
            </p>
          </div>
        </div>
      )}

      {/* Header Halaman Clean */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">{todayDateStr}</p>
        </div>
        {/* <Button asChild size="sm" className="font-semibold gap-1.5 shadow-xs w-fit">
          <Link href="/sales">
            <ShoppingCart className="h-4 w-4" />
            <span>Kasir POS</span>
          </Link>
        </Button> */}
      </div>

      {/* 4 Kartu Ringkasan Utama: Omset Hari Ini, Omset Bulan Ini, Transaksi Hari Ini, Transaksi Bulan Ini */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Omset Hari Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Omset Hari Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <span>Rp</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.omzetToday)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                {summary.revenueChangePercentage >= 0 ? (
                  <span className="inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />+
                    {summary.revenueChangePercentage}% vs kemarin
                  </span>
                ) : (
                  <span className="inline-flex items-center font-medium text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    {summary.revenueChangePercentage}% vs kemarin
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Omset Bulan Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Omset Bulan Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.omzetThisMonth)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                {summary.monthRevenueChangePercentage >= 0 ? (
                  <span className="inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />+
                    {summary.monthRevenueChangePercentage}% vs bln lalu
                  </span>
                ) : (
                  <span className="inline-flex items-center font-medium text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    {summary.monthRevenueChangePercentage}% vs bln lalu
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Transaksi Hari Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Transaksi Hari Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-foreground">
                {summary.transactionsTodayCount}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  trx
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Rata-rata: {formatRupiah(avgTransaction)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Transaksi Bulan Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Transaksi Bulan Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-foreground">
                {summary.transactionsThisMonthCount}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  trx
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Periode {summary.currentMonthName}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bagian Kinerja Admin Kasir */}
      <AdminPerformanceSection
        initialData={summary.adminPerformance}
        initialMonth={summary.initialMonth}
        initialYear={summary.initialYear}
        initialPeriodName={summary.currentMonthName}
        availableYears={summary.availableYears}
        isSuperAdmin={isOwner}
      />

      {/* 3 Kolom Sejajar: Tren Penjualan (Kiri) | Best Seller Toko (Tengah) | Tren Pasar Shopee (Kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Paling Kiri: Tren Penjualan (7 Hari) */}
        <Card className="shadow-xs border border-border/70 rounded-xl h-full flex flex-col bg-card">
          <CardContent className="p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Tren Penjualan (7 Hari)</span>
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                Omset Harian
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center pt-2">
              <SalesTrendChart data={summary.salesChart} />
            </div>
          </CardContent>
        </Card>

        {/* 2. Tengah: Best Seller Toko (Internal POS) */}
        <Card className="shadow-xs border border-border/70 rounded-xl h-full flex flex-col bg-card">
          <CardContent className="p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Best Seller Toko</span>
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                Laba Terbesar
              </span>
            </div>

            <div className="mt-3.5 space-y-2 flex-1">
              {!summary.bestSellers || summary.bestSellers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-xs text-muted-foreground">
                  <Award className="h-8 w-8 text-slate-300 mb-2 opacity-50" />
                  Belum ada data penjualan produk.
                </div>
              ) : (
                summary.bestSellers.map((prod: any, idx: number) => (
                  <div
                    key={prod.productId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition border border-border/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : idx === 1
                            ? "bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200"
                            : idx === 2
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {prod.brand} • {prod.qty} unit terjual
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatRupiah(prod.profit)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Paling Kanan: Tren Pasar Shopee */}
        <ShopeeMarketTrendsCard />
      </div>

      {/* Recent Transactions Section with Editable Commission */}
      <OwnerRecentSales
        initialSales={summary.recentSales as any}
        isOwner={isOwner}
      />
    </div>
  );
}
