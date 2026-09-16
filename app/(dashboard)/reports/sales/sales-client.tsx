"use client";

import { useState, useTransition } from "react";
import { ProfitReportView } from "@/components/reports/profit-report-view";
import { getProfitReport } from "@/lib/actions/report.actions";
import { toast } from "sonner";

interface SalesReportClientProps {
  initialProfitReport: any;
}

export function SalesReportClient({ initialProfitReport }: SalesReportClientProps) {
  const [profitData, setProfitData] = useState(initialProfitReport);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await getProfitReport();
        setProfitData(res);
      } catch (err: any) {
        toast.error("Gagal menyinkronkan data terbaru.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <ProfitReportView
        data={profitData}
        onCommissionUpdated={handleRefresh}
      />
    </div>
  );
}
