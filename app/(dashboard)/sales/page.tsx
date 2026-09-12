import { getProducts } from "@/lib/actions/product.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getSales, getSalesLifecycleData } from "@/lib/actions/sale.actions";
import { SalesTabsClient } from "@/components/sales/sales-tabs-client";

export default async function SalesPage() {
  const [productsData, customers, salesData, lifecycleData] = await Promise.all([
    getProducts({ limit: 100 }),
    getCustomers(),
    getSales({ limit: 100 }),
    getSalesLifecycleData(),
  ]);

  return (
    <SalesTabsClient
      products={productsData.products}
      customers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
      }))}
      initialSales={salesData.sales as any}
      currentUserId={salesData.currentUserId}
      currentUserRole={salesData.currentUserRole}
      lifecycleData={lifecycleData}
    />
  );
}
