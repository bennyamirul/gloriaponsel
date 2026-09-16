"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Calendar,
  Clock,
  Receipt,
  ArrowRight,
  CreditCard,
  Banknote,
  Award,
  ImageIcon,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
} from "lucide-react";
import {
  CommissionDetailDialog,
  CommissionSaleInfo,
} from "@/components/sales/commission-detail-dialog";
import { Table } from "@/components/ui/table";

export interface CashierRecentSaleProductItem {
  id: string;
  productName: string;
  capacity?: string | null;
  color?: string | null;
  imei?: string | null;
  qty: number;
  price: number;
  isReturned?: boolean;
}

export interface CashierRecentSale {
  id: string;
  invoiceNo: string;
  customerName: string;
  cashierName?: string;
  total: number;
  commission?: number;
  commissionProofUrl?: string | null;
  status: string;
  statusLabel?: string;
  statusVariant?: string;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
  items?: CashierRecentSaleProductItem[];
}

export interface CashierDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  initialData: {
    todayCount: number;
    todayCashCount: number;
    todayNonCashCount: number;
    monthCount: number;
    monthCashCount: number;
    monthNonCashCount: number;
    totalIncome?: number;
    totalTransactions?: number;
    recentSales: CashierRecentSale[];
  };
  initialMonth: number;
  initialYear: number;
  initialPeriodName: string;
  availableYears: number[];
  todayDateStr: string;
}

