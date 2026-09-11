"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Download,
  Printer,
  Search,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SalesReportViewProps {
  data: {
    summary: {
      totalGrossRevenue: number;
      totalDiscount: number;
      totalNetRevenue: number;
      totalTransactions: number;
      totalItemsSold: number;
      averageOrderValue: number;
      startDate: string;
      endDate: string;
    };
    categoryBreakdown: {
      categoryName: string;
      qty: number;
      revenue: number;
      percentage: number;
    }[];
    paymentBreakdown: {
      method: string;
      count: number;
      total: number;
    }[];
    sales: {
      id: string;
      invoiceNo: string;
      date: string;
      customerName: string;
      cashierName: string;
      paymentMethod: string;
      subtotal: number;
      discount: number;
      total: number;
      itemsCount: number;
      items: {
        id: string;
        name: string;
        variant: string | null;
        category?: string;
        brand?: string;
        qty: number;
        unitPrice: number;
        subtotal: number;
      }[];
    }[];
  };
}

export function SalesReportView({ data }: SalesReportViewProps) {
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const { summary, categoryBreakdown, paymentBreakdown, sales } = data;

  const filteredSales = sales.filter(
    (s) =>
      s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = [
      "No Faktur",
      "Tanggal",
      "Pelanggan",
      "Kasir",
      "Jumlah Item",
      "Subtotal",
      "Diskon",
      "Total",
      "Metode Pembayaran",
    ];

    const rows = filteredSales.map((s) => [
      s.invoiceNo,
      new Date(s.date).toLocaleString("id-ID"),
      s.customerName,
      s.cashierName,
      s.itemsCount,
      s.subtotal,
      s.discount,
      s.total,
      s.paymentMethod.toUpperCase(),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`Laporan_Penjualan_${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Ringkasan Kinerja Penjualan</h3>
          <p className="text-xs text-muted-foreground">
            Periode: {new Date(summary.startDate).toLocaleDateString("id-ID")} -{" "}
            {new Date(summary.endDate).toLocaleDateString("id-ID")}
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
              <span className="text-xs font-semibold text-slate-700">Total Omzet Bersih</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {formatRupiah(summary.totalNetRevenue)}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Diskon: {formatRupiah(summary.totalDiscount)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--purple-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Jumlah Transaksi</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/15 text-purple-700">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {summary.totalTransactions} Transaksi
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Rata-rata: {formatRupiah(summary.averageOrderValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--success-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total Unit Terjual</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {summary.totalItemsSold} Unit
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Semua smartphone & aksesoris
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-[var(--warning-bg)]/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Rata-rata Keranjang (AOV)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/15 text-amber-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-xl font-extrabold text-slate-900">
                {formatRupiah(summary.averageOrderValue)}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Nilai belanja per pelanggan
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Row: Kategori & Metode Pembayaran */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kategori Breakdown */}
        <Card className="shadow-sm border border-border">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Kontribusi Penjualan per Kategori</h4>
            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data penjualan per kategori.</p>
              ) : (
                categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {cat.categoryName} ({cat.qty} unit)
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatRupiah(cat.revenue)}{" "}
                        <span className="text-muted-foreground font-normal">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pembayaran Breakdown */}
        <Card className="shadow-sm border border-border">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Distribusi Metode Pembayaran</h4>
            <div className="grid grid-cols-2 gap-3">
              {paymentBreakdown.map((pb, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    {pb.method === "cash" && <Banknote className="h-4 w-4 text-emerald-600" />}
                    {pb.method === "transfer" && <CreditCard className="h-4 w-4 text-blue-600" />}
                    {pb.method === "qris" && <QrCode className="h-4 w-4 text-purple-600" />}
                    {pb.method === "debit" && <CreditCard className="h-4 w-4 text-amber-600" />}
                    <span className="text-xs font-bold uppercase text-foreground">
                      {pb.method}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {formatRupiah(pb.total)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{pb.count} transaksi</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Transaksi Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">Rincian Transaksi Penjualan</h4>
              <p className="text-xs text-muted-foreground">
                Total {filteredSales.length} transaksi pada filter yang dipilih
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

          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada data transaksi yang cocok.
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
                      <th className="pb-3">Metode</th>
                      <th className="pb-3 text-center">Item</th>
                      <th className="pb-3 text-right">Diskon</th>
                      <th className="pb-3 text-right">Total</th>
                      <th className="pb-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-foreground">
                          {sale.invoiceNo}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(sale.date).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 font-medium text-foreground">{sale.customerName}</td>
                        <td className="py-3 text-muted-foreground">{sale.cashierName}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {sale.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 text-center font-medium">{sale.itemsCount}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          {sale.discount > 0 ? formatRupiah(sale.discount) : "-"}
                        </td>
                        <td className="py-3 text-right font-bold text-foreground">
                          {formatRupiah(sale.total)}
                        </td>
                        <td className="py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSale(sale)}
                            className="h-7 w-7 p-0"
                            title="Detail Item"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden mt-4">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2 cursor-pointer hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {sale.invoiceNo}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {sale.paymentMethod}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sale.customerName}</span>
                      <span>
                        {new Date(sale.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-xs text-muted-foreground">
                        {sale.itemsCount} unit barang
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatRupiah(sale.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Detail Item Transaksi */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Detail Faktur {selectedSale?.invoiceNo}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Waktu: {selectedSale && new Date(selectedSale.date).toLocaleString("id-ID")} • Kasir:{" "}
              {selectedSale?.cashierName}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span className="font-semibold">{selectedSale.customerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Metode Pembayaran</span>
                  <span className="font-semibold uppercase">{selectedSale.paymentMethod}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground mb-2">Daftar Produk Dibeli</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedSale.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-border text-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground">{it.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {it.qty} x {formatRupiah(it.unitPrice)}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon</span>
                    <span>-{formatRupiah(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                  <span>Total Pembayaran</span>
                  <span>{formatRupiah(selectedSale.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
