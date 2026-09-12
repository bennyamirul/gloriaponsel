"use client";

import { useState, useMemo, useRef } from "react";
import {
  Search,
  Printer,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Eye,
  Smartphone,
  Tag,
  Store,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface PrintableSaleItem {
  id: string;
  productName: string;
  productSku: string;
  productImei?: string | null;
  capacity?: string | null;
  color?: string | null;
  variant?: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface PrintableSale {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress?: string | null;
  cashierName: string;
  cashierId: string;
  subtotal: number;
  discount: number;
  additionalFee?: number;
  warrantyDays?: number;
  warrantyExpiry?: string | null;
  total: number;
  paymentMethod: "cash" | "transfer" | "edc" | "qris" | string;
  status: "completed" | "cancelled" | string;
  createdAt: string;
  itemCount: number;
  items: PrintableSaleItem[];
}

interface SalesInvoicePrintClientProps {
  sales: PrintableSale[];
}

export function SalesInvoicePrintClient({ sales }: SalesInvoicePrintClientProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<PrintableSale | null>(null);
  const [printFormat, setPrintFormat] = useState<"standard" | "thermal">("standard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

  const printAreaRef = useRef<HTMLDivElement>(null);

  const toggleExpandSale = (saleId: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  // Filter sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // 1. Search filter
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            (it.productImei && it.productImei.toLowerCase().includes(q)) ||
            (it.productSku && it.productSku.toLowerCase().includes(q))
        );

      // 2. Date filter
      let matchesDate = true;
      if (dateFilter) {
        const saleDateStr = new Date(s.createdAt).toISOString().split("T")[0];
        matchesDate = saleDateStr === dateFilter;
      }

      // 3. Payment filter
      let matchesPayment = true;
      if (paymentFilter !== "all") {
        matchesPayment = s.paymentMethod === paymentFilter;
      }

      return matchesSearch && matchesDate && matchesPayment;
    });
  }, [sales, search, dateFilter, paymentFilter]);

  // Statistics
  const totalInvoices = filteredSales.length;
  const totalCompleted = filteredSales.filter((s) => s.status === "completed").length;
  const totalAmount = filteredSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.total, 0);

  const handleOpenPrintModal = (sale: PrintableSale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Dedicated Print Function
  const executePrint = () => {
    if (!selectedSale || !printAreaRef.current) {
      window.print();
      return;
    }

    const contentHtml = printAreaRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    const isThermal = printFormat === "thermal";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice_${selectedSale.invoiceNo}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isThermal ? "80mm auto" : "A4 portrait"};
              margin: ${isThermal ? "4mm" : "12mm"};
            }
            body {
              font-family: ${
                isThermal
                  ? "'Courier New', Courier, monospace"
                  : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              };
              margin: 0;
              padding: ${isThermal ? "4px" : "15px"};
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * { box-sizing: border-box; }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: ${isThermal ? "4px 2px" : "8px 10px"}; text-align: left; }
            th { border-bottom: 2px solid #0f172a; font-weight: 700; }
            td { border-bottom: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .font-mono { font-family: monospace; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-dashed { border-style: dashed; }
            .text-muted { color: #64748b; }
            .uppercase { text-transform: uppercase; }
            .text-xs { font-size: ${isThermal ? "10px" : "11px"}; }
            .text-sm { font-size: ${isThermal ? "11px" : "13px"}; }
            .text-base { font-size: ${isThermal ? "12px" : "14px"}; }
            .text-lg { font-size: ${isThermal ? "14px" : "18px"}; }
            .text-xl { font-size: ${isThermal ? "16px" : "22px"}; }
            .text-primary { color: #055B5A; }
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <span>Cetak Faktur</span>
          </h3>
        </div>

        {/* Mini Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs flex items-center gap-2 shadow-xs">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Total Faktur:</span>
            <span className="font-bold text-foreground font-mono">{totalInvoices}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs flex items-center gap-2 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-muted-foreground">Total Transaksi:</span>
            <span className="font-bold text-emerald-600 font-mono">{formatRupiah(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice (INV-...), nama pelanggan, kasir, IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Picker Filter */}
          <div className="relative">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl text-xs bg-background w-[145px]"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground cursor-pointer"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="transfer">Transfer Bank</option>
            <option value="qris">QRIS</option>
            <option value="edc">Kartu EDC</option>
          </select>

          {(search || dateFilter || paymentFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setPaymentFilter("all");
              }}
              className="h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] font-bold text-xs">No. Faktur / Invoice</TableHead>
                <TableHead className="w-[160px] font-bold text-xs">Tanggal Transaksi</TableHead>
                <TableHead className="font-bold text-xs">Pelanggan</TableHead>
                <TableHead className="font-bold text-xs">Unit / Rincian Barang</TableHead>
                <TableHead className="w-[140px] font-bold text-xs text-right">Total Transaksi</TableHead>
                <TableHead className="w-[110px] font-bold text-xs text-center">Metode</TableHead>
                <TableHead className="w-[110px] font-bold text-xs text-center">Garansi</TableHead>
                <TableHead className="w-[130px] font-bold text-xs text-center">Aksi Cetak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                    <FileText className="h-10 w-10 mx-auto mb-2.5 opacity-30" />
                    <p className="font-semibold text-sm">Tidak ada invoice transaksi ditemukan</p>
                    <p className="text-[11px] mt-0.5">
                      {search || dateFilter || paymentFilter !== "all"
                        ? "Coba ubah kata kunci pencarian atau reset filter tanggal."
                        : "Lakukan transaksi kasir POS baru untuk menghasilkan faktur penjualan."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/40 transition">
                    {/* No Invoice */}
                    <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                      {sale.invoiceNo}
                      {sale.status === "cancelled" && (
                        <span className="block text-[10px] text-destructive font-normal font-sans">
                          (Dibatalkan)
                        </span>
                      )}
                    </TableCell>

                    {/* Tanggal */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 opacity-60 shrink-0" />
                        <span>{formatDate(sale.createdAt)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                        Kasir: {sale.cashierName}
                      </span>
                    </TableCell>

                    {/* Pelanggan */}
                    <TableCell className="text-xs">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{sale.customerName}</span>
                      </p>
                      {sale.customerPhone && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {sale.customerPhone}
                        </p>
                      )}
                    </TableCell>

                    {/* Rincian Barang */}
                    <TableCell className="text-xs max-w-[320px]">
                      {(() => {
                        const isExpanded = expandedSaleIds.has(sale.id);
                        const displayedItems = isExpanded
                          ? sale.items
                          : sale.items.slice(0, 2);
                        const remainingCount = sale.items.length - 2;

                        return (
                          <div className="space-y-1.5">
                            {displayedItems.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 flex-wrap leading-tight"
                              >
                                <span className="font-semibold text-foreground truncate max-w-[180px]">
                                  {it.productName}
                                </span>
                                {(it.capacity || it.color) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {[it.capacity, it.color].filter(Boolean).join(" ")}
                                  </span>
                                )}
                                {(it.productImei || it.productSku) && (
                                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded shrink-0">
                                    {it.productImei || it.productSku}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                                  x{it.qty}
                                </span>
                              </div>
                            ))}

                            {sale.items.length > 2 && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandSale(sale.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Sembunyikan</span>
                                      <span>▲</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>+{remainingCount} barang lainnya ({sale.itemCount} total)</span>
                                      <span>▼</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-right whitespace-nowrap">
                      <p className="font-bold text-sm text-foreground font-mono">
                        {formatRupiah(sale.total)}
                      </p>
                      {sale.discount > 0 && (
                        <p className="text-[10px] text-destructive">
                          Diskon: -{formatRupiah(sale.discount)}
                        </p>
                      )}
                      {sale.additionalFee && sale.additionalFee > 0 ? (
                        <p className="text-[10px] text-primary">
                          Biaya: +{formatRupiah(sale.additionalFee)}
                        </p>
                      ) : null}
                    </TableCell>

                    {/* Metode Pembayaran */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold gap-1">
                        {sale.paymentMethod === "cash" && <Banknote className="h-2.5 w-2.5" />}
                        {sale.paymentMethod === "transfer" && <CreditCard className="h-2.5 w-2.5" />}
                        {sale.paymentMethod === "qris" && <QrCode className="h-2.5 w-2.5" />}
                        {sale.paymentMethod === "edc" && <CreditCard className="h-2.5 w-2.5" />}
                        <span>{sale.paymentMethod}</span>
                      </Badge>
                    </TableCell>

                    {/* Garansi */}
                    <TableCell className="text-center whitespace-nowrap">
                      {sale.warrantyDays && sale.warrantyDays > 0 ? (
                        <Badge variant="success" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          <span>{sale.warrantyDays} Hari</span>
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Tombol Aksi Cetak */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        onClick={() => handleOpenPrintModal(sale)}
                        className="h-8 px-3 rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Cetak Invoice</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL PREVIEW & CETAK INVOICE */}
      {selectedSale && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  <span>Pratinjau & Cetak Invoice</span>
                </DialogTitle>
                {/* Format Selector: Standar A4 vs Struk Thermal */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border text-xs w-fit">
                  <button
                    type="button"
                    onClick={() => setPrintFormat("standard")}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      printFormat === "standard"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Faktur Standar (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat("thermal")}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      printFormat === "thermal"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Struk Thermal (58/80mm)
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* AREA DOKUMEN CETAK (PRINTABLE CONTAINER) */}
            <div
              ref={printAreaRef}
              className={`rounded-xl border border-border p-6 transition ${
                printFormat === "thermal"
                  ? "max-w-sm mx-auto bg-zinc-50 dark:bg-zinc-900 font-mono text-xs shadow-inner"
                  : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              {/* === TAMPILAN FORMAT THERMAL === */}
              {printFormat === "thermal" ? (
                <div className="space-y-3">
                  {/* Header Toko Thermal */}
                  <div className="text-center border-b border-dashed border-border pb-3">
                    <p className="text-base font-extrabold tracking-wider text-[#055B5A]">
                      GLORIA PONSEL
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Pusat Handphone & Aksesoris Terpercaya
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      WhatsApp: 0812-3456-7890
                    </p>
                    <div className="pt-2 text-[10px] space-y-0.5">
                      <p className="font-bold text-foreground">
                        FAKTUR: {selectedSale.invoiceNo}
                      </p>
                      <p className="text-muted-foreground">{formatDate(selectedSale.createdAt)}</p>
                      <p className="text-muted-foreground">Kasir: {selectedSale.cashierName}</p>
                      <p className="text-foreground font-semibold">
                        Pelanggan: {selectedSale.customerName}
                      </p>
                    </div>
                  </div>

                  {/* Rincian Item Thermal */}
                  <div className="space-y-2 divide-y divide-dashed divide-border/60 text-xs">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="pt-1.5">
                        <p className="font-bold text-foreground">{item.productName}</p>
                        {(item.capacity || item.color) && (
                          <p className="text-[10px] text-muted-foreground">
                            {[item.capacity, item.color].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {(item.productImei || item.productSku) && (
                          <p className="text-[10px] text-primary font-bold">
                            IMEI: {item.productImei || item.productSku}
                          </p>
                        )}
                        <div className="flex justify-between text-[11px] pt-0.5">
                          <span>
                            {item.qty} x {formatRupiah(item.unitPrice)}
                          </span>
                          <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ringkasan Biaya Thermal */}
                  <div className="pt-2 border-t border-dashed border-border space-y-1 text-right text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>{formatRupiah(selectedSale.subtotal)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Potongan Diskon:</span>
                        <span>-{formatRupiah(selectedSale.discount)}</span>
                      </div>
                    )}
                    {selectedSale.additionalFee && selectedSale.additionalFee > 0 ? (
                      <div className="flex justify-between text-primary">
                        <span>Biaya Tambahan:</span>
                        <span>+{formatRupiah(selectedSale.additionalFee)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dashed border-border text-foreground">
                      <span>TOTAL BAYAR:</span>
                      <span className="text-[#055B5A]">{formatRupiah(selectedSale.total)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>Metode Pembayaran:</span>
                      <span className="uppercase font-bold text-foreground">
                        {selectedSale.paymentMethod} (LUNAS)
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Garansi Toko:</span>
                      <span className="font-bold text-foreground">
                        {selectedSale.warrantyDays && selectedSale.warrantyDays > 0
                          ? `${selectedSale.warrantyDays} Hari (${formatDateOnly(selectedSale.warrantyExpiry)})`
                          : "Tanpa Garansi"}
                      </span>
                    </div>
                  </div>

                  {/* Footer Struk Thermal */}
                  <div className="pt-3 border-t border-dashed border-border text-center text-[10px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">
                      Terima kasih atas kunjungan Anda!
                    </p>
                    <p>Barang yang sudah dibeli wajib menyertakan nota ini saat klaim garansi.</p>
                  </div>
                </div>
              ) : (
                /* === TAMPILAN FORMAT STANDAR A4 === */
                <div className="space-y-5 text-slate-800">
                  {/* Kop Surat / Header Faktur */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className="h-6 w-6 text-[#055B5A]" />
                        <h2 className="text-2xl font-black tracking-tight text-[#055B5A]">
                          GLORIA PONSEL
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Pusat Penjualan Handphone Baru & Second Berkualitas • Aksesoris • Servis
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Alamat: Jl. Toko Gloria Ponsel | Telp/WA: 0812-3456-7890
                      </p>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="inline-block px-3 py-1 rounded bg-[#055B5A] text-white font-extrabold text-xs tracking-wider uppercase">
                        FAKTUR PENJUALAN
                      </span>
                      <p className="font-mono font-bold text-base text-slate-900 mt-1">
                        {selectedSale.invoiceNo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tanggal: {formatDate(selectedSale.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Informasi Pelanggan & Kasir */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">
                        Ditujukan Kepada:
                      </p>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {selectedSale.customerName}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        No. Telepon: {selectedSale.customerPhone || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">
                        Petugas Kasir:
                      </p>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {selectedSale.cashierName}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Status Pembayaran:{" "}
                        <span className="font-bold text-emerald-700 uppercase">
                          LUNAS ({selectedSale.paymentMethod})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Tabel Rincian Barang A4 */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-3 text-center w-10">No</th>
                          <th className="py-2 px-3">Nama Produk / Unit</th>
                          <th className="py-2 px-3">No. IMEI / Barcode</th>
                          <th className="py-2 px-3 text-center w-16">Qty</th>
                          <th className="py-2 px-3 text-right w-28">Harga Satuan</th>
                          <th className="py-2 px-3 text-right w-32">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900">{item.productName}</p>
                              {(item.capacity || item.color) && (
                                <p className="text-[11px] text-slate-500">
                                  {[item.capacity, item.color].filter(Boolean).join(" • ")}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#055B5A]">
                              {item.productImei || item.productSku || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {item.qty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(item.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rincian Total & Garansi Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                    {/* Kotak Informasi Garansi */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-[#055B5A]" />
                        <span>Ketentuan Garansi Toko:</span>
                      </p>
                      <p className="text-slate-700">
                        Masa Garansi Unit:{" "}
                        <span className="font-bold text-slate-900">
                          {selectedSale.warrantyDays && selectedSale.warrantyDays > 0
                            ? `${selectedSale.warrantyDays} Hari (Hingga ${formatDateOnly(selectedSale.warrantyExpiry)})`
                            : "Tanpa Garansi"}
                        </span>
                      </p>
                      <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                        <li>Nota asli dan segel toko wajib utuh & tidak rusak saat klaim garansi.</li>
                        <li>Garansi tidak berlaku untuk kerusakan akibat kelalaian pemakaian (jatuh/kena air).</li>
                      </ul>
                    </div>

                    {/* Ringkasan Angka Pembayaran */}
                    <div className="space-y-1.5 text-xs text-right p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Barang:</span>
                        <span className="font-mono">{formatRupiah(selectedSale.subtotal)}</span>
                      </div>
                      {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Potongan Diskon:</span>
                          <span className="font-mono">-{formatRupiah(selectedSale.discount)}</span>
                        </div>
                      )}
                      {selectedSale.additionalFee && selectedSale.additionalFee > 0 ? (
                        <div className="flex justify-between text-[#055B5A] font-semibold">
                          <span>Biaya Tambahan:</span>
                          <span className="font-mono">+{formatRupiah(selectedSale.additionalFee)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300 font-bold text-sm text-slate-900">
                        <span>TOTAL AKHIR:</span>
                        <span className="font-mono text-base text-[#055B5A]">
                          {formatRupiah(selectedSale.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                    <div>
                      <p className="text-slate-500">Tanda Tangan Pelanggan,</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40 mx-auto">
                        {selectedSale.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Hormat Kami (Kasir),</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40 mx-auto">
                        {selectedSale.cashierName}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Aksi Modal */}
            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Tutup
              </Button>
              <Button
                type="button"
                onClick={executePrint}
                className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Invoice Sekarang</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
