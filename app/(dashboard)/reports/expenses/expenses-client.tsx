"use client";

import { useState, useTransition } from "react";
import { DailyExpenseView } from "@/components/reports/daily-expense-view";
import { getDailyExpenses } from "@/lib/actions/report.actions";
import { toast } from "sonner";

interface ExpensesReportClientProps {
  initialDailyExpenses: any;
}

export function ExpensesReportClient({ initialDailyExpenses }: ExpensesReportClientProps) {
  const [dailyExpensesData, setDailyExpensesData] = useState(initialDailyExpenses);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = (startDate?: string, endDate?: string) => {
    startTransition(async () => {
      try {
        const res = await getDailyExpenses(
          startDate || endDate ? { startDate, endDate } : undefined
        );
        setDailyExpensesData(res);
      } catch (err: any) {
        toast.error("Gagal menyinkronkan data terbaru.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <DailyExpenseView
        data={dailyExpensesData}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
