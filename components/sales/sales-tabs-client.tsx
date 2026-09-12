"use client";

import { useState } from "react";
import { ShoppingCart, History, Printer, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesPosClient } from "@/components/sales/sales-pos-client";
import { SalesHistoryClient, SaleRecord } from "@/components/sales/sales-history-client";
import { SalesLifecycleClient } from "@/components/sales/sales-lifecycle-client";
import { SalesInvoicePrintClient } from "@/components/sales/sales-invoice-print-client";

interface SalesTabsClientProps {
  products: any[];
  customers: any[];
  initialSales: SaleRecord[];
  currentUserId: string;
  currentUserRole: string;
  lifecycleData?: {
    readyItems: any[];
    warrantyItems: any[];
    soldItems: any[];
    summary: {
      readyCount: number;
      warrantyCount: number;
      soldCount: number;
    };
  };
}

export function SalesTabsClient({
  products,
  customers,
  initialSales,
  currentUserId,
  currentUserRole,
  lifecycleData,
}: SalesTabsClientProps) {
  const isSuperAdmin = currentUserRole === "super_admin";
  const [activeTab, setActiveTab] = useState<"pos" | "history" | "invoice">("pos");

  const currentTab = !isSuperAdmin && activeTab === "invoice" ? "pos" : activeTab;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Transaksi
          </h2>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === "pos"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === "history"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Manajemen Unit</span>
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("invoice")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === "invoice"
                  ? "bg-card text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {currentTab === "pos" ? (
        <SalesPosClient
          products={products}
          customers={customers}
          onSaleCreated={() => {
            if (isSuperAdmin) {
              setActiveTab("invoice");
            }
            window.location.reload();
          }}
        />
      ) : currentTab === "history" ? (
        lifecycleData ? (
          <SalesLifecycleClient
            initialReadyItems={lifecycleData.readyItems}
            initialWarrantyItems={lifecycleData.warrantyItems}
            initialSoldItems={lifecycleData.soldItems}
            userRole={currentUserRole}
          />
        ) : (
          <SalesHistoryClient
            initialSales={initialSales}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )
      ) : isSuperAdmin ? (
        <SalesInvoicePrintClient sales={initialSales as any} />
      ) : null}
    </div>
  );
}
