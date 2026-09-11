import { getBrands } from "@/lib/actions/brand.actions";
import { BrandsClient } from "@/components/master/brands-client";

export default async function BrandsPage() {
  const brands = await getBrands();

  return <BrandsClient initialBrands={brands} />;
}
