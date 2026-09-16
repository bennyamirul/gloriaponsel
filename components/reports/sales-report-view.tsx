"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToExcel, triggerPrint } from "@/lib/export-utils";
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
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
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
      customerPhone?: string;
      cashierName: string;
      paymentMethod: string;
      subtotal: number;
      discount: number;
      additionalFee?: number;
      additionalFeeNote?: string;
      total: number;
      itemsCount: number;
      totalHpp: number;
      sellingPrice: number;
      commission: number;
      profit: number;
      items: {
        id: string;
        name: string;
        color?: string | null;
        variant: string | null;
        category?: string;
        brand?: string;
        qty: number;
        unitCost?: number;
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

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.invoiceNo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
      s.cashierName.toLowerCase().includes(q) ||
      (s.additionalFeeNote && s.additionalFeeNote.toLowerCase().includes(q)) ||
      s.items.some(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.color && it.color.toLowerCase().includes(q))
      )
    );
  });

  const handleExportExcel = () => {
    const headers = [
      "Tanggal",
      "No Faktur",
      "Pelanggan",
      "Produk",
      "HPP (Rp)",
      "Harga Jual (Rp)",
      "Komisi (Rp)",
      "Laba (Rp)",
      "Kasir",
      "Keterangan",
    ];

    const rows = filteredSales.map((s) => [
      new Date(s.date).toLocaleString("id-ID"),
      s.invoiceNo,
      s.customerPhone ? `${s.customerName} (${s.customerPhone})` : s.customerName,
      s.items
        .map((it) => (it.color ? `${it.name} (${it.color})` : it.name))
        .join(", "),
      s.totalHpp,
      s.sellingPrice,
      s.commission,
      s.profit,
      s.cashierName,
      s.additionalFeeNote || "-",
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(`Laporan_Penjualan_${dateStr}.xlsx`, "Penjualan", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Ringkasan Kinerja Penjualan</h3>
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
        {/* Card 1: Omzet Bersih */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Omzet Bersih
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.totalNetRevenue)}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Diskon diberikan: {formatRupiah(summary.totalDiscount)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Jumlah Transaksi */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Transaksi
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {summary.totalTransactions}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Faktur berhasil diselesaikan</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Unit Terjual */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Barang Terjual
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {summary.totalItemsSold} Unit
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Total kuantitas barang fisik</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Rata-rata Keranjang */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rata-rata Keranjang
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-bold tracking-tight text-foreground">
                {formatRupiah(summary.averageOrderValue)}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Rata-rata nilai belanja per struk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Row: Kategori & Metode Pembayaran */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kategori Breakdown */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Kontribusi Penjualan per Kategori</h4>
            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data penjualan per kategori.</p>
              ) : (
                categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {cat.categoryName}{" "}
                        <span className="text-muted-foreground">({cat.qty} unit)</span>
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatRupiah(cat.revenue)}{" "}
                        <span className="text-muted-foreground font-normal">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
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
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Distribusi Metode Pembayaran</h4>
            <div className="grid grid-cols-2 gap-3">
              {paymentBreakdown.map((pb, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    {pb.method === "cash" && <Banknote className="h-3.5 w-3.5 text-emerald-600" />}
                    {pb.method === "transfer" && <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                    {pb.method === "qris" && <QrCode className="h-3.5 w-3.5 text-purple-600" />}
                    {pb.method === "debit" && <CreditCard className="h-3.5 w-3.5 text-amber-600" />}
                    <span className="text-xs font-bold uppercase text-foreground tracking-wide">
                      {pb.method}
                    </span>
                  </div>
                  <p className="text-base font-bold text-foreground">
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
      <Card className="border border-border bg-card shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">Rincian Transaksi Penjualan</h4>
              <p className="text-xs text-muted-foreground">
                Total {filteredSales.length} transaksi pada periode yang dipilih
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari faktur / pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada data transaksi yang cocok.
            </div>
          ) : (
            <>
              {/* Desktop Table View (10 Kolom) */}
              <div className="hidden lg:block mt-3">
                <Table className="w-full text-left text-xs min-w-[950px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-3 whitespace-nowrap">Tanggal</th>
                      <th className="pb-3 whitespace-nowrap">No. Faktur</th>
                      <th className="pb-3">Pelanggan</th>
                      <th className="pb-3 min-w-[170px]">Produk</th>
                      <th className="pb-3 text-right whitespace-nowrap">HPP</th>
                      <th className="pb-3 text-right whitespace-nowrap">Harga Jual</th>
                      <th className="pb-3 text-right whitespace-nowrap">Komisi</th>
                      <th className="pb-3 text-right whitespace-nowrap">Laba</th>
                      <th className="pb-3 whitespace-nowrap">Kasir</th>
                      <th className="pb-3 min-w-[130px]">Keterangan</th>
                      <th className="pb-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/40 transition-colors">
                        {/* 1. Tanggal */}
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(sale.date).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>

                        {/* 2. No Faktur */}
                        <td className="py-3 font-mono font-semibold text-foreground whitespace-nowrap">
                          {sale.invoiceNo}
                        </td>

                        {/* 3. Pelanggan (Nama dan No Telp) */}
                        <td className="py-3">
                          <p className="font-semibold text-foreground leading-tight">
                            {sale.customerName}
                          </p>
                          {sale.customerPhone ? (
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {sale.customerPhone}
                            </p>
                          ) : null}
                        </td>

                        {/* 4. Produk (Nama Produk dan Warna) */}
                        <td className="py-3">
                          <div className="space-y-1">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="leading-tight">
                                <span className="font-semibold text-foreground">{it.name}</span>
                                {it.color && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    ({it.color})
                                  </span>
                                )}
                                {it.qty > 1 && (
                                  <span className="text-[11px] text-muted-foreground font-medium ml-1">
                                    x{it.qty}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 5. HPP */}
                        <td className="py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatRupiah(sale.totalHpp)}
                        </td>

                        {/* 6. Harga Jual */}
                        <td className="py-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                          {formatRupiah(sale.sellingPrice)}
                        </td>

                        {/* 7. Komisi */}
                        <td className="py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {sale.commission > 0 ? formatRupiah(sale.commission) : "-"}
                        </td>

                        {/* 8. Laba */}
                        <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatRupiah(sale.profit)}
                        </td>

                        {/* 9. Kasir */}
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {sale.cashierName}
                        </td>

                        {/* 10. Keterangan */}
                        <td className="py-3 text-muted-foreground max-w-[160px] truncate" title={sale.additionalFeeNote || "-"}>
                          {sale.additionalFeeNote || "-"}
                        </td>

                        {/* Aksi */}
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
                </Table>
              </div>

              {/* Mobile Card List View (Clean & Anti-Collision) */}
              <div className="grid grid-cols-1 gap-3 lg:hidden mt-3">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {/* Header Faktur & Waktu */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary truncate">
                        {sale.invoiceNo}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {new Date(sale.date).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    {/* Pelanggan & Kasir */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-foreground">{sale.customerName}</span>
                        {sale.customerPhone && (
                          <span className="ml-1 text-[11px] text-muted-foreground font-mono">
                            ({sale.customerPhone})
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-muted-foreground text-[11px]">
                        Kasir: <strong className="text-foreground font-medium">{sale.cashierName}</strong>
                      </span>
                    </div>

                    {/* Rincian Produk */}
                    <div className="p-2.5 rounded-xl bg-muted/40 text-xs space-y-1.5 border border-border/50">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        PRODUK ({sale.items.reduce((acc, it) => acc + (it.qty || 1), 0)} unit):
                      </p>
                      <div className="space-y-1">
                        {sale.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center gap-2 text-xs font-medium text-foreground">
                            <span className="truncate">
                              {it.name} {it.color ? <span className="text-muted-foreground font-normal">({it.color})</span> : ""}
                            </span>
                            <span className="shrink-0 text-muted-foreground text-[11px] font-mono">
                              {it.qty}x @ {formatRupiah(it.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kotak Keuangan Terdedikasi (Anti-Tertimpa) */}
                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-border/80 space-y-2 text-xs">
                      {/* Baris 1: HPP (Modal) & Harga Jual */}
                      <div className="grid grid-cols-2 gap-3 pb-2 border-b border-border/60">
                        <div className="min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold mb-0.5">
                            HPP (Modal)
                          </span>
                          <span className="font-mono font-medium text-muted-foreground text-xs truncate block">
                            {formatRupiah(sale.totalHpp)}
                          </span>
                        </div>
                        <div className="text-right min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold mb-0.5">
                            Harga Jual
                          </span>
                          <span className="font-mono font-bold text-foreground text-xs truncate block">
                            {formatRupiah(sale.sellingPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Baris 2: Komisi & Laba Bersih */}
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div className="min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold mb-0.5">
                            Komisi
                          </span>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 text-xs truncate block">
                            {sale.commission > 0 ? formatRupiah(sale.commission) : "Rp 0"}
                          </span>
                        </div>
                        <div className="text-right min-w-0">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block font-bold mb-0.5">
                            Laba Bersih
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm truncate block">
                            {formatRupiah(sale.profit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Keterangan */}
                    {sale.additionalFeeNote && (
                      <p className="text-[11px] text-muted-foreground pt-1 border-t border-dashed border-border/70 truncate">
                        <span className="font-medium text-foreground">Ket:</span> {sale.additionalFeeNote}
                      </p>
                    )}
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
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span className="font-semibold text-right">
                    {selectedSale.customerName}
                    {selectedSale.customerPhone && (
                      <span className="block text-[11px] text-muted-foreground font-mono font-normal">
                        {selectedSale.customerPhone}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Metode Pembayaran</span>
                  <span className="font-semibold uppercase">{selectedSale.paymentMethod}</span>
                </div>
                {selectedSale.additionalFeeNote && (
                  <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Keterangan</span>
                    <span className="font-medium text-foreground text-right">{selectedSale.additionalFeeNote}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-foreground mb-2">Daftar Produk Dibeli</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedSale.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {it.name} {it.color ? <span className="text-muted-foreground">({it.color})</span> : ""}
                        </p>
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

              <div className="border-t border-border pt-3 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedSale.discount)}</span>
                  </div>
                )}
                {selectedSale.additionalFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Biaya Tambahan:</span>
                    <span>+{formatRupiah(selectedSale.additionalFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>HPP (Modal):</span>
                  <span>{formatRupiah(selectedSale.totalHpp)}</span>
                </div>
                {selectedSale.commission > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Komisi:</span>
                    <span>{formatRupiah(selectedSale.commission)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border">
                  <span>Laba Bersih:</span>
                  <span>{formatRupiah(selectedSale.profit)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-dashed border-border">
                  <span>Total Faktur:</span>
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
