"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToExcel, triggerPrint } from "@/lib/export-utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Coins,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  CheckCircle2,
  Eye,
  Store,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createMonthlyExpense,
  deleteMonthlyExpense,
} from "@/lib/actions/report.actions";
import { toast } from "sonner";
import { ReportPrintPreviewModal } from "./report-print-preview-modal";

export interface DailyExpenseDayBreakdown {
  dateStr: string;
  rawDate: string;
  count: number;
  totalAmount: number;
  items: { description: string; amount: number; time: string; creatorName: string }[];
}

export interface MonthlyExpenseItem {
  id: string;
  month: number;
  year: number;
  description: string;
  amount: number;
  createdByName: string;
  createdAt: string;
}

export interface MonthlyFinancialReportData {
  month: number;
  year: number;
  monthName: string;
  salesSummary: {
    transactionCount: number;
    totalGrossRevenue?: number;
    totalDiscount?: number;
    totalRevenue: number;
    totalCogs: number;
    grossSalesProfit: number;
    totalCommission: number;
    netSalesProfit: number;
    totalItemsSold?: number;
    paymentBreakdown?: { method: string; count: number; total: number }[];
    categoryBreakdown?: {
      categoryName: string;
      qty: number;
      revenue: number;
      cogs: number;
      profit: number;
    }[];
  };
  expensesSummary: {
    totalDailyExpenses: number;
    dailyExpenseCount: number;
    dailyExpenseBreakdown?: DailyExpenseDayBreakdown[];
    totalMonthlyExpenses: number;
    monthlyExpenses: MonthlyExpenseItem[];
    totalOperationalExpenses: number;
  };
  netStoreProfit: number;
}

interface FinancialReportViewProps {
  data: MonthlyFinancialReportData;
  selectedMonth: number;
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
  onRefresh?: () => void;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const COMMON_EXPENSE_PRESETS = [
  "Sewa Ruko / Toko",
  "Listrik PLN",
  "Internet & Wi-Fi",
  "Gaji Karyawan",
  "Air & Kebersihan",
  "Maintenance & Renovasi",
];

export function FinancialReportView({
  data,
  selectedMonth,
  selectedYear,
  onMonthYearChange,
  onRefresh,
}: FinancialReportViewProps) {
  // Input Additional Expense state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, startSubmitting] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal Print Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { salesSummary, expensesSummary, netStoreProfit } = data;
  const grossRevenue = salesSummary.totalGrossRevenue ?? salesSummary.totalRevenue;
  const discountTotal = salesSummary.totalDiscount ?? 0;
  const itemsSoldTotal = salesSummary.totalItemsSold ?? 0;
  const dailyBreakdown = expensesSummary.dailyExpenseBreakdown ?? [];
  const paymentMethods = salesSummary.paymentBreakdown ?? [];
  const categoriesList = salesSummary.categoryBreakdown ?? [];

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Keterangan pengeluaran tambahan wajib diisi.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Biaya pengeluaran harus lebih besar dari Rp 0.");
      return;
    }

