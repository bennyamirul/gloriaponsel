import { getCurrentUser } from "@/lib/auth";
import { getSalesLifecycleData } from "@/lib/actions/sale.actions";
import { SalesLifecycleClient } from "@/components/sales/sales-lifecycle-client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [user, lifecycleData] = await Promise.all([
    getCurrentUser(),
    getSalesLifecycleData(),
  ]);

  return (
    <SalesLifecycleClient
      initialReadyItems={lifecycleData.readyItems}
      initialWarrantyItems={lifecycleData.warrantyItems}
      initialSoldItems={lifecycleData.soldItems}
      userRole={user?.role}
    />
  );
}


