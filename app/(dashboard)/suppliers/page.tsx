import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/supplier.actions";
import { SuppliersClient } from "@/components/master/suppliers-client";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    redirect("/dashboard?access_denied=true");
  }

  const suppliers = await getSuppliers();

  return <SuppliersClient initialSuppliers={suppliers} />;
}
