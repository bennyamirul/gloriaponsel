"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToExcel, triggerPrint } from "@/lib/export-utils";
import {
  Boxes,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Printer,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface StockReportViewProps {
  data: {
    summary: {
      isSuperAdmin: boolean;
      totalPhysicalStock: number;
      totalSkus: number;
      lowStockSkus: number;
      outOfStockSkus: number;
      totalAssetRetailValue: number;
      totalAssetCostValue: number | null;
      potentialGrossProfit: number | null;
    };
    products: {
      id: string;
      name: string;
      sku: string;
      variant: string | null;
      categoryName: string;
      brandName: string;
      stock: number;
      minStock: number;
      status: "safe" | "low" | "out";
      sellingPrice: number;
      purchasePrice: number | null;
      retailValuation: number;
      costValuation: number | null;
    }[];
  };
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  onFilterChange: (filters: { categoryId?: string; brandId?: string; stockStatus?: string }) => void;
}

export function StockReportView({
  data,
  categories,
  brands,
  onFilterChange,
}: StockReportViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { summary, products } = data;
  const isSuperAdmin = summary.isSuperAdmin;

  const handleFilter = (catId: string, brId: string, stat: string) => {
    setSelectedCategory(catId);
    setSelectedBrand(brId);
    setSelectedStatus(stat);
    onFilterChange({
      categoryId: catId !== "all" ? catId : undefined,
      brandId: brId !== "all" ? brId : undefined,
      stockStatus: stat,
    });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.variant && p.variant.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExportExcel = () => {
    const headers = isSuperAdmin
      ? [
          "Kode SKU",
          "Nama Produk",
          "Varian",
          "Kategori",
          "Brand",
          "Stok (Unit)",
          "Min Stok",
          "Status Stok",
          "Harga Modal (Rp)",
          "Valuasi Modal (Rp)",
          "Harga Jual (Rp)",
          "Valuasi Jual Retail (Rp)",
        ]
      : [
          "Kode SKU",
          "Nama Produk",
          "Varian",
          "Kategori",
          "Brand",
          "Stok (Unit)",
          "Min Stok",
          "Status Stok",
          "Harga Jual (Rp)",
          "Valuasi Jual Retail (Rp)",
        ];

    const rows = filteredProducts.map((p) => {
      const baseRow = [
        p.sku,
        p.name,
        p.variant || "-",
        p.categoryName,
        p.brandName,
        p.stock,
        p.minStock,
        p.status === "safe" ? "Aman" : p.status === "low" ? "Menipis" : "Habis",
      ];

      if (isSuperAdmin) {
        return [
          ...baseRow,
          p.purchasePrice || 0,
          p.costValuation || 0,
          p.sellingPrice,
          p.retailValuation,
        ];
      }

      return [...baseRow, p.sellingPrice, p.retailValuation];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(`Laporan_Valuasi_Stok_${dateStr}.xlsx`, "Valuasi Stok", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Laporan Stok & Valuasi Inventaris</h3>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin
              ? "Valuasi total aset stok berdasarkan harga modal (HPP) & potensi nilai jual."
              : "Ringkasan ketersediaan unit fisik stok produk dan estimasi nilai jual."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerPrint}
            className="text-xs font-medium border-border"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Cetak PDF
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Unduh Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Clean Minimalist KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Unit Fisik
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {summary.totalPhysicalStock} Unit
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Dari {summary.totalSkus} varian SKU aktif
              </p>
            </div>
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valuasi Modal (HPP)
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(summary.totalAssetCostValue ?? 0)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Modal aset tertanam di inventaris
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Stok Menipis
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {summary.lowStockSkus} SKU
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Habis: {summary.outOfStockSkus} SKU
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Valuasi Harga Jual
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.totalAssetRetailValue)}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Estimasi nilai pasar seluruh stok
              </p>
            </div>
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Potensi Laba Kotor
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-emerald-700">
                  {formatRupiah(summary.potentialGrossProfit ?? 0)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Margin keuntungan jika semua stok terjual
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total SKU Aktif
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {summary.totalSkus} SKU
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Siap dijual di kasir POS</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter & Table Container */}
      <Card className="border border-border bg-card shadow-xs">
        <CardContent className="p-5">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-border">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari SKU / nama produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => handleFilter(e.target.value, selectedBrand, selectedStatus)}
                className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBrand}
                onChange={(e) => handleFilter(selectedCategory, e.target.value, selectedStatus)}
                className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => handleFilter(selectedCategory, selectedBrand, e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Status Stok</option>
                <option value="safe">Stok Aman</option>
                <option value="low">Stok Menipis (≤ Min)</option>
                <option value="out">Stok Habis (0)</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada produk yang cocok dengan filter.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-3">SKU</th>
                      <th className="pb-3">Produk</th>
                      <th className="pb-3">Kategori & Brand</th>
                      <th className="pb-3 text-center">Stok</th>
                      <th className="pb-3 text-center">Status</th>
                      {isSuperAdmin && (
                        <>
                          <th className="pb-3 text-right">Modal (HPP)</th>
                          <th className="pb-3 text-right">Valuasi Modal</th>
                        </>
                      )}
                      <th className="pb-3 text-right">Harga Jual</th>
                      <th className="pb-3 text-right">Valuasi Jual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-mono font-semibold text-foreground">{p.sku}</td>
                        <td className="py-3">
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.variant && (
                            <p className="text-[11px] text-muted-foreground">{p.variant}</p>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {p.categoryName} • {p.brandName}
                        </td>
                        <td className="py-3 text-center font-bold text-foreground">
                          {p.stock}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (min: {p.minStock})
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.status === "safe"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.status === "low"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {p.status === "safe"
                              ? "Aman"
                              : p.status === "low"
                              ? "Menipis"
                              : "Habis"}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <>
                            <td className="py-3 text-right text-muted-foreground">
                              {formatRupiah(p.purchasePrice || 0)}
                            </td>
                            <td className="py-3 text-right font-semibold text-slate-900">
                              {formatRupiah(p.costValuation || 0)}
                            </td>
                          </>
                        )}
                        <td className="py-3 text-right text-muted-foreground">
                          {formatRupiah(p.sellingPrice)}
                        </td>
                        <td className="py-3 text-right font-bold text-foreground">
                          {formatRupiah(p.retailValuation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden mt-3">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-border bg-card space-y-2 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{p.sku}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === "safe"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "low"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {p.status === "safe"
                          ? "Aman"
                          : p.status === "low"
                          ? "Menipis"
                          : "Habis"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.variant ? `${p.variant} • ` : ""}
                        {p.categoryName} ({p.brandName})
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                      <span className="text-muted-foreground">
                        Sisa Stok: <strong className="text-foreground">{p.stock}</strong> unit
                      </span>
                      <span className="font-bold text-foreground">
                        {formatRupiah(p.sellingPrice)}
                      </span>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-[11px] text-slate-700 border border-border">
                        <span>Valuasi Modal:</span>
                        <span className="font-bold">{formatRupiah(p.costValuation || 0)}</span>
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
