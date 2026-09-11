"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Coins,
  Download,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ProfitReportViewProps {
  data: {
    summary: {
      totalGrossRevenue: number;
      totalDiscount: number;
      totalNetRevenue: number;
      totalCogs: number;
      grossProfit: number;
      profitMargin: number;
      startDate: string;
      endDate: string;
    };
    categoryBreakdown: {
      categoryName: string;
      revenue: number;
      cogs: number;
      profit: number;
      margin: number;
    }[];
    productBreakdown: {
      productId: string;
      name: string;
      brand: string;
      qty: number;
      revenue: number;
      cogs: number;
      profit: number;
      margin: number;
    }[];
    transactionBreakdown: {
      id: string;
      invoiceNo: string;
      date: string;
      customerName: string;
      cashierName: string;
      netRevenue: number;
      cogs: number;
      grossProfit: number;
      margin: number;
    }[];
  };
}

export function ProfitReportView({ data }: ProfitReportViewProps) {
  const [search, setSearch] = useState("");
  const { summary, categoryBreakdown, productBreakdown, transactionBreakdown } = data;

  const filteredTransactions = transactionBreakdown.filter(
    (t) =>
      t.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.cashierName.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = [
      "No Faktur",
      "Tanggal",
      "Pelanggan",
      "Kasir",
      "Omzet Bersih",
      "HPP (Modal)",
      "Laba Kotor",
      "Margin (%)",
    ];

    const rows = filteredTransactions.map((t) => [
      t.invoiceNo,
      new Date(t.date).toLocaleString("id-ID"),
      t.customerName,
      t.cashierName,
      t.netRevenue,
      t.cogs,
      t.grossProfit,
      `${t.margin}%`,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`Laporan_Laba_Rugi_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Laporan Laba-Rugi (Profit & Loss)</h3>
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px] font-semibold border-indigo-200">
              <ShieldCheck className="h-3 w-3 mr-1 text-indigo-600" />
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Periode: {new Date(summary.startDate).toLocaleDateString("id-ID")} -{" "}
            {new Date(summary.endDate).toLocaleDateString("id-ID")} • Formula: Laba Kotor = Omzet Bersih − HPP
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-0 shadow-sm bg-[var(--info-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Penjualan Bersih</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {formatRupiah(summary.totalNetRevenue)}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Kotor: {formatRupiah(summary.totalGrossRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--warning-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total HPP (Modal Barang)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/15 text-amber-700">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {formatRupiah(summary.totalCogs)}
              </h4>
              <p className="text-[11px] text-amber-800 font-semibold mt-1">
                Harga pokok barang terjual
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--success-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Laba Kotor Bersih</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-emerald-950">
                {formatRupiah(summary.grossProfit)}
              </h4>
              <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                Keuntungan kotor operasional
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--purple-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Margin Laba Kotor</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/15 text-purple-700">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {summary.profitMargin}%
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Rasio profitabilitas rata-rata
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Laba Kategori & Produk Unggulan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kategori Profit */}
        <Card className="shadow-sm border border-border">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Profitabilitas per Kategori</h4>
            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data penjualan.</p>
              ) : (
                categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-foreground">{cat.categoryName}</span>
                      <span className="font-extrabold text-emerald-700">
                        {formatRupiah(cat.profit)}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Margin: {cat.margin}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Omzet: {formatRupiah(cat.revenue)}</span>
                      <span>HPP: {formatRupiah(cat.cogs)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Produk Penyumbang Laba Terbesar */}
        <Card className="shadow-sm border border-border">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Produk Penyumbang Laba Terbesar</h4>
            <div className="space-y-2.5">
              {productBreakdown.slice(0, 5).length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data penjualan produk.</p>
              ) : (
                productBreakdown.slice(0, 5).map((prod, idx) => (
                  <div
                    key={prod.productId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-800">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {prod.brand} • {prod.qty} unit terjual
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-800">
                        {formatRupiah(prod.profit)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Margin: {prod.margin}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rincian Transaksi Penjualan Laba Rugi */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">Rincian Laba per Transaksi</h4>
              <p className="text-xs text-muted-foreground">
                Audit profitabilitas setiap faktur kasir
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari faktur / pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada data transaksi.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="pb-3">No. Faktur</th>
                      <th className="pb-3">Waktu</th>
                      <th className="pb-3">Pelanggan</th>
                      <th className="pb-3">Kasir</th>
                      <th className="pb-3 text-right">Omzet Bersih</th>
                      <th className="pb-3 text-right">HPP Modal</th>
                      <th className="pb-3 text-right">Laba Kotor</th>
                      <th className="pb-3 text-center">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-foreground">{t.invoiceNo}</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(t.date).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 font-medium text-foreground">{t.customerName}</td>
                        <td className="py-3 text-muted-foreground">{t.cashierName}</td>
                        <td className="py-3 text-right font-medium text-foreground">
                          {formatRupiah(t.netRevenue)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {formatRupiah(t.cogs)}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-800">
                          {formatRupiah(t.grossProfit)}
                        </td>
                        <td className="py-3 text-center font-semibold text-slate-700">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              t.margin >= 20
                                ? "bg-emerald-100 text-emerald-800"
                                : t.margin >= 10
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {t.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden mt-4">
                {filteredTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{t.invoiceNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.margin >= 20
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        Margin: {t.margin}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.customerName}</span>
                      <span>
                        {new Date(t.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Omzet</p>
                        <p className="font-semibold text-foreground">{formatRupiah(t.netRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">HPP</p>
                        <p className="font-medium text-slate-600">{formatRupiah(t.cogs)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Laba</p>
                        <p className="font-bold text-emerald-800">{formatRupiah(t.grossProfit)}</p>
                      </div>
                    </div>
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
