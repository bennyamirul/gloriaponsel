import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowUpRight,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

export default async function DashboardPage(props: {
  searchParams?: Promise<{ access_denied?: string }>;
}) {
  const user = await getCurrentUser();
  const searchParams = await props.searchParams;
  const isAccessDenied = searchParams?.access_denied === "true";
  const isSuperAdmin = user?.role === "super_admin";

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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Halo, {user?.name || "Pengguna"}! 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan operasional toko handphone hari ini • Masuk sebagai{" "}
            <span className="font-semibold text-foreground capitalize">
              {user?.role.replace("_", " ") || "Admin"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Badge variant="outline" className="px-3 py-1 bg-white shadow-sm font-medium">
            Status Sistem: <span className="ml-1 text-emerald-600 font-semibold">Online</span>
          </Badge>
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
                Rp 14.500.000
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <ArrowUpRight className="h-4 w-4" />
                <span>+12.5% dari kemarin</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Transaksi */}
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
                8 Transaksi
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span>Rata-rata: Rp 1.812.500</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Stok Menipis */}
        <Card className="border-0 shadow-sm bg-[var(--warning-bg)]/60 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Stok Menipis</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/15 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                3 Produk
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                <span>Perlu restock segera</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  Rp 2.850.000
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                  <span>Margin: ~19.6% (Super Admin)</span>
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
                  48 SKU
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <span>Semua produk aktif</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Placeholder Grid for Chart & Quick Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Chart Container */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Tren Penjualan (7 Hari Terakhir)</h3>
                <p className="text-xs text-muted-foreground">Grafik fluktuasi omzet penjualan harian</p>
              </div>
              <Badge variant="secondary">Grafik Omzet</Badge>
            </div>
            <div className="flex h-64 items-center justify-center rounded-xl bg-muted/30 border border-dashed border-border mt-6">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-8 w-8 text-indigo-500" />
                <span className="text-sm font-medium">Recharts Shell Siap (Data transaksi riil dihubungkan di Phase 3)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Container */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Produk Terlaris</h3>
                <p className="text-xs text-muted-foreground">Bulan ini</p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                { name: "Samsung Galaxy A55 5G", brand: "Samsung", sold: 18 },
                { name: "iPhone 15 128GB", brand: "Apple", sold: 12 },
                { name: "Redmi Note 13 Pro", brand: "Xiaomi", sold: 9 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{item.brand}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {item.sold} terjual
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
