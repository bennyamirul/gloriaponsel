import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/actions/category.actions";
import { getBrands } from "@/lib/actions/brand.actions";
import {
  getSalesReport,
  getStockReport,
  getProfitReport,
  getBestSellersReport,
} from "@/lib/actions/report.actions";
import { ReportsClient } from "@/components/reports/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "super_admin";

  const [categories, brands, salesReport, stockReport, bestSellers, profitReport] =
    await Promise.all([
      getCategories(),
      getBrands(),
      getSalesReport(),
      getStockReport(),
      getBestSellersReport(),
      isSuperAdmin ? getProfitReport() : Promise.resolve(null),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Laporan Bisnis & Analitik
        </h2>
        <p className="text-sm text-muted-foreground">
          Pantau omzet penjualan, valuasi stok gudang, produk terlaris, dan performa laba-rugi toko handphone.
        </p>
      </div>

      <ReportsClient
        userRole={user?.role || "admin"}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        initialSalesReport={salesReport}
        initialStockReport={stockReport}
        initialProfitReport={profitReport}
        initialBestSellers={bestSellers}
      />
    </div>
  );
}
