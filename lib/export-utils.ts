/**
 * Utilitas ekspor data laporan ke Microsoft Excel (.xlsx asli) dan Print PDF.
 * Menghasilkan file spreadsheet berstandar .xlsx dengan kolom terpisah rapi,
 * lebar kolom otomatis, dan format angka yang kompatibel dengan Excel di semua regional Windows.
 */

import * as XLSX from "xlsx";

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  if (typeof window === "undefined") return;

  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths agar judul dan isi tidak terpotong
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const val = row[colIdx];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

export function triggerPrint() {
  if (typeof window !== "undefined") {
    window.print();
  }
}
