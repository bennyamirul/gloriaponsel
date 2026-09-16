"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight,
  Smartphone,
  Calendar,
  User,
  Receipt,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Info,
  HelpCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export interface ExchangeDetailData {
  invoiceNo?: string;
  customerName?: string;
  exchangedAt?: string;
  reason?: string;
  oldProduct: {
    name: string;
    imei?: string | null;
    price?: number | null;
  };
  replacementProduct: {
    name: string;
    imei?: string | null;
    price?: number | null;
  };
  priceDiff?: number | null;
  newSaleTotal?: number | null;
  oldSaleTotal?: number | null;
}

interface ExchangeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExchangeDetailData | null;
}

export function parseExchangeData(
  rawText?: string | null,
  fallback?: Partial<ExchangeDetailData>
): ExchangeDetailData | null {
  if (!rawText && !fallback) return null;

  let parsedJson: any = null;
  if (rawText && rawText.includes("||EXCHANGE_JSON:")) {
    const match = rawText.match(/\|\|EXCHANGE_JSON:(.*?)\|\|/);
    if (match && match[1]) {
      try {
        parsedJson = JSON.parse(match[1]);
      } catch (e) {
        // ignore parse error
      }
    }
  }

  if (parsedJson) {
    return {
      invoiceNo: parsedJson.invoiceNo || fallback?.invoiceNo,
      customerName: parsedJson.customerName || fallback?.customerName,
      exchangedAt: parsedJson.exchangedAt || fallback?.exchangedAt,
      reason: parsedJson.reason || fallback?.reason || "Tukar Unit Pelanggan",
      oldProduct: {
        name: parsedJson.oldProduct?.name || "Unit Lama",
        imei: parsedJson.oldProduct?.imei,
        price: parsedJson.oldProduct?.price,
      },
      replacementProduct: {
        name: parsedJson.replacementProduct?.name || "Unit Pengganti",
        imei: parsedJson.replacementProduct?.imei,
        price: parsedJson.replacementProduct?.price,
      },
      priceDiff: parsedJson.priceDiff,
      newSaleTotal: parsedJson.newSaleTotal,
      oldSaleTotal: parsedJson.oldSaleTotal,
    };
  }

  // Fallback parsing from human text
  const cleanText = (rawText || "").replace(/\|\|EXCHANGE_JSON:.*?\|\|/g, "").trim();
  return {
    invoiceNo: fallback?.invoiceNo || "-",
    customerName: fallback?.customerName || "Pelanggan",
    exchangedAt: fallback?.exchangedAt,
    reason: cleanText || fallback?.reason || "Klaim Garansi / Tukar Unit",
    oldProduct: fallback?.oldProduct || {
      name: "Unit Asal",
      imei: "-",
      price: 0,
    },
    replacementProduct: fallback?.replacementProduct || {
      name: "Unit Pengganti",
      imei: "-",
      price: 0,
    },
    priceDiff: fallback?.priceDiff ?? null,
    newSaleTotal: fallback?.newSaleTotal ?? null,
    oldSaleTotal: fallback?.oldSaleTotal ?? null,
  };
}

export function ExchangeDetailDialog({
  open,
  onOpenChange,
  data,
}: ExchangeDetailDialogProps) {
  if (!data) return null;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
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

  const priceDiff = data.priceDiff ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold text-foreground">
                Detail Tukar Unit
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Rincian pergantian unit dan penyesuaian total transaksi
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Metadata Faktur */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl border border-border">
            <div>
              <span className="text-[10px] text-muted-foreground block">No. Faktur</span>
              <span className="font-mono font-bold text-foreground flex items-center gap-1 mt-0.5">
                <Receipt className="h-3 w-3 text-primary" />
                {data.invoiceNo || "-"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Pelanggan</span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-primary" />
                {data.customerName || "Pelanggan Umum"}
              </span>
            </div>
            {data.exchangedAt && (
              <div>
                <span className="text-[10px] text-muted-foreground block">Waktu Penukaran</span>
                <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {formatDate(data.exchangedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Unit Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card Unit Lama */}
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-200 dark:border-rose-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Unit Asal (Lama)
                </span>
                <Badge variant="outline" className="text-[9px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 border-rose-300">
                  Dikembalikan
                </Badge>
              </div>

              <div>
                <p className="font-bold text-foreground text-xs leading-snug">
                  {data.oldProduct.name}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  IMEI/SKU: {data.oldProduct.imei || "-"}
                </p>
              </div>

              {typeof data.oldProduct.price === "number" && (
                <div className="pt-1.5 border-t border-rose-200/60 dark:border-rose-900/40 flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Harga Beli:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatRupiah(data.oldProduct.price)}
                  </span>
                </div>
              )}
            </div>

            {/* Card Unit Baru */}
            <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-200 dark:border-sky-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Unit Pengganti (Baru)
                </span>
                <Badge variant="outline" className="text-[9px] bg-sky-100 dark:bg-sky-950/60 text-sky-700 border-sky-300">
                  Diberikan
                </Badge>
              </div>

              <div>
                <p className="font-bold text-foreground text-xs leading-snug">
                  {data.replacementProduct.name}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  IMEI/SKU: {data.replacementProduct.imei || "-"}
                </p>
              </div>

              {typeof data.replacementProduct.price === "number" && (
                <div className="pt-1.5 border-t border-sky-200/60 dark:border-sky-900/40 flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Harga Unit Baru:</span>
                  <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                    {formatRupiah(data.replacementProduct.price)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selisih Harga & Status Finansial */}
          <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-primary" />
                Selisih Harga Unit:
              </span>
              <div>
                {priceDiff > 0 ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 font-mono font-bold text-xs">
                    + {formatRupiah(priceDiff)} (Tambah Bayar)
                  </Badge>
                ) : priceDiff < 0 ? (
                  <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-300 font-mono font-bold text-xs">
                    - {formatRupiah(Math.abs(priceDiff))} (Kembali Dana)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 font-mono font-bold text-xs">
                    Rp 0 (Harga Sama)
                  </Badge>
                )}
              </div>
            </div>

            {typeof data.newSaleTotal === "number" && (
              <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Total Transaksi Faktur Setelah Tukar:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatRupiah(data.newSaleTotal)}
                </span>
              </div>
            )}
          </div>

          {/* Alasan Tukar Unit */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3 text-muted-foreground" />
              Alasan Penukaran Unit:
            </span>
            <div className="p-2.5 rounded-xl bg-card border border-border text-foreground text-xs leading-relaxed">
              {data.reason || "Klaim Garansi / Permintaan Tukar Unit Pelanggan"}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
