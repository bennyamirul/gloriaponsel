"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatRupiah } from "@/lib/utils";
import {
  updateSaleCommission,
  uploadCommissionProof,
} from "@/lib/actions/report.actions";
import {
  Award,
  Upload,
  X,
  Loader2,
  ImageIcon,
  Receipt,
  User,
  AlertCircle,
} from "lucide-react";

export interface CommissionEditSaleInfo {
  id: string;
  invoiceNo: string;
  customerName?: string;
  cashierName?: string;
  total?: number;
  commission?: number;
  commissionProofUrl?: string | null;
}

interface CommissionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: CommissionEditSaleInfo | null;
  onSuccess?: (updated: {
    id: string;
    commission: number;
    commissionProofUrl: string | null;
  }) => void;
}

export function CommissionEditDialog({
  open,
  onOpenChange,
  sale,
  onSuccess,
}: CommissionEditDialogProps) {
  const [commissionInput, setCommissionInput] = useState<number>(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (sale) {
      setCommissionInput(Number(sale.commission || 0));
      setProofFile(null);
      setProofPreview(sale.commissionProofUrl || null);
    }
  }, [sale]);

  if (!sale) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB.");
      return;
    }

    setProofFile(file);
    const objectUrl = URL.createObjectURL(file);
    setProofPreview(objectUrl);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleSave = () => {
    if (!sale) return;

    startTransition(async () => {
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

        const res = await updateSaleCommission(
          sale.id,
          commissionInput,
          finalProofUrl
        );

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success(`Komisi untuk faktur ${sale.invoiceNo} berhasil disimpan.`);
        onOpenChange(false);

        if (onSuccess) {
          onSuccess({
            id: sale.id,
            commission: commissionInput,
            commissionProofUrl: finalProofUrl,
          });
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan komisi.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <DialogContent className="max-w-md p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Award className="h-5 w-5 text-emerald-600" />
            <span>Kelola Komisi Transaksi</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Info Singkat Penjualan */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3 w-3" /> No. Faktur:
              </span>
              <span className="font-mono font-bold text-foreground">
                {sale.invoiceNo}
              </span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Pelanggan:
                </span>
                <span className="font-medium text-foreground">
                  {sale.customerName}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-primary" /> Kasir Penerima:
              </span>
              <span className="font-semibold text-primary">
                {sale.cashierName || "Kasir"}
              </span>
            </div>
            {sale.total !== undefined && (
              <div className="flex justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Total Transaksi:</span>
                <span className="font-bold text-foreground font-mono">
                  {formatRupiah(sale.total)}
                </span>
              </div>
            )}
          </div>

          {/* Input Nominal Komisi */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Nominal Komisi (Rp) *
            </label>
            <CurrencyInput
              value={commissionInput}
              onValueChange={(val) => setCommissionInput(val)}
              placeholder="0"
              allowZero={true}
              className="h-10 text-base font-bold bg-background border-border rounded-xl"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />

            {/* Presets Cepat */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                Pilihan Cepat:
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
          </div>

          {/* Upload Bukti Transfer / Foto */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Bukti Transfer / Foto Komisi</span>
              {proofPreview && (
                <button
                  type="button"
                  onClick={handleRemoveProof}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" />
                  Hapus Foto
                </button>
              )}
            </label>

            {proofPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[180px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview}
                  alt="Pratinjau Bukti Komisi"
                  className="w-auto h-auto max-h-[180px] max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
                <Upload className="h-6 w-6 text-muted-foreground/60 mb-1" />
                <span className="text-xs font-semibold text-foreground">
                  Pilih / Unggah Bukti Transfer
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  JPG, PNG, atau WebP (Maks. 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl text-xs gap-1.5 font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Award className="h-3.5 w-3.5" />
                <span>Simpan Komisi</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
