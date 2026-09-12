import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/actions/category.actions";
import { CategoriesClient } from "@/components/master/categories-client";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    redirect("/dashboard?access_denied=true");
  }

  const categories = await getCategories();

  return <CategoriesClient initialCategories={categories} />;
}
