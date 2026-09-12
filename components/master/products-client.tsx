"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Smartphone,
  Headphones,
  Printer,
  Calendar,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  updateProductStatus,
} from "@/lib/actions/product.actions";

interface ProductsClientProps {
  initialProducts: ProductItem[];
  total: number;
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  isSuperAdmin: boolean;
}

export function ProductsClient({
  initialProducts,
  isSuperAdmin,
}: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<"phone" | "accessory">("phone");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "retur" | "sold">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Status edit modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [productToChangeStatus, setProductToChangeStatus] = useState<ProductItem | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<"available" | "retur" | "sold">("available");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleOpenStatusModal = (prod: ProductItem) => {
    setProductToChangeStatus(prod);
    setSelectedNewStatus(((prod.status as any) || "available") as "available" | "retur" | "sold");
    setNewPrice(prod.sellingPrice);
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!productToChangeStatus) return;
    try {
      setIsUpdatingStatus(true);
      const res = await updateProductStatus(
        productToChangeStatus.id,
        selectedNewStatus,
        newPrice !== productToChangeStatus.sellingPrice ? newPrice : undefined
      );

      if (res.success) {
        toast.success(res.message);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToChangeStatus.id
              ? { ...p, status: selectedNewStatus, sellingPrice: newPrice || p.sellingPrice }
              : p
          )
        );
        setStatusModalOpen(false);
        setProductToChangeStatus(null);
      } else {
        toast.error(res.error || "Gagal mengubah status.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter products by tab, search, and status
  const activeProducts = products.filter((p) => p.isActive);

  const filteredProducts = activeProducts.filter((p) => {
    const isPhone = (p.productType || "phone") === "phone";
    if (activeTab === "phone" && !isPhone) return false;
    if (activeTab === "accessory" && isPhone) return false;

    if (activeTab === "phone" && statusFilter !== "all") {
      if (p.status !== statusFilter) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();

    return (
      p.name.toLowerCase().includes(q) ||
      (p.imei && p.imei.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.capacity && p.capacity.toLowerCase().includes(q)) ||
      (p.color && p.color.toLowerCase().includes(q)) ||
      (p.brandName && p.brandName.toLowerCase().includes(q)) ||
      (p.retailSupplier && p.retailSupplier.toLowerCase().includes(q))
    );
  });

  const phoneCount = activeProducts.filter((p) => (p.productType || "phone") === "phone").length;
  const accessoryCount = activeProducts.filter((p) => p.productType === "accessory").length;
  const phoneAvailableCount = activeProducts.filter(
    (p) => (p.productType || "phone") === "phone" && p.status === "available"
  ).length;
  const phoneReturCount = activeProducts.filter(
    (p) => (p.productType || "phone") === "phone" && p.status === "retur"
  ).length;
  const phoneSoldCount = activeProducts.filter(
    (p) => (p.productType || "phone") === "phone" && p.status === "sold"
  ).length;

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
      toast.success(`Status aktif produk "${prod.name}" berhasil diubah.`);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isActive: !p.isActive } : p))
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (prod: ProductItem) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus produk "${prod.name}"? Produk tidak akan ditampilkan lagi.`
      )
    ) {
      return;
    }

    const res = await deleteProduct(prod.id);
    if (res.success) {
      toast.success(res.message || "Produk berhasil dihapus.");
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } else {
      toast.error(res.error || "Gagal menghapus produk.");
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Data Produk
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Link ke Cetak Barcode SKU */}
          <Link href="/products/barcode">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Barcode SKU</span>
            </Button>
          </Link>

          {/* Tombol Tambah Produk */}
          <Button
            onClick={handleOpenAdd}
            className="bg-primary text-primary-foreground font-semibold rounded-xl gap-2 shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === "phone" ? "Tambah Unit HP" : "Tambah Aksesoris"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation: Phone vs Aksesoris */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("phone")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === "phone"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Phone ({phoneCount})</span>
            {phoneAvailableCount > 0 && (
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-mono">
                {phoneAvailableCount} Ready
              </span>
            )}
            {phoneReturCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-mono flex items-center gap-0.5">
                <RotateCcw className="h-2.5 w-2.5" />
                <span>{phoneReturCount} Retur</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("accessory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === "accessory"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Headphones className="h-4 w-4" />
            <span>Aksesoris ({accessoryCount})</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "phone" && (
            <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border border-border text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => setStatusFilter("available")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === "available"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tersedia ({phoneAvailableCount})
              </button>
              <button
                onClick={() => setStatusFilter("retur")}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  statusFilter === "retur"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retur ({phoneReturCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter("sold")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === "sold"
                    ? "bg-zinc-700 text-white shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Terjual ({phoneSoldCount})
              </button>
            </div>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "phone"
                  ? "Cari IMEI, seri HP, supplier..."
                  : "Cari nama, SKU aksesoris..."
              }
              className="pl-9 text-xs rounded-xl h-9"
            />
          </div>
        </div>
      </div>

      {/* TABEL 1: KHUSUS TAB PHONE */}
      {activeTab === "phone" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Tgl Masuk Unit</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">IMEI</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[160px]">Nama Produk</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Kapasitas</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Warna</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Kelengkapan</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Retail (Supplier)</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                    HPP (Modal)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                    Harga Jual
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      <Smartphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm">Belum ada unit handphone terdaftar</p>
                      <p className="text-xs">Klik &quot;Tambah Unit HP&quot; untuk menginput data unit beserta scan IMEI.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors text-xs">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      {/* Tgl Masuk Unit */}
                      <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary/70" />
                          <span>{formatDate(p.entryDate)}</span>
                        </div>
                      </TableCell>

                      {/* IMEI */}
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {p.imei || p.sku}
                        </span>
                      </TableCell>

                      {/* Nama Produk */}
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-xs font-bold leading-snug">{p.name}</p>
                            {p.brandName && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.brandName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Kapasitas */}
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          {p.capacity || "-"}
                        </Badge>
                      </TableCell>

                      {/* Warna */}
                      <TableCell className="whitespace-nowrap text-muted-foreground font-medium">
                        {p.color || "-"}
                      </TableCell>

                      {/* Kelengkapan */}
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="text-xs">{p.completeness || "Fullset"}</span>
                      </TableCell>

                      {/* Retail (Supplier) */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Building2 className="h-3 w-3 text-muted-foreground/60" />
                          <span>{p.retailSupplier || "-"}</span>
                        </div>
                      </TableCell>

                      {/* HPP (Harga Modal) */}
                      <TableCell className="text-right whitespace-nowrap font-mono text-xs">
                        {isSuperAdmin ? (
                          p.purchasePrice ? (
                            formatRupiah(p.purchasePrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        ) : (
                          <span className="text-muted-foreground tracking-widest">••••••</span>
                        )}
                      </TableCell>

                      {/* Harga Jual */}
                      <TableCell className="text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatRupiah(p.sellingPrice)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(p)}
                          className="focus:outline-none group/badge transition transform hover:scale-105"
                          title="Klik untuk mengubah status produk"
                        >
                          {p.status === "sold" ? (
                            <Badge variant="secondary" className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] gap-1 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700">
                              <span>Terjual</span>
                              <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                            </Badge>
                          ) : p.status === "retur" ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold gap-1 cursor-pointer hover:bg-amber-500/25">
                              <RotateCcw className="h-2.5 w-2.5" />
                              <span>Retur</span>
                              <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                            </Badge>
                          ) : (
                            <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] gap-1 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900">
                              <span>Tersedia</span>
                              <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TABEL 2: KHUSUS TAB AKSESORIS */}
      {activeTab === "accessory" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Tgl Masuk</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">SKU / Barcode</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[180px]">Nama Produk</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Jenis Aksesoris</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Retail (Supplier)</TableHead>
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">Stok</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">HPP (Modal)</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Harga Jual</TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <Headphones className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm">Belum ada aksesoris terdaftar</p>
                      <p className="text-xs">Klik &quot;Tambah Aksesoris&quot; untuk mendaftarkan charger, casing, tempered glass, dll.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors text-xs">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      {/* Tgl Masuk */}
                      <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary/70" />
                          <span>{formatDate(p.entryDate)}</span>
                        </div>
                      </TableCell>

                      {/* SKU / Barcode */}
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                          {p.sku}
                        </span>
                      </TableCell>

                      {/* Nama Produk */}
                      <TableCell className="font-semibold text-foreground">
                        <p className="text-xs font-bold leading-snug">{p.name}</p>
                        {p.brandName && (
                          <span className="text-[10px] text-muted-foreground">{p.brandName}</span>
                        )}
                      </TableCell>

                      {/* Jenis Aksesoris */}
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-[11px]">
                          {p.categoryName || "Aksesoris"}
                        </Badge>
                      </TableCell>

                      {/* Retail (Supplier) */}
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {p.retailSupplier || "-"}
                      </TableCell>

                      {/* Stok */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={p.stock <= p.minStock ? "warning" : "success"}
                          className="font-mono font-bold text-xs"
                        >
                          {p.stock} Pcs
                        </Badge>
                      </TableCell>

                      {/* HPP (Harga Modal) */}
                      <TableCell className="text-right whitespace-nowrap font-mono text-xs">
                        {isSuperAdmin ? (
                          p.purchasePrice ? (
                            formatRupiah(p.purchasePrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        ) : (
                          <span className="text-muted-foreground tracking-widest">••••••</span>
                        )}
                      </TableCell>

                      {/* Harga Jual */}
                      <TableCell className="text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatRupiah(p.sellingPrice)}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Sheet Form */}
      <ProductFormSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingProduct(null);
          }
        }}
        editingProduct={editingProduct}
        isSuperAdmin={isSuperAdmin}
        initialType={activeTab}
        onSuccess={() => {
          // Re-trigger page refresh or state update
          window.location.reload();
        }}
      />

      {/* MODAL UBAH STATUS PRODUK */}
      <Dialog
        open={statusModalOpen}
        onOpenChange={(open) => {
          if (!isUpdatingStatus) {
            setStatusModalOpen(open);
            if (!open) setProductToChangeStatus(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <span className="block">Ubah Status Produk</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Perbarui status unit atau sesuaikan harga jual
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {productToChangeStatus && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5 font-mono">
                <div>
                  <p className="font-bold text-foreground text-sm font-sans">{productToChangeStatus.name}</p>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    {productToChangeStatus.brandName} • {productToChangeStatus.capacity || ""} {productToChangeStatus.color || ""}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-sans">IMEI / Barcode:</span>
                  <span className="font-semibold text-primary">{productToChangeStatus.imei || productToChangeStatus.sku}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Pilih Status Unit:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("available")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      selectedNewStatus === "available"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                        : "border-border bg-card text-muted-foreground hover:border-emerald-300"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Tersedia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("retur")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      selectedNewStatus === "retur"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                        : "border-border bg-card text-muted-foreground hover:border-amber-300"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                    <span>Retur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("sold")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      selectedNewStatus === "sold"
                        ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ring-2 ring-zinc-500/20"
                        : "border-border bg-card text-muted-foreground hover:border-zinc-400"
                    }`}
                  >
                    <Tag className="h-4 w-4 text-zinc-500" />
                    <span>Terjual</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Harga Jual Unit (Rp):</label>
                <CurrencyInput
                  value={newPrice}
                  onValueChange={(val) => setNewPrice(val)}
                  placeholder="0"
                />
                <p className="text-[10px] text-muted-foreground">
                  Sesuaikan harga jual bila unit ini berstatus retur / second.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdatingStatus}
                  onClick={() => setStatusModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleSaveStatus}
                  className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold gap-1.5"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Status</span>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
