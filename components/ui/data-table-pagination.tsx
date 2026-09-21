"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}: DataTablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", safeTotalPages];
    }
    if (safeCurrentPage >= safeTotalPages - 3) {
      return [
        1,
        "...",
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages,
      ];
    }
    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      safeTotalPages,
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t border-border bg-card/60 rounded-b-xl select-none text-xs text-muted-foreground ${className}`}
    >
      {/* Sisi Kiri: Info Data & Pilihan Limit Baris */}
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
        <span>
          {totalItems === 0 ? (
            "Tidak ada data"
          ) : (
            <>
              Menampilkan{" "}
              <span className="font-semibold text-foreground font-mono">
                {startItem}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-foreground font-mono">
                {endItem}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground font-mono">
                {totalItems}
              </span>{" "}
              data
            </>
          )}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-[11px] text-muted-foreground">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Pilih jumlah baris per halaman"
              className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition font-medium"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sisi Kanan: Kontrol Navigasi Halaman */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* Tombol Halaman Pertama */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          title="Halaman Pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Tombol Sebelumnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Tampilan Desktop: Tombol Angka Halaman */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-0.5 text-muted-foreground font-mono text-xs select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === safeCurrentPage;
            return (
              <Button
                key={`page-${p}`}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className={`h-7 min-w-[28px] px-2 text-xs font-semibold rounded-md transition ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => onPageChange(Number(p))}
              >
                {p}
              </Button>
            );
          })}
        </div>

        {/* Tampilan Mobile: Ringkas 'Hal X dari Y' */}
        <div className="sm:hidden flex items-center px-2 text-xs font-semibold text-foreground">
          Hal {safeCurrentPage} / {safeTotalPages}
        </div>

        {/* Tombol Selanjutnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
          title="Halaman Selanjutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Tombol Halaman Terakhir */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages}
          title="Halaman Terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