export function CashierDashboard({
  user,
  initialData,
  todayDateStr,
}: CashierDashboardProps) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // Filter Rentang Tanggal Card 1: Total Penghasilan Bulan Ini (Komisi) - Default Bulan Ini
  const [incomeStartDate, setIncomeStartDate] = useState<string>(currentMonthStart);
  const [incomeEndDate, setIncomeEndDate] = useState<string>(todayStr);
  const [showIncomeFilter, setShowIncomeFilter] = useState<boolean>(false);

  // Filter Rentang Tanggal Card 2: Total Transaksi Bulan Ini - Default Bulan Ini
  const [txStartDate, setTxStartDate] = useState<string>(currentMonthStart);
  const [txEndDate, setTxEndDate] = useState<string>(todayStr);
  const [showTxFilter, setShowTxFilter] = useState<boolean>(false);

  // Search & Filter Riwayat Transaksi
  const [tableSearch, setTableSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal Detail Komisi & Bukti Foto
  const [selectedDetailSale, setSelectedDetailSale] = useState<CommissionSaleInfo | null>(null);

  const allSales = initialData.recentSales || [];

  // Hitung Total Penghasilan (Komisi) berdasarkan filter rentang tanggal Card 1
  const filteredIncome = useMemo(() => {
    return allSales
      .filter((s) => s.status === "completed")
      .filter((s) => {
        if (!incomeStartDate && !incomeEndDate) return true;
        const saleDate = s.createdAt.slice(0, 10);
        if (incomeStartDate && saleDate < incomeStartDate) return false;
        if (incomeEndDate && saleDate > incomeEndDate) return false;
        return true;
      })
      .reduce((acc, s) => acc + Number(s.commission || 0), 0);
  }, [allSales, incomeStartDate, incomeEndDate]);

  // Hitung Total Transaksi & Metode Pembayaran berdasarkan filter rentang tanggal Card 2
  const filteredTxData = useMemo(() => {
    const list = allSales
      .filter((s) => s.status === "completed")
      .filter((s) => {
        if (!txStartDate && !txEndDate) return true;
        const saleDate = s.createdAt.slice(0, 10);
        if (txStartDate && saleDate < txStartDate) return false;
        if (txEndDate && saleDate > txEndDate) return false;
        return true;
      });

    const count = list.length;
    const cashCount = list.filter((s) => s.paymentMethod === "cash").length;
    const nonCashCount = list.filter((s) => s.paymentMethod !== "cash").length;
    const totalOmzet = list.reduce((acc, s) => acc + Number(s.total || 0), 0);

    return { count, cashCount, nonCashCount, totalOmzet };
  }, [allSales, txStartDate, txEndDate]);

  // Quick Preset Helper
  const setQuickIncomePreset = (preset: "all" | "today" | "month") => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (preset === "all") {
      setIncomeStartDate("");
      setIncomeEndDate("");
    } else if (preset === "today") {
      setIncomeStartDate(todayStr);
      setIncomeEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setIncomeStartDate(firstDay);
      setIncomeEndDate(todayStr);
    }
  };

  const setQuickTxPreset = (preset: "all" | "today" | "month") => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (preset === "all") {
      setTxStartDate("");
      setTxEndDate("");
    } else if (preset === "today") {
      setTxStartDate(todayStr);
      setTxEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setTxStartDate(firstDay);
      setTxEndDate(todayStr);
    }
  };

  // Filter Tabel Riwayat Transaksi
  const filteredSalesForTable = useMemo(() => {
    return allSales.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!tableSearch.trim()) return true;
      const q = tableSearch.toLowerCase().trim();
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [allSales, statusFilter, tableSearch]);



  return (
    <div className="space-y-6">
      {/* Header Halaman Kasir */}
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Dashboard Kasir
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayDateStr} • Kasir: <span className="font-semibold text-foreground">{user.name}</span>
          </p>
        </div>
        {/*<div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-9 px-4 rounded-xl gap-2 font-semibold">
            <Link href="/sales">
              <ShoppingCart className="h-4 w-4" />
              <span>Buka Kasir POS</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 px-3 rounded-xl gap-2 text-xs">
            <Link href="/sales/history">
              <Receipt className="h-3.5 w-3.5" />
              <span>Riwayat Transaksi</span>
            </Link>
          </Button>
        </div>*/}
      </div>

      {/* Grid 2 Kartu: Total Penghasilan & Total Transaksi (Masing-masing dengan Filter Rentang Tanggal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Total Penghasilan (Komisi) */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    Total Penghasilan Bulan Ini
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Berdasarkan total komisi yang diperoleh bulan ini
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowIncomeFilter((prev) => !prev)}
                className={`h-7 px-2.5 text-xs rounded-lg gap-1 border border-border/70 shrink-0 ${
                  showIncomeFilter || incomeStartDate || incomeEndDate
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Filter Rentang Tanggal"
              >
                <Calendar className="h-3 w-3" />
                <span className="text-[11px]">Filter</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showIncomeFilter ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* Filter Rentang Tanggal Card 1 (Collapsible) */}
            {showIncomeFilter && (
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Rentang Tanggal:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickIncomePreset("all")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                        !incomeStartDate && !incomeEndDate
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickIncomePreset("today")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:bg-muted transition"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickIncomePreset("month")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:bg-muted transition"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={incomeStartDate}
                    onChange={(e) => setIncomeStartDate(e.target.value)}
                    className="h-7 text-xs px-2 bg-background rounded-lg border-border"
                    title="Dari Tanggal"
                  />
                  <span className="text-muted-foreground text-xs font-medium">s/d</span>
                  <Input
                    type="date"
                    value={incomeEndDate}
                    onChange={(e) => setIncomeEndDate(e.target.value)}
                    className="h-7 text-xs px-2 bg-background rounded-lg border-border"
                    title="Sampai Tanggal"
                  />
                </div>
              </div>
            )}

            {/* Nominal Total Penghasilan */}
            <div className="pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatRupiah(filteredIncome)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {incomeStartDate || incomeEndDate
                  ? `Periode: ${incomeStartDate || "Awal"} s/d ${incomeEndDate || "Hari Ini"}`
                  : "Akumulasi seluruh komisi transaksi disetujui"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Transaksi */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    Total Transaksi Bulan Ini
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Jumlah transaksi penjualan berhasil bulan ini
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTxFilter((prev) => !prev)}
                className={`h-7 px-2.5 text-xs rounded-lg gap-1 border border-border/70 shrink-0 ${
                  showTxFilter || txStartDate || txEndDate
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/40 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Filter Rentang Tanggal"
              >
                <Calendar className="h-3 w-3" />
                <span className="text-[11px]">Filter</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showTxFilter ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* Filter Rentang Tanggal Card 2 (Collapsible) */}
            {showTxFilter && (
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Rentang Tanggal:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickTxPreset("all")}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                        !txStartDate && !txEndDate
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTxPreset("today")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:bg-muted transition"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTxPreset("month")}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:bg-muted transition"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    className="h-7 text-xs px-2 bg-background rounded-lg border-border"
                    title="Dari Tanggal"
                  />
                  <span className="text-muted-foreground text-xs font-medium">s/d</span>
                  <Input
                    type="date"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    className="h-7 text-xs px-2 bg-background rounded-lg border-border"
                    title="Sampai Tanggal"
                  />
                </div>
              </div>
            )}

            {/* Angka Total Transaksi & Breakdown */}
            <div className="pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground font-mono">
                  {filteredTxData.count}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Transaksi
                </span>
              </div>

              {/* Rincian Tunai vs Non Tunai */}
              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tunai:</span>
                  <span className="font-bold text-foreground font-mono">{filteredTxData.cashCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Non-Tunai:</span>
                  <span className="font-bold text-foreground font-mono">{filteredTxData.nonCashCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bagian Riwayat Transaksi Kasir (Menampilkan seluruh transaksi kasir & bukti foto komisi) */}
      <Card className="shadow-xs border border-border/70 rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Riwayat Transaksi</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seluruh transaksi yang Anda proses beserta nilai komisi dan bukti foto
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Cari faktur, pelanggan..."
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>

              {/*<select
                aria-label="Filter Status Transaksi"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Batal</option>
              </select>*/}
            </div>
          </div>

          {filteredSalesForTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Tidak ada transaksi yang cocok.</p>
            </div>
          ) : (
            <div>
              <Table className="w-full text-left text-sm min-w-[850px]">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 w-32">No. Faktur</th>
                      <th className="pb-3 w-36">Tanggal</th>
                      <th className="pb-3 w-40">Pelanggan</th>
                      <th className="pb-3">Produk</th>
                      <th className="pb-3 text-right w-28">Total</th>
                      <th className="pb-3 text-right w-36">Komisi & Bukti</th>
                      <th className="pb-3 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSalesForTable.map((sale) => {
                      const isPendingCommission = !sale.commission || sale.commission <= 0;
                      return (
                        <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-mono text-xs font-bold text-primary align-top">
                            {sale.invoiceNo}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                            <span className="font-medium text-foreground block">
                              {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 opacity-60" />
                              {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="py-3 text-xs font-medium text-foreground align-top">
                            <div className="font-semibold text-xs">{sale.customerName}</div>
                          </td>

                          {/* Kolom Produk (Rincian Produk Lengkap) */}
                          <td className="py-3 text-xs align-top">
                            <div className="space-y-1.5 max-w-[280px]">
                              {sale.items && sale.items.length > 0 ? (
                                sale.items.map((it, idx) => (
                                  <div
                                    key={it.id || idx}
                                    className="rounded-lg bg-muted/40 p-1.5 border border-border/50 text-xs"
                                  >
                                    <div className="font-semibold text-foreground leading-tight text-xs">
                                      {it.productName}
                                    </div>
                                    {(it.capacity || it.color) && (
                                      <div className="text-[11px] text-muted-foreground">
                                        {[it.capacity, it.color].filter(Boolean).join(" • ")}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                                      <span className="font-semibold text-foreground">{it.qty}x</span>
                                      {it.imei && <span>IMEI: {it.imei}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">
                                  {sale.itemCount || 0} unit
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 text-right font-bold text-foreground font-mono text-xs whitespace-nowrap align-top">
                            {formatRupiah(sale.total)}
                          </td>

                          {/* Kolom Komisi & Bukti Gabungan */}
                          <td className="py-3 text-right whitespace-nowrap align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDetailSale(sale)}
                                className="text-right hover:opacity-80 transition cursor-pointer"
                                title="Klik untuk melihat rincian & bukti komisi"
                              >
                                <span
                                  className={`font-mono font-bold text-xs block ${
                                    sale.commission && sale.commission > 0
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {sale.commission && sale.commission > 0
                                    ? formatRupiah(sale.commission)
                                    : "Rp 0"}
                                </span>
                                {sale.commissionProofUrl ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <ImageIcon className="h-2.5 w-2.5" />
                                    <span>Bukti Ada</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Tanpa Bukti</span>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Kolom Status: Pending jika komisi belum diinput, Done jika sudah */}
                          <td className="py-3 text-center whitespace-nowrap align-top">
                            <Badge
                              variant="secondary"
                              className={
                                isPendingCommission
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold"
                              }
                            >
                              {isPendingCommission ? "Pending" : "Done"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Komisi & Bukti Transfer */}
      <CommissionDetailDialog
        open={Boolean(selectedDetailSale)}
        onOpenChange={(open) => !open && setSelectedDetailSale(null)}
        sale={selectedDetailSale}
        isOwner={false}
      />
    </div>
  );
}
