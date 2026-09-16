"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";

interface ReportPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  pdfPreview: React.ReactNode;
  excelHeaders: string[];
  excelRows: (string | number)[][];
  excelFileName: string;
  onExportExcel: () => void;
  onPrintPdf: () => void;
}

export function ReportPrintPreviewModal({
  isOpen,
  onClose,
  title = "Pratinjau Dokumen & Cetak",
  pdfPreview,
  excelHeaders,
  excelRows,
  excelFileName,
  onExportExcel,
  onPrintPdf,
}: ReportPrintPreviewModalProps) {
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");

  // Excel column letters: A, B, C, ... Z, AA, AB...
  const getColLetter = (index: number) => {
    let letter = "";
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header Dialog & Switcher Format */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              {title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih format output untuk melihat pratinjau sebelum mencetak atau mengunduh.
            </p>
          </div>

          {/* Toggle Format: PDF vs Excel */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                format === "pdf"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Format PDF (Dokumen)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat("excel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                format === "excel"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Format Excel (Spreadsheet)</span>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-zinc-950">
          {format === "pdf" ? (
            /* ========================================================================= */
            /* PRATINJAU DOKUMEN RESMI PDF                                               */
            /* ========================================================================= */
            <div className="w-full max-w-5xl mx-auto bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8 text-slate-900 overflow-x-auto">
              {pdfPreview}
            </div>
          ) : (
            /* ========================================================================= */
            /* PRATINJAU SPREADSHEET MICROSOFT EXCEL                                     */
            /* ========================================================================= */
            <div className="w-full max-w-5xl mx-auto rounded-lg shadow-md border border-emerald-700/40 bg-white overflow-hidden text-slate-800">
              {/* Excel Header Toolbar */}
              <div className="bg-[#107c41] px-4 py-2 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-xs font-bold tracking-wide">
                    {excelFileName} - Microsoft Excel Preview
                  </span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
                  Sheet1 • {excelRows.length} Baris
                </span>
              </div>

              {/* Formula Bar Mockup */}
              <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-slate-600">
                <span className="font-bold text-slate-500 text-[11px]">A1</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-400 font-serif italic text-xs">fx</span>
                <span className="text-slate-800 truncate text-[11px]">
                  {excelHeaders[0] || ""}
                </span>
              </div>

              {/* Grid Spreadsheet */}
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  {/* Column Indicators (A, B, C, ...) */}
                  <thead>
                    <tr className="bg-slate-200/80 text-slate-600 font-semibold border-b border-slate-300 select-none text-[10px]">
                      <th className="w-10 text-center py-1 px-1 bg-slate-300/80 border-r border-slate-300">
                        #
                      </th>
                      {excelHeaders.map((_, colIdx) => (
                        <th
                          key={colIdx}
                          className="py-1 px-3 text-center border-r border-slate-300 font-mono uppercase tracking-wider"
                        >
                          {getColLetter(colIdx)}
                        </th>
                      ))}
                    </tr>
                    {/* Header Row (Row 1) */}
                    <tr className="bg-slate-100 font-bold border-b-2 border-slate-400 text-[11px] text-slate-900">
                      <td className="text-center py-2 px-1 bg-slate-200 border-r border-slate-300 font-mono text-[10px] text-slate-600">
                        1
                      </td>
                      {excelHeaders.map((header, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-3 border-r border-slate-300 whitespace-nowrap bg-slate-50"
                        >
                          {header}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {excelRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={excelHeaders.length + 1}
                          className="py-8 text-center text-slate-400 italic"
                        >
                          Tidak ada baris data untuk diekspor.
                        </td>
                      </tr>
                    ) : (
                      excelRows.slice(0, 100).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="hover:bg-emerald-50/40 transition-colors"
                        >
                          <td className="text-center py-1.5 px-1 bg-slate-100 border-r border-slate-300 font-mono text-[10px] text-slate-500 select-none">
                            {rowIdx + 2}
                          </td>
                          {row.map((cell, colIdx) => {
                            const isNumeric = typeof cell === "number";
                            return (
                              <td
                                key={colIdx}
                                className={`py-1.5 px-3 border-r border-slate-200 whitespace-nowrap ${
                                  isNumeric
                                    ? "text-right font-mono"
                                    : "text-slate-800"
                                }`}
                              >
                                {cell !== null && cell !== undefined
                                  ? String(cell)
                                  : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Excel Bottom Tab Bar Mockup */}
              <div className="bg-slate-100 border-t border-slate-300 px-3 py-1 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="bg-white px-3 py-0.5 rounded-t border-t border-x border-slate-300 font-bold text-emerald-800 text-xs">
                    Sheet1
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {excelRows.length > 100
                    ? `Menampilkan 100 dari ${excelRows.length} baris data`
                    : `Total ${excelRows.length} baris`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Aksi */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {format === "pdf"
              ? "Pratinjau dokumen siap dicetak atau disimpan sebagai file PDF."
              : `File spreadsheet siap diunduh dengan ekstensi .xlsx`}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Batal
            </Button>

            {format === "pdf" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    onPrintPdf();
                  }, 200);
                }}
                className="text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak PDF</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onExportExcel();
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh File Excel (.xlsx)</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
