import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlyFinancialReport } from "@/lib/actions/report.actions";
import { FinancialReportClient } from "./financial-client";

export const dynamic = "force-dynamic";

export default async function FinancialReportPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "owner" && user.role !== "staff_keuangan")) {
    redirect("/dashboard?access_denied=true");
  }

  const now = new Date();
  const initialMonth = now.getMonth() + 1;
  const initialYear = now.getFullYear();

  const monthlyReport = await getMonthlyFinancialReport(initialMonth, initialYear);

  return (
    <FinancialReportClient
      initialReport={monthlyReport}
      initialMonth={initialMonth}
      initialYear={initialYear}
    />
  );
}
