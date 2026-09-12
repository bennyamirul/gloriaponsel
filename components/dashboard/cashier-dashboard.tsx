"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Calendar,
  Clock,
  Receipt,
  ArrowRight,
  Loader2,
  CreditCard,
  Banknote,
  RotateCcw,
} from "lucide-react";
import { getCashierPerformanceByPeriod } from "@/lib/actions/dashboard.actions";

export interface CashierRecentSale {
  id: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
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
    recentSales: CashierRecentSale[];
  };
  initialMonth: number;
  initialYear: number;
  initialPeriodName: string;
  availableYears: number[];
  todayDateStr: string;
}

const MONTH_NAMES = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export function CashierDashboard({
  user,
  initialData,
  initialMonth,
  initialYear,
  initialPeriodName,
  availableYears,
  todayDateStr,
}: CashierDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [periodName, setPeriodName] = useState(initialPeriodName);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [monthCount, setMonthCount] = useState(initialData.monthCount);
  const [monthCashCount, setMonthCashCount] = useState(initialData.monthCashCount);
  const [monthNonCashCount, setMonthNonCashCount] = useState(initialData.monthNonCashCount);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);

    startTransition(async () => {
      try {
        const res = await getCashierPerformanceByPeriod(newMonth, newYear);
        setMonthCount(res.count);
        setPeriodName(res.periodName);
        setIsCurrentMonth(res.isCurrentMonth);
        setMonthCashCount(res.cashCount);
        setMonthNonCashCount(res.nonCashCount);
      } catch (err) {
        console.error("Gagal memuat data transaksi kasir:", err);
      }
    });
  };

  const handleResetToCurrent = () => {
    const now = new Date();
    handlePeriodChange(now.getMonth() + 1, now.getFullYear());
  };

  const recentSalesToDisplay = initialData.recentSales.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Halaman Kasir */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Dashboard Kasir
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {todayDateStr} • Kasir: <span className="font-semibold text-foreground">{user.name}</span>
        </p>
      </div>

      {/* Grid 2 Kartu Ringkasan: Transaksi Hari Ini & Transaksi Bulan Ini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Transaksi Hari Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Transaksi Hari Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {initialData.todayCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Transaksi
                </span>
              </div>

              {/* Rincian Metode Pembayaran Hari Ini (Untuk Closing Kasir) */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tunai:</span>
                  <span className="font-bold text-foreground font-mono">{initialData.todayCashCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Non-Tunai:</span>
                  <span className="font-bold text-foreground font-mono">{initialData.todayNonCashCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Transaksi Bulan Ini (Dengan Opsi Memilih Bulan & Tahun) */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Transaksi Bulan Ini
                  </span>
                </div>
              </div>

              {/* Dropdown Pemilih Bulan & Tahun */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <div className="flex items-center bg-muted/50 border border-border/80 rounded-lg px-2 py-1 text-xs">
                  <select
                    aria-label="Pilih Bulan"
                    value={selectedMonth}
                    onChange={(e) => handlePeriodChange(Number(e.target.value), selectedYear)}
                    disabled={isPending}
                    className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                  >
                    {MONTH_NAMES.map((m) => (
                      <option key={m.value} value={m.value} className="bg-popover text-foreground">
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Pilih Tahun"
                    value={selectedYear}
                    onChange={(e) => handlePeriodChange(selectedMonth, Number(e.target.value))}
                    disabled={isPending}
                    className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer border-l border-border/80 pl-1.5 ml-1"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y} className="bg-popover text-foreground">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {!isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleResetToCurrent}
                    disabled={isPending}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Kembali ke Bulan Sekarang"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}

                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {monthCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Transaksi
                </span>
              </div>

              {/* Label Periode Terpilih */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>Periode:</span>
                  <span className="font-semibold text-foreground">{periodName}</span>
                </div>
                <span>
                  {isCurrentMonth ? "Bulan Berjalan" : "Riwayat Lampau"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bagian 3: Transaksi Terakhir */}
      <Card className="shadow-xs border border-border/70 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Transaksi Terakhir</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                5 transaksi terakhir yang Anda proses
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
              <Link href="/sales">
                <span>Lihat Semua di Kasir</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {recentSalesToDisplay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-medium">Belum ada transaksi penjualan yang Anda proses.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/sales">Mulai Transaksi Baru</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-muted-foreground">
                      <th className="pb-3">No. Faktur</th>
                      <th className="pb-3">Pelanggan</th>
                      <th className="pb-3">Waktu</th>
                      <th className="pb-3">Item</th>
                      <th className="pb-3">Metode</th>
                      <th className="pb-3 text-right">Total Belanja</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentSalesToDisplay.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs font-bold text-foreground">
                          {sale.invoiceNo}
                        </td>
                        <td className="py-3 text-sm text-foreground">
                          {sale.customerName}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-foreground">
                          {sale.itemCount} unit
                        </td>
                        <td className="py-3 text-xs uppercase font-semibold text-muted-foreground">
                          {sale.paymentMethod}
                        </td>
                        <td className="py-3 text-right font-bold text-foreground font-mono">
                          {formatRupiah(sale.total)}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              sale.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 text-[11px] font-semibold"
                                : "bg-rose-100 text-rose-800 text-[11px] font-semibold"
                            }
                          >
                            {sale.status === "completed" ? "Selesai" : "Batal"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {recentSalesToDisplay.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {sale.invoiceNo}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          sale.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 text-[11px]"
                            : "bg-rose-100 text-rose-800 text-[11px]"
                        }
                      >
                        {sale.status === "completed" ? "Selesai" : "Batal"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{sale.customerName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        {sale.itemCount} unit • {sale.paymentMethod}
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {formatRupiah(sale.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
