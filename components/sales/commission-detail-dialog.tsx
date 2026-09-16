"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import {
  Award,
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  Receipt,
  User,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
} from "lucide-react";

export interface CommissionSaleInfo {
  id: string;
  invoiceNo: string;
  customerName?: string;
  cashierName?: string;
  total?: number;
  commission?: number;
  commissionProofUrl?: string | null;
  createdAt?: string;
}

interface CommissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: CommissionSaleInfo | null;
  isOwner?: boolean;
  onEditCommission?: (sale: CommissionSaleInfo) => void;
}

export function CommissionDetailDialog({
  open,
  onOpenChange,
  sale,
  isOwner = false,
  onEditCommission,
}: CommissionDetailDialogProps) {
  if (!sale) return null;

  const commissionAmount = Number(sale.commission || 0);
  const hasProof = Boolean(sale.commissionProofUrl);

  const formattedDate = sale.createdAt
    ? new Date(sale.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Award className="h-5 w-5 text-emerald-600" />
            <span>Rincian Komisi Transaksi</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Card Info Ringkas Penjualan */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                No. Faktur
              </span>
              <span className="font-mono font-bold text-foreground">
                {sale.invoiceNo}
              </span>
            </div>

            {formattedDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Waktu Transaksi
                </span>
                <span className="text-foreground font-medium">
                  {formattedDate}
                </span>
              </div>
            )}

            {sale.customerName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Pelanggan
                </span>
                <span className="text-foreground font-medium">
                  {sale.customerName}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Penerima (Kasir)
              </span>
              <span className="font-semibold text-primary">
                {sale.cashierName || "Kasir"}
              </span>
            </div>

            {sale.total !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Total Belanja:</span>
                <span className="font-bold text-foreground font-mono">
                  {formatRupiah(sale.total)}
                </span>
              </div>
            )}
          </div>

          {/* Nominal Komisi Card */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Nominal Komisi
              </span>
              {hasProof ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] gap-1 font-semibold"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Bukti Terlampir
                </Badge>
              ) : commissionAmount > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] gap-1 font-semibold"
                >
                  <Clock className="h-3 w-3" />
                  Menunggu Bukti Transfer
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground text-[10px]"
                >
                  Belum Ada Komisi
                </Badge>
              )}
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {formatRupiah(commissionAmount)}
            </div>
          </div>

          {/* Bukti Foto Transfer Komisi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Bukti Foto / Transfer
              </span>
              {sale.commissionProofUrl && (
                <a
                  href={sale.commissionProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Buka Penuh</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {sale.commissionProofUrl ? (
              <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[320px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sale.commissionProofUrl}
                  alt={`Bukti Komisi ${sale.invoiceNo}`}
                  className="w-auto h-auto max-h-[320px] max-w-full object-contain rounded-lg shadow-xs"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground bg-muted/20">
                <AlertCircle className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
                <p className="text-xs font-semibold">
                  Bukti transfer belum diunggah
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Owner belum melampirkan foto bukti transfer komisi untuk transaksi ini.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {isOwner && onEditCommission ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEditCommission(sale);
              }}
              className="rounded-xl text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Komisi</span>
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
