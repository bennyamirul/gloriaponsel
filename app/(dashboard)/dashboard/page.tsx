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
  const isSuperAdmin = user?.role === "super_admin";

  const todayDateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Jika user adalah Admin Kasir (bukan Owner/Super Admin), tampilkan Dashboard Kasir khusus
  if (!isSuperAdmin) {
    return (
      <CashierDashboard
        user={{
          id: user?.id || "",
          name: user?.name || "Kasir",
          email: user?.email || "",
          role: user?.role || "admin",
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
      {/* Access Denied Banner if Admin attempted to access Super Admin route */}
      {isAccessDenied && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-rose-800 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Akses Terbatas</p>
            <p className="text-xs text-rose-700">
              Anda tidak memiliki hak akses (Super Admin) untuk membuka halaman tersebut.
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
          <p className="text-xs text-muted-foreground">
            {todayDateStr}
          </p>
        </div>
        <Button asChild size="sm" className="font-semibold gap-1.5 shadow-xs w-fit">
          <Link href="/sales">
            <ShoppingCart className="h-4 w-4" />
            <span>Kasir POS</span>
          </Link>
        </Button>
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
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.omzetToday)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                {summary.revenueChangePercentage >= 0 ? (
                  <span className="inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    +{summary.revenueChangePercentage}% vs kemarin
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
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    +{summary.monthRevenueChangePercentage}% vs bln lalu
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
                {summary.transactionsTodayCount} <span className="text-xs font-normal text-muted-foreground">trx</span>
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
                {summary.transactionsThisMonthCount} <span className="text-xs font-normal text-muted-foreground">trx</span>
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
        isSuperAdmin={isSuperAdmin}
      />

      {/* Tren Penjualan (7 Hari Terakhir) */}
      <Card className="shadow-xs border border-border/70 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Tren Penjualan (7 Hari Terakhir)</span>
            </h3>
          </div>
          <SalesTrendChart data={summary.salesChart} />
        </CardContent>
      </Card>

      {/* Recent Transactions Section */}
      <Card className="shadow-xs border border-border/70 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span>Transaksi Terakhir</span>
            </h3>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
              <Link href="/sales">
                <span>Lihat Semua</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {summary.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Belum ada transaksi penjualan tercatat.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/sales">Mulai Transaksi Baru</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-muted-foreground">
                      <th className="pb-3">No. Faktur</th>
                      <th className="pb-3">Pelanggan</th>
                      <th className="pb-3">Waktu</th>
                      <th className="pb-3">Item</th>
                      <th className="pb-3">Metode</th>
                      <th className="pb-3 text-right">Total</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs font-semibold text-foreground">
                          {sale.invoiceNo}
                        </td>
                        <td className="py-3 text-sm text-foreground">
                          {sale.customerName}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-foreground">
                          {sale.itemCount} unit
                        </td>
                        <td className="py-3 text-xs capitalize text-muted-foreground">
                          {sale.paymentMethod}
                        </td>
                        <td className="py-3 text-right font-semibold text-foreground">
                          {formatRupiah(sale.total)}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              sale.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 text-[11px] font-semibold"
                                : "bg-rose-100 text-rose-800 text-[11px] font-semibold"
                            }
                          >
                            {sale.status === "completed" ? "Selesai" : "Batal"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (No horizontal scroll) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {summary.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {sale.invoiceNo}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          sale.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 text-[11px]"
                            : "bg-rose-100 text-rose-800 text-[11px]"
                        }
                      >
                        {sale.status === "completed" ? "Selesai" : "Batal"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sale.customerName}</span>
                      <span>
                        {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-xs text-muted-foreground">
                        {sale.itemCount} item • {sale.paymentMethod.toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatRupiah(sale.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
