import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfitReport } from "@/lib/actions/report.actions";
import { SalesReportClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesReportPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "owner" && user.role !== "staff_keuangan")) {
    redirect("/dashboard?access_denied=true");
  }

  const profitReport = await getProfitReport();

  return <SalesReportClient initialProfitReport={profitReport} />;
}
