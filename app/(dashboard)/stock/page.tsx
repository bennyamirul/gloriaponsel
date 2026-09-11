import { getProducts } from "@/lib/actions/product.actions";
import { getSuppliers } from "@/lib/actions/supplier.actions";
import { getStockMovements, getLowStockProducts } from "@/lib/actions/stock.actions";
import { StockClient } from "@/components/stock/stock-client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [productsRes, suppliers, movementsRes, lowStockProducts] = await Promise.all([
    getProducts({ limit: 200 }),
    getSuppliers(),
    getStockMovements({ limit: 50 }),
    getLowStockProducts(),
  ]);

  const productOptions = productsRes.products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    variant: p.variant,
    stock: p.stock,
    minStock: p.minStock,
    purchasePrice: p.purchasePrice,
    brandName: p.brandName,
    categoryName: p.categoryName,
  }));

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Manajemen Stok & Mutasi
        </h2>
        <p className="text-sm text-muted-foreground">
          Riwayat pergerakan stok, penerimaan barang supplier, stok opname, kartu stok per produk, dan peringatan stok menipis.
        </p>
      </div>

      <StockClient
        products={productOptions}
        suppliers={supplierOptions}
        initialMovements={movementsRes.movements}
        lowStockProducts={lowStockProducts}
      />
    </div>
  );
}

