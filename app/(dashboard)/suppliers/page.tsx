import { getSuppliers } from "@/lib/actions/supplier.actions";
import { SuppliersClient } from "@/components/master/suppliers-client";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return <SuppliersClient initialSuppliers={suppliers} />;
}
