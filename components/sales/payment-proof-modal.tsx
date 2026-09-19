"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  MessageSquare,
  Share2,
  Sparkles,
  Copy,
} from "lucide-react";
import { uploadSalePaymentProof } from "@/lib/actions/sale.actions";
import { formatWhatsAppProofCaption } from "@/lib/utils/payment-proof-composer";
import { toast } from "sonner";

export interface PaymentProofSaleItem {
  productName: string;
  productImei?: string | null;
  productSku?: string | null;
  capacity?: string | null;
  color?: string | null;
  completeness?: string | null;
  qty?: number;
}

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  invoiceNo: string;
  customerPhone?: string | null;
  initialProofUrl?: string | null;
  readOnly?: boolean;
  userRole?: string;
  onUploaded?: (newUrl: string) => void;
  transactionDate?: string | null;
  customerName?: string | null;
  cashierName?: string | null;
  total?: number | null;
  items?: PaymentProofSaleItem[] | null;
}

export function PaymentProofModal({
  isOpen,
  onClose,
  saleId,
  invoiceNo,
  customerPhone,
  initialProofUrl,
  readOnly = false,
  userRole,
  onUploaded,
  transactionDate,
  customerName,
  cashierName,
  total,
  items,
}: PaymentProofModalProps) {
  const isStaffMarketing = userRole === "admin_kasir";
  const [proofUrl, setProofUrl] = useState<string | null>(initialProofUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setProofUrl(initialProofUrl || null);
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [initialProofUrl, isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async (): Promise<string | null> => {
    if (!selectedFile) return proofUrl;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await uploadSalePaymentProof(saleId, formData);
      if (res.error) {
        toast.error(res.error);
        return null;
      }

      if (res.success && res.paymentProofUrl) {
        setProofUrl(res.paymentProofUrl);
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);

        toast.success("Foto bukti pembayaran berhasil disimpan!");
        onUploaded?.(res.paymentProofUrl);
        return res.paymentProofUrl;
      }
      return null;
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah bukti pembayaran.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const WA_GROUP_LINK =
    "https://chat.whatsapp.com/GAhjmAUfSXV0z1wkA8MZWG?s=cl&p=a&mlu=4&ilr=4";

  const handleSendWhatsAppGroup = async () => {
    let activeUrl = proofUrl;
    if (selectedFile) {
      const uploadedUrl = await handleUpload();
      if (uploadedUrl) activeUrl = uploadedUrl;
      else return;
    }

    if (!activeUrl) {
      toast.error("Silakan pilih dan simpan bukti pembayaran terlebih dahulu.");
      return;
    }

    const fullProofUrl = activeUrl.startsWith("http")
      ? activeUrl
      : `${window.location.origin}${activeUrl}`;

    let fileToShare: File | null = null;
    if (fullProofUrl) {
      try {
        const res = await fetch(fullProofUrl);
        const blob = await res.blob();
        fileToShare = new File([blob], `bukti-${invoiceNo}.jpg`, {
          type: blob.type || "image/jpeg",
        });
      } catch {
        // ignore
      }
    }

    // Salin rincian transaksi ke clipboard (sebagai cadangan teks)
    const messageCaption = formatWhatsAppProofCaption({
      invoiceNo,
      transactionDate,
      cashierName,
      customerName,
      customerPhone,
      total,
      items: (items || []).map((it) => ({
        productName: it.productName || (it as any).name || "Produk",
        productImei: it.productImei || (it as any).imei || null,
        productSku: it.productSku || (it as any).sku || null,
        capacity: it.capacity || null,
        color: it.color || null,
        completeness: it.completeness || null,
        qty: it.qty || 1,
      })),
    });

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(messageCaption);
      } catch {
        // ignore
      }
    }

    // Bagikan file gambar bukti asli via Web Share API di HP
    if (
      fileToShare &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [fileToShare] })
    ) {
      try {
        await navigator.share({
          files: [fileToShare],
          title: `Bukti Pembayaran ${invoiceNo}`,
          text: messageCaption,
        });
        toast.success("Foto bukti dan caption transaksi siap dikirim ke WhatsApp!");
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback Desktop: buka link grup WhatsApp dan info caption sudah dicopy
    toast.success("Caption rincian telah disalin ke clipboard! Membuka grup WhatsApp...");
    window.open(WA_GROUP_LINK, "_blank");
  };

  const handleCopyCaptionOnly = async () => {
    const messageCaption = formatWhatsAppProofCaption({
      invoiceNo,
      transactionDate,
      cashierName,
      customerName,
      customerPhone,
      total,
      items: (items || []).map((it) => ({
        productName: it.productName || (it as any).name || "Produk",
        productImei: it.productImei || (it as any).imei || null,
        productSku: it.productSku || (it as any).sku || null,
        capacity: it.capacity || null,
        color: it.color || null,
        completeness: it.completeness || null,
        qty: it.qty || 1,
      })),
    });

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(messageCaption);
        toast.success("Teks caption rincian berhasil disalin!");
      } catch {
        toast.error("Gagal menyalin teks caption.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ImageIcon className="w-5 h-5 text-primary dark:text-teal-400" />
            Bukti Pembayaran - {invoiceNo}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Lihat foto bukti transfer atau struk pembayaran transaksi ini."
              : "Unggah foto bukti pembayaran dan kirim caption rincian transaksi ke grup WhatsApp."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pratinjau Bukti: Jika sedang memilih file baru */}
          {selectedFile && previewUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#055B5A] dark:text-teal-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Pratinjau Foto Bukti Dipilih:
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Foto asli (tanpa overlay teks)
                </span>
              </div>
              <div className="relative border border-teal-200 dark:border-teal-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[220px]">
                <div className="relative w-full max-h-[420px] flex items-center justify-center bg-black/5 dark:bg-black/40 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt={`Pratinjau Bukti Pembayaran ${invoiceNo}`}
                    className="w-full h-auto max-h-[420px] object-contain"
                  />
                </div>
              </div>
            </div>
          ) : proofUrl ? (
            /* Jika sudah tersimpan, tampilkan gambar yang sudah tersimpan */
            <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[220px]">
              <div className="relative w-full max-h-[420px] flex items-center justify-center bg-black/5 dark:bg-black/40 overflow-hidden">
                <img
                  src={proofUrl}
                  alt={`Bukti Pembayaran ${invoiceNo}`}
                  className="w-full h-auto max-h-[420px] object-contain"
                />
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm text-xs flex items-center gap-1 transition-colors shadow"
                  title="Buka Ukuran Penuh"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Buka Penuh</span>
                </a>
              </div>
            </div>
          ) : (
            /* Belum ada bukti */
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Belum Ada Bukti Pembayaran
              </p>
              <p className="text-xs text-slate-400 max-w-[300px] mx-auto">
                {readOnly
                  ? "Staff Marketing belum mengunggah bukti pembayaran untuk transaksi ini."
                  : "Pilih foto bukti transfer atau struk dari galeri / kamera di bawah ini."}
              </p>
            </div>
          )}

          {/* Form Upload jika bukan read-only */}
          {!readOnly && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="block w-full text-xs text-slate-500
                      file:mr-3 file:py-2 file:px-3
                      file:rounded-lg file:border-0
                      file:text-xs file:font-semibold
                      file:bg-teal-50 file:text-[#055B5A]
                      hover:file:bg-teal-100
                      dark:file:bg-teal-950 dark:file:text-teal-300
                      cursor-pointer"
                  />
                </label>
                {selectedFile && (
                  <Button
                    size="sm"
                    onClick={() => handleUpload()}
                    disabled={isUploading}
                    className="bg-[#055B5A] hover:bg-[#044a49] text-white gap-1.5 shrink-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Simpan Foto Bukti</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  File dipilih: {selectedFile.name} (Foto asli disimpan bersih, rincian dikirim via caption)
                </p>
              )}
            </div>
          )}

          {/* Area Kirim Bukti ke WhatsApp (Khusus Staff Marketing / Kasir) */}
          {(proofUrl || selectedFile) && isStaffMarketing && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Share2 className="w-3.5 h-3.5 text-[#25D366]" />
                  Kirim Bukti ke Grup WhatsApp
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  [{invoiceNo}]
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSendWhatsAppGroup}
                    disabled={isUploading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Kirim ke Grup WA</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyCaptionOnly}
                    disabled={isUploading}
                    className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 text-xs gap-1"
                    title="Salin teks rincian transaksi"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </Button>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium text-center bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-emerald-300/50">
                  💡 <strong>Foto Asli & Teks Caption:</strong> Foto bukti diunggah bersih tanpa watermark. Rincian transaksi otomatis tersalin dan dikirim sebagai caption teks WhatsApp.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
