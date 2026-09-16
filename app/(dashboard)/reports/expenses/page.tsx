import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDailyExpenses } from "@/lib/actions/report.actions";
import { ExpensesReportClient } from "./expenses-client";

export const dynamic = "force-dynamic";

export default async function DailyExpensesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "owner" && user.role !== "staff_keuangan")) {
    redirect("/dashboard?access_denied=true");
  }

  const dailyExpenses = await getDailyExpenses();

  return <ExpensesReportClient initialDailyExpenses={dailyExpenses} />;
}
