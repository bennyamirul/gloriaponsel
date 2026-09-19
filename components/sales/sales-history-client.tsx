"use client";

import { useState } from "react";
import {
  Search,
  FileText,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelSale } from "@/lib/actions/sale.actions";

export interface SaleItemDetail {
  id: string;
  productName: string;
  productSku: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  cashierName: string;
  cashierId: string;
  subtotal: number;
  discount: number;
  additionalFee?: number;
  additionalFeeNote?: string | null;
  total: number;
  paymentMethod: "cash" | "transfer" | "edc" | "qris";
  status: "completed" | "cancelled";
  createdAt: string;
  itemCount: number;
  items: SaleItemDetail[];
}

interface SalesHistoryClientProps {
  initialSales: SaleRecord[];
  currentUserId: string;
  currentUserRole: string;
}

export function SalesHistoryClient({
  initialSales,
  currentUserId,
  currentUserRole,
}: SalesHistoryClientProps) {
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || s.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const handleCancelSale = async (sale: SaleRecord) => {
    if (
      !confirm(
        `PERINGATAN: Batalkan transaksi ${sale.invoiceNo}? Stok barang akan dikembalikan otomatis.`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await cancelSale(sale.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Transaksi ${sale.invoiceNo} berhasil dibatalkan.`);
        setSales((prev) =>
          prev.map((s) =>
            s.id === sale.id ? { ...s, status: "cancelled" } : s
          )
        );
        if (selectedSale?.id === sale.id) {
          setSelectedSale({ ...selectedSale, status: "cancelled" });
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat membatalkan transaksi.");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>Selesai</span>
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        <span>Dibatalkan</span>
      </Badge>
    );
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Tunai";
      case "transfer":
        return "Transfer Bank";
      case "edc":
        return "Kartu / EDC";
      case "qris":
        return "QRIS";
      default:
        return method;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Status Filter */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari faktur INV-..., nama pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm h-9"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Faktur / Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Metode Bayar</TableHead>
              <TableHead className="text-right">Total Transaksi</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Belum ada riwayat transaksi penjualan.
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-bold text-foreground text-sm leading-tight">
                      {sale.invoiceNo}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm font-medium text-foreground">
                    {sale.customerName}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {sale.cashierName}
                  </TableCell>

                  <TableCell className="text-xs font-semibold">
                    <span className="bg-muted px-2 py-1 rounded-md">
                      {getPaymentLabel(sale.paymentMethod)}
                    </span>
                  </TableCell>

                  <TableCell className="text-right font-extrabold text-foreground">
                    {formatRupiah(sale.total)}
                    <span className="text-[10px] text-muted-foreground block font-normal">
                      {sale.itemCount} item
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    {getStatusBadge(sale.status)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs rounded-lg gap-1"
                        onClick={() => handleOpenDetail(sale)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </Button>
                      {sale.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isCancelling}
                          className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleCancelSale(sale)}
                          title="Batalkan Transaksi"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Tidak ada data transaksi.
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="border-border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">
                    {sale.invoiceNo}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {getStatusBadge(sale.status)}
              </div>

              <div className="mt-3 py-2 border-y border-border/50 flex justify-between items-center text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    Pelanggan
                  </span>
                  <span className="font-semibold text-foreground">
                    {sale.customerName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">
                    Total ({sale.itemCount} item)
                  </span>
                  <span className="font-extrabold text-foreground text-sm">
                    {formatRupiah(sale.total)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {getPaymentLabel(sale.paymentMethod)} • {sale.cashierName}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs rounded-lg"
                    onClick={() => handleOpenDetail(sale)}
                  >
                    Detail
                  </Button>
                  {sale.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:bg-rose-50"
                      onClick={() => handleCancelSale(sale)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Sale Detail & Receipt Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedSale && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-lg font-bold">
                    Faktur {selectedSale.invoiceNo}
                  </DialogTitle>
                  {getStatusBadge(selectedSale.status)}
                </div>
                <DialogDescription>
                  Waktu:{" "}
                  {new Date(selectedSale.createdAt).toLocaleString("id-ID")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Pelanggan
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedSale.customerName}
                    </span>
                    {selectedSale.customerPhone && (
                      <span className="text-[10px] text-muted-foreground block">
                        {selectedSale.customerPhone}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Kasir
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedSale.cashierName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Metode Pembayaran
                    </span>
                    <span className="font-semibold text-foreground">
                      {getPaymentLabel(selectedSale.paymentMethod)}
                    </span>
                  </div>
                </div>

                {/* Items breakdown */}
                <div className="space-y-2">
                  <span className="font-bold text-foreground block">
                    Daftar Barang ({selectedSale.itemCount} item)
                  </span>
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {selectedSale.items.map((it) => (
                      <div
                        key={it.id}
                        className="p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {it.productName}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {it.qty} x {formatRupiah(it.unitPrice)}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatRupiah(it.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatRupiah(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Diskon</span>
                      <span>-{formatRupiah(selectedSale.discount)}</span>
                    </div>
                  )}
                  {selectedSale.additionalFee && selectedSale.additionalFee > 0 ? (
                    <div className="flex justify-between text-primary font-medium">
                      <span>Biaya Tambahan{selectedSale.additionalFeeNote ? ` (${selectedSale.additionalFeeNote})` : ""}</span>
                      <span>+{formatRupiah(selectedSale.additionalFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-base font-extrabold text-foreground pt-1 border-t border-border">
                    <span>Total Tagihan</span>
                    <span className="text-primary font-mono">
                      {formatRupiah(selectedSale.total)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 flex items-center justify-between sm:justify-between">
                {selectedSale.status === "completed" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isCancelling}
                    onClick={() => handleCancelSale(selectedSale)}
                    className="gap-1 text-xs"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Batalkan Transaksi</span>
                  </Button>
                ) : (
                  <span className="text-xs text-rose-600 italic">
                    Transaksi telah dibatalkan
                  </span>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
