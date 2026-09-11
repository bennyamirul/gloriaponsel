import { getProducts } from "@/lib/actions/product.actions";
import { getCategories } from "@/lib/actions/category.actions";
import { getBrands } from "@/lib/actions/brand.actions";
import { ProductsClient } from "@/components/master/products-client";

export default async function ProductsPage() {
  const [productsData, categories, brands] = await Promise.all([
    getProducts({ limit: 100 }),
    getCategories(),
    getBrands(),
  ]);

  return (
    <ProductsClient
      initialProducts={productsData.products}
      total={productsData.total}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      isSuperAdmin={productsData.isSuperAdmin}
    />
  );
}
