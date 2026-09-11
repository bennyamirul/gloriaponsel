"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  Trophy,
  Package,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  Medal,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BestSellerReportViewProps {
  data: {
    isSuperAdmin: boolean;
    grandTotalQty: number;
    grandTotalRevenue: number;
    startDate: string;
    endDate: string;
    items: {
      rank: number;
      productId: string;
      name: string;
      sku: string;
      variant: string | null;
      brandName: string;
      categoryName: string;
      qty: number;
      revenue: number;
      profit: number | null;
      margin: number | null;
      sellingPrice: number;
      sharePercentage: number;
    }[];
  };
  currentSortBy: "qty" | "revenue";
  currentLimit: number;
  onFilterChange: (sortBy: "qty" | "revenue", limit: number) => void;
}

export function BestSellerReportView({
  data,
  currentSortBy,
  currentLimit,
  onFilterChange,
}: BestSellerReportViewProps) {
  const { isSuperAdmin, grandTotalQty, grandTotalRevenue, startDate, endDate, items } = data;

  const handleExportCSV = () => {
    const headers = isSuperAdmin
      ? [
          "Peringkat",
          "Kode SKU",
          "Nama Produk",
          "Varian",
          "Kategori",
          "Brand",
          "Unit Terjual",
          "Kontribusi (%)",
          "Total Omzet",
          "Laba Kotor",
          "Margin (%)",
        ]
      : [
          "Peringkat",
          "Kode SKU",
          "Nama Produk",
          "Varian",
          "Kategori",
          "Brand",
          "Unit Terjual",
          "Kontribusi (%)",
          "Total Omzet",
        ];

    const rows = items.map((it) => {
      const baseRow = [
        `#${it.rank}`,
        it.sku,
        it.name,
        it.variant || "-",
        it.categoryName,
        it.brandName,
        it.qty,
        `${it.sharePercentage}%`,
        it.revenue,
      ];

      if (isSuperAdmin) {
        return [...baseRow, it.profit ?? 0, `${it.margin ?? 0}%`];
      }

      return baseRow;
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`Laporan_Produk_Terlaris_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Peringkat Produk Terlaris (Best Sellers)</h3>
            <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[10px]">
              <Flame className="h-3 w-3 mr-1 text-amber-600 fill-amber-600" />
              Top Performance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Periode: {new Date(startDate).toLocaleDateString("id-ID")} -{" "}
            {new Date(endDate).toLocaleDateString("id-ID")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerPrint}
            className="text-xs font-semibold"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Cetak PDF
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Ekspor Excel (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm bg-[var(--info-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total Unit Terjual</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-700">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">{grandTotalQty} Unit</h4>
              <p className="text-[11px] text-slate-600 mt-1">Akumulasi seluruh produk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--success-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total Omzet Terkumpul</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {formatRupiah(grandTotalRevenue)}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">Dari transaksi sukses</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--purple-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Juara Penjualan (#1)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/15 text-purple-700">
                <Trophy className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                {items[0]?.name || "-"}
              </h4>
              <p className="text-[11px] text-purple-800 font-semibold mt-1">
                {items[0] ? `${items[0].qty} unit (${formatRupiah(items[0].revenue)})` : "Belum ada penjualan"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Urutkan:</span>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => onFilterChange("qty", currentLimit)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                currentSortBy === "qty"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kuantitas (Unit)
            </button>
            <button
              onClick={() => onFilterChange("revenue", currentLimit)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                currentSortBy === "revenue"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Omzet (Rupiah)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Tampilkan:</span>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {[10, 20, 50].map((lim) => (
              <button
                key={lim}
                onClick={() => onFilterChange(currentSortBy, lim)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  currentLimit === lim
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Top {lim}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking List Table */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-5">
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Belum ada data penjualan pada periode ini.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="pb-3 text-center w-12">Rank</th>
                      <th className="pb-3">Produk</th>
                      <th className="pb-3">Kategori & Brand</th>
                      <th className="pb-3 text-center">Unit Terjual</th>
                      <th className="pb-3 w-40">Kontribusi</th>
                      <th className="pb-3 text-right">Total Omzet</th>
                      {isSuperAdmin && (
                        <>
                          <th className="pb-3 text-right">Laba Kotor</th>
                          <th className="pb-3 text-center">Margin</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((it) => (
                      <tr key={it.productId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs ${
                              it.rank === 1
                                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                                : it.rank === 2
                                ? "bg-slate-200 text-slate-800"
                                : it.rank === 3
                                ? "bg-amber-50 text-amber-800"
                                : "text-muted-foreground font-medium"
                            }`}
                          >
                            #{it.rank}
                          </span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-foreground">{it.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {it.sku} {it.variant ? `• ${it.variant}` : ""}
                          </p>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {it.categoryName} • {it.brandName}
                        </td>
                        <td className="py-3 text-center font-bold text-foreground text-sm">
                          {it.qty}
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Porsi:</span>
                              <span className="font-bold text-foreground">
                                {it.sharePercentage}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(3, it.sharePercentage))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right font-extrabold text-slate-900">
                          {formatRupiah(it.revenue)}
                        </td>
                        {isSuperAdmin && (
                          <>
                            <td className="py-3 text-right font-bold text-emerald-800">
                              {formatRupiah(it.profit ?? 0)}
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {it.margin}%
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {items.map((it) => (
                  <div
                    key={it.productId}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg font-bold text-xs ${
                            it.rank === 1
                              ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                              : it.rank === 2
                              ? "bg-slate-200 text-slate-800"
                              : it.rank === 3
                              ? "bg-amber-50 text-amber-800"
                              : "text-muted-foreground bg-slate-100 font-medium"
                          }`}
                        >
                          #{it.rank}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{it.sku}</span>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-bold">
                        {it.qty} unit terjual
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-foreground">{it.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {it.variant ? `${it.variant} • ` : ""}
                        {it.categoryName} ({it.brandName})
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Kontribusi:</span>
                        <span className="font-semibold text-foreground">{it.sharePercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(3, it.sharePercentage))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <span className="text-muted-foreground">Total Omzet:</span>
                      <span className="font-extrabold text-foreground">
                        {formatRupiah(it.revenue)}
                      </span>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center justify-between bg-emerald-50/60 p-2 rounded-lg text-xs text-emerald-900">
                        <span>Laba: {formatRupiah(it.profit ?? 0)}</span>
                        <span className="font-bold">Margin: {it.margin}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
