"use client";

import { useState, useTransition } from "react";
import { FinancialReportView } from "@/components/reports/financial-report-view";
import { getMonthlyFinancialReport } from "@/lib/actions/report.actions";
import { toast } from "sonner";

interface FinancialReportClientProps {
  initialReport: any;
  initialMonth: number;
  initialYear: number;
}

export function FinancialReportClient({
  initialReport,
  initialMonth,
  initialYear,
}: FinancialReportClientProps) {
  const [financialData, setFinancialData] = useState(initialReport);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isPending, startTransition] = useTransition();

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

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await getMonthlyFinancialReport(selectedMonth, selectedYear);
        setFinancialData(res);
      } catch (err: any) {
        toast.error("Gagal menyinkronkan data terbaru.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <FinancialReportView
        data={financialData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthYearChange={handleMonthYearChange}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
