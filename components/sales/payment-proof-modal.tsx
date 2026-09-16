"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { uploadSalePaymentProof } from "@/lib/actions/sale.actions";
import { toast } from "sonner";

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
        toast.success("Bukti pembayaran berhasil disimpan.");
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
    }

    const messageText = `bukti transaksi [${invoiceNo}]`;
    const fullProofUrl = activeUrl
      ? activeUrl.startsWith("http")
        ? activeUrl
        : `${window.location.origin}${activeUrl}`
      : "";

    let fileToShare: File | null = selectedFile;
    if (!fileToShare && fullProofUrl) {
      try {
        const res = await fetch(fullProofUrl);
        const blob = await res.blob();
        const ext = fullProofUrl.split(".").pop()?.split("?")[0] || "jpg";
        fileToShare = new File([blob], `bukti-${invoiceNo}.${ext}`, {
          type: blob.type || "image/jpeg",
        });
      } catch {
        // ignore
      }
    }

    if (
      fileToShare &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [fileToShare] })
    ) {
      try {
        await navigator.share({
          files: [fileToShare],
          title: messageText,
          text: messageText,
        });
        toast.success("Foto dan pesan bukti transaksi berhasil dibagikan ke WhatsApp!");
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    const contentToCopy = fullProofUrl
      ? `${messageText}\n${fullProofUrl}`
      : messageText;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(contentToCopy);
        toast.success("Pesan bukti transaksi disalin ke clipboard! Membuka grup WhatsApp...");
      }
    } catch {
      // ignore
    }

    window.open(WA_GROUP_LINK, "_blank");
  };

  const displayUrl = previewUrl || proofUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Bukti Pembayaran - {invoiceNo}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Lihat bukti transfer atau struk pembayaran transaksi ini."
              : isStaffMarketing
                ? "Unggah bukti pembayaran transaksi dan bagikan ke grup WhatsApp."
                : "Lihat atau perbarui foto bukti pembayaran transaksi."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Gambar Pratinjau / Bukti */}
          <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[220px] max-h-[340px]">
            {displayUrl ? (
              <div className="relative w-full h-[250px] flex items-center justify-center bg-black/5 dark:bg-black/40">
                <img
                  src={displayUrl}
                  alt={`Bukti Pembayaran ${invoiceNo}`}
                  className="w-full h-full object-contain"
                />
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm text-xs flex items-center gap-1 transition-colors shadow"
                  title="Buka Ukuran Penuh"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Buka Penuh</span>
                </a>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Belum Ada Bukti Pembayaran
                </p>
                <p className="text-xs text-slate-400 max-w-[280px]">
                  {readOnly
                    ? "Staff Marketing belum mengunggah bukti pembayaran untuk transaksi ini."
                    : "Pilih foto bukti transfer / struk pembayaran di bawah ini."}
                </p>
              </div>
            )}
          </div>

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
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                      dark:file:bg-indigo-950 dark:file:text-indigo-300
                      cursor-pointer"
                  />
                </label>
                {selectedFile && (
                  <Button
                    size="sm"
                    onClick={() => handleUpload()}
                    disabled={isUploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Simpan Bukti</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  File: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Area Kirim Bukti ke WhatsApp (Khusus Staff Marketing / Kasir) */}
          {displayUrl && isStaffMarketing && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Share2 className="w-3.5 h-3.5 text-[#25D366]" />
                  Kirim Bukti ke WhatsApp
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  bukti transaksi [{invoiceNo}]
                </span>
              </div>

              <div>
                <Button
                  type="button"
                  onClick={handleSendWhatsAppGroup}
                  disabled={isUploading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim ke Grup WA</span>
                </Button>
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
