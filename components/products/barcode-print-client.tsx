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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateQrCodeSvg } from "@/lib/barcode";
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
  const [labelSize, setLabelSize] = useState<"sheet" | "thermal">("sheet");
  const [resmiInterOverrides, setResmiInterOverrides] = useState<Record<string, "RESMI" | "INTER">>({});

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
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    const stickersHtml = selectedList
      .map((item) => {
        const barcodeValue = item.imei || item.sku;
        const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
        const resmiInter = item.productType === "phone" ? getResmiInterStatus(item) : "ORIGINAL";
        const capColor =
          [item.capacity, item.color].filter(Boolean).join(" / ") ||
          (item.productType === "accessory" ? "Aksesoris" : "-");

        return `
          <div class="sticker-card">
            <div class="col-left">
              <div class="qr-box">
                ${qrSvg}
              </div>
              <div class="imei-text">${barcodeValue}</div>
            </div>
            <div class="col-right">
              <div class="row-1">GLORIA PONSEL</div>
              <div class="row-2"><div class="row-2-text">${item.name}</div></div>
              <div class="row-3">${capColor}</div>
              <div class="row-4">${resmiInter}</div>
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak_Barcode_70x35mm</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isThermal ? "70mm 35mm" : "A4 portrait"};
              margin: ${isThermal ? "0" : "8mm 6mm"};
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
                width: 70mm;
                margin: 0;
                padding: 0;
              }
              .stickers-container {
                display: block;
                margin: 0;
                padding: 0;
              }
              .sticker-card {
                width: 70mm;
                height: 35mm;
                max-width: 70mm;
                max-height: 35mm;
                border: 1px solid #000000;
                display: flex;
                flex-direction: row;
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid;
                overflow: hidden;
                background: #ffffff;
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
                gap: 3mm;
                justify-content: flex-start;
                padding: 0;
              }
              .sticker-card {
                width: 70mm;
                height: 35mm;
                border: 1px solid #000000;
                display: flex;
                flex-direction: row;
                page-break-inside: avoid;
                break-inside: avoid;
                overflow: hidden;
                background: #ffffff;
              }
            `
            }
            .col-left {
              width: 27mm;
              height: 35mm;
              border-right: 1px solid #000000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1mm;
              flex-shrink: 0;
              box-sizing: border-box;
            }
            .qr-box {
              width: 24mm;
              height: 24mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box svg {
              width: 24mm;
              height: 24mm;
              display: block;
            }
            .imei-text {
              font-family: "Courier New", Courier, monospace;
              font-size: 8px;
              font-weight: 700;
              text-align: center;
              line-height: 1.1;
              margin-top: 0.5mm;
              width: 25mm;
              word-break: break-all;
              letter-spacing: -0.2px;
            }
            .col-right {
              width: 43mm;
              height: 35mm;
              display: flex;
              flex-direction: column;
              flex-grow: 1;
              overflow: hidden;
              box-sizing: border-box;
            }
            .row-1 {
              height: 8mm;
              border-bottom: 1px solid #000000;
              display: flex;
              align-items: center;
              padding: 0 2.5mm;
              font-weight: 900;
              font-size: 13.5px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              box-sizing: border-box;
            }
            .row-2 {
              height: 11.5mm;
              border-bottom: 1px solid #000000;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              padding: 0 2.5mm;
              box-sizing: border-box;
              overflow: hidden;
            }
            .row-2-text {
              font-weight: 800;
              font-size: 12px;
              line-height: 1.15;
              text-align: left;
              width: 100%;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .row-3 {
              height: 7.5mm;
              border-bottom: 1px solid #000000;
              display: flex;
              align-items: center;
              padding: 0 2.5mm;
              font-weight: 700;
              font-size: 10.5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              box-sizing: border-box;
            }
            .row-4 {
              height: 8mm;
              display: flex;
              align-items: center;
              padding: 0 2.5mm;
              font-weight: 900;
              font-size: 11px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              box-sizing: border-box;
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
      <div className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <span>Cetak Barcode SKU</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Label size / layout selector */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs">
            <button
              onClick={() => setLabelSize("sheet")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                labelSize === "sheet"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              Banyak Label / Kertas (70x35mm)
            </button>
            <button
              onClick={() => setLabelSize("thermal")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                labelSize === "thermal"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              1 Label per Kertas (Roll 70x35mm)
            </button>
          </div>

          <Button
            onClick={handlePrint}
            disabled={selectedList.length === 0}
            className="bg-primary text-primary-foreground font-bold px-5 rounded-xl gap-2 shadow-md shadow-primary/20"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak {selectedList.length} Label</span>
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
            <span>Pratinjau Label 70x35mm (Barcode 2D QR Code):</span>
          </div>
          <span>Format: 70x35mm • Barcode 2D + 4 Baris Rapat</span>
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
                : "flex flex-wrap gap-3.5 print:flex print:flex-wrap print:gap-2.5"
            }
          >
            {selectedList.map((item) => {
              const barcodeValue = item.imei || item.sku;
              const qrSvg = generateQrCodeSvg(barcodeValue, { margin: 1 });
              const resmiInter = item.productType === "phone" ? getResmiInterStatus(item) : "ORIGINAL";

              return (
                <div
                  key={item.id}
                  className={`label-sticker ${
                    labelSize === "thermal" ? "label-sticker-thermal" : "label-sticker-sheet"
                  } bg-white text-black border border-black shadow-sm print:shadow-none flex flex-row items-center overflow-hidden`}
                  style={{
                    width: "70mm",
                    height: "35mm",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Left: Barcode 2D Besar (QR Code) */}
                  <div
                    className="flex flex-col items-center justify-center shrink-0 border-r border-black p-1 box-border"
                    style={{ width: "27mm", height: "35mm" }}
                  >
                    <div
                      className="w-[24mm] h-[24mm] flex items-center justify-center bg-white"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                    <span className="text-[8px] font-mono font-bold tracking-tight text-black leading-tight mt-0.5 text-center w-[25mm] break-all">
                      {barcodeValue}
                    </span>
                  </div>

                  {/* Right: 4 Baris (Gloria Ponsel, Tipe HP, Kapasitas & Warna, Resmi/Inter) dengan pembatas garis */}
                  <div
                    className="flex flex-col h-[35mm] flex-1 overflow-hidden box-border text-left"
                    style={{ width: "43mm" }}
                  >
                    {/* Baris 1: Gloria Ponsel */}
                    <div className="h-[8mm] border-b border-black flex items-center px-2.5 box-border">
                      <span className="font-black text-[13.5px] tracking-wide uppercase text-black font-sans whitespace-nowrap overflow-hidden">
                        GLORIA PONSEL
                      </span>
                    </div>

                    {/* Baris 2: Tipe HP / Nama HP */}
                    <div className="h-[11.5mm] border-b border-black flex items-center justify-start px-2.5 box-border overflow-hidden text-left">
                      <p className="font-extrabold text-[12px] text-black leading-tight line-clamp-2 w-full text-left">
                        {item.name}
                      </p>
                    </div>

                    {/* Baris 3: Kapasitas dan Warna */}
                    <div className="h-[7.5mm] border-b border-black flex items-center px-2.5 box-border">
                      <p className="font-bold text-[10.5px] text-zinc-900 leading-none truncate">
                        {[item.capacity, item.color].filter(Boolean).join(" / ") ||
                          (item.productType === "accessory" ? "Aksesoris" : "-")}
                      </p>
                    </div>

                    {/* Baris 4: Resmi / Inter */}
                    <div className="h-[8mm] flex items-center px-2.5 box-border">
                      <button
                        type="button"
                        onClick={() => item.productType === "phone" && toggleResmiInter(item.id)}
                        className="font-black text-[11px] text-black uppercase tracking-wider cursor-pointer hover:underline"
                        title="Klik untuk ubah Resmi / Inter"
                      >
                        {resmiInter}
                      </button>
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
            size: ${labelSize === "thermal" ? "70mm 35mm" : "A4 portrait"};
            margin: ${labelSize === "thermal" ? "0" : "8mm 6mm"};
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
            width: 70mm !important;
            height: 35mm !important;
            max-width: 70mm !important;
            max-height: 35mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #000000 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .label-sticker-sheet {
            width: 70mm !important;
            height: 35mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #000000 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
