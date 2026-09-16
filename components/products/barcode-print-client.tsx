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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateBarcodeSvg, generateQrCodeSvg } from "@/lib/barcode";
import { formatRupiah } from "@/lib/utils";

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
  status?: string;
  sellingPrice: number;
  stock: number;
  brandName?: string | null;
  entryDate?: string | null;
}

interface BarcodePrintClientProps {
  initialItems: StockItemForBarcode[];
}

export function BarcodePrintClient({ initialItems }: BarcodePrintClientProps) {
  const [items] = useState<StockItemForBarcode[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialItems.slice(0, 8).map((item) => item.id))
  );
  const [filterType, setFilterType] = useState<"all" | "phone" | "accessory">("all");
  const [search, setSearch] = useState("");
  const [labelSize, setLabelSize] = useState<"thermal" | "sheet">("thermal");
  const [sizePreset, setSizePreset] = useState<"50x30" | "40x30" | "40x20" | "30x20" | "custom">("50x30");
  const [customWidth, setCustomWidth] = useState<number>(50);
  const [customHeight, setCustomHeight] = useState<number>(30);
  const [resmiInterOverrides, setResmiInterOverrides] = useState<Record<string, "RESMI" | "INTER">>({});

  const stickerWidth =
    sizePreset === "custom"
      ? Math.max(20, Number(customWidth) || 50)
      : sizePreset === "40x30"
      ? 40
      : sizePreset === "40x20"
      ? 40
      : sizePreset === "30x20"
      ? 30
      : 50;

  const stickerHeight =
    sizePreset === "custom"
      ? Math.max(15, Number(customHeight) || 30)
      : sizePreset === "40x30"
      ? 30
      : sizePreset === "40x20"
      ? 20
      : sizePreset === "30x20"
      ? 20
      : 30;

  // Responsive layout calculations to prevent clipping on small stickers
  const isVerySmall = stickerWidth <= 32 || stickerHeight <= 21;
  const isSmall = !isVerySmall && (stickerWidth <= 42 || stickerHeight <= 25);

  const leftColWidth = Math.min(22, Math.max(10.5, Number((stickerWidth * (isVerySmall ? 0.35 : 0.38)).toFixed(1))));
  const rightColWidth = Number((stickerWidth - leftColWidth).toFixed(1));

  const horizPadding = isVerySmall ? "0.4mm" : isSmall ? "0.7mm" : "1mm";
  const vertPaddingTop = isVerySmall ? "0.3mm" : isSmall ? "0.5mm" : "0.7mm";
  const vertPaddingBottom = isVerySmall ? "0.3mm" : isSmall ? "0.5mm" : "0.7mm";

  const brandMarginTop = isVerySmall ? "0.2mm" : isSmall ? "0.4mm" : "0.7mm";
  const brandFontSize = isVerySmall ? "4.2px" : isSmall ? "5.5px" : "6.5px";
  const brandLetterSpacing = isVerySmall ? "-0.2px" : "0.2px";

  const reservedForBrand = isVerySmall ? 4.2 : isSmall ? 5.5 : 7;
  const qrBoxSize = Math.max(7, Math.min(leftColWidth - 1.2, stickerHeight - reservedForBrand));

  const titleFontSize = isVerySmall ? "6.5px" : isSmall ? "8px" : stickerHeight >= 35 ? "11px" : "9.5px";
  const imeiFontSize = isVerySmall ? "5.8px" : isSmall ? "7px" : stickerHeight >= 35 ? "9.5px" : "8px";
  const statusFontSize = isVerySmall ? "6px" : isSmall ? "7.5px" : stickerHeight >= 35 ? "10px" : "8.5px";
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

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, filterType, search]);

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
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const handlePrint = () => {
    if (selectedList.length === 0) return;

    const isThermal = labelSize === "thermal";
    const printWindow = window.open("", "_blank", "width=750,height=850");
    if (!printWindow) {
      window.print();
      return;
    }

    const stickersHtml = selectedList
      .map((item) => {
        const barcodeValue = item.imei || item.sku;
        const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
        const resmiInter = item.productType === "phone" ? getResmiInterStatus(item) : "ORIGINAL";
        const fullTitle = getProductTitleCombined(item);

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
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak_Barcode_${stickerWidth}x${stickerHeight}mm</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isThermal ? `${stickerWidth}mm ${stickerHeight}mm` : "A4 portrait"};
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
              isThermal
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
              height: ${stickerHeight}mm;
              border-right: 1px solid #000000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 0.5mm;
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
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: ${brandLetterSpacing};
              margin-top: ${brandMarginTop};
              text-align: center;
              line-height: 1;
              color: #000000;
              white-space: nowrap;
            }
            .col-right {
              width: ${rightColWidth}mm;
              height: ${stickerHeight}mm;
              display: flex;
              flex-direction: column;
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
              font-weight: 800;
              line-height: 1.12;
              color: #000000;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              word-break: break-word;
              text-transform: uppercase;
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
              font-weight: 800;
              color: #000000;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              letter-spacing: ${isVerySmall ? "-0.4px" : "-0.2px"};
            }
            .status-text {
              font-size: ${statusFontSize};
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: ${isVerySmall ? "0.2px" : "0.4px"};
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
                  min={15}
                  max={100}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value) || 15)}
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

          <Button
            onClick={handlePrint}
            disabled={selectedList.length === 0}
            className="bg-primary text-primary-foreground font-bold px-4 sm:px-5 rounded-xl gap-2 shadow-md shadow-primary/20 shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak {selectedList.length} Label ({stickerWidth}x{stickerHeight}mm)</span>
          </Button>
        </div>
      </div>

      {/* Screen controls & inventory selector - Hidden on print */}
      <div className="print:hidden space-y-4">
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
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Daftar Stok Tersedia ({filteredItems.length} unit)</span>
            <span className="text-primary">{selectedIds.size} label terpilih</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Tidak ada stok barang yang sesuai dengan filter.
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
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              {item.capacity}
                            </Badge>
                          )}
                          {item.color && (
                            <span className="text-muted-foreground text-[11px]">{item.color}</span>
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

        {/* Live Preview Notification */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span>Pratinjau Label 50x30mm (Barcode 2D di Kiri 1/3):</span>
          </div>
          <span>Format: 50x30mm • Kiri: Barcode 2D QR Code • Kanan: Tipe & Varian + IMEI/Status</span>
        </div>
      </div>

      {/* PRINTABLE LABELS CONTAINER */}
      {/* On screen: Shown as nice stickers grid */}
      {/* On print: Clean, minimal thermal or page layout */}
      <div className="print-container">
        {selectedList.length === 0 ? (
          <div className="print:hidden border-2 border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
            <Printer className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-semibold text-sm">Pilih satu atau lebih barang di atas untuk melihat label barcode.</p>
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
              const resmiInter = item.productType === "phone" ? getResmiInterStatus(item) : "ORIGINAL";
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
                    className="flex flex-col items-center justify-center shrink-0 border-r border-black p-[0.5mm] box-border"
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
                        className="font-extrabold text-black leading-[1.12] line-clamp-2 w-full text-left m-0 uppercase"
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
                          letterSpacing: isVerySmall ? "-0.4px" : "-0.2px",
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
            size: ${labelSize === "thermal" ? `${stickerWidth}mm ${stickerHeight}mm` : "A4 portrait"};
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
