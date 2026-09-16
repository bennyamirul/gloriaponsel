"use client";

import { useState, useTransition } from "react";
import {
  TrendingUp,
  Receipt,
  Calendar,
  RefreshCw,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProfitReport,
  getDailyExpenses,
  getMonthlyFinancialReport,
} from "@/lib/actions/report.actions";
import { ProfitReportView } from "./profit-report-view";
import { DailyExpenseView } from "./daily-expense-view";
import { FinancialReportView } from "./financial-report-view";

interface ReportsClientProps {
  userRole: string;
  initialProfitReport: any;
  initialDailyExpenses: any;
  initialMonthlyFinancialReport: any;
  initialMonth: number;
  initialYear: number;
}

export function ReportsClient({
  userRole,
  initialProfitReport,
  initialDailyExpenses,
  initialMonthlyFinancialReport,
  initialMonth,
  initialYear,
}: ReportsClientProps) {
  const isSuperAdmin = userRole === "super_admin" || userRole === "owner";

  // Active Tab: 1 = Laporan Penjualan (Laba Rugi), 2 = Pengeluaran Harian, 3 = Laporan Keuangan
  const [activeTab, setActiveTab] = useState<"sales" | "daily-expenses" | "financial">(
    "sales"
  );

  // Date Range State for Tab 1 & Tab 2
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [datePreset, setDatePreset] = useState<
    "today" | "7days" | "30days" | "this_month" | "custom"
  >("this_month");

  // Month & Year State for Tab 3
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Data states
  const [profitData, setProfitData] = useState(initialProfitReport);
  const [dailyExpensesData, setDailyExpensesData] = useState(initialDailyExpenses);
  const [financialData, setFinancialData] = useState(initialMonthlyFinancialReport);

  const [isPending, startTransition] = useTransition();

  // Handle Preset Date Range Selection
  const applyPreset = (preset: "today" | "7days" | "30days" | "this_month") => {
    const current = new Date();
    const end = current.toISOString().slice(0, 10);
    let start = end;

    if (preset === "today") {
      start = end;
    } else if (preset === "7days") {
      const d = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 6);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "30days") {
      const d = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 29);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "this_month") {
      start = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().slice(0, 10);
    }

    setDatePreset(preset);
    setStartDate(start);
    setEndDate(end);

    loadDateFilteredReports(start, end);
  };

  // Fetch reports when dates change for Tab 1 and Tab 2
  const loadDateFilteredReports = (start: string, end: string) => {
    startTransition(async () => {
      try {
        if (activeTab === "sales") {
          const res = await getProfitReport({ startDate: start, endDate: end });
          setProfitData(res);
        } else if (activeTab === "daily-expenses") {
          const res = await getDailyExpenses({ startDate: start, endDate: end });
          setDailyExpensesData(res);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat data laporan.");
      }
    });
  };

  // Fetch financial report when month/year changes for Tab 3
  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    startTransition(async () => {
      try {
        const res = await getMonthlyFinancialReport(month, year);
        setFinancialData(res);
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat laporan keuangan bulanan.");
      }
    });
  };

  // Refresh current active tab
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        if (activeTab === "sales") {
          const res = await getProfitReport({ startDate, endDate });
          setProfitData(res);
        } else if (activeTab === "daily-expenses") {
          const res = await getDailyExpenses({ startDate, endDate });
          setDailyExpensesData(res);
        } else if (activeTab === "financial") {
          const res = await getMonthlyFinancialReport(selectedMonth, selectedYear);
          setFinancialData(res);
        }
      } catch (err: any) {
        toast.error("Gagal menyinkronkan data terbaru.");
      }
    });
  };

  // Tab switch handler
  const handleTabChange = (tab: "sales" | "daily-expenses" | "financial") => {
    setActiveTab(tab);
    if (tab === "sales" && !profitData) {
      loadDateFilteredReports(startDate, endDate);
    } else if (tab === "daily-expenses" && !dailyExpensesData) {
      loadDateFilteredReports(startDate, endDate);
    } else if (tab === "financial" && !financialData) {
      handleMonthYearChange(selectedMonth, selectedYear);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Tabs Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Laporan Penjualan */}
          <Button
            variant={activeTab === "sales" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("sales")}
            className="rounded-xl font-semibold text-xs"
          >
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Laporan Penjualan
          </Button>

          {/* Tab 2: Pengeluaran Harian */}
          <Button
            variant={activeTab === "daily-expenses" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("daily-expenses")}
            className="rounded-xl font-semibold text-xs"
          >
            <Wallet className="mr-1.5 h-4 w-4" />
            Pengeluaran Harian
          </Button>

          {/* Tab 3: Laporan Keuangan */}
          <Button
            variant={activeTab === "financial" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTabChange("financial")}
            className="rounded-xl font-semibold text-xs"
          >
            <Receipt className="mr-1.5 h-4 w-4" />
            Laporan Keuangan
          </Button>
        </div>

        {/* Global Date Filter for Tab 1 & Tab 2 */}
        {activeTab !== "financial" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex rounded-xl bg-muted/60 p-1">
              <button
                onClick={() => applyPreset("today")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "today"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => applyPreset("7days")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "7days"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => applyPreset("this_month")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                  datePreset === "this_month"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Range Picker */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 text-[11px] w-32 bg-white"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 text-[11px] w-32 bg-white"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadDateFilteredReports(startDate, endDate)}
                disabled={isPending}
                className="h-8 text-xs font-semibold px-2.5"
                title="Terapkan Rentang Tanggal"
              >
                {isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarDays className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isPending && (
        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground animate-pulse">
          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin text-primary" />
          Memuat data laporan terbaru...
        </div>
      )}

      {/* Tab 1: Laporan Penjualan (Laba Rugi + Komisi) */}
      {activeTab === "sales" && profitData && (
        <ProfitReportView
          data={profitData}
          onCommissionUpdated={handleRefresh}
        />
      )}

      {/* Tab 2: Pengeluaran Harian */}
      {activeTab === "daily-expenses" && dailyExpensesData && (
        <DailyExpenseView
          data={dailyExpensesData}
          onRefresh={handleRefresh}
        />
      )}

      {/* Tab 3: Laporan Keuangan Bulanan */}
      {activeTab === "financial" && financialData && (
        <FinancialReportView
          data={financialData}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthYearChange={handleMonthYearChange}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