    startSubmitting(async () => {
      try {
        const res = await createMonthlyExpense({
          month: selectedMonth,
          year: selectedYear,
          description: description.trim(),
          amount,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Pengeluaran tambahan bulan ini berhasil disimpan.");
        setDescription("");
        setAmount(0);

        if (onRefresh) {
          onRefresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal mencatat pengeluaran tambahan.");
      }
    });
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    if (!window.confirm(`Hapus pengeluaran tambahan "${desc}"?`)) return;

    setDeletingId(id);
    startSubmitting(async () => {
      try {
        const res = await deleteMonthlyExpense(id);
        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Pengeluaran tambahan berhasil dihapus.");
        if (onRefresh) {
          onRefresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal menghapus pengeluaran tambahan.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const excelHeaders = ["Komponen Keuangan", "Keterangan", "Nominal (Rp)"];
  const excelRows: (string | number)[][] = [
    ["Informasi Laporan", "Periode", `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`],
    ["Pendapatan", "Penjualan Kotor (Gross Sales)", grossRevenue],
    ["Pendapatan", "(-) Diskon Penjualan", discountTotal],
    ["Pendapatan", "(=) Penjualan Bersih (Net Sales)", salesSummary.totalRevenue],
    ["Beban Pokok", "(-) Harga Pokok Penjualan (HPP Modal)", salesSummary.totalCogs],
    ["Laba Kotor", "(=) Laba Kotor Penjualan", salesSummary.grossSalesProfit],
    ["Beban Penjualan", "(-) Beban Komisi Penjualan", salesSummary.totalCommission],
    ["Laba Bersih Penjualan", "(=) Laba Bersih Penjualan", salesSummary.netSalesProfit],
    ["Beban Operasional", "(-) Total Pengeluaran Kas Harian", expensesSummary.totalDailyExpenses],
    ["Beban Operasional", "(-) Total Beban Tambahan Bulanan", expensesSummary.totalMonthlyExpenses],
    ["Total Beban", "(=) Total Beban Operasional Toko", expensesSummary.totalOperationalExpenses],
    ["LABA BERSIH AKHIR", "(=) LABA BERSIH OPERASIONAL TOKO", netStoreProfit],
  ];

  // Append Daily Expenses Breakdown
  excelRows.push(["--- RINCIAN PENGELUARAN HARIAN ---", "", ""]);
  for (const d of dailyBreakdown) {
    const itemDescs = d.items.map((it) => `${it.description} (${formatRupiah(it.amount)})`).join(", ");
    excelRows.push([d.dateStr, `${d.count} transaksi: ${itemDescs}`, d.totalAmount]);
  }

  // Append Monthly Expenses
  excelRows.push(["--- RINCIAN BEBAN TAMBAHAN BULAN INI ---", "", ""]);
  for (const m of expensesSummary.monthlyExpenses) {
    excelRows.push([m.description, `${m.createdByName} (${new Date(m.createdAt).toLocaleDateString("id-ID")})`, m.amount]);
  }

  const excelFileName = `Laporan_Keuangan_Formal_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.xlsx`;

  const handleExportExcel = () => {
    exportToExcel(excelFileName, "Laporan-Keuangan", excelHeaders, excelRows);
  };

  // Reusable Formal Document Component (Used in print mode and inside preview modal)
  const FormalFinancialDocument = () => {
    const todayFormatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    const currentDateOnly = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

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
                DOKUMEN FINANSIAL RESMI
              </span>
              <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                NO: FIN/{selectedYear}/{String(selectedMonth).padStart(2, "0")}
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
            LAPORAN KEUANGAN & LABA-RUGI BULANAN
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Periode: Bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        {/* BAGIAN I: LAPORAN LABA RUGI KOMPREHENSIF (INCOME STATEMENT) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              I. Laporan Laba-Rugi Komprehensif (Income Statement)
            </h3>
            <span className="text-[10px] text-slate-500 italic">Mata Uang: Rupiah (IDR)</span>
          </div>

          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="py-2 px-3 text-left w-12">No</th>
                <th className="py-2 px-3 text-left">Komponen Keuangan</th>
                <th className="py-2 px-3 text-left w-48">Rincian Pos</th>
                <th className="py-2 px-3 text-right w-36">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Pendapatan */}
              <tr className="bg-slate-50/50 font-bold">
                <td className="py-1.5 px-3">1.</td>
                <td className="py-1.5 px-3">PENDAPATAN OPERASIONAL PENJUALAN</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600 font-normal">
                  {salesSummary.transactionCount} Transaksi Selesai
                </td>
                <td className="py-1.5 px-3 text-right"></td>
              </tr>
              <tr>
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6">Penjualan Kotor (Gross Sales)</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600">Subtotal Transaksi</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatRupiah(grossRevenue)}</td>
              </tr>
              {discountTotal > 0 && (
                <tr>
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-3 pl-6 text-slate-600">(-) Potongan Diskon Penjualan</td>
                  <td className="py-1.5 px-3 text-[11px] text-slate-500">Promosi & Potongan</td>
                  <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                    -{formatRupiah(discountTotal)}
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100/70 font-semibold">
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6">Total Penjualan Bersih (Net Revenue)</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600">Omzet Bersih Toko</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatRupiah(salesSummary.totalRevenue)}
                </td>
              </tr>

              {/* HPP */}
              <tr className="bg-slate-50/50 font-bold">
                <td className="py-1.5 px-3">2.</td>
                <td className="py-1.5 px-3">BEBAN POKOK PENJUALAN (HPP / COGS)</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600 font-normal">
                  {itemsSoldTotal > 0 ? `${itemsSoldTotal} Unit Produk` : "-"}
                </td>
                <td className="py-1.5 px-3 text-right"></td>
              </tr>
              <tr>
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 text-slate-600">(-) Harga Pokok Modal Barang Terjual</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-500">Harga Beli Modal</td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                  -{formatRupiah(salesSummary.totalCogs)}
                </td>
              </tr>
              <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 font-bold">(=) LABA KOTOR PENJUALAN (GROSS PROFIT)</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600">Omzet Bersih - HPP</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                  {formatRupiah(salesSummary.grossSalesProfit)}
                </td>
              </tr>

              {/* Komisi */}
              <tr className="bg-slate-50/50 font-bold">
                <td className="py-1.5 px-3">3.</td>
                <td className="py-1.5 px-3">BEBAN PENJUALAN LANGSUNG</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600 font-normal">Insentif Transaksi</td>
                <td className="py-1.5 px-3 text-right"></td>
              </tr>
              <tr>
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 text-slate-600">(-) Beban Komisi Penjualan</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-500">Komisi Disetujui Owner</td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                  -{formatRupiah(salesSummary.totalCommission)}
                </td>
              </tr>
              <tr className="bg-blue-50/60 font-semibold text-blue-950">
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 font-bold">(=) LABA BERSIH PENJUALAN</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600">Laba Kotor - Komisi</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-800">
                  {formatRupiah(salesSummary.netSalesProfit)}
                </td>
              </tr>

              {/* Beban Operasional */}
              <tr className="bg-slate-50/50 font-bold">
                <td className="py-1.5 px-3">4.</td>
                <td className="py-1.5 px-3">BEBAN OPERASIONAL TOKO (OPERATING EXPENSES)</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600 font-normal">Kas & Beban Tetap</td>
                <td className="py-1.5 px-3 text-right"></td>
              </tr>
              <tr>
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 text-slate-600">(-) Total Pengeluaran Kas Harian</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-500">
                  {expensesSummary.dailyExpenseCount} Transaksi Harian
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                  -{formatRupiah(expensesSummary.totalDailyExpenses)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6 text-slate-600">(-) Total Beban Tambahan Bulanan</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-500">
                  {expensesSummary.monthlyExpenses.length} Pos Beban Bulanan
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                  -{formatRupiah(expensesSummary.totalMonthlyExpenses)}
                </td>
              </tr>
              <tr className="bg-slate-100/70 font-semibold">
                <td className="py-1.5 px-3"></td>
                <td className="py-1.5 px-3 pl-6">Total Beban Operasional Toko</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-600">Harian + Bulanan</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                  {formatRupiah(expensesSummary.totalOperationalExpenses)}
                </td>
              </tr>

              {/* Laba Bersih Akhir Toko */}
              <tr
                className={`font-black text-sm border-t-2 border-b-4 border-double border-slate-900 ${
                  netStoreProfit >= 0 ? "bg-emerald-100/80 text-emerald-950" : "bg-rose-100/80 text-rose-950"
                }`}
              >
                <td className="py-2.5 px-3">5.</td>
                <td className="py-2.5 px-3 font-extrabold uppercase">
                  LABA BERSIH AKHIR TOKO (NET INCOME)
                </td>
                <td className="py-2.5 px-3 text-[11px] font-normal">
                  {netStoreProfit >= 0 ? "SURPLUS LABA BERSIH" : "DEFISIT KERUGIAN"}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm">
                  {formatRupiah(netStoreProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BAGIAN II: RINCIAN KINERJA PENJUALAN BULAN INI */}
        <div className="space-y-2 pt-2">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              II. Rincian Kinerja Penjualan Bulan Ini
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Total Transaksi
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {salesSummary.transactionCount} Faktur
              </span>
            </div>
            <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Total Unit Terjual
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {itemsSoldTotal} Unit
              </span>
            </div>
            <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Total Penjualan
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {formatRupiah(salesSummary.totalRevenue)}
              </span>
            </div>
          </div>

          {/* Tabel Metode Pembayaran */}
          <div className="border border-slate-300 rounded overflow-hidden mt-1">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-[11px] text-slate-800">
              Rincian Penerimaan per Metode Pembayaran
            </div>
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-slate-200">
                {paymentMethods.length === 0 ? (
                  <tr>
                    <td className="p-2 text-center text-slate-400 italic">Tidak ada transaksi.</td>
                  </tr>
                ) : (
                  paymentMethods.map((pm) => (
                    <tr key={pm.method}>
                      <td className="py-1.5 px-3 uppercase font-semibold text-slate-700">
                        {pm.method}
                      </td>
                      <td className="py-1.5 px-3 text-center text-slate-500">{pm.count} transaksi</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(pm.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BAGIAN III: RINCIAN PENGELUARAN HARIAN PER HARI */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              III. Rincian Rekapitulasi Pengeluaran per Hari
            </h3>
            <span className="text-[11px] font-bold text-slate-800">
              Total: {formatRupiah(expensesSummary.totalDailyExpenses)}
            </span>
          </div>

          {dailyBreakdown.length === 0 ? (
            <div className="p-3 text-center text-slate-400 border border-slate-200 rounded italic text-[11px]">
              Tidak ada catatan pengeluaran harian pada bulan ini.
            </div>
          ) : (
            <table className="w-full text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                  <th className="py-1.5 px-3 text-center w-10">No</th>
                  <th className="py-1.5 px-3 text-left w-44">Tanggal</th>
                  <th className="py-1.5 px-3 text-center w-24">Jumlah Catatan</th>
                  <th className="py-1.5 px-3 text-left">Rincian Pengeluaran Kas</th>
                  <th className="py-1.5 px-3 text-right w-36">Total Biaya (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {dailyBreakdown.map((item, idx) => (
                  <tr key={item.rawDate} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">{item.dateStr}</td>
                    <td className="py-1.5 px-3 text-center text-slate-600">{item.count} transaksi</td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {item.items
                        .map((it) => `${it.description} (${formatRupiah(it.amount)})`)
                        .join(", ")}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-xs">
                  <td colSpan={4} className="py-2 px-3 text-right">
                    TOTAL PENGELUARAN KAS HARIAN BULAN INI:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold">
                    {formatRupiah(expensesSummary.totalDailyExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* BAGIAN IV: RINCIAN BEBAN OPERASIONAL TAMBAHAN BULAN INI */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              IV. Rincian Beban Operasional Tambahan Bulan Ini
            </h3>
            <span className="text-[11px] font-bold text-slate-800">
              Total: {formatRupiah(expensesSummary.totalMonthlyExpenses)}
            </span>
          </div>

          {expensesSummary.monthlyExpenses.length === 0 ? (
            <div className="p-3 text-center text-slate-400 border border-slate-200 rounded italic text-[11px]">
              Tidak ada catatan beban operasional tambahan pada bulan ini.
            </div>
          ) : (
            <table className="w-full text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                  <th className="py-1.5 px-3 text-center w-10">No</th>
                  <th className="py-1.5 px-3 text-left">Pos Beban / Keterangan</th>
                  <th className="py-1.5 px-3 text-left w-36">Dicatat Oleh</th>
                  <th className="py-1.5 px-3 text-left w-36">Tanggal Input</th>
                  <th className="py-1.5 px-3 text-right w-36">Nominal Biaya (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {expensesSummary.monthlyExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">{exp.description}</td>
                    <td className="py-1.5 px-3 text-slate-600">{exp.createdByName}</td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {new Date(exp.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-xs">
                  <td colSpan={4} className="py-2 px-3 text-right">
                    TOTAL BEBAN OPERASIONAL TAMBAHAN BULAN INI:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-700 font-bold">
                    {formatRupiah(expensesSummary.totalMonthlyExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* BAGIAN V: LEMBAR PENGESAHAN LAPORAN KEUANGAN */}
        <div className="pt-8 space-y-4 break-inside-avoid">
          <div className="flex justify-end text-xs text-slate-700">
            <p>Gloria Ponsel, {currentDateOnly}</p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-xs pt-2">
            <div>
              <p className="font-medium text-slate-600">Dibuat Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 underline underline-offset-4">
                ( Bagian Administrasi / Keuangan )
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Staff Kasir & Pembukuan</p>
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
              Dokumen resmi ini dicetak secara komputerisasi melalui Sistem Manajemen Gloria Ponsel dan sah sebagai laporan pertanggungjawaban operasional internal.
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
        <FormalFinancialDocument />
      </div>

      {/* ========================================================================= */}
      {/* ON-SCREEN INTERACTIVE DASHBOARD VIEW (Disembunyikan saat cetak)           */}
      {/* ========================================================================= */}
      <div className="no-print space-y-6">
        {/* Top Controls: Month & Year Selector + Export */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Laporan Keuangan Bulanan
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Konsolidasi Laba Bersih
              </span>
            </div>
            {/*<p className="text-xs text-muted-foreground">
              Laporan finansial komprehensif mengintegrasikan omzet, HPP, komisi, beban harian, dan beban bulanan.
            </p>*/}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => onMonthYearChange(Number(e.target.value), selectedYear)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => onMonthYearChange(selectedMonth, Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Tombol Cetak / Ekspor Universal */}
            <Button
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="text-xs font-semibold gap-1.5 shadow-xs"
              title="Buka pratinjau cetak PDF dan Excel"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Omzet Penjualan */}
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Omzet Penjualan
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <span>Rp</span>
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(salesSummary.totalRevenue)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {salesSummary.transactionCount} transaksi penjualan
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Laba Bersih Penjualan */}
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Laba Penjualan Bersih
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-blue-700">
                  {formatRupiah(salesSummary.netSalesProfit)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Setelah HPP & Komisi ({formatRupiah(salesSummary.totalCommission)})
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Beban Operasional */}
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Beban Operasional
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-rose-700">
                  {formatRupiah(expensesSummary.totalOperationalExpenses)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Harian: {formatRupiah(expensesSummary.totalDailyExpenses)} • Tambahan: {formatRupiah(expensesSummary.totalMonthlyExpenses)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Laba Bersih Akhir Toko */}
          <Card
            className={`border shadow-xs ${
              netStoreProfit >= 0
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-rose-200 bg-rose-50/40"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Laba Bersih Akhir Toko
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    netStoreProfit >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4
                  className={`text-2xl font-extrabold tracking-tight ${
                    netStoreProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatRupiah(netStoreProfit)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Hasil bersih yang diterima Owner
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Input Pengeluaran Tambahan Bulan Ini */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Input Pengeluaran Tambahan Bulan Ini ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Catat biaya tetap dan beban operasional bulanan seperti sewa toko, tagihan listrik, internet, atau gaji.
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Pilihan Cepat Kategori Beban Bulanan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_EXPENSE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDescription(preset)}
                    className="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:bg-background transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-7 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Keterangan Pengeluaran Tambahan
                  </label>
                  <Input
                    placeholder="Contoh: Sewa Ruko Gloria Ponsel, Tagihan Listrik PLN..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 text-xs bg-background"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="sm:col-span-5 space-y-1.5">
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
              </div>

              <div className="flex justify-end pt-1">
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
                      Tambah Pengeluaran Bulan Ini
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Grid: 1 Rincian Laba Rugi Komprehensif, 2 Daftar Pengeluaran Tambahan */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Rincian Laba Rugi Komprehensif (Income Statement) */}
          <div className="lg:col-span-7">
            <Card className="border border-border bg-card shadow-xs h-full">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Laporan Laba-Rugi Komprehensif
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ringkasan alur perhitungan laba bersih toko periode {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="rounded-xl border border-border bg-muted/10 divide-y divide-border text-xs">
                  {/* 1. Pendapatan */}
                  <div className="p-3.5 flex justify-between items-center bg-muted/20">
                    <span className="font-bold text-foreground">1. Omzet Penjualan Bersih</span>
                    <span className="font-bold text-foreground font-mono">
                      {formatRupiah(salesSummary.totalRevenue)}
                    </span>
                  </div>

                  {/* 2. HPP */}
                  <div className="p-3.5 flex justify-between items-center pl-6 text-muted-foreground">
                    <span>(-) Harga Pokok Penjualan (Modal Barang)</span>
                    <span className="font-mono">{formatRupiah(salesSummary.totalCogs)}</span>
                  </div>

                  {/* 3. Laba Kotor */}
                  <div className="p-3.5 flex justify-between items-center bg-muted/10">
                    <span className="font-semibold text-foreground">(=) Laba Kotor Penjualan</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatRupiah(salesSummary.grossSalesProfit)}
                    </span>
                  </div>

                  {/* 4. Komisi */}
                  <div className="p-3.5 flex justify-between items-center pl-6 text-muted-foreground">
                    <span>(-) Beban Komisi Penjualan</span>
                    <span className="font-mono">{formatRupiah(salesSummary.totalCommission)}</span>
                  </div>

                  {/* 5. Laba Bersih Penjualan */}
                  <div className="p-3.5 flex justify-between items-center bg-blue-50/50">
                    <span className="font-bold text-blue-900">(=) Laba Bersih Penjualan</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {formatRupiah(salesSummary.netSalesProfit)}
                    </span>
                  </div>

                  {/* 6. Beban Operasional */}
                  <div className="p-3.5 space-y-2 bg-muted/20">
                    <div className="flex justify-between items-center font-bold text-foreground">
                      <span>2. Beban Operasional Toko</span>
                      <span className="font-mono text-rose-700">
                        {formatRupiah(expensesSummary.totalOperationalExpenses)}
                      </span>
                    </div>
                    <div className="pl-3 space-y-1.5 text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>(-) Pengeluaran Harian Kas ({expensesSummary.dailyExpenseCount} transaksi)</span>
                        <span className="font-mono">{formatRupiah(expensesSummary.totalDailyExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>(-) Pengeluaran Tambahan Bulanan ({expensesSummary.monthlyExpenses.length} pos)</span>
                        <span className="font-mono">{formatRupiah(expensesSummary.totalMonthlyExpenses)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7. Laba Bersih Akhir Toko */}
                  <div
                    className={`p-4 flex justify-between items-center ${
                      netStoreProfit >= 0 ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-extrabold block">
                        (=) LABA BERSIH AKHIR TOKO
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Laba Penjualan Bersih dikurangi Beban Operasional Toko
                      </span>
                    </div>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        netStoreProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatRupiah(netStoreProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daftar Pengeluaran Tambahan Bulan Ini */}
          <div className="lg:col-span-5">
            <Card className="border border-border bg-card shadow-xs h-full">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Daftar Beban Tambahan
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Pos pengeluaran tambahan bulan ini
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                    {formatRupiah(expensesSummary.totalMonthlyExpenses)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {expensesSummary.monthlyExpenses.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Belum ada catatan pengeluaran tambahan untuk bulan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold">
                          <th className="pb-3">Keterangan</th>
                          <th className="pb-3 text-right">Biaya (Rp)</th>
                          <th className="pb-3 text-center w-12">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {expensesSummary.monthlyExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-3">
                              <p className="font-medium text-foreground">{exp.description}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(exp.createdAt).toLocaleDateString("id-ID")} • {exp.createdByName}
                              </p>
                            </td>
                            <td className="py-3 text-right font-bold text-rose-600">
                              {formatRupiah(exp.amount)}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id, exp.description)}
                                disabled={deletingId === exp.id}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Hapus pos pengeluaran"
                              >
                                {deletingId === exp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PRATINJAU CETAK TERPADU (PDF & EXCEL)                              */}
      {/* ========================================================================= */}
      <ReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Pratinjau Cetak Laporan Keuangan"
        pdfPreview={<FormalFinancialDocument />}
        excelHeaders={excelHeaders}
        excelRows={excelRows}
        excelFileName={excelFileName}
        onExportExcel={handleExportExcel}
        onPrintPdf={triggerPrint}
      />
    </div>
  );
}
