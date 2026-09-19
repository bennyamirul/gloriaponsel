import { redirect } from "next/navigation";
import { getCurrentUser, isRoleAllowed } from "@/lib/auth";
import { getProducts } from "@/lib/actions/product.actions";
import { getActiveCatalogs } from "@/lib/actions/catalog.actions";
import { ProductsClient } from "@/components/master/products-client";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (
    !user ||
    !isRoleAllowed(user.role, [
      "owner",
      "staff_gudang",
      "admin_kasir",
      "admin",
    ])
  ) {
    redirect("/dashboard?access_denied=true");
  }

  const [productsData, catalogs] = await Promise.all([
    getProducts({ limit: 100 }),
    getActiveCatalogs(),
  ]);

  return (
    <ProductsClient
      initialProducts={productsData.products}
      total={productsData.total}
      catalogs={catalogs}
      isSuperAdmin={productsData.isSuperAdmin}
      currentUserRole={productsData.currentUserRole}
      currentUserId={user.id}
    />
  );
}
