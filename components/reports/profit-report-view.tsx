"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { exportToExcel, triggerPrint } from "@/lib/export-utils";
import {
  DollarSign,
  TrendingUp,
  Coins,
  Printer,
  Search,
  ShieldCheck,
  FileSpreadsheet,
  Edit3,
  Award,
  Check,
  Loader2,
  Eye,
  Store,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
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
import { updateSaleCommission, uploadCommissionProof } from "@/lib/actions/report.actions";
import { toast } from "sonner";
import { ReportPrintPreviewModal } from "./report-print-preview-modal";

export interface ProfitTransaction {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone?: string | null;
  cashierName: string;
  items: {
    id?: string;
    name: string;
    color?: string | null;
    qty: number;
    unitCost?: number;
    unitPrice?: number;
  }[];
  cogs: number;
  sellingPrice: number;
  commission: number;
  commissionProofUrl?: string | null;
  netProfit: number;
  grossProfit: number;
  netRevenue: number;
  additionalFeeNote?: string | null;
}

interface ProfitReportViewProps {
  data: {
    summary: {
      totalGrossRevenue: number;
      totalDiscount: number;
      totalNetRevenue: number;
      totalCogs: number;
      grossProfit: number;
      totalCommission: number;
      netProfit: number;
      startDate: string;
      endDate: string;
    };
    categoryBreakdown: {
      categoryName: string;
      revenue: number;
      cogs: number;
      profit: number;
    }[];
    productBreakdown: {
      productId: string;
      name: string;
      brand: string;
      qty: number;
      revenue: number;
      cogs: number;
      profit: number;
    }[];
    transactionBreakdown: ProfitTransaction[];
  };
  onCommissionUpdated?: () => void;
}

export function ProfitReportView({ data, onCommissionUpdated }: ProfitReportViewProps) {
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<ProfitTransaction[]>(
    data.transactionBreakdown
  );
  const [summary, setSummary] = useState(data.summary);

  // Sync if parent data changes
  if (data.transactionBreakdown !== transactions && data.summary !== summary) {
    setTransactions(data.transactionBreakdown);
    setSummary(data.summary);
  }

  // Edit Commission Modal State
  const [editingTx, setEditingTx] = useState<ProfitTransaction | null>(null);
  const [commissionInput, setCommissionInput] = useState<number>(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [isSavingCommission, startSavingCommission] = useTransition();

  // Print Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleOpenEditCommission = (tx: ProfitTransaction) => {
    setEditingTx(tx);
    setCommissionInput(tx.commission || 0);
    setProofPreview(tx.commissionProofUrl || null);
    setProofFile(null);
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 10MB");
        return;
      }
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveCommission = () => {
    if (!editingTx) return;

    const newCommission = Math.max(0, commissionInput || 0);
    const saleId = editingTx.id;
    const oldCommission = editingTx.commission || 0;
    const diff = newCommission - oldCommission;

    startSavingCommission(async () => {
      try {
        let finalProofUrl = proofPreview;
        if (proofFile) {
          const fd = new FormData();
          fd.append("file", proofFile);
          const upRes = await uploadCommissionProof(fd);
          if (upRes.error) {
            toast.error(upRes.error);
            return;
          }
          finalProofUrl = upRes.url || null;
        }

        const res = await updateSaleCommission(saleId, newCommission, finalProofUrl);
        if (res.error) {
          toast.error(res.error);
          return;
        }

        // Optimistically update local transactions & summary
        setTransactions((prev) =>
          prev.map((t) => {
            if (t.id === saleId) {
              const netProfit = t.sellingPrice - t.cogs - newCommission;
              return {
                ...t,
                commission: newCommission,
                commissionProofUrl: finalProofUrl,
                netProfit,
              };
            }
            return t;
          })
        );

        setSummary((prev) => ({
          ...prev,
          totalCommission: prev.totalCommission + diff,
          netProfit: prev.netProfit - diff,
        }));

        toast.success(`Komisi untuk faktur ${editingTx.invoiceNo} berhasil disimpan.`);
        setEditingTx(null);
        setProofFile(null);
        setProofPreview(null);

        if (onCommissionUpdated) {
          onCommissionUpdated();
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan komisi.");
      }
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        t.invoiceNo.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        (t.customerPhone && t.customerPhone.toLowerCase().includes(q)) ||
        t.cashierName.toLowerCase().includes(q) ||
        (t.additionalFeeNote && t.additionalFeeNote.toLowerCase().includes(q)) ||
        (t.items &&
          t.items.some(
            (it) =>
              it.name.toLowerCase().includes(q) ||
              (it.color && it.color.toLowerCase().includes(q))
          ))
      );
    });
  }, [transactions, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalFilteredTransactions = filteredTransactions.length;
  const totalPages = Math.ceil(totalFilteredTransactions / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const excelHeaders = [
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

  const excelRows = filteredTransactions.map((t) => [
    new Date(t.date).toLocaleString("id-ID"),
    t.invoiceNo,
    t.customerPhone ? `${t.customerName} (${t.customerPhone})` : t.customerName,
    t.items?.map((it) => (it.color ? `${it.name} (${it.color})` : it.name)).join(", ") || "-",
    t.cogs,
    t.sellingPrice,
    t.commission,
    t.netProfit,
    t.cashierName,
    t.additionalFeeNote || "-",
  ]);

  const excelFileName = `Laporan_Penjualan_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const handleExportExcel = () => {
    exportToExcel(excelFileName, "Penjualan", excelHeaders, excelRows);
  };

  // Reusable Formal Sales Document Component for Print and Preview Modal
  const FormalSalesReportDocument = () => {
    const todayFormatted = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    const currentDateOnly = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const startDateStr = new Date(summary.startDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDateStr = new Date(summary.endDate).toLocaleDateString("id-ID", {
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
                DOKUMEN PENJUALAN RESMI
              </span>
              <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                NO: SLS/{currentYear}/{currentMonth}
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
            LAPORAN PENJUALAN & LABA-RUGI
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Periode: {startDateStr} s/d {endDateStr}
          </p>
        </div>

        {/* Ringkasan Finansial Penjualan (KPI Box Grid) */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Penjualan Bersih (Omzet)
            </span>
            <span className="text-base font-bold font-mono text-slate-900">
              {formatRupiah(summary.totalNetRevenue)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Kotor: {formatRupiah(summary.totalGrossRevenue)}
            </span>
          </div>

          <div className="p-2.5 rounded border border-slate-300 bg-slate-50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Total HPP (Modal)
            </span>
            <span className="text-base font-bold font-mono text-slate-900">
              {formatRupiah(summary.totalCogs)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Modal barang terjual
            </span>
          </div>

          <div className="p-2.5 rounded border border-slate-300 bg-amber-50/50 border-amber-200">
            <span className="text-[10px] text-amber-800 uppercase font-semibold block">
              Total Alokasi Komisi
            </span>
            <span className="text-base font-bold font-mono text-amber-800">
              {formatRupiah(summary.totalCommission)}
            </span>
            <span className="text-[10px] text-amber-700 block mt-0.5">
              Insentif penjualan
            </span>
          </div>

          <div className="p-2.5 rounded border border-emerald-300 bg-emerald-50/50">
            <span className="text-[10px] text-emerald-800 uppercase font-semibold block">
              Laba Bersih Penjualan
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-800">
              {formatRupiah(summary.netProfit)}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              Setelah dikurangi komisi
            </span>
          </div>
        </div>

        <style>{`
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 6mm 8mm !important;
            }
          }
        `}</style>

        {/* Tabel Rincian Penjualan per Faktur */}
        <div className="space-y-2 w-full overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Rincian Transaksi Penjualan & Laba Bersih
            </h3>
            <span className="text-[10px] text-slate-500 italic">
              Total: {filteredTransactions.length} Transaksi Faktur
            </span>
          </div>

          <table className="w-full text-xs border border-slate-300 table-auto border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px]">
                <th className="py-2 px-1 text-center w-7">No</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Tanggal</th>
                <th className="py-2 px-2 text-left whitespace-nowrap">No. Faktur</th>
                <th className="py-2 px-2.5 text-left">Pelanggan</th>
                <th className="py-2 px-2.5 text-left">Produk</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">HPP</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Harga Jual</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Komisi</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Laba</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Kasir</th>
                <th className="py-2 px-2 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[10px]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-slate-400 italic">
                    Tidak ada transaksi penjualan pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2 text-center whitespace-nowrap text-slate-600">
                      {new Date(t.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap text-slate-900">
                      {t.invoiceNo}
                    </td>
                    <td className="py-1.5 px-2.5 font-medium text-slate-800">
                      <div className="whitespace-nowrap">{t.customerName}</div>
                      {t.customerPhone && (
                        <div className="text-[9px] text-slate-500 font-mono whitespace-nowrap">
                          {t.customerPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-800">
                      {t.items?.map((it, i) => (
                        <div key={i} className="leading-tight">
                          <span className="font-medium">{it.name}</span>
                          {it.color && <span className="text-slate-500"> ({it.color})</span>}
                          {it.qty > 1 && <span className="text-slate-500 font-mono"> x{it.qty}</span>}
                        </div>
                      )) || "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap text-slate-600">
                      {formatRupiah(t.cogs)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap font-medium text-slate-900">
                      {formatRupiah(t.sellingPrice)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap text-amber-700 font-semibold">
                      {formatRupiah(t.commission)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap font-bold text-emerald-800">
                      {formatRupiah(t.netProfit)}
                    </td>
                    <td className="py-1.5 px-2 text-center whitespace-nowrap text-slate-600">
                      {t.cashierName}
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 truncate max-w-[120px]">
                      {t.additionalFeeNote || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-[10px]">
                <td colSpan={5} className="py-2 px-3 text-right">
                  TOTAL AKUMULASI:
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-700 font-bold whitespace-nowrap">
                  {formatRupiah(summary.totalCogs)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-900 font-bold whitespace-nowrap">
                  {formatRupiah(summary.totalNetRevenue)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-amber-800 font-bold whitespace-nowrap">
                  {formatRupiah(summary.totalCommission)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-emerald-800 font-bold whitespace-nowrap">
                  {formatRupiah(summary.netProfit)}
                </td>
                <td colSpan={2}></td>
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
                ( Bagian Kasir / Administrasi )
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Petugas Kasir & Pembukuan</p>
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
              Dokumen resmi ini dicetak secara komputerisasi melalui Sistem Manajemen Gloria Ponsel dan sah sebagai laporan pertanggungjawaban penjualan internal.
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
        <FormalSalesReportDocument />
      </div>

      {/* ========================================================================= */}
      {/* ON-SCREEN INTERACTIVE DASHBOARD VIEW (Disembunyikan saat cetak)           */}
      {/* ========================================================================= */}
      <div className="no-print space-y-6">
        {/* Top Banner & Action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Laporan Penjualan (Laba & Rugi)
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                <ShieldCheck className="h-3 w-3 text-indigo-600" />
                Super Admin
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Periode: {new Date(summary.startDate).toLocaleDateString("id-ID")} -{" "}
              {new Date(summary.endDate).toLocaleDateString("id-ID")}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* KPI Cards (Margin removed, Komisi added) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Penjualan Bersih
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <span>Rp</span>
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(summary.totalNetRevenue)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Kotor: {formatRupiah(summary.totalGrossRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total HPP (Modal)
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatRupiah(summary.totalCogs)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Harga pokok modal barang terjual
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Komisi
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-amber-700">
                  {formatRupiah(summary.totalCommission)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Total komisi yang dialokasikan
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Laba Bersih Penjualan
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-2xl font-bold tracking-tight text-emerald-700">
                  {formatRupiah(summary.netProfit)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Laba kotor dikurangi komisi
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rincian Transaksi Penjualan */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-foreground">Rincian Laba & Komisi per Transaksi</h4>
                <p className="text-xs text-muted-foreground">
                  Klik pada kolom Komisi untuk mengubah atau menambahkan nilai komisi
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

            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Tidak ada data transaksi.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block mt-3">
                  <Table className="w-full text-left text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="pb-3 pr-2 whitespace-nowrap">Tanggal</th>
                        <th className="pb-3 pr-2 whitespace-nowrap">No. Faktur</th>
                        <th className="pb-3 pr-2">Pelanggan</th>
                        <th className="pb-3 pr-2">Produk</th>
                        <th className="pb-3 pr-2 text-right whitespace-nowrap">HPP</th>
                        <th className="pb-3 pr-2 text-right whitespace-nowrap">Harga Jual</th>
                        <th className="pb-3 pr-2 text-right whitespace-nowrap">Komisi</th>
                        <th className="pb-3 pr-2 text-right whitespace-nowrap">Laba</th>
                        <th className="pb-3 pr-2 text-center whitespace-nowrap">Kasir</th>
                        <th className="pb-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 pr-2 text-muted-foreground whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {new Date(t.date).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="py-3 pr-2 font-mono font-semibold text-foreground whitespace-nowrap">
                            {t.invoiceNo}
                          </td>
                          <td className="py-3 pr-2">
                            <p className="font-medium text-foreground">{t.customerName}</p>
                            {t.customerPhone ? (
                              <p className="text-[11px] text-muted-foreground font-mono">{t.customerPhone}</p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">-</p>
                            )}
                          </td>
                          <td className="py-3 pr-2">
                            <div className="space-y-0.5 min-w-[140px]">
                              {t.items?.map((it, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-semibold text-foreground">{it.name}</span>
                                  {it.color && (
                                    <span className="text-muted-foreground text-[11px] ml-1">
                                      ({it.color})
                                    </span>
                                  )}
                                  {it.qty > 1 && (
                                    <span className="text-[10px] font-mono text-muted-foreground ml-1">
                                      x{it.qty}
                                    </span>
                                  )}
                                </div>
                              )) || "-"}
                            </div>
                          </td>
                          <td className="py-3 pr-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                            {formatRupiah(t.cogs)}
                          </td>
                          <td className="py-3 pr-2 text-right font-mono font-medium text-foreground whitespace-nowrap">
                            {formatRupiah(t.sellingPrice)}
                          </td>
                          <td className="py-3 pr-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {t.commissionProofUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewingProofUrl(t.commissionProofUrl || null)}
                                  className="p-1 rounded text-primary hover:bg-primary/10 transition"
                                  title="Lihat Bukti Foto Komisi"
                                >
                                  <ImageIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCommission(t)}
                                className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-right transition hover:bg-amber-50"
                                title="Klik untuk ubah komisi"
                              >
                                <span
                                  className={`font-mono font-semibold ${
                                    t.commission > 0 ? "text-amber-700" : "text-muted-foreground"
                                  }`}
                                >
                                  {formatRupiah(t.commission)}
                                </span>
                                <Edit3 className="h-3 w-3 text-muted-foreground group-hover:text-amber-600 transition" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pr-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(t.netProfit)}
                          </td>
                          <td className="py-3 pr-2 text-center text-muted-foreground whitespace-nowrap">
                            {t.cashierName}
                          </td>
                          <td className="py-3 text-center text-xs text-muted-foreground max-w-[140px] truncate" title={t.additionalFeeNote || "-"}>
                            {t.additionalFeeNote || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-bold text-xs bg-muted/20">
                        <td colSpan={4} className="py-3 pr-2 text-right text-muted-foreground">
                          TOTAL:
                        </td>
                        <td className="py-3 pr-2 text-right font-mono text-muted-foreground">
                          {formatRupiah(summary.totalCogs)}
                        </td>
                        <td className="py-3 pr-2 text-right font-mono text-foreground font-bold">
                          {formatRupiah(summary.totalNetRevenue)}
                        </td>
                        <td className="py-3 pr-2 text-right font-mono text-amber-700 font-bold">
                          {formatRupiah(summary.totalCommission)}
                        </td>
                        <td className="py-3 pr-2 text-right font-mono text-emerald-700 font-bold">
                          {formatRupiah(summary.netProfit)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>

                {/* Mobile Card List View (Clean & Anti-Collision) */}
                <div className="grid grid-cols-1 gap-3 md:hidden mt-3">
                  {paginatedTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Header Faktur & Tombol Komisi */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary truncate">
                          {t.invoiceNo}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCommission(t)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition active:scale-95"
                          title="Input / Edit Komisi"
                        >
                          <span>Komisi: {formatRupiah(t.commission)}</span>
                          <Edit3 className="h-3 w-3 ml-0.5" />
                        </button>
                      </div>

                      {/* Baris Pelanggan & Tanggal */}
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="min-w-0 truncate">
                          <span className="font-medium text-foreground">{t.customerName}</span>
                          {t.customerPhone && (
                            <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                              ({t.customerPhone})
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {new Date(t.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Kotak Rincian Produk */}
                      <div className="text-xs bg-muted/40 p-2.5 rounded-xl border border-border/50 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          PRODUK ({t.items?.reduce((acc, it) => acc + (it.qty || 1), 0) || 0} unit):
                        </p>
                        <div className="space-y-1">
                          {t.items?.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 font-medium text-foreground text-xs"
                            >
                              <span className="truncate">
                                {it.name}{" "}
                                {it.color && (
                                  <span className="text-muted-foreground font-normal">
                                    ({it.color})
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 font-mono text-muted-foreground text-[11px]">
                                {it.qty > 1 ? `x${it.qty}` : ""}
                              </span>
                            </div>
                          )) || <span className="text-muted-foreground text-xs">-</span>}
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
                              {formatRupiah(t.cogs)}
                            </span>
                          </div>
                          <div className="text-right min-w-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold mb-0.5">
                              Harga Jual
                            </span>
                            <span className="font-mono font-bold text-foreground text-xs truncate block">
                              {formatRupiah(t.sellingPrice)}
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
                              {t.commission > 0 ? formatRupiah(t.commission) : "Rp 0"}
                            </span>
                          </div>
                          <div className="text-right min-w-0">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block font-bold mb-0.5">
                              Laba Bersih
                            </span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm truncate block">
                              {formatRupiah(t.netProfit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Kasir & Keterangan */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1 border-t border-dashed border-border">
                        <span className="truncate">
                          Kasir: <strong className="text-foreground font-medium">{t.cashierName}</strong>
                        </span>
                        {t.additionalFeeNote && (
                          <span
                            className="truncate shrink-0 max-w-[150px] text-right"
                            title={t.additionalFeeNote}
                          >
                            Ket: {t.additionalFeeNote}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalFilteredTransactions}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="mt-4 rounded-xl border border-border"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Input / Edit Komisi */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="max-w-md no-print">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Input Komisi Transaksi
            </DialogTitle>
          </DialogHeader>

          {editingTx && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Faktur:</span>
                  <span className="font-mono font-bold text-foreground">{editingTx.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-medium text-foreground">{editingTx.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kasir:</span>
                  <span className="font-medium text-foreground">{editingTx.cashierName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Omzet Bersih:</span>
                  <span className="font-semibold text-foreground">
                    {formatRupiah(editingTx.netRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Laba Kotor:</span>
                  <span className="font-semibold text-emerald-700">
                    {formatRupiah(editingTx.grossProfit)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Nominal Komisi (Rp)
                </label>
                <CurrencyInput
                  value={commissionInput}
                  onValueChange={(val) => setCommissionInput(val)}
                  placeholder="0"
                  allowZero={true}
                  className="h-10 text-base font-bold bg-background border-border"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveCommission();
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Estimasi Laba Bersih setelah komisi:{" "}
                  <span className="font-bold text-emerald-700">
                    {formatRupiah(editingTx.grossProfit - (commissionInput || 0))}
                  </span>
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Preset Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 5000, 10000, 20000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCommissionInput(preset)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition"
                    >
                      {preset === 0 ? "Rp 0" : formatRupiah(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bukti Foto Komisi */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Bukti Transfer / Foto Komisi</span>
                  {proofPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  )}
                </label>
                {proofPreview ? (
                  <div className="relative rounded-xl border border-border p-2 bg-muted/20 flex items-center gap-3">
                    <img
                      src={proofPreview}
                      alt="Bukti Komisi"
                      className="h-16 w-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition"
                      onClick={() => setViewingProofUrl(proofPreview)}
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-medium text-foreground truncate">
                        {proofFile ? proofFile.name : "Bukti foto tersimpan"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewingProofUrl(proofPreview)}
                        className="text-[11px] text-primary hover:underline mt-0.5 inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> Lihat Gambar Penuh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center border-2 border-dashed border-border rounded-xl p-3 hover:bg-muted/30 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="text-center">
                      <Upload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                      <p className="text-xs font-medium text-foreground">
                        Unggah bukti transfer atau foto
                      </p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG, JPEG maks 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingTx(null)}
              disabled={isSavingCommission}
              className="text-xs font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCommission}
              disabled={isSavingCommission}
              className="text-xs font-semibold"
            >
              {isSavingCommission ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Simpan Komisi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Zoom Bukti Foto Komisi */}
      <Dialog open={!!viewingProofUrl} onOpenChange={(open) => !open && setViewingProofUrl(null)}>
        <DialogContent className="max-w-lg p-4 no-print">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Bukti Pembayaran Komisi</DialogTitle>
          </DialogHeader>
          {viewingProofUrl && (
            <div className="flex justify-center p-2">
              <img
                src={viewingProofUrl}
                alt="Bukti Komisi"
                className="max-h-[70vh] w-auto rounded-lg object-contain border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Pratinjau Cetak Terpadu (PDF & Excel) */}
      <ReportPrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Pratinjau Cetak Laporan Penjualan"
        pdfPreview={<FormalSalesReportDocument />}
        excelHeaders={excelHeaders}
        excelRows={excelRows}
        excelFileName={excelFileName}
        onExportExcel={handleExportExcel}
        onPrintPdf={triggerPrint}
      />
    </div>
  );
}
