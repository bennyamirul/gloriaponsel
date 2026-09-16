"use client";

import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Wallet,
  Receipt,
  DollarSign,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";
import { FinanceDashboardData } from "@/lib/actions/dashboard.actions";

interface FinanceDashboardProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    role: string;
  };
  todayDateStr: string;
  data: FinanceDashboardData;
}

export function FinanceDashboard({ user, todayDateStr, data }: FinanceDashboardProps) {
  const { periodName, salesHighlight, financialHighlight, expenseHighlight } = data;

  const maxRevenue = Math.max(...salesHighlight.dailyTrend.map((t) => t.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header Banner Dashboard Keuangan */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-[#031e1d] border border-blue-900/40 shadow-lg text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 border-none">
              Staff Keuangan
            </Badge>
            <span className="text-xs text-blue-200/80 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {todayDateStr}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Dashboard Keuangan & Finansial
          </h1>
          <p className="text-xs text-slate-300">
            Ikhtisar performa penjualan, laba bersih, beban operasional, dan kas keluar periode {periodName}.
          </p>
        </div>

        {/* Quick Navigation Buttons to Reports */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold bg-white/10 text-white border-white/20 hover:bg-white/20">
            <Link href="/reports/sales">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Laporan Penjualan
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold bg-white/10 text-white border-white/20 hover:bg-white/20">
            <Link href="/reports/expenses">
              <Wallet className="w-3.5 h-3.5 mr-1 text-rose-400" />
              Pengeluaran Harian
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs">
            <Link href="/reports/financial">
              <Receipt className="w-3.5 h-3.5 mr-1" />
              Laporan Keuangan
            </Link>
          </Button>
        </div>
      </div>

      {/* SECTION 1: HIGHLIGHT LAPORAN KEUANGAN (LABA BERSIH, MARGIN & OPERASIONAL) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Highlight Laporan Keuangan ({periodName})
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-7 p-0 gap-1">
            <Link href="/reports/financial">
              Lihat Detail Keuangan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pendapatan Bersih */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Pendapatan Bersih</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {formatRupiah(financialHighlight.netRevenue)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total omzet penjualan bulan berjalan
              </p>
            </CardContent>
          </Card>

          {/* 2. Total HPP / Modal Barang */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Modal / HPP</span>
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {formatRupiah(financialHighlight.cogs)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Harga modal unit terjual
              </p>
            </CardContent>
          </Card>

          {/* 3. Laba Kotor */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Laba Kotor (Gross Profit)</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-300">
                  Margin {financialHighlight.grossMargin}%
                </Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(financialHighlight.grossProfit)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Pendapatan dikurangi modal produk
              </p>
            </CardContent>
          </Card>

          {/* 4. Laba Bersih */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Laba Bersih (Net Profit)</span>
                <Badge variant="outline" className={`text-[10px] ${financialHighlight.netProfit >= 0 ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-300" : "bg-rose-50 text-rose-700 border-rose-300"}`}>
                  Margin {financialHighlight.netMargin}%
                </Badge>
              </div>
              <p className={`text-2xl font-bold tracking-tight font-mono ${financialHighlight.netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600"}`}>
                {formatRupiah(financialHighlight.netProfit)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Laba kotor dikurangi biaya operasional
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ringkasan Beban Operasional */}
        <div className="p-4 rounded-2xl border border-border bg-muted/30 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Total Beban Operasional: {formatRupiah(financialHighlight.operationalExpenses)}</p>
              <p className="text-[11px] text-muted-foreground">
                Pengeluaran kas operasional harian ({formatRupiah(financialHighlight.dailyExpensesTotal)}) + Beban rutin bulanan ({formatRupiah(financialHighlight.monthlyExpensesTotal)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px]">Rasio Beban terhadap Omzet</span>
              <span className="font-bold font-mono text-sm text-foreground">
                {financialHighlight.netRevenue > 0
                  ? Math.round((financialHighlight.operationalExpenses / financialHighlight.netRevenue) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: HIGHLIGHT LAPORAN PENJUALAN (OMZET, TRANSAKSI, TREN & METODE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Highlight Laporan Penjualan
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 h-7 p-0 gap-1">
            <Link href="/reports/sales">
              Lihat Detail Penjualan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Omzet Bulan Ini</span>
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatRupiah(salesHighlight.omzetMonth)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {salesHighlight.salesCountMonth} transaksi berhasil
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Penjualan Hari Ini</span>
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatRupiah(salesHighlight.omzetToday)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {salesHighlight.salesCountToday} transaksi hari ini
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Total Unit Terjual</span>
                <Layers className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {salesHighlight.itemsSoldMonth} <span className="text-sm font-normal text-muted-foreground">Unit</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Seluruh varian produk aktif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tren Penjualan 14 Hari & Metode Pembayaran */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tren Grafik Bar Sederhana */}
          <Card className="lg:col-span-2 rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground">
                Tren Pendapatan Harian (14 Hari Terakhir)
              </CardTitle>
              <CardDescription className="text-[11px]">
                Distribusi omzet per tanggal transaksi
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-end gap-1.5 h-44 w-full pt-4 pb-1">
                {salesHighlight.dailyTrend.map((t, idx) => {
                  const heightPercent = maxRevenue > 0 ? Math.max((t.revenue / maxRevenue) * 100, 4) : 4;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                      {/* Tooltip Hover */}
                      <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                        <span className="font-bold">{t.label}</span>
                        <span>{formatRupiah(t.revenue)} ({t.count} trx)</span>
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-md bg-emerald-500/80 hover:bg-emerald-600 transition-all cursor-pointer"
                      />
                      <span className="text-[9px] text-muted-foreground transform -rotate-45 sm:rotate-0 truncate">
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Metode Pembayaran */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground">
                Metode Pembayaran
              </CardTitle>
              <CardDescription className="text-[11px]">
                Pembagian omzet bulan ini
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {salesHighlight.paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Belum ada transaksi di bulan ini
                </p>
              ) : (
                salesHighlight.paymentMethods.map((pm) => (
                  <div key={pm.method} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {pm.method === "cash" && <Banknote className="w-3 h-3 text-emerald-600" />}
                        {pm.method === "transfer" && <CreditCard className="w-3 h-3 text-blue-600" />}
                        {pm.method === "qris" && <QrCode className="w-3 h-3 text-purple-600" />}
                        {pm.method === "edc" && <CreditCard className="w-3 h-3 text-amber-600" />}
                        {pm.label}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {formatRupiah(pm.total)} ({pm.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pm.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: HIGHLIGHT PENGELUARAN HARIAN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Highlight Pengeluaran Kas Harian
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-rose-600 hover:text-rose-700 h-7 p-0 gap-1">
            <Link href="/reports/expenses">
              Lihat Semua Pengeluaran <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Pengeluaran Hari Ini</span>
              <p className="text-xl font-bold font-mono text-rose-600">
                {formatRupiah(expenseHighlight.todayTotal)}
              </p>
              <p className="text-[11px] text-muted-foreground">Kas keluar operasional hari ini</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total Pengeluaran Bulan Ini</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatRupiah(expenseHighlight.monthTotal)}
              </p>
              <p className="text-[11px] text-muted-foreground">Akumulasi pengeluaran harian periode {periodName}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card shadow-xs flex flex-col justify-center p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Kelola Kas Operasional</p>
                <p className="text-[11px] text-muted-foreground">Catat transaksi kas keluar harian toko</p>
              </div>
              <Button asChild size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                <Link href="/reports/expenses">+ Input Kas Keluar</Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Tabel Pengeluaran Terbaru */}
        <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold text-foreground">
              Pengeluaran Kas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expenseHighlight.recentExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                Belum ada pengeluaran kas dicatat
              </p>
            ) : (
              <div className="divide-y divide-border">
                {expenseHighlight.recentExpenses.map((exp) => (
                  <div key={exp.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{exp.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(exp.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })} • Dicatat oleh: {exp.creatorName}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      -{formatRupiah(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
