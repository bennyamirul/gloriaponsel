"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  Smartphone,
  Headphones,
  Sliders,
  Download,
  Info,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateBarcodeSvg, generateQrCodeSvg } from "@/lib/barcode";
import { formatRupiah } from "@/lib/utils";
import {
  markProductsBarcodePrinted,
  resetProductsBarcodePrinted,
} from "@/lib/actions/product.actions";

export interface StockItemForBarcode {
  id: string;
  name: string;
  sku: string;
  imei: string;
  productType: "phone" | "accessory";
  capacity?: string | null;
  color?: string | null;
  completeness?: string | null;
  retailSupplier?: string | null;
  grade?: string | null;
  status?: string;
  sellingPrice: number;
  stock: number;
  brandName?: string | null;
  entryDate?: string | null;
  isBarcodePrinted?: boolean;
  barcodePrintedAt?: string | null;
}

interface BarcodePrintClientProps {
  initialItems: StockItemForBarcode[];
}

export function BarcodePrintClient({ initialItems }: BarcodePrintClientProps) {
  const [items, setItems] = useState<StockItemForBarcode[]>(initialItems);
  const [printTab, setPrintTab] = useState<"pending" | "done">("pending");
  const [isResetting, setIsResetting] = useState(false);

  const initialPending = useMemo(
    () => initialItems.filter((item) => !item.isBarcodePrinted),
    [initialItems]
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(
      (initialPending.length > 0 ? initialPending : initialItems)
        .slice(0, 8)
        .map((item) => item.id)
    )
  );
  const [filterType, setFilterType] = useState<"all" | "phone" | "accessory">("all");
  const [search, setSearch] = useState("");
  const [labelSize, setLabelSize] = useState<"thermal" | "sheet">("thermal");
  const [sizePreset, setSizePreset] = useState<"71x14_2col" | "50x30" | "40x30" | "40x20" | "30x20" | "custom">("71x14_2col");
  const [customWidth, setCustomWidth] = useState<number>(50);
  const [customHeight, setCustomHeight] = useState<number>(30);
  const [resmiInterOverrides, setResmiInterOverrides] = useState<Record<string, "RESMI" | "INTER">>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const is2Col = sizePreset === "71x14_2col";

  const stickerWidth =
    sizePreset === "71x14_2col"
      ? 33
      : sizePreset === "custom"
      ? Math.max(20, Number(customWidth) || 50)
      : sizePreset === "40x30"
      ? 40
      : sizePreset === "40x20"
      ? 40
      : sizePreset === "30x20"
      ? 30
      : 50;

  const stickerHeight =
    sizePreset === "71x14_2col"
      ? 14
      : sizePreset === "custom"
      ? Math.max(14, Number(customHeight) || 30)
      : sizePreset === "40x30"
      ? 30
      : sizePreset === "40x20"
      ? 20
      : sizePreset === "30x20"
      ? 20
      : 30;

  // Responsive layout calculations to prevent clipping on small stickers
  const isVerySmall = is2Col || stickerWidth <= 32 || stickerHeight <= 21;
  const isSmall = !isVerySmall && (stickerWidth <= 42 || stickerHeight <= 25);

  const leftColWidth = is2Col
    ? 10.6
    : Math.min(22, Math.max(10.5, Number((stickerWidth * (isVerySmall ? 0.35 : 0.38)).toFixed(1))));
  const rightColWidth = Number((stickerWidth - leftColWidth).toFixed(1));

  const horizPadding = is2Col ? "0.4mm" : isVerySmall ? "0.4mm" : isSmall ? "0.7mm" : "1mm";
  const vertPaddingTop = is2Col ? "0.3mm" : isVerySmall ? "0.3mm" : isSmall ? "0.5mm" : "0.7mm";
  const vertPaddingBottom = is2Col ? "0.3mm" : isVerySmall ? "0.3mm" : isSmall ? "0.5mm" : "0.7mm";

  const brandMarginTop = is2Col ? "0.3mm" : isVerySmall ? "0.2mm" : isSmall ? "0.4mm" : "0.7mm";
  const brandFontSize = is2Col ? "3.4px" : isVerySmall ? "4.2px" : isSmall ? "5.5px" : "6.5px";
  const brandLetterSpacing = is2Col ? "0.2px" : isVerySmall ? "-0.2px" : "0.2px";

  const reservedForBrand = is2Col ? 3.8 : isVerySmall ? 4.2 : isSmall ? 5.5 : 7;
  const qrBoxSize = is2Col ? 9.6 : Math.max(7, Math.min(leftColWidth - 1.2, stickerHeight - reservedForBrand));

  const titleFontSize = is2Col ? "5.0px" : isVerySmall ? "6.5px" : isSmall ? "8px" : stickerHeight >= 35 ? "11px" : "9.5px";
  const imeiFontSize = is2Col ? "5.4px" : isVerySmall ? "5.8px" : isSmall ? "7px" : stickerHeight >= 35 ? "9.5px" : "8px";
  const statusFontSize = is2Col ? "5.8px" : isVerySmall ? "6px" : isSmall ? "7.5px" : stickerHeight >= 35 ? "10px" : "8.5px";
  const halfHeight = (stickerHeight / 2 - 0.2).toFixed(1);

  const getResmiInterStatus = (item: StockItemForBarcode): "RESMI" | "INTER" => {
    if (resmiInterOverrides[item.id]) {
      return resmiInterOverrides[item.id];
    }
    const text = `${item.retailSupplier || ""} ${item.completeness || ""} ${item.name} ${item.sku}`.toLowerCase();
    if (text.includes("inter")) return "INTER";
    return "RESMI";
  };

  const toggleResmiInter = (id: string) => {
    setResmiInterOverrides((prev) => {
      const item = items.find((i) => i.id === id);
      const current = prev[id] || (item ? getResmiInterStatus(item) : "RESMI");
      return {
        ...prev,
        [id]: current === "RESMI" ? "INTER" : "RESMI",
      };
    });
  };

  const getResmiStatusWithGrade = (item: StockItemForBarcode): string => {
    const baseStatus = item.productType === "phone" ? getResmiInterStatus(item) : "ORIGINAL";
    const rawGrade = (item.grade || "").trim();
    if (!rawGrade || rawGrade === "-" || rawGrade.toLowerCase() === "null") {
      return baseStatus;
    }
    return `${baseStatus} - ${rawGrade.toUpperCase()}`;
  };

  // Helper untuk menyatukan Tipe HP, Kapasitas, dan Warna menjadi 1 baris
  const getProductTitleCombined = (item: StockItemForBarcode) => {
    const name = (item.name || "").trim();
    const cap = (item.capacity || "").trim();
    const color = (item.color || "").trim();

    const details: string[] = [];
    if (cap && !name.toLowerCase().includes(cap.toLowerCase())) {
      details.push(cap);
    }
    if (color && !name.toLowerCase().includes(color.toLowerCase())) {
      details.push(color);
    }

    if (details.length > 0) {
      return `${name} ${details.join(" ")}`;
    }
    return name;
  };

  // Tab counts
  const countPending = useMemo(
    () => items.filter((i) => !i.isBarcodePrinted).length,
    [items]
  );
  const countDone = useMemo(
    () => items.filter((i) => Boolean(i.isBarcodePrinted)).length,
    [items]
  );

  // Tab items: pisahkan antara belum dicetak dan done cetak
  const tabItems = useMemo(() => {
    if (printTab === "pending") {
      return items.filter((item) => !item.isBarcodePrinted);
    }
    return items.filter((item) => Boolean(item.isBarcodePrinted));
  }, [items, printTab]);

  const handleSwitchTab = (tab: "pending" | "done") => {
    setPrintTab(tab);
    const targetItems = items.filter((i) =>
      tab === "pending" ? !i.isBarcodePrinted : Boolean(i.isBarcodePrinted)
    );
    setSelectedIds(new Set(targetItems.slice(0, 8).map((i) => i.id)));
  };

  const handleResetToPending = async () => {
    if (selectedList.length === 0) return;
    const targetIds = selectedList.map((i) => i.id);
    setIsResetting(true);
    const toastId = toast.loading("Mengembalikan ke antrean belum dicetak...");
    try {
      const res = await resetProductsBarcodePrinted(targetIds);
      if (res.success) {
        setItems((prev) =>
          prev.map((item) =>
            targetIds.includes(item.id)
              ? { ...item, isBarcodePrinted: false, barcodePrintedAt: null }
              : item
          )
        );
        setSelectedIds(new Set());
        toast.dismiss(toastId);
        toast.success(
          `${targetIds.length} produk dikembalikan ke antrean "Belum Dicetak"`
        );
      } else {
        toast.dismiss(toastId);
        toast.error(res.error || "Gagal mengembalikan produk ke antrean");
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsResetting(false);
    }
  };

  // Filter items sesuai tab dan pencarian
  const filteredItems = useMemo(() => {
    return tabItems.filter((item) => {
      if (filterType === "phone" && item.productType !== "phone") return false;
      if (filterType === "accessory" && item.productType !== "accessory") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.imei.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.brandName && item.brandName.toLowerCase().includes(q)) ||
        (item.color && item.color.toLowerCase().includes(q))
      );
    });
  }, [tabItems, filterType, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedList = useMemo(() => {
    return tabItems.filter((item) => selectedIds.has(item.id));
  }, [tabItems, selectedIds]);

  const pairs = useMemo(() => {
    const result: (StockItemForBarcode | null)[][] = [];
    for (let i = 0; i < selectedList.length; i += 2) {
      result.push([selectedList[i], selectedList[i + 1] || null]);
    }
    return result;
  }, [selectedList]);

  const handlePrint = () => {
    if (selectedList.length === 0) return;

    const isThermal = labelSize === "thermal";
    const printWindow = window.open("", "_blank", "width=850,height=850");
    if (!printWindow) {
      window.print();
      return;
    }

    const renderCardHtml = (item: StockItemForBarcode) => {
      const barcodeValue = item.imei || item.sku;
      const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
      const resmiInter = getResmiStatusWithGrade(item);
      const fullTitle = getProductTitleCombined(item);

      if (is2Col && isThermal) {
        return `
          <div class="sticker-card">
            <div class="col-left">
              <div class="qr-box">
                ${qrSvg}
              </div>
              <div class="brand-text">GLORIA PONSEL</div>
            </div>
            <div class="col-right">
              <div class="product-title">${fullTitle}</div>
              <div class="divider-line"></div>
              <div class="imei-text">IMEI: ${barcodeValue}</div>
              <div class="status-text">${resmiInter}</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="sticker-card">
          <div class="col-left">
            <div class="qr-box">
              ${qrSvg}
            </div>
            <div class="brand-text">GLORIA PONSEL</div>
          </div>
          <div class="col-right">
            <div class="right-top">
              <div class="product-title">${fullTitle}</div>
            </div>
            <div class="divider-h"></div>
            <div class="right-bottom">
              <div class="imei-text">IMEI: ${barcodeValue}</div>
              <div class="status-text">${resmiInter}</div>
            </div>
          </div>
        </div>
      `;
    };

    let stickersHtml = "";
    if (is2Col && isThermal) {
      for (let i = 0; i < selectedList.length; i += 2) {
        const item1 = selectedList[i];
        const item2 = selectedList[i + 1] || null;
        stickersHtml += `
          <div class="roll-row-71">
            ${renderCardHtml(item1)}
            ${item2 ? renderCardHtml(item2) : '<div class="sticker-card placeholder"></div>'}
          </div>
        `;
      }
    } else {
      stickersHtml = selectedList.map((item) => renderCardHtml(item)).join("");
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${is2Col ? "Cetak_Barcode_Roll_71x14mm_2Kolom" : `Cetak_Barcode_${stickerWidth}x${stickerHeight}mm`}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${
                is2Col && isThermal
                  ? "71mm 14mm"
                  : isThermal
                  ? `${stickerWidth}mm ${stickerHeight}mm`
                  : "A4 portrait"
              };
              margin: ${isThermal ? "0" : "6mm 5mm"};
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              background: #ffffff;
              color: #000000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            ${
              is2Col && isThermal
                ? `
              body {
                width: 71mm;
                margin: 0;
                padding: 0;
              }
              .stickers-container {
                width: 71mm;
                display: block;
                margin: 0;
                padding: 0;
              }
              .roll-row-71 {
                width: 71mm;
                height: 14mm;
                max-width: 71mm;
                max-height: 14mm;
                padding-left: 1mm;
                padding-right: 1mm;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                gap: 3mm;
                box-sizing: border-box;
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid;
                overflow: hidden;
              }
              .roll-row-71:last-child {
                page-break-after: auto;
                break-after: auto;
              }
              .sticker-card {
                width: 33mm;
                height: 14mm;
                max-width: 33mm;
                max-height: 14mm;
                border: none;
                display: flex;
                flex-direction: row;
                box-sizing: border-box;
                overflow: hidden;
                background: #ffffff;
                flex-shrink: 0;
                padding: 0.5mm 0.6mm;
              }
              .sticker-card.placeholder {
                visibility: hidden !important;
                border: none !important;
                background: transparent !important;
              }
            `
                : isThermal
                ? `
              body {
                width: ${stickerWidth}mm;
                margin: 0;
                padding: 0;
              }
              .stickers-container {
                display: block;
                margin: 0;
                padding: 0;
              }
              .sticker-card {
                width: ${stickerWidth}mm;
                height: ${stickerHeight}mm;
                max-width: ${stickerWidth}mm;
                max-height: ${stickerHeight}mm;
                border: 1px solid #000000;
                display: flex;
                flex-direction: row;
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid;
                overflow: hidden;
                background: #ffffff;
                box-sizing: border-box;
              }
            `
                : `
              body {
                margin: 0;
                padding: 0;
              }
              .stickers-container {
                display: flex;
                flex-wrap: wrap;
                gap: 2mm;
                justify-content: flex-start;
                padding: 0;
              }
              .sticker-card {
                width: ${stickerWidth}mm;
                height: ${stickerHeight}mm;
                max-width: ${stickerWidth}mm;
                max-height: ${stickerHeight}mm;
                border: 1px solid #000000;
                display: flex;
                flex-direction: row;
                page-break-inside: avoid;
                break-inside: avoid;
                overflow: hidden;
                background: #ffffff;
                box-sizing: border-box;
              }
            `
            }
            .col-left {
              width: ${leftColWidth}mm;
              height: 100%;
              border-right: 1px solid #000000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding-right: ${is2Col ? "0.6mm" : "0.3mm"};
              box-sizing: border-box;
              flex-shrink: 0;
            }
            .qr-box {
              width: ${qrBoxSize}mm;
              height: ${qrBoxSize}mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box svg {
              width: 100%;
              height: 100%;
              display: block;
            }
            .brand-text {
              font-size: ${brandFontSize};
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: ${brandLetterSpacing};
              margin-top: ${brandMarginTop};
              text-align: center;
              line-height: 1;
              color: #000000;
              white-space: nowrap;
            }
            .col-right {
              ${is2Col ? "flex: 1;" : `width: ${rightColWidth}mm;`}
              height: 100%;
              display: flex;
              flex-direction: column;
              ${is2Col ? "justify-content: center; gap: 0.6mm; padding-left: 0.9mm;" : ""}
              box-sizing: border-box;
              text-align: left;
              overflow: hidden;
            }
            .right-top {
              height: ${halfHeight}mm;
              display: flex;
              align-items: flex-end;
              padding: ${vertPaddingTop} ${horizPadding} ${vertPaddingBottom} ${horizPadding};
              box-sizing: border-box;
              overflow: hidden;
            }
            .product-title {
              font-size: ${titleFontSize};
              font-weight: 700;
              line-height: 1.15;
              color: #000000;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              word-break: break-word;
              text-transform: uppercase;
            }
            .divider-line {
              border-top: 1px solid #000000;
              width: 100%;
              margin: 0;
            }
            .divider-h {
              border-top: 1px solid #000000;
              width: 100%;
              margin: 0;
            }
            .right-bottom {
              height: ${halfHeight}mm;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              padding: ${vertPaddingTop} ${horizPadding} ${vertPaddingBottom} ${horizPadding};
              box-sizing: border-box;
              gap: ${isVerySmall ? "0.1mm" : "0.3mm"};
              overflow: hidden;
            }
            .imei-text {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: ${imeiFontSize};
              font-weight: 700;
              color: #000000;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              letter-spacing: ${is2Col ? "-0.1px" : isVerySmall ? "-0.3px" : "-0.2px"};
            }
            .status-text {
              font-size: ${statusFontSize};
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: ${is2Col ? "0.3px" : isVerySmall ? "0.2px" : "0.4px"};
              color: #000000;
              line-height: 1.1;
            }
          </style>
        </head>
        <body>
          <div class="stickers-container">
            ${stickersHtml}
          </div>
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

    // Tandai barang yang dicetak sebagai "Done Cetak" di database & state lokal
    const targetIds = selectedList.map((item) => item.id);
    const nowIso = new Date().toISOString();
    markProductsBarcodePrinted(targetIds).catch((e) =>
      console.error("markProductsBarcodePrinted error:", e)
    );

    setItems((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id)
          ? { ...item, isBarcodePrinted: true, barcodePrintedAt: nowIso }
          : item
      )
    );

    if (printTab === "pending") {
      toast.success(
        `${targetIds.length} label barcode dicetak & dipindahkan ke tab "Done Cetak"`
      );
      setSelectedIds(new Set());
    } else {
      toast.success(
        `${targetIds.length} label barcode berhasil dicetak ulang!`
      );
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedList.length === 0) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Sedang menyiapkan file PDF barcode...");

    try {
      const isThermal = labelSize === "thermal";

      if (is2Col && isThermal) {
        // Roll 71mm (33x14mm - 2 Kolom)
        // Format dokumen: [14, 71] orientation landscape = Lebar 71mm, Tinggi 14mm
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [14, 71],
        });

        // Pre-generate QR code data URLs (256x256 px untuk ketajaman thermal maksimal)
        const qrCache = new Map<string, string>();
        for (const item of selectedList) {
          const val = item.imei || item.sku;
          if (!qrCache.has(val)) {
            const dataUrl = await QRCode.toDataURL(val, {
              margin: 0,
              errorCorrectionLevel: "M",
              width: 256,
            });
            qrCache.set(val, dataUrl);
          }
        }

        const drawCard71 = (startX: number, item: StockItemForBarcode) => {
          const barcodeVal = item.imei || item.sku;
          const qrUrl = qrCache.get(barcodeVal);
          const resmiStatus = getResmiStatusWithGrade(item);
          const fullTitle = getProductTitleCombined(item).toUpperCase();

          // QR Code (9.6 x 9.6 mm)
          if (qrUrl) {
            doc.addImage(qrUrl, "PNG", startX + 0.3, 0.6, 9.6, 9.6);
          }

          // GLORIA PONSEL di bawah QR
          doc.setFont("helvetica", "bold");
          doc.setFontSize(3.7);
          doc.setTextColor(0, 0, 0);
          doc.text("GLORIA PONSEL", startX + 5.1, 11.6, { align: "center" });

          // Garis pemisah vertikal
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.18);
          doc.line(startX + 10.6, 0.4, startX + 10.6, 13.6);

          // Kolom Kanan
          const rightX = startX + 11.5;
          const maxRightW = 20.8;

          // Nama Produk (maksimal 2 baris)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.0);
          const lines = doc.splitTextToSize(fullTitle, maxRightW);
          if (lines.length === 1) {
            doc.text(lines[0], rightX, 3.6);
          } else {
            let line2 = lines[1];
            if (lines.length > 2) {
              while (line2.length > 3 && doc.getTextWidth(line2 + "..") > maxRightW) {
                line2 = line2.slice(0, -1);
              }
              line2 += "..";
            }
            doc.text(lines[0], rightX, 2.6);
            doc.text(line2, rightX, 4.5);
          }

          // Garis pemisah horizontal antara Nama Produk dan IMEI
          doc.setLineWidth(0.18);
          doc.line(rightX - 0.2, 5.6, startX + 32.5, 5.6);

          // IMEI
          doc.setFontSize(5.4);
          doc.setFont("helvetica", "bold");
          const imeiLabel = (item.imei && item.imei.length > 10 ? "IMEI: " : "SKU: ") + barcodeVal;
          doc.text(imeiLabel, rightX, 8.5);

          // Status Garansi & Grade
          let statusFs = 5.8;
          doc.setFontSize(statusFs);
          doc.setFont("helvetica", "bold");
          while (doc.getTextWidth(resmiStatus) > maxRightW && statusFs > 3.8) {
            statusFs -= 0.3;
            doc.setFontSize(statusFs);
          }
          doc.text(resmiStatus, rightX, 11.8);
        };

        for (let i = 0; i < selectedList.length; i += 2) {
          if (i > 0) {
            doc.addPage([14, 71], "landscape");
          }
          const item1 = selectedList[i];
          const item2 = selectedList[i + 1] || null;

          // Stiker kiri di x = 1mm
          drawCard71(1, item1);

          // Stiker kanan di x = 37mm jika ada
          if (item2) {
            drawCard71(37, item2);
          }
        }

        const filename = `Barcode_Roll_71x14mm_${selectedList.length}label_${Date.now()}.pdf`;
        doc.save(filename);
        toast.dismiss(toastId);
        toast.success(`Berhasil mengunduh ${filename} (Ukuran pas 71x14mm)`);
      } else if (isThermal) {
        // Format thermal 1 kolom (e.g. 50x30, 40x30, dll)
        const isLandscape = stickerWidth >= stickerHeight;
        const pageW = isLandscape ? stickerHeight : stickerWidth;
        const pageH = isLandscape ? stickerWidth : stickerHeight;
        const orient = isLandscape ? "landscape" : "portrait";

        const doc = new jsPDF({
          orientation: orient,
          unit: "mm",
          format: [pageW, pageH],
        });

        const qrCache = new Map<string, string>();
        for (const item of selectedList) {
          const val = item.imei || item.sku;
          if (!qrCache.has(val)) {
            const dataUrl = await QRCode.toDataURL(val, {
              margin: 0,
              errorCorrectionLevel: "M",
              width: 256,
            });
            qrCache.set(val, dataUrl);
          }
        }

        for (let i = 0; i < selectedList.length; i++) {
          if (i > 0) {
            doc.addPage([pageW, pageH], orient);
          }
          const item = selectedList[i];
          const barcodeVal = item.imei || item.sku;
          const qrUrl = qrCache.get(barcodeVal);
          const resmiStatus = getResmiStatusWithGrade(item);
          const fullTitle = getProductTitleCombined(item).toUpperCase();

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.rect(0.2, 0.2, stickerWidth - 0.4, stickerHeight - 0.4);

          const qrY = Math.max(0.5, (stickerHeight - qrBoxSize - 4) / 2);
          const qrX = Math.max(0.4, (leftColWidth - qrBoxSize) / 2);
          if (qrUrl) {
            doc.addImage(qrUrl, "PNG", qrX, qrY, qrBoxSize, qrBoxSize);
          }

          doc.setFont("helvetica", "bold");
          const brandFs = stickerHeight <= 20 ? 3.5 : 4.5;
          doc.setFontSize(brandFs);
          doc.text("GLORIA PONSEL", leftColWidth / 2, qrY + qrBoxSize + (stickerHeight <= 20 ? 2.2 : 3.0), { align: "center" });

          doc.line(leftColWidth, 0.2, leftColWidth, stickerHeight - 0.2);

          const rightX = leftColWidth + 1.0;
          const rightW = stickerWidth - leftColWidth - 2.0;
          const halfH = stickerHeight / 2;

          const titleFs = stickerHeight <= 20 ? 5.0 : stickerHeight <= 25 ? 6.5 : 8.0;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(titleFs);
          const lines = doc.splitTextToSize(fullTitle, rightW);
          doc.text(lines.slice(0, 2), rightX, halfH / 2 + (lines.length > 1 ? 0 : 1));

          doc.line(leftColWidth, halfH, stickerWidth - 0.2, halfH);

          const imeiFs = stickerHeight <= 20 ? 5.2 : stickerHeight <= 25 ? 6.5 : 7.5;
          doc.setFontSize(imeiFs);
          const imeiLabel = (item.imei && item.imei.length > 10 ? "IMEI: " : "SKU: ") + barcodeVal;
          doc.text(imeiLabel, rightX, halfH + (stickerHeight <= 20 ? 3.2 : 4.5));

          let statusFs = stickerHeight <= 20 ? 5.6 : stickerHeight <= 25 ? 7.0 : 8.5;
          doc.setFontSize(statusFs);
          while (doc.getTextWidth(resmiStatus) > rightW && statusFs > 3.8) {
            statusFs -= 0.3;
            doc.setFontSize(statusFs);
          }
          doc.text(resmiStatus, rightX, halfH + (stickerHeight <= 20 ? 6.2 : 9.0));
        }

        const filename = `Barcode_${stickerWidth}x${stickerHeight}mm_${selectedList.length}label_${Date.now()}.pdf`;
        doc.save(filename);
        toast.dismiss(toastId);
        toast.success(`Berhasil mengunduh ${filename}`);
      } else {
        // Lembar A4
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const marginX = 6;
        const marginY = 8;
        const gap = 2;
        const cols = Math.max(1, Math.floor((210 - marginX * 2 + gap) / (stickerWidth + gap)));
        const rowsPerPage = Math.max(1, Math.floor((297 - marginY * 2 + gap) / (stickerHeight + gap)));
        const perPage = cols * rowsPerPage;

        const qrCache = new Map<string, string>();
        for (const item of selectedList) {
          const val = item.imei || item.sku;
          if (!qrCache.has(val)) {
            const dataUrl = await QRCode.toDataURL(val, {
              margin: 0,
              errorCorrectionLevel: "M",
              width: 256,
            });
            qrCache.set(val, dataUrl);
          }
        }

        for (let i = 0; i < selectedList.length; i++) {
          const pageIndex = Math.floor(i / perPage);
          const itemIndexInPage = i % perPage;

          if (itemIndexInPage === 0 && pageIndex > 0) {
            doc.addPage("a4", "portrait");
          }

          const col = itemIndexInPage % cols;
          const row = Math.floor(itemIndexInPage / cols);
          const posX = marginX + col * (stickerWidth + gap);
          const posY = marginY + row * (stickerHeight + gap);

          const item = selectedList[i];
          const barcodeVal = item.imei || item.sku;
          const qrUrl = qrCache.get(barcodeVal);
          const resmiStatus = getResmiStatusWithGrade(item);
          const fullTitle = getProductTitleCombined(item).toUpperCase();

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.rect(posX, posY, stickerWidth, stickerHeight);

          const qrY = posY + Math.max(0.5, (stickerHeight - qrBoxSize - 4) / 2);
          const qrX = posX + Math.max(0.4, (leftColWidth - qrBoxSize) / 2);
          if (qrUrl) {
            doc.addImage(qrUrl, "PNG", qrX, qrY, qrBoxSize, qrBoxSize);
          }

          doc.setFont("helvetica", "bold");
          const brandFs = stickerHeight <= 20 ? 3.5 : 4.5;
          doc.setFontSize(brandFs);
          doc.text("GLORIA PONSEL", posX + leftColWidth / 2, qrY + qrBoxSize + (stickerHeight <= 20 ? 2.2 : 3.0), { align: "center" });

          doc.line(posX + leftColWidth, posY, posX + leftColWidth, posY + stickerHeight);

          const rightX = posX + leftColWidth + 1.0;
          const rightW = stickerWidth - leftColWidth - 2.0;
          const halfH = stickerHeight / 2;

          const titleFs = stickerHeight <= 20 ? 5.0 : stickerHeight <= 25 ? 6.5 : 8.0;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(titleFs);
          const lines = doc.splitTextToSize(fullTitle, rightW);
          doc.text(lines.slice(0, 2), rightX, posY + halfH / 2 + (lines.length > 1 ? 0 : 1));

          doc.line(posX + leftColWidth, posY + halfH, posX + stickerWidth, posY + halfH);

          const imeiFs = stickerHeight <= 20 ? 5.2 : stickerHeight <= 25 ? 6.5 : 7.5;
          doc.setFontSize(imeiFs);
          const imeiLabel = (item.imei && item.imei.length > 10 ? "IMEI: " : "SKU: ") + barcodeVal;
          doc.text(imeiLabel, rightX, posY + halfH + (stickerHeight <= 20 ? 3.2 : 4.5));

          let statusFs = stickerHeight <= 20 ? 5.6 : stickerHeight <= 25 ? 7.0 : 8.5;
          doc.setFontSize(statusFs);
          while (doc.getTextWidth(resmiStatus) > rightW && statusFs > 3.8) {
            statusFs -= 0.3;
            doc.setFontSize(statusFs);
          }
          doc.text(resmiStatus, rightX, posY + halfH + (stickerHeight <= 20 ? 6.2 : 9.0));
        }

        const filename = `Barcode_LembarA4_${selectedList.length}label_${Date.now()}.pdf`;
        doc.save(filename);
        toast.dismiss(toastId);
        toast.success(`Berhasil mengunduh ${filename}`);
      }

      // Tandai barang yang dicetak sebagai "Done Cetak" di database & state lokal
      const targetIds = selectedList.map((item) => item.id);
      const nowIso = new Date().toISOString();
      markProductsBarcodePrinted(targetIds).catch((e) =>
        console.error("markProductsBarcodePrinted error:", e)
      );

      setItems((prev) =>
        prev.map((item) =>
          targetIds.includes(item.id)
            ? { ...item, isBarcodePrinted: true, barcodePrintedAt: nowIso }
            : item
        )
      );

      if (printTab === "pending") {
        toast.success(
          `${targetIds.length} label barcode dipindahkan ke tab "Done Cetak"`
        );
        setSelectedIds(new Set());
      } else {
        toast.success(
          `${targetIds.length} barcode berhasil diunduh ulang!`
        );
      }
    } catch (err) {
      console.error("Download PDF error:", err);
      toast.dismiss(toastId);
      toast.error("Gagal membuat file PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar - Hidden on print */}
      <div className="print:hidden flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/products">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <span>Cetak Barcode </span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full xl:w-auto ml-auto">
          {/* Label size dropdown selector */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border text-xs shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground pl-1">Ukuran:</span>
            <div className="relative">
              <select
                value={sizePreset}
                onChange={(e) => setSizePreset(e.target.value as any)}
                className="h-8 pl-2.5 pr-7 text-xs font-semibold rounded-lg bg-background border border-border text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:border-primary/40 transition"
              >
                <option value="71x14_2col">Roll 71mm (33x14mm - 2 Kolom) [Sesuai Kertas]</option>
                <option value="50x30">50 x 30 mm (Standar)</option>
                <option value="40x30">40 x 30 mm</option>
                <option value="40x20">40 x 20 mm</option>
                <option value="30x20">30 x 20 mm</option>
                <option value="custom">Kustom (L x T)</option>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            {sizePreset === "custom" && (
              <div className="flex items-center gap-1 pl-1.5 border-l border-border">
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value) || 20)}
                  placeholder="L"
                  className="w-11 h-8 text-xs px-1 rounded-lg border border-border bg-background text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Lebar (mm)"
                />
                <span className="text-muted-foreground text-xs font-semibold">x</span>
                <input
                  type="number"
                  min={14}
                  max={100}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value) || 14)}
                  placeholder="T"
                  className="w-11 h-8 text-xs px-1 rounded-lg border border-border bg-background text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Tinggi (mm)"
                />
                <span className="text-[10px] text-muted-foreground pr-0.5">mm</span>
              </div>
            )}
          </div>

          {/* Label layout selector (Thermal vs A4 Sheet) */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs shrink-0">
            <button
              type="button"
              onClick={() => setLabelSize("thermal")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                labelSize === "thermal"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Roll Thermal
            </button>
            <button
              type="button"
              onClick={() => setLabelSize("sheet")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                labelSize === "sheet"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lembar A4
            </button>
          </div>

          {/* Tombol Cetak Browser (Untuk Printer Desktop / Thermal di PC) */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={selectedList.length === 0}
            className="border-border hover:bg-muted font-bold px-3.5 sm:px-4 rounded-xl gap-2 shrink-0 text-foreground"
            title={printTab === "done" ? "Cetak ulang label barcode barang yang dipilih" : "Buka dialog cetak browser (printer desktop / thermal di PC)"}
          >
            <Printer className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">
              {printTab === "done" ? "Cetak Ulang Langsung" : "Cetak Langsung"}
            </span>
            <span className="sm:hidden">
              {printTab === "done" ? "Cetak Ulang" : "Cetak"}
            </span>
          </Button>

          {/* Tombol Khusus Download PDF (Ukuran pas 71x14mm tanpa terpotong / A4 di HP) */}
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={selectedList.length === 0 || isGeneratingPdf}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-4 sm:px-5 rounded-xl gap-2 shadow-md shadow-primary/20 shrink-0"
            title="Unduh file PDF dengan ukuran pas (71x14mm). Langsung pas di HP tanpa terpotong atau jadi kertas A4 raksasa!"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>
                  {printTab === "done" ? "Download PDF Ulang" : "Download PDF"} ({selectedList.length} Label
                  {is2Col ? " • Roll 71mm" : ""})
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Screen controls & inventory selector - Hidden on print */}
      <div className="print:hidden space-y-4">
        {/* Tab Navigasi: Belum Dicetak vs Done Cetak */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-2 rounded-2xl border border-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchTab("pending")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                printTab === "pending"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Belum Dicetak</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                printTab === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-foreground"
              }`}>
                {countPending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab("done")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                printTab === "done"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Done Cetak</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                printTab === "done"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-foreground"
              }`}>
                {countDone}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground px-2">
            {printTab === "pending" ? (
              <span>Barang baru masuk &amp; belum pernah dicetak labelnya.</span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Barang sudah dicetak barcodenya. Anda dapat memilih barang di tab ini untuk <strong>mencetak ulang</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Filter and search bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Stok
            </button>
            <button
              onClick={() => setFilterType("phone")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Handphone</span>
            </button>
            <button
              onClick={() => setFilterType("accessory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === "accessory"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Aksesoris</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari IMEI, SKU, produk..."
                className="pl-8 text-xs h-8 rounded-xl"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={selectAllFiltered}
              className="text-xs h-8 rounded-xl"
            >
              Pilih Semua
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={deselectAll}
              className="text-xs h-8 rounded-xl text-muted-foreground"
            >
              Batal Pilih
            </Button>
          </div>
        </div>

        {/* Available inventory list selector */}
        <div className="border border-border rounded-2xl bg-card overflow-hidden">
          <div className="p-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                {printTab === "pending" ? "Antrean Belum Dicetak" : "Daftar Done Cetak"} ({filteredItems.length} unit)
              </span>
              {printTab === "done" && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                  Bisa Dicetak Ulang
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {printTab === "done" && selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToPending}
                  disabled={isResetting}
                  className="h-7 text-xs rounded-lg border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 gap-1.5"
                  title="Kembalikan barang terpilih ke antrean Belum Dicetak"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Kembalikan ke Belum Dicetak ({selectedIds.size})</span>
                </Button>
              )}
              <span className="text-primary font-bold">{selectedIds.size} label terpilih</span>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {printTab === "pending"
                  ? "Semua barcode telah selesai dicetak! Cek tab 'Done Cetak' untuk mencetak ulang."
                  : "Belum ada produk di tab Done Cetak."}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`flex items-center justify-between p-2.5 px-4 cursor-pointer hover:bg-muted/40 transition text-xs ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-primary focus:outline-none"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary fill-primary/20" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{item.name}</span>
                          {item.capacity && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                              {item.capacity}
                            </Badge>
                          )}
                          {item.grade && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold border-indigo-500/30 text-indigo-600 bg-indigo-500/10">
                              {item.grade}
                            </Badge>
                          )}
                          {item.color && (
                            <span className="text-muted-foreground text-[11px]">{item.color}</span>
                          )}
                          {item.isBarcodePrinted && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-medium">
                              Done Cetak
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                          <span className="font-mono text-[11px] text-primary font-semibold">
                            {item.imei || item.sku}
                          </span>
                          <span>•</span>
                          <span>{item.brandName || "Gloria Ponsel"}</span>
                          {item.completeness && (
                            <>
                              <span>•</span>
                              <span>{item.completeness}</span>
                            </>
                          )}
                          {item.barcodePrintedAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Dicetak: {new Date(item.barcodePrintedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.productType === "phone" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleResmiInter(item.id);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                            getResmiInterStatus(item) === "INTER"
                              ? "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700"
                          }`}
                          title="Klik untuk ubah status Resmi / Inter"
                        >
                          {getResmiInterStatus(item)}
                        </button>
                      )}
                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(item.sellingPrice)}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          Stok: {item.stock} Unit
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clean Live Preview Header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold text-foreground">
            {is2Col ? "Pratinjau Label Roll 71mm (2 Kolom)" : `Pratinjau Label ${stickerWidth}×${stickerHeight}mm`}
          </span>
          <span className="text-[11px] font-mono">{selectedList.length} label dipilih</span>
        </div>
      </div>

      {/* PRINTABLE LABELS CONTAINER */}
      <div className="print-container">
        {selectedList.length === 0 ? (
          <div className="print:hidden border-2 border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
            <Printer className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-semibold text-sm">Pilih produk di atas untuk melihat label barcode.</p>
          </div>
        ) : is2Col && labelSize === "thermal" ? (
          <div className="flex flex-col gap-4 print:block print:m-0">
            {/* Clean Info Bar */}
            <div className="print:hidden px-3.5 py-2 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-between">
              <span className="font-medium text-foreground">
                Simulasi Roll 71mm ({pairs.length} baris • 2 kolom)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Tip HP: Gunakan tombol <strong>Download PDF</strong> untuk ukuran pas 71×14mm
              </span>
            </div>

            <div className="flex flex-wrap gap-4 items-start">
              {pairs.map(([item1, item2], rowIndex) => (
                <div
                  key={rowIndex}
                  className="bg-muted/15 p-2.5 rounded-xl border border-dashed border-border flex flex-col gap-1.5 items-center"
                >
                  <div className="text-[10px] font-mono text-muted-foreground font-semibold flex items-center justify-between w-full px-1">
                    <span>Baris #{rowIndex + 1}</span>
                    <span>Lebar Roll 71mm</span>
                  </div>
                  {/* Simulasi Kertas Roll Lebar 71mm */}
                  <div
                    className="bg-white p-0 flex flex-row items-center border border-slate-300 rounded shadow-xs"
                    style={{
                      width: "71mm",
                      height: "14mm",
                      paddingLeft: "1mm",
                      paddingRight: "1mm",
                      gap: "3mm",
                      boxSizing: "border-box",
                    }}
                  >
                    {[item1, item2].map((item, idx) => {
                      if (!item) {
                        return (
                          <div
                            key="placeholder"
                            style={{ width: "33mm", height: "14mm", boxSizing: "border-box" }}
                            className="border border-dashed border-slate-300 rounded flex items-center justify-center text-[8.5px] text-slate-400 font-mono"
                          >
                            (Slot Kosong)
                          </div>
                        );
                      }
                      const barcodeValue = item.imei || item.sku;
                      const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
                      const resmiInter = getResmiStatusWithGrade(item);
                      const combinedTitle = getProductTitleCombined(item);

                      return (
                        <div
                          key={item.id}
                          className="label-sticker label-sticker-thermal bg-white text-black border border-slate-300 rounded-xs shadow-xs print:shadow-none flex flex-row overflow-hidden text-left"
                          style={{
                            width: "33mm",
                            height: "14mm",
                            maxWidth: "33mm",
                            maxHeight: "14mm",
                            boxSizing: "border-box",
                            flexShrink: 0,
                            padding: "0.5mm 0.6mm",
                          }}
                        >
                          {/* Kiri Barcode: Barcode 2D + Tulisan Kecil Gloria Ponsel */}
                          <div
                            className="flex flex-col items-center justify-center shrink-0 border-r border-black pr-[0.6mm] box-border"
                            style={{ width: `${leftColWidth}mm`, height: "100%" }}
                          >
                            <div
                              style={{ width: `${qrBoxSize}mm`, height: `${qrBoxSize}mm` }}
                              className="flex items-center justify-center bg-white"
                              dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                            <span
                              style={{
                                fontSize: brandFontSize,
                                marginTop: brandMarginTop,
                                letterSpacing: brandLetterSpacing,
                              }}
                              className="font-bold text-black uppercase text-center leading-none whitespace-nowrap select-none"
                            >
                              GLORIA PONSEL
                            </span>
                          </div>

                          {/* Kanan Isi: Spacing Lega Terdistribusi Rapi (Anti-Blur & Anti-Clipping) */}
                          <div
                            className="flex flex-col justify-center gap-[0.6mm] h-full pl-[0.9mm] box-border text-left overflow-hidden flex-1"
                          >
                            {/* Atas: Nama Produk & Spek (1-2 baris, font proporsional agar tidak ...) */}
                            <p
                              style={{ fontSize: titleFontSize }}
                              className="font-bold text-black leading-[1.15] line-clamp-2 w-full text-left m-0 uppercase"
                              title={combinedTitle}
                            >
                              {combinedTitle}
                            </p>

                            {/* Garis Pemisah antara Nama Produk dan IMEI */}
                            <div className="border-t border-black w-full" />

                            {/* Tengah: IMEI */}
                            <span
                              style={{
                                fontSize: imeiFontSize,
                                letterSpacing: "-0.1px",
                              }}
                              className="font-sans font-bold text-black leading-[1.1] truncate"
                            >
                              IMEI: {barcodeValue}
                            </span>

                            {/* Bawah: Status Garansi */}
                            <div>
                              {item.productType === "phone" ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleResmiInter(item.id);
                                  }}
                                  style={{
                                    fontSize: statusFontSize,
                                    letterSpacing: "0.3px",
                                  }}
                                  className="font-extrabold text-black uppercase cursor-pointer hover:underline leading-[1.1]"
                                  title="Klik untuk ubah Resmi / Inter"
                                >
                                  {resmiInter}
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: statusFontSize,
                                    letterSpacing: "0.3px",
                                  }}
                                  className="font-extrabold text-black uppercase leading-[1.1]"
                                >
                                  {resmiInter}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={
              labelSize === "thermal"
                ? "flex flex-wrap gap-4 print:block print:m-0"
                : "flex flex-wrap gap-3.5 print:flex print:flex-wrap print:gap-2"
            }
          >
            {selectedList.map((item) => {
              const barcodeValue = item.imei || item.sku;
              const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
              const resmiInter = getResmiStatusWithGrade(item);
              const combinedTitle = getProductTitleCombined(item);

              return (
                <div
                  key={item.id}
                  className={`label-sticker ${
                    labelSize === "thermal" ? "label-sticker-thermal" : "label-sticker-sheet"
                  } bg-white text-black border border-black shadow-xs print:shadow-none flex flex-row overflow-hidden text-left`}
                  style={{
                    width: `${stickerWidth}mm`,
                    height: `${stickerHeight}mm`,
                    boxSizing: "border-box",
                  }}
                >
                  {/* Kiri Barcode: Barcode 2D + Tulisan Kecil Gloria Ponsel */}
                  <div
                    className="flex flex-col items-center justify-center shrink-0 border-r border-black p-[0.3mm] box-border"
                    style={{ width: `${leftColWidth}mm`, height: `${stickerHeight}mm` }}
                  >
                    <div
                      style={{ width: `${qrBoxSize}mm`, height: `${qrBoxSize}mm` }}
                      className="flex items-center justify-center bg-white"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                    <span
                      style={{
                        fontSize: brandFontSize,
                        marginTop: brandMarginTop,
                        letterSpacing: brandLetterSpacing,
                      }}
                      className="font-extrabold text-black uppercase text-center leading-none whitespace-nowrap select-none"
                    >
                      GLORIA PONSEL
                    </span>
                  </div>

                  {/* Kanan Isi: Terbagi 2 rapat di garis tengah horisontal */}
                  <div
                    className="flex flex-col box-border text-left overflow-hidden flex-1"
                    style={{ width: `${rightColWidth}mm`, height: `${stickerHeight}mm` }}
                  >
                    {/* Atas (Tipe HP + Kapasitas + Warna): Menempel rapat ke garis tengah */}
                    <div
                      style={{
                        height: `${halfHeight}mm`,
                        padding: `${vertPaddingTop} ${horizPadding} ${vertPaddingBottom} ${horizPadding}`,
                      }}
                      className="flex items-end box-border overflow-hidden"
                    >
                      <p
                        style={{ fontSize: titleFontSize }}
                        className="font-extrabold text-black leading-[1.1] line-clamp-2 w-full text-left m-0 uppercase"
                        title={combinedTitle}
                      >
                        {combinedTitle}
                      </p>
                    </div>

                    {/* Garis Pemisah Tengah Horisontal */}
                    <div className="border-t border-black w-full" />

                    {/* Bawah (IMEI & Status Garansi): Menempel rapat ke garis tengah */}
                    <div
                      style={{
                        height: `${halfHeight}mm`,
                        padding: `${vertPaddingTop} ${horizPadding} ${vertPaddingBottom} ${horizPadding}`,
                        gap: isVerySmall ? "0.1mm" : "0.3mm",
                      }}
                      className="flex flex-col justify-start box-border overflow-hidden"
                    >
                      <span
                        style={{
                          fontSize: imeiFontSize,
                          letterSpacing: isVerySmall ? "-0.3px" : "-0.2px",
                        }}
                        className="font-sans font-bold text-black leading-[1.1] truncate"
                      >
                        IMEI: {barcodeValue}
                      </span>
                      <div>
                        {item.productType === "phone" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleResmiInter(item.id);
                            }}
                            style={{
                              fontSize: statusFontSize,
                              letterSpacing: isVerySmall ? "0.2px" : "0.4px",
                            }}
                            className="font-black text-black uppercase cursor-pointer hover:underline leading-[1.1]"
                            title="Klik untuk ubah Resmi / Inter"
                          >
                            {resmiInter}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: statusFontSize,
                              letterSpacing: isVerySmall ? "0.2px" : "0.4px",
                            }}
                            className="font-black text-black uppercase leading-[1.1]"
                          >
                            {resmiInter}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded CSS for Thermal & Desktop Printing Fallback */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${
              is2Col && labelSize === "thermal"
                ? "71mm 14mm"
                : labelSize === "thermal"
                ? `${stickerWidth}mm ${stickerHeight}mm`
                : "A4 portrait"
            };
            margin: ${labelSize === "thermal" ? "0" : "6mm 5mm"};
          }
          body * {
            visibility: hidden !important;
          }
          .print-container,
          .print-container * {
            visibility: visible !important;
          }
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          html, body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, aside, header, .print\\:hidden {
            display: none !important;
          }
          .label-sticker-thermal {
            width: ${stickerWidth}mm !important;
            height: ${stickerHeight}mm !important;
            max-width: ${stickerWidth}mm !important;
            max-height: ${stickerHeight}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #000000 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: row !important;
          }
          .label-sticker-sheet {
            width: ${stickerWidth}mm !important;
            height: ${stickerHeight}mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #000000 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: row !important;
          }
        }
      `}</style>
    </div>
  );
}
