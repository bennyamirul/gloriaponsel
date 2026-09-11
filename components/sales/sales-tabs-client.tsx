"use client";

import { useState } from "react";
import { ShoppingCart, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesPosClient } from "@/components/sales/sales-pos-client";
import { SalesHistoryClient, SaleRecord } from "@/components/sales/sales-history-client";

interface SalesTabsClientProps {
  products: any[];
  customers: any[];
  initialSales: SaleRecord[];
  currentUserId: string;
  currentUserRole: string;
}

export function SalesTabsClient({
  products,
  customers,
  initialSales,
  currentUserId,
  currentUserRole,
}: SalesTabsClientProps) {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  return (
    <div className="space-y-6">
      {/* Tab Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Transaksi Penjualan
          </h2>
          <p className="text-sm text-muted-foreground">
            Kasir point-of-sale Gloria Ponsel dan riwayat transaksi faktur.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "pos"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Kasir Baru (POS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Riwayat Penjualan</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "pos" ? (
        <SalesPosClient
          products={products}
          customers={customers}
          onSaleCreated={() => {
            // Switch to history tab upon completing sale
            setActiveTab("history");
            window.location.reload();
          }}
        />
      ) : (
        <SalesHistoryClient
          initialSales={initialSales}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
