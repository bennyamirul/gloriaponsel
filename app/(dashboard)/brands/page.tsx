import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBrands } from "@/lib/actions/brand.actions";
import { BrandsClient } from "@/components/master/brands-client";

export default async function BrandsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    redirect("/dashboard?access_denied=true");
  }

  const brands = await getBrands();

  return <BrandsClient initialBrands={brands} />;
}
