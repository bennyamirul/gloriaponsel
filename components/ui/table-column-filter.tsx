"use client";

import React, { useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp10,
  ArrowUpDown,
  Filter,
  X,
  Check,
  Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ColumnFilterProps {
  title: string;
  className?: string;
  align?: "left" | "center" | "right";
  // Sorting
  sortDirection?: "asc" | "desc" | null;
  onSort?: (direction: "asc" | "desc" | null) => void;
  sortType?: "text" | "number" | "date";
  // Text filter
  textFilterValue?: string;
  onTextFilterChange?: (val: string) => void;
  textFilterPlaceholder?: string;
  // Options filter (multi-select)
  options?: { label: string; value: string; count?: number }[];
  selectedOptions?: string[];
  onOptionToggle?: (val: string) => void;
  // Reset
  onReset?: () => void;
}

export function TableColumnFilter({
  title,
  className,
  align = "left",
  sortDirection,
  onSort,
  sortType = "text",
  textFilterValue = "",
  onTextFilterChange,
  textFilterPlaceholder = "Saring data...",
  options,
  selectedOptions = [],
  onOptionToggle,
  onReset,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilter =
    Boolean(textFilterValue) ||
    selectedOptions.length > 0 ||
    Boolean(sortDirection);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1.5 py-1 px-1.5 -mx-1.5 rounded-lg text-xs font-bold transition select-none cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-muted/80",
            align === "center" && "mx-auto justify-center",
            align === "right" && "ml-auto justify-end text-right",
            hasActiveFilter
              ? "text-primary bg-primary/10 hover:bg-primary/20"
              : "text-foreground hover:text-foreground",
            className
          )}
          title={`Klik untuk filter & urutkan kolom ${title}`}
        >
          <span>{title}</span>
          <span className="inline-flex items-center">
            {sortDirection === "asc" ? (
              sortType === "number" ? (
                <ArrowUp10 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />
              )
            ) : sortDirection === "desc" ? (
              sortType === "number" ? (
                <ArrowDown01 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />
              )
            ) : hasActiveFilter ? (
              <Filter className="h-3 w-3 text-primary fill-primary/20" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
          {hasActiveFilter && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align === "right" ? "end" : align === "center" ? "center" : "start"}
        className="w-64 p-3 space-y-3 z-50 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Filter {title}</span>
          </div>
          {hasActiveFilter && onReset && (
            <button
              type="button"
              onClick={() => {
                onReset();
              }}
              className="text-[11px] text-destructive hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>

        {/* 1. Sorting */}
        {onSort && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Urutan
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={sortDirection === "asc" ? "default" : "outline"}
                onClick={() => onSort(sortDirection === "asc" ? null : "asc")}
                className="h-7 text-[11px] font-medium gap-1 px-2 rounded-lg"
              >
                {sortType === "number" ? (
                  <ArrowUp10 className="h-3 w-3" />
                ) : (
                  <ArrowUpAZ className="h-3 w-3" />
                )}
                <span>{sortType === "number" ? "Terkecil" : sortType === "date" ? "Terlama" : "A - Z"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant={sortDirection === "desc" ? "default" : "outline"}
                onClick={() => onSort(sortDirection === "desc" ? null : "desc")}
                className="h-7 text-[11px] font-medium gap-1 px-2 rounded-lg"
              >
                {sortType === "number" ? (
                  <ArrowDown01 className="h-3 w-3" />
                ) : (
                  <ArrowDownAZ className="h-3 w-3" />
                )}
                <span>{sortType === "number" ? "Terbesar" : sortType === "date" ? "Terbaru" : "Z - A"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* 2. Text Search Filter */}
        {onTextFilterChange && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Cari / Filter Teks
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={textFilterValue}
                onChange={(e) => onTextFilterChange(e.target.value)}
                placeholder={textFilterPlaceholder}
                className="h-8 pl-8 pr-7 text-xs rounded-lg"
              />
              {textFilterValue && (
                <button
                  type="button"
                  onClick={() => onTextFilterChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Multi-Select Options */}
        {options && options.length > 0 && onOptionToggle && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Pilihan Nilai
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {options.map((opt) => {
                const isSelected = selectedOptions.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onOptionToggle(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded-lg text-xs text-left transition cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={cn(
                          "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {typeof opt.count === "number" && (
                      <span className="text-[10px] text-muted-foreground font-mono ml-2">
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {hasActiveFilter ? "Filter aktif" : "Belum difilter"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="h-6 px-2 text-xs rounded-md"
          >
            Tutup
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
