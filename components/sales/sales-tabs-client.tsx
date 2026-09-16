"use client";

import { ShoppingBag } from "lucide-react";
import { SalesPosClient } from "@/components/sales/sales-pos-client";

interface SalesTabsClientProps {
  products: any[];
  customers: any[];
  currentUserRole: string;
  storeSettings?: any;
}

export function SalesTabsClient({
  products,
  customers,
  currentUserRole,
  storeSettings,
}: SalesTabsClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Transaksi Penjualan
            </h2>
            <p className="text-xs text-muted-foreground">
              Scan barcode stiker / IMEI atau cari produk. Item otomatis masuk
              ke daftar belanja.
            </p>
          </div>
        </div>
      </div>

      <SalesPosClient
        products={products}
        customers={customers}
        storeSettings={storeSettings}
      />
    </div>
  );
}
