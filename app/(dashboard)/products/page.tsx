import { redirect } from "next/navigation";
import { getCurrentUser, isRoleAllowed } from "@/lib/auth";
import { getProducts } from "@/lib/actions/product.actions";
import { ProductsClient } from "@/components/master/products-client";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user || !isRoleAllowed(user.role, ["owner", "staff_gudang"])) {
    redirect("/dashboard?access_denied=true");
  }

  const productsData = await getProducts({ limit: 100 });

  return (
    <ProductsClient
      initialProducts={productsData.products}
      total={productsData.total}
      isSuperAdmin={productsData.isSuperAdmin}
      currentUserRole={productsData.currentUserRole}
    />
  );
}
