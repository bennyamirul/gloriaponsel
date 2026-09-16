"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  AdminPerformanceItem,
  getAdminPerformanceByPeriod,
} from "@/lib/actions/dashboard.actions";

interface AdminPerformanceSectionProps {
  initialData: AdminPerformanceItem[];
  initialMonth: number;
  initialYear: number;
  initialPeriodName: string;
  availableYears: number[];
  isSuperAdmin: boolean;
}

const MONTH_NAMES = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export function AdminPerformanceSection({
  initialData,
  initialMonth,
  initialYear,
  availableYears,
  isSuperAdmin,
}: AdminPerformanceSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [data, setData] = useState<AdminPerformanceItem[]>(initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);

    startTransition(async () => {
      try {
        const res = await getAdminPerformanceByPeriod(newMonth, newYear);
        setData(res.adminPerformance);
        setIsCurrentMonth(res.isCurrentMonth);
      } catch (err) {
        console.error("Gagal memuat data kinerja admin kasir:", err);
      }
    });
  };

  const handleResetToCurrent = () => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    handlePeriodChange(curMonth, curYear);
  };

  const selectedMonthObj = MONTH_NAMES.find((m) => m.value === selectedMonth);
  const monthLabel = selectedMonthObj?.label || "";

  return (
    <div className="space-y-3">
      {/* Clean Header: Title & Period Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Kinerja Staff Marketing
          </h2>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        {/* Minimalist Dropdown Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border/70 rounded-lg px-2 py-0.5 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
            <select
              aria-label="Pilih Bulan"
              value={selectedMonth}
              disabled={isPending}
              onChange={(e) => handlePeriodChange(Number(e.target.value), selectedYear)}
              className="text-xs font-medium bg-transparent text-foreground py-1 pr-1 border-none focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m.value} value={m.value} className="bg-popover text-popover-foreground">
                  {m.label}
                </option>
              ))}
            </select>

            <span className="text-muted-foreground/40 mx-1">/</span>

            <select
              aria-label="Pilih Tahun"
              value={selectedYear}
              disabled={isPending}
              onChange={(e) => handlePeriodChange(selectedMonth, Number(e.target.value))}
              className="text-xs font-medium bg-transparent text-foreground py-1 border-none focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-popover text-popover-foreground">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {!isCurrentMonth && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleResetToCurrent}
              disabled={isPending}
              className="h-7 text-xs font-medium gap-1 text-primary hover:bg-primary/10 rounded-lg px-2"
              title="Kembali ke bulan berjalan"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Bulan Ini</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {data.length === 0 ? (
        <Card className="border border-dashed border-border/70 p-6 text-center rounded-xl bg-card">
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-1">
            <Users className="h-6 w-6 text-muted-foreground/50 mb-1" />
            <p className="text-xs font-semibold text-foreground">Tidak ada data transaksi kasir</p>
            <p className="text-[11px] text-muted-foreground">
              Periode {monthLabel} {selectedYear}
            </p>
            {isSuperAdmin && (
              <Button asChild size="sm" variant="outline" className="mt-2 text-xs font-medium h-7">
                <Link href="/users">Kelola Pengguna</Link>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-150 ${
            isPending ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          {data.map((admin, idx) => (
            <Card
              key={admin.id}
              className="border border-border/80 bg-card shadow-xs hover:shadow-sm hover:border-primary/40 transition-all rounded-xl overflow-hidden"
            >
              <CardContent className="p-5 space-y-4">
                {/* Header: Nama Admin & Badge Kasir */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate" title={admin.name}>
                        {admin.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {admin.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold shrink-0 bg-muted/40">
                    Kasir #{idx + 1}
                  </Badge>
                </div>

                {/* Metrik Utama: Total Transaksi */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    {isCurrentMonth ? "Total Transaksi Bulan Ini" : `Total Transaksi (${monthLabel})`}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-extrabold text-foreground tracking-tight">
                      {admin.transactionsMonthCount}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Transaksi</span>
                  </div>
                </div>

                {/* Metrik Finansial & Kontribusi */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total Penjualan:</span>
                    <span className="font-bold text-foreground">
                      {formatRupiah(admin.omzetMonth)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{isCurrentMonth ? "Transaksi Hari Ini:" : "Rata-rata Penjualan:"}</span>
                    <span className="font-semibold text-foreground">
                      {isCurrentMonth
                        ? `${admin.transactionsTodayCount} trx`
                        : admin.transactionsMonthCount > 0
                        ? formatRupiah(Math.round(admin.omzetMonth / admin.transactionsMonthCount))
                        : "Rp 0"}
                    </span>
                  </div>

                  {/* Progress Bar Kontribusi terhadap Penjualan Toko */}
                  <div className="space-y-1 pt-1.5 border-t border-border/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Kontribusi Transaksi:</span>
                      <span className="font-bold text-primary">
                        {admin.contributionPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${admin.contributionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
