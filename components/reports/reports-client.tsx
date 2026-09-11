"use client";

import { useState, useTransition } from "react";
import {
  BarChart3,
  Boxes,
  TrendingUp,
  Flame,
  Calendar,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSalesReport,
  getStockReport,
  getProfitReport,
  getBestSellersReport,
} from "@/lib/actions/report.actions";
import { SalesReportView } from "./sales-report-view";
import { StockReportView } from "./stock-report-view";
import { ProfitReportView } from "./profit-report-view";
import { BestSellerReportView } from "./bestseller-report-view";

interface ReportsClientProps {
  userRole: string;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  initialSalesReport: any;
  initialStockReport: any;
  initialProfitReport?: any;
  initialBestSellers: any;
}

export function ReportsClient({
  userRole,
  categories,
  brands,
  initialSalesReport,
  initialStockReport,
  initialProfitReport,
  initialBestSellers,
}: ReportsClientProps) {
  const isSuperAdmin = userRole === "super_admin";

  const [activeTab, setActiveTab] = useState<"sales" | "stock" | "profit" | "bestseller">("sales");

  // Date Range State
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [datePreset, setDatePreset] = useState<"today" | "7days" | "30days" | "this_month" | "custom">(
    "this_month"
  );

  // Data states
  const [salesData, setSalesData] = useState(initialSalesReport);
  const [stockData, setStockData] = useState(initialStockReport);
  const [profitData, setProfitData] = useState(initialProfitReport || null);
  const [bestSellersData, setBestSellersData] = useState(initialBestSellers);

  // Best seller options
  const [bestSellerSort, setBestSellerSort] = useState<"qty" | "revenue">("qty");
  const [bestSellerLimit, setBestSellerLimit] = useState(10);

  const [isPending, startTransition] = useTransition();

  // Handle Preset Date Range Selection
  const applyPreset = (preset: "today" | "7days" | "30days" | "this_month") => {
    const current = new Date();
    const end = current.toISOString().slice(0, 10);
    let start = end;

    if (preset === "today") {
      start = end;
    } else if (preset === "7days") {
      const d = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 6);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "30days") {
      const d = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 29);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "this_month") {
      start = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().slice(0, 10);
    }

    setDatePreset(preset);
    setStartDate(start);
    setEndDate(end);

    loadReportsForDates(start, end);
  };

  // Fetch reports when dates are applied
  const loadReportsForDates = (start: string, end: string) => {
    startTransition(async () => {
      try {
        if (activeTab === "sales") {
          const res = await getSalesReport({ startDate: start, endDate: end });
          setSalesData(res);
        } else if (activeTab === "profit" && isSuperAdmin) {
          const res = await getProfitReport({ startDate: start, endDate: end });
          setProfitData(res);
        } else if (activeTab === "bestseller") {
          const res = await getBestSellersReport({
            startDate: start,
            endDate: end,
            sortBy: bestSellerSort,
            limit: bestSellerLimit,
          });
          setBestSellersData(res);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat data laporan.");
      }
    });
  };

  // Stock filter change
  const handleStockFilterChange = (filters: {
    categoryId?: string;
    brandId?: string;
    stockStatus?: any;
  }) => {
    startTransition(async () => {
      try {
        const res = await getStockReport(filters);
        setStockData(res);
      } catch (err: any) {
        toast.error("Gagal memfilter laporan stok.");
      }
    });
  };

  // Best sellers filter change
  const handleBestSellerFilterChange = (sortBy: "qty" | "revenue", limit: number) => {
    setBestSellerSort(sortBy);
    setBestSellerLimit(limit);
    startTransition(async () => {
      try {
        const res = await getBestSellersReport({
          startDate,
          endDate,
          sortBy,
          limit,
        });
        setBestSellersData(res);
      } catch (err: any) {
        toast.error("Gagal memfilter best sellers.");
      }
    });
  };

  // Tab switch handler
  const handleTabChange = (tab: "sales" | "stock" | "profit" | "bestseller") => {
    setActiveTab(tab);
    if (tab === "sales" && !salesData) {
      loadReportsForDates(startDate, endDate);
    } else if (tab === "profit" && isSuperAdmin && !profitData) {
      loadReportsForDates(startDate, endDate);
    } else if (tab === "bestseller" && !bestSellersData) {
      loadReportsForDates(startDate, endDate);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === "sales" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("sales")}
            className="rounded-xl font-semibold text-xs"
          >
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Laporan Penjualan
          </Button>

          <Button
            variant={activeTab === "stock" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("stock")}
            className="rounded-xl font-semibold text-xs"
          >
            <Boxes className="mr-1.5 h-4 w-4" />
            Laporan Stok & Valuasi
          </Button>

          {isSuperAdmin && (
            <Button
              variant={activeTab === "profit" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange("profit")}
              className="rounded-xl font-semibold text-xs relative"
            >
              <TrendingUp className="mr-1.5 h-4 w-4 text-emerald-600" />
              Laba-Rugi (P&L)
            </Button>
          )}

          <Button
            variant={activeTab === "bestseller" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("bestseller")}
            className="rounded-xl font-semibold text-xs"
          >
            <Flame className="mr-1.5 h-4 w-4 text-amber-500" />
            Produk Terlaris
          </Button>
        </div>

        {/* Global Date Filter for tabs that use date ranges */}
        {activeTab !== "stock" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex rounded-xl bg-muted/60 p-1">
              <button
                onClick={() => applyPreset("today")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "today" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => applyPreset("7days")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "7days" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => applyPreset("this_month")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "this_month"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Range Picker */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 text-[11px] w-32 bg-white"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 text-[11px] w-32 bg-white"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadReportsForDates(startDate, endDate)}
                disabled={isPending}
                className="h-8 text-xs font-semibold px-2.5"
                title="Terapkan Rentang Tanggal"
              >
                {isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarDays className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      {isPending && (
        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground animate-pulse">
          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin text-primary" />
          Memuat data laporan terbaru...
        </div>
      )}

      {activeTab === "sales" && salesData && <SalesReportView data={salesData} />}

      {activeTab === "stock" && stockData && (
        <StockReportView
          data={stockData}
          categories={categories}
          brands={brands}
          onFilterChange={handleStockFilterChange}
        />
      )}

      {activeTab === "profit" && isSuperAdmin && profitData && (
        <ProfitReportView data={profitData} />
      )}

      {activeTab === "bestseller" && bestSellersData && (
        <BestSellerReportView
          data={bestSellersData}
          currentSortBy={bestSellerSort}
          currentLimit={bestSellerLimit}
          onFilterChange={handleBestSellerFilterChange}
        />
      )}
    </div>
  );
}
