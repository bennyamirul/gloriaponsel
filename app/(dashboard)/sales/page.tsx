import { getProducts } from "@/lib/actions/product.actions";
import { getStoreSettings } from "@/lib/actions/setting.actions";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SalesPosClient } from "@/components/sales/sales-pos-client";
import { ShoppingBag } from "lucide-react";

export default async function SalesPage() {
  const [user, productsData, recentSales, storeSettings] = await Promise.all([
    requireAuth(),
    getProducts({ status: "available", limit: 200 }),
    db.sale.findMany({
      where: { customerName: { not: null } },
      select: { id: true, customerName: true, customerPhone: true },
      distinct: ["customerName"],
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getStoreSettings(),
  ]);

  const customerList = recentSales
    .filter((s) => s.customerName)
    .map((s) => ({
      id: s.id,
      name: s.customerName as string,
      phone: s.customerPhone || null,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Transaksi Penjualan
          </h2>
          <p className="text-xs text-muted-foreground">
            Scan barcode stiker / IMEI atau cari produk. Item otomatis masuk ke daftar belanja.
          </p>
        </div>
      </div>

      <SalesPosClient
        products={productsData.products}
        customers={customerList}
        storeSettings={storeSettings}
        currentUserRole={user.role}
      />
    </div>
  );
}
