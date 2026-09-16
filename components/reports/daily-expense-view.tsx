"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToExcel, triggerPrint } from "@/lib/export-utils";
import {
  Wallet,
  Calendar,
  PlusCircle,
  Trash2,
  FileSpreadsheet,
  Loader2,
  Printer,
  Eye,
  Store,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Table } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createDailyExpense, deleteDailyExpense } from "@/lib/actions/report.actions";
import { toast } from "sonner";
import { ReportPrintPreviewModal } from "./report-print-preview-modal";

export interface DailyExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  createdByName: string;
  createdAt: string;
}

export interface DailyExpenseAggregate {
  dateStr: string;
  rawDate: string;
  count: number;
  totalAmount: number;
}

interface DailyExpenseViewProps {
  data: {
    todayExpenses: DailyExpenseItem[];
    periodExpenses?: DailyExpenseItem[];
    totalToday: number;
    dailyAggregates: DailyExpenseAggregate[];
    totalPeriod: number;
    startDate: string;
    endDate: string;
    isFiltered?: boolean;
  };
  onRefresh?: (startDate?: string, endDate?: string) => void;
}

export function DailyExpenseView({ data, onRefresh }: DailyExpenseViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(todayStr);

  // Action states
  const [isSubmitting, startSubmitting] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Print Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filter Rentang Tanggal di samping tombol Cetak
  const [startDate, setStartDate] = useState<string>(
    data.startDate ? data.startDate.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState<string>(
    data.endDate ? data.endDate.slice(0, 10) : ""
  );

  const handleApplyDateRange = () => {
    if (onRefresh) {
      onRefresh(startDate || undefined, endDate || undefined);
    }
  };

  const handleResetDateRange = () => {
    setStartDate("");
    setEndDate("");
    if (onRefresh) {
      onRefresh(undefined, undefined);
    }
  };

  const filteredDailyAggregates = data.dailyAggregates;
  const filteredTotalPeriod = data.totalPeriod;

  const isDateFiltered = Boolean(data.isFiltered || (startDate && endDate));
  const activeExpenseList = isDateFiltered
    ? (data.periodExpenses ?? data.todayExpenses)
    : data.todayExpenses;
  const activeExpenseTotal = isDateFiltered ? data.totalPeriod : data.totalToday;
  const activeExpenseTitle = isDateFiltered
    ? "History Pengeluaran (Periode Terpilih)"
    : "History Pengeluaran Hari Ini";
  const activeExpenseSubtitle = isDateFiltered
    ? `Daftar transaksi pengeluaran pada rentang periode terpilih (${activeExpenseList.length} transaksi)`
    : `Daftar pengeluaran yang dicatat pada hari ini (${activeExpenseList.length} transaksi)`;

  const excelHeaders = ["Tanggal", "Jumlah Catatan", "Total Biaya (Rp)"];
  const excelRows = data.dailyAggregates.map((d) => [
    d.dateStr,
    d.count,
    d.totalAmount,
  ]);
  const excelFileName = `Rekap_Pengeluaran_Harian_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Handle Create Expense
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Keterangan pengeluaran tidak boleh kosong.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Biaya pengeluaran harus lebih besar dari Rp 0.");
      return;
    }

    startSubmitting(async () => {
      try {
        const res = await createDailyExpense({
          description: description.trim(),
          amount,
          date: expenseDate,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Pengeluaran harian berhasil dicatat.");
        setDescription("");
        setAmount(0);
        setExpenseDate(todayStr);

        if (onRefresh) {
          onRefresh(startDate || undefined, endDate || undefined);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal mencatat pengeluaran.");
      }
    });
  };

  // Handle Delete Expense
  const handleDelete = (id: string, desc: string) => {
    if (!window.confirm(`Hapus catatan pengeluaran "${desc}"?`)) return;

    setDeletingId(id);
    startSubmitting(async () => {
      try {
        const res = await deleteDailyExpense(id);
        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Catatan pengeluaran berhasil dihapus.");
        if (onRefresh) {
          onRefresh(startDate || undefined, endDate || undefined);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal menghapus pengeluaran.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  // Export Daily Expenses to Excel
  const handleExportExcel = () => {
    exportToExcel(excelFileName, "Pengeluaran-Harian", excelHeaders, excelRows);
  };

  // Reusable Formal Daily Expense Document Component for Print and Preview Modal
  const FormalDailyExpenseDocument = () => {
    const todayFormatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    const currentDateOnly = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const startDateStr = new Date(data.startDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDateStr = new Date(data.endDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    return (
      <div className="text-slate-900 bg-white font-sans text-xs leading-normal space-y-6">
        {/* Kop Surat Resmi Bisnis */}
        <div className="border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6 text-[#055B5A]" />
                <h1 className="text-2xl font-black tracking-tight text-[#055B5A]">
                  GLORIA PONSEL
                </h1>
              </div>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                Pusat Penjualan Handphone Baru & Second Berkualitas • Aksesoris • Servis
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Alamat: Jl. Toko Gloria Ponsel | Telp/WA: 0812-3456-7890 | Website: gloriaponsel.com
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 border border-slate-900 bg-slate-100 text-slate-900 font-extrabold text-[10px] tracking-wider uppercase rounded-sm">
                DOKUMEN KAS OPERASIONAL
              </span>
              <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                NO: EXP/{currentYear}/{currentMonth}
              </p>
              <p className="text-[10px] text-slate-500">
                Dicetak: {todayFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Judul Laporan */}
        <div className="text-center py-1">
          <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
            LAPORAN PENGELUARAN KAS HARIAN OPERASIONAL
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Periode: {startDateStr} s/d {endDateStr}
          </p>
        </div>

        {/* Ringkasan Indikator Pengeluaran Kas (KPI Box Grid) */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Pengeluaran Kas Hari Ini
            </span>
            <span className="text-base font-bold font-mono text-rose-700">
              {formatRupiah(data.totalToday)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {data.todayExpenses.length} transaksi kas hari ini
            </span>
          </div>

          <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Total Pengeluaran Periode Ini
            </span>
            <span className="text-base font-bold font-mono text-slate-900">
              {formatRupiah(data.totalPeriod)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Akumulasi rentang tanggal
            </span>
          </div>

          <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Hari Operasional Terdata
            </span>
            <span className="text-base font-bold font-mono text-slate-900">
              {data.dailyAggregates.length} Hari
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Catatan aktif pembukuan
            </span>
          </div>
        </div>

        {/* BAGIAN I: TABEL REKAPITULASI TOTAL PENGELUARAN PER HARI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              I. Rekapitulasi Total Pengeluaran per Hari
            </h3>
            <span className="text-[10px] text-slate-500 italic">
              Akumulasi Biaya Operasional per Tanggal
            </span>
          </div>

          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                <th className="py-2 px-3 text-center w-12">No</th>
                <th className="py-2 px-3 text-left">Hari & Tanggal</th>
                <th className="py-2 px-3 text-center w-36">Jumlah Catatan</th>
                <th className="py-2 px-3 text-right w-44">Total Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {data.dailyAggregates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                    Tidak ada catatan pengeluaran harian pada rentang waktu ini.
                  </td>
                </tr>
              ) : (
                data.dailyAggregates.map((agg, idx) => (
                  <tr key={agg.rawDate} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">{agg.dateStr}</td>
                    <td className="py-1.5 px-3 text-center text-slate-600">{agg.count} catatan</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(agg.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                <td colSpan={3} className="py-2 px-3 text-right">
                  TOTAL AKUMULASI PENGELUARAN PERIODE INI:
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                  {formatRupiah(data.totalPeriod)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* BAGIAN II: RINCIAN PENGELUARAN */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              II. {isDateFiltered ? "Rincian Transaksi Pengeluaran Kas Periode Terpilih" : "Rincian Transaksi Pengeluaran Kas Hari Ini"}
            </h3>
            <span className="text-[10px] text-slate-500 italic">
              {isDateFiltered ? `Rentang: ${startDate || "-"} s/d ${endDate || "-"}` : `Status Kas Tanggal: ${currentDateOnly}`}
            </span>
          </div>

          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                <th className="py-2 px-3 text-center w-12">No</th>
                <th className="py-2 px-3 text-left w-28">{isDateFiltered ? "Tgl & Waktu" : "Waktu"}</th>
                <th className="py-2 px-3 text-left">Keterangan Pengeluaran</th>
                <th className="py-2 px-3 text-left w-36">Dicatat Oleh</th>
                <th className="py-2 px-3 text-right w-36">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {activeExpenseList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                    Belum ada pengeluaran yang dicatat pada rentang periode ini.
                  </td>
                </tr>
              ) : (
                activeExpenseList.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-mono text-slate-600">
                      {isDateFiltered ? (
                        <>
                          <span>{new Date(it.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>{" "}
                          <span className="text-slate-400">
                            {new Date(it.date).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      ) : (
                        new Date(it.date).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-medium text-slate-800">{it.description}</td>
                    <td className="py-1.5 px-3 text-slate-600">{it.createdByName}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                      {formatRupiah(it.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                <td colSpan={4} className="py-2 px-3 text-right">
                  {isDateFiltered ? "TOTAL PENGELUARAN PERIODE TERPILIH:" : "TOTAL PENGELUARAN KAS HARI INI:"}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                  {formatRupiah(activeExpenseTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lembar Pengesahan Resmi */}
        <div className="pt-8 space-y-4 break-inside-avoid">
          <div className="flex justify-end text-xs text-slate-700">
            <p>Gloria Ponsel, {currentDateOnly}</p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs pt-2">
            <div>
              <p className="font-medium text-slate-600">Dibuat Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline underline-offset-4">
                ( Petugas Kasir / Administrasi )
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Penanggung Jawab Kas Harian</p>
            </div>
            <div>
              <p className="font-medium text-slate-600">Disetujui & Diketahui Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline underline-offset-4">
                ( Owner Gloria Ponsel )
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Pimpinan & Pemilik Toko</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
            <p>
              Dokumen resmi ini dicetak secara komputerisasi melalui Sistem Manajemen Gloria Ponsel dan sah sebagai laporan pertanggungjawaban kas harian internal.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PRINT-ONLY CONTAINER: Tampil otomatis saat window.print() / Cetak PDF     */}
      {/* ========================================================================= */}
      <div className="only-print">
        <FormalDailyExpenseDocument />
      </div>

      {/* ========================================================================= */}
      {/* ON-SCREEN INTERACTIVE DASHBOARD VIEW (Disembunyikan saat cetak)           */}
      {/* ========================================================================= */}
      <div className="no-print space-y-6">
        {/* Top Banner & Export */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Pengeluaran Harian Operasional
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Operasional Kas
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Catat dan pantau pengeluaran kas harian toko seperti bensin, konsumsi, dan perlengkapan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none w-28"
                title="Tanggal Mulai"
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none w-28"
                title="Tanggal Selesai"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleApplyDateRange}
              disabled={isSubmitting}
              className="text-xs h-8 px-2.5 rounded-xl font-semibold"
            >
              Filter
            </Button>
            {(startDate || endDate) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleResetDateRange}
                disabled={isSubmitting}
                className="text-xs h-8 px-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-semibold gap-1.5 shadow-xs h-8 rounded-xl"
              title="Buka pratinjau cetak PDF dan Excel"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pengeluaran Hari Ini
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(data.totalToday)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.todayExpenses.length} transaksi pengeluaran hari ini
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Pengeluaran Periode Ini
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(data.totalPeriod)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi seluruh pengeluaran dalam rentang tanggal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container Input Pengeluaran Baru */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Input Pengeluaran Baru
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Masukkan keterangan dan nominal pengeluaran untuk dicatat langsung ke pembukuan.
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Keterangan */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Keterangan Pengeluaran
                  </label>
                  <Input
                    placeholder="Contoh: Konsumsi harian, bensin kurir, plastik kresek..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 text-xs bg-background"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Biaya (Rp) */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Biaya / Nominal (Rp)
                  </label>
                  <CurrencyInput
                    placeholder="0"
                    value={amount}
                    onValueChange={(val) => setAmount(val)}
                    className="h-10 text-xs font-bold bg-background"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Tanggal */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tanggal
                  </label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="h-10 text-xs bg-background"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !description.trim() || amount <= 0}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                      Simpan Pengeluaran
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Grid 2 Tabel: 1 History Pengeluaran, 2 Total per Hari */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* TABEL 1: History Pengeluaran (Terkoneksi ke Filter) */}
          <div className="lg:col-span-6">
            <Card className="border border-border bg-card shadow-xs h-full">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{activeExpenseTitle}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {activeExpenseSubtitle}
                    </p>
                  </div>
                  <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                    {formatRupiah(activeExpenseTotal)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {activeExpenseList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Belum ada pengeluaran yang dicatat pada rentang periode ini.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground font-semibold">
                            <th className="pb-3">{isDateFiltered ? "Tgl & Waktu" : "Waktu"}</th>
                            <th className="pb-3">Keterangan</th>
                            <th className="pb-3 text-right">Biaya (Rp)</th>
                            <th className="pb-3">Dicatat Oleh</th>
                            <th className="pb-3 text-center w-12">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeExpenseList.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                              <td className="py-3 text-muted-foreground font-mono">
                                {isDateFiltered ? (
                                  <div>
                                    <span className="font-semibold text-foreground">
                                      {new Date(item.date).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                      })}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      {new Date(item.date).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  new Date(item.date).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                )}
                              </td>
                              <td className="py-3 font-medium text-foreground">
                                {item.description}
                              </td>
                              <td className="py-3 text-right font-bold text-rose-600">
                                {formatRupiah(item.amount)}
                              </td>
                              <td className="py-3 text-muted-foreground text-[11px]">
                                {item.createdByName}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id, item.description)}
                                  disabled={deletingId === item.id}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus pengeluaran"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Mobile Card List View (Opsi 1) */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                      {activeExpenseList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-muted/20 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground text-[11px]">
                              {new Date(item.date).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              •{" "}
                              {new Date(item.date).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="font-mono font-bold text-rose-600 text-xs">
                              {formatRupiah(item.amount)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[11px] text-muted-foreground">
                            <span>
                              Dicatat: <strong className="text-foreground font-medium">{item.createdByName}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.description)}
                              disabled={deletingId === item.id}
                              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* TABEL 2: Total Pengeluaran per Hari */}
          <div className="lg:col-span-6">
            <Card className="border border-border bg-card shadow-xs h-full">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Total Pengeluaran per Hari</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Akumulasi pengeluaran harian dalam rentang periode
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Total: {formatRupiah(filteredTotalPeriod)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {filteredDailyAggregates.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Belum ada catatan pengeluaran pada rentang waktu ini.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground font-semibold">
                            <th className="pb-3">Tanggal</th>
                            <th className="pb-3 text-center">Jumlah Transaksi</th>
                            <th className="pb-3 text-right">Total Biaya (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredDailyAggregates.map((agg) => (
                            <tr key={agg.rawDate} className="hover:bg-muted/40 transition-colors">
                              <td className="py-3 font-medium text-foreground">
                                {agg.dateStr}
                              </td>
                              <td className="py-3 text-center text-muted-foreground">
                                <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                                  {agg.count} catatan
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-foreground">
                                {formatRupiah(agg.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Mobile Card List View (Opsi 1) */}
                    <div className="grid grid-cols-1 gap-2 md:hidden">
                      {filteredDailyAggregates.map((agg) => (
                        <div
                          key={agg.rawDate}
                          className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-muted/20 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-foreground">{agg.dateStr}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {agg.count} transaksi pengeluaran
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-foreground">
                            {formatRupiah(agg.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Pratinjau Cetak Terpadu (PDF & Excel) */}
      <ReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Pratinjau Cetak Pengeluaran Harian"
        pdfPreview={<FormalDailyExpenseDocument />}
        excelHeaders={excelHeaders}
        excelRows={excelRows}
        excelFileName={excelFileName}
        onExportExcel={handleExportExcel}
        onPrintPdf={triggerPrint}
      />
    </div>
  );
}
