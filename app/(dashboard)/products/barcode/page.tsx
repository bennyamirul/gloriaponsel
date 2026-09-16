import { redirect } from "next/navigation";
import { getCurrentUser, isRoleAllowed } from "@/lib/auth";
import { getAvailableStockForBarcodes } from "@/lib/actions/product.actions";
import { BarcodePrintClient } from "@/components/products/barcode-print-client";

export const metadata = {
  title: "Cetak Barcode & SKU - Gloria Ponsel",
  description: "Cetak stiker barcode IMEI dan SKU produk Gloria Ponsel",
};

export default async function BarcodePrintPage() {
  const user = await getCurrentUser();
  if (!user || !isRoleAllowed(user.role, ["owner", "staff_gudang"])) {
    redirect("/dashboard?access_denied=true");
  }

  const stockItems = await getAvailableStockForBarcodes();

  return <BarcodePrintClient initialItems={stockItems as any} />;
}
