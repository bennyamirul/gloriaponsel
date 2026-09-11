"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ProductFormSheet,
  ProductItem,
} from "@/components/master/product-form-sheet";
import {
  deleteProduct,
  toggleProductStatus,
} from "@/lib/actions/product.actions";

interface Option {
  id: string;
  name: string;
}

interface ProductsClientProps {
  initialProducts: ProductItem[];
  total: number;
  categories: Option[];
  brands: Option[];
  isSuperAdmin: boolean;
}

export function ProductsClient({
  initialProducts,
  total,
  categories,
  brands,
  isSuperAdmin,
}: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Client-side filtering for fast interaction
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.variant && p.variant.toLowerCase().includes(search.toLowerCase()));

    const matchesCat =
      selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesBrand =
      selectedBrand === "all" || p.brandId === selectedBrand;

    return matchesSearch && matchesCat && matchesBrand;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod: ProductItem) => {
    setEditingProduct(prod);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (prod: ProductItem) => {
    const res = await toggleProductStatus(prod.id, prod.isActive);
    if (res.success) {
      toast.success(`Status produk "${prod.name}" berhasil diubah.`);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isActive: !p.isActive } : p))
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (prod: ProductItem) => {
    if (!confirm(`Nonaktifkan produk "${prod.name}"?`)) return;

    const res = await deleteProduct(prod.id);
    if (res.success) {
      toast.success(res.message || "Produk berhasil dinonaktifkan.");
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isActive: false } : p))
      );
    } else {
      toast.error(res.error || "Gagal menonaktifkan produk.");
    }
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) {
      return (
        <Badge variant="danger" className="gap-1 font-semibold">
          <XCircle className="h-3 w-3" />
          <span>Habis (0)</span>
        </Badge>
      );
    }
    if (stock <= minStock) {
      return (
        <Badge variant="warning" className="gap-1 font-semibold">
          <AlertTriangle className="h-3 w-3" />
          <span>Menipis ({stock})</span>
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="gap-1 font-semibold">
        <CheckCircle className="h-3 w-3" />
        <span>Aman ({stock})</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Data Produk
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola katalog handphone, aksesoris, harga, dan ketersediaan stok.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Produk</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama produk, SKU, atau varian..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Filter Category */}
            <div className="w-full md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Brand */}
            <div className="w-full md:w-48">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Semua Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori / Brand</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              {isSuperAdmin && (
                <TableHead className="text-right bg-indigo-50/40 text-indigo-900">
                  Harga Modal
                </TableHead>
              )}
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 8 : 7}
                  className="h-36 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/60" />
                    <span>Tidak ada produk yang sesuai kriteria pencarian.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((prod, idx) => (
                <TableRow key={prod.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>

                  {/* Thumbnail & Product Info */}
                  <TableCell className="max-w-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-border overflow-hidden">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Smartphone className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm leading-tight">
                          {prod.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[11px] font-mono text-slate-500">
                            {prod.sku}
                          </code>
                          {prod.variant && (
                            <span className="text-[11px] text-muted-foreground">
                              • {prod.variant}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Category & Brand */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-foreground">
                        {prod.brandName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {prod.categoryName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Selling Price */}
                  <TableCell className="text-right font-bold text-foreground">
                    {formatRupiah(prod.sellingPrice)}
                  </TableCell>

                  {/* Purchase Price (SUPER ADMIN ONLY) */}
                  {isSuperAdmin && (
                    <TableCell className="text-right font-semibold text-indigo-900 bg-indigo-50/20">
                      {prod.purchasePrice != null
                        ? formatRupiah(prod.purchasePrice)
                        : "—"}
                    </TableCell>
                  )}

                  {/* Stock Status */}
                  <TableCell className="text-center">
                    {getStockBadge(prod.stock, prod.minStock)}
                  </TableCell>

                  {/* Status Aktif */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleStatus(prod)}
                      className="cursor-pointer transition hover:opacity-80"
                      title="Klik untuk ubah status"
                    >
                      {prod.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Nonaktif</Badge>
                      )}
                    </button>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                        onClick={() => handleOpenEdit(prod)}
                        title="Edit Produk"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(prod)}
                        title="Nonaktifkan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View (<768px) */}
      <div className="grid grid-cols-1 gap-3.5 md:hidden">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Tidak ada produk yang cocok.
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((prod) => (
            <Card
              key={prod.id}
              className="border-border shadow-sm p-4 transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-border overflow-hidden">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Smartphone className="h-6 w-6 text-indigo-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug truncate">
                      {prod.name}
                    </h3>
                    <Badge
                      variant={prod.isActive ? "outline" : "destructive"}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {prod.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {prod.brandName} • {prod.categoryName}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-slate-600">
                      {prod.sku}
                    </code>
                    {prod.variant && (
                      <span className="text-[10px] text-slate-500 truncate">
                        {prod.variant}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price & Stock Section */}
              <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    Harga Jual
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    {formatRupiah(prod.sellingPrice)}
                  </span>
                  {isSuperAdmin && prod.purchasePrice != null && (
                    <span className="text-[10px] text-indigo-600 block">
                      Modal: {formatRupiah(prod.purchasePrice)}
                    </span>
                  )}
                </div>

                <div>{getStockBadge(prod.stock, prod.minStock)}</div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg font-medium"
                  onClick={() => handleOpenEdit(prod)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleDelete(prod)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Product Form in Sheet Drawer (Mobile & Desktop) */}
      <ProductFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingProduct={editingProduct}
        categories={categories}
        brands={brands}
        isSuperAdmin={isSuperAdmin}
        onSuccess={() => {
          // Refresh products
          window.location.reload();
        }}
      />
    </div>
  );
}
