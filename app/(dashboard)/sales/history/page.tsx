import { getSales, getAvailableExchangeProducts } from "@/lib/actions/sale.actions";
import { getStoreSettings } from "@/lib/actions/setting.actions";
import { requireAuth } from "@/lib/auth";
import { SalesInvoicePrintClient } from "@/components/sales/sales-invoice-print-client";

export const dynamic = "force-dynamic";

export default async function SalesHistoryPage() {
  const [session, salesData, storeSettings, readyProducts] = await Promise.all([
    requireAuth(),
    getSales({ limit: 100 }),
    getStoreSettings(),
    getAvailableExchangeProducts(),
  ]);

  return (
    <SalesInvoicePrintClient
      sales={salesData.sales as any}
      storeSettings={storeSettings}
      readyProducts={readyProducts}
      currentUserRole={session.role}
    />
  );
}
