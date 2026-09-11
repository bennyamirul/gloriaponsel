import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/actions/dashboard.actions";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Smartphone,
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

      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Halo, {user?.name || "Pengguna"}! 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            {todayDateStr} • Masuk sebagai{" "}
            <span className="font-semibold text-foreground capitalize">
              {user?.role.replace("_", " ") || "Admin"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="shadow-sm font-semibold">
            <Link href="/sales">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Buka Kasir POS
            </Link>
          </Button>
        </div>
      </div>

      {/* Pastel Stat Cards Grid (4 cols on xl, 2 cols on md, 1 col on mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Omzet Hari Ini */}
        <Card className="border-0 shadow-sm bg-[var(--info-bg)]/60 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Omzet Hari Ini</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {formatRupiah(summary.omzetToday)}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                {summary.revenueChangePercentage >= 0 ? (
                  <span className="flex items-center text-emerald-700">
                    <ArrowUpRight className="h-4 w-4 mr-0.5" />
                    +{summary.revenueChangePercentage}% vs kemarin
                  </span>
                ) : (
                  <span className="flex items-center text-rose-600">
                    <ArrowDownRight className="h-4 w-4 mr-0.5" />
                    {summary.revenueChangePercentage}% vs kemarin
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Transaksi Hari Ini */}
        <Card className="border-0 shadow-sm bg-[var(--purple-bg)]/60 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Transaksi Hari Ini</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/15 text-purple-700">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {summary.transactionsTodayCount} Transaksi
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span>Rata-rata: {formatRupiah(avgTransaction)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Stok Menipis */}
        <Link href="/stock" className="block">
          <Card className="border-0 shadow-sm bg-[var(--warning-bg)]/60 hover:shadow-md hover:ring-1 hover:ring-amber-300 transition-all cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Stok Menipis</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/15 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {summary.lowStockCount} Produk
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs text-amber-800 font-semibold">
                  <span>{summary.lowStockCount > 0 ? "Perlu restock segera" : "Stok aman terkendali"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Role-Based (Laba Kotor untuk Super Admin, Produk Aktif untuk Admin) */}
        {isSuperAdmin ? (
          <Card className="border-0 shadow-sm bg-[var(--success-bg)]/60 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Estimasi Laba Kotor
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {formatRupiah(summary.profitToday ?? 0)}
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                  <span>Margin: ~{summary.marginPercentage}% (Super Admin)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm bg-[var(--success-bg)]/60 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Produk Siap Jual
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {summary.totalActiveProducts} SKU
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <span>Semua produk aktif</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grid: Sales Trend Chart & Top 5 Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Chart Container (2 cols on lg) */}
        <Card className="lg:col-span-2 shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Tren Penjualan (7 Hari Terakhir)</h3>
                <p className="text-xs text-muted-foreground">Fluktuasi omzet harian berdasarkan transaksi lunas</p>
              </div>
              <Badge variant="secondary" className="font-semibold text-xs">
                Grafik Omzet
              </Badge>
            </div>
            <SalesTrendChart data={summary.salesChart} />
          </CardContent>
        </Card>

        {/* Top Products Container (1 col on lg) */}
        <Card className="lg:col-span-1 shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Produk Terlaris</h3>
                <p className="text-xs text-muted-foreground">Berdasarkan kuantitas terjual</p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-2.5">
              {summary.topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Belum ada data penjualan produk</p>
                </div>
              ) : (
                summary.topProducts.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{item.brand}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 shrink-0">
                      {item.soldCount} unit
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Transaksi Terakhir</h3>
              <p className="text-xs text-muted-foreground">
                5 transaksi kasir terbaru di sistem
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="font-semibold text-xs">
              <Link href="/sales">
                Lihat Semua Transaksi
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
