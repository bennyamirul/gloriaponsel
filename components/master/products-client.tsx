"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  Printer,
  Calendar,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  RotateCcw,
  ArrowLeftRight,
  Check,
  Loader2,
  Boxes,
  FilterX,
  ChevronDown,
  X,
  PackageCheck,
  Clock,
  CheckCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { TableColumnFilter } from "@/components/ui/table-column-filter";
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
import { CatalogItem } from "@/lib/actions/catalog.actions";
import {
  deleteProduct,
  toggleProductStatus,
  updateProductStatus,
  approveProduct,
  rejectProduct,
} from "@/lib/actions/product.actions";
import {
  ExchangeDetailDialog,
  parseExchangeData,
  ExchangeDetailData,
} from "@/components/sales/exchange-detail-dialog";

const DEFAULT_CATALOGS: CatalogItem[] = [
  { id: "cat-phone", name: "Handphone", code: "phone", hasImei: true, displayOrder: 1, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-tablet", name: "Tablet", code: "tablet", hasImei: true, displayOrder: 2, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-smartwatch", name: "SmartWatch", code: "smartwatch", hasImei: true, displayOrder: 3, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-accessory", name: "Aksesoris", code: "accessory", hasImei: false, displayOrder: 4, description: "", isActive: true, createdAt: "", updatedAt: "" },
];

function getCategoryIcon(code: string) {
  const c = code.toLowerCase();
  if (c.includes("phone") || c.includes("hp")) return <Smartphone className="h-3 w-3" />;
  if (c.includes("tablet") || c.includes("pad")) return <Tablet className="h-3 w-3" />;
  if (c.includes("watch")) return <Watch className="h-3 w-3" />;
  if (c.includes("accessory") || c.includes("aksesoris")) return <Headphones className="h-3 w-3" />;
  return <Tag className="h-3 w-3" />;
}

interface ProductsClientProps {
  initialProducts: ProductItem[];
  total: number;
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  catalogs?: CatalogItem[];
  isSuperAdmin: boolean;
  currentUserRole?: string;
  currentUserId?: string;
}

export function ProductsClient({
  initialProducts,
  catalogs,
  isSuperAdmin,
  currentUserRole,
  currentUserId,
}: ProductsClientProps) {
  const isWarehouse = currentUserRole === "staff_gudang";
  const isCashier =
    currentUserRole === "admin_kasir" || currentUserRole === "admin";
  const isOwner =
    isSuperAdmin ||
    currentUserRole === "owner" ||
    currentUserRole === "super_admin";

  const activeCatalogs = useMemo(() => {
    return catalogs && catalogs.length > 0 ? catalogs : DEFAULT_CATALOGS;
  }, [catalogs]);

  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ready" | "sold" | "menunggu_persetujuan" | "ditolak"
  >("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );

  // Modal Review & Persetujuan Produk oleh Owner
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [productToApprove, setProductToApprove] = useState<ProductItem | null>(
    null,
  );
  const [approvalPurchasePrice, setApprovalPurchasePrice] = useState<number>(0);
  const [approvalSellingPrice, setApprovalSellingPrice] = useState<number>(0);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Modal Tolak Produk oleh Owner dengan Alasan
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [productToReject, setProductToReject] = useState<ProductItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Column Filters & Sorting
  const [sortConfig, setSortConfig] = useState<{
    column:
      | "entryDate"
      | "imei"
      | "name"
      | "grade"
      | "capacity"
      | "color"
      | "completeness"
      | "retailSupplier"
      | "purchasePrice"
      | "sellingPrice"
      | "stock"
      | null;
    direction: "asc" | "desc" | null;
  }>({ column: "entryDate", direction: "desc" });

  const [colFilters, setColFilters] = useState<{
    imei: string;
    name: string;
    grade: string;
    capacity: string;
    color: string;
    completeness: string;
    retailSupplier: string;
    status: string[];
  }>({
    imei: "",
    name: "",
    grade: "",
    capacity: "",
    color: "",
    completeness: "",
    retailSupplier: "",
    status: [],
  });

  // Status edit modal state (Ready dan Terjual saja)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [productToChangeStatus, setProductToChangeStatus] =
    useState<ProductItem | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<
    "available" | "sold"
  >("available");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Detail Tukar Unit dialog state
  const [exchangeDetail, setExchangeDetail] =
    useState<ExchangeDetailData | null>(null);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);

  const handleOpenExchangeDetail = (prod: ProductItem) => {
    const parsed = parseExchangeData(prod.description, {
      customerName: "Pelanggan",
      exchangedAt: prod.entryDate || prod.createdAt,
      oldProduct: {
        name: prod.name,
        imei: prod.imei || prod.sku,
        price: prod.sellingPrice,
      },
      reason: prod.description || "Unit Masuk Penukaran Pelanggan",
    });
    setExchangeDetail(parsed);
    setIsExchangeDialogOpen(true);
  };

  const handleOpenStatusModal = (prod: ProductItem) => {
    setProductToChangeStatus(prod);
    const rawSt = (prod.status as any) || "available";
    const mappedSt: "available" | "sold" = rawSt === "sold" ? "sold" : "available";
    setSelectedNewStatus(mappedSt);
    setNewPrice(prod.sellingPrice);
    setStatusModalOpen(true);
  };

  const handleOpenApprovalModal = (prod: ProductItem) => {
    setProductToApprove(prod);
    setApprovalPurchasePrice(prod.purchasePrice || 0);
    setApprovalSellingPrice(prod.sellingPrice || 0);
    setApprovalModalOpen(true);
  };

  const handleApproveProduct = async () => {
    if (!productToApprove) return;
    if (approvalPurchasePrice <= 0) {
      toast.error("HPP (Harga Modal) harus lebih dari 0.");
      return;
    }
    if (approvalSellingPrice <= 0) {
      toast.error("Harga Jual harus lebih dari 0.");
      return;
    }

    try {
      setIsProcessingApproval(true);
      const res = await approveProduct(productToApprove.id, {
        grade: productToApprove.grade || undefined,
        purchasePrice: approvalPurchasePrice,
        sellingPrice: approvalSellingPrice,
      });

      if (res.success) {
        toast.success(res.message);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToApprove.id
              ? {
                  ...p,
                  status: "available",
                  purchasePrice: approvalPurchasePrice,
                  sellingPrice: approvalSellingPrice,
                }
              : p,
          ),
        );
        setApprovalModalOpen(false);
        setProductToApprove(null);
      } else {
        toast.error(res.error || "Gagal menyetujui produk.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan.");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleOpenRejectModal = (targetProduct?: ProductItem) => {
    const prod = targetProduct || productToApprove;
    if (!prod) return;
    setProductToReject(prod);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!productToReject) return;
    if (!rejectionReason.trim()) {
      toast.error("Silakan masukkan alasan penolakan.");
      return;
    }

    try {
      setIsProcessingApproval(true);
      const res = await rejectProduct(productToReject.id, rejectionReason.trim());
      if (res.success) {
        toast.success(res.message);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToReject.id
              ? {
                  ...p,
                  status: "ditolak",
                  rejectionReason: rejectionReason.trim(),
                }
              : p,
          ),
        );
        setRejectModalOpen(false);
        setProductToReject(null);
        setRejectionReason("");
        setApprovalModalOpen(false);
        setProductToApprove(null);
      } else {
        toast.error(res.error || "Gagal menolak produk.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan.");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!productToChangeStatus) return;
    try {
      setIsUpdatingStatus(true);
      const res = await updateProductStatus(
        productToChangeStatus.id,
        selectedNewStatus,
        newPrice !== productToChangeStatus.sellingPrice ? newPrice : undefined,
      );

      if (res.success) {
        toast.success(res.message);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToChangeStatus.id
              ? {
                  ...p,
                  status: selectedNewStatus,
                  sellingPrice: newPrice || p.sellingPrice,
                }
              : p,
          ),
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

  // Filter products by status filter, type, search, and column filters
  const activeProducts = products.filter((p) => p.isActive);

  // Live counters untuk status
  const countAll = activeProducts.length;
  const countReady = activeProducts.filter(
    (p) =>
      p.status === "available" ||
      (!p.status && p.status !== "sold" && p.status !== "menunggu_persetujuan" && p.status !== "ditolak"),
  ).length;
  const countSold = activeProducts.filter((p) => p.status === "sold").length;
  const countPending = activeProducts.filter(
    (p) => p.status === "menunggu_persetujuan",
  ).length;
  const countRejected = activeProducts.filter(
    (p) => p.status === "ditolak",
  ).length;

  const filteredProducts = useMemo(() => {
    return activeProducts
      .filter((p) => {
        // 1. Device Type / Catalog Filter
        if (productTypeFilter !== "all") {
          const pType = (p.productType || "phone").toLowerCase();
          const target = productTypeFilter.toLowerCase();
          if (target === "phone" || target === "handphone") {
            if (pType !== "phone" && pType !== "handphone") return false;
          } else if (target === "accessory" || target === "aksesoris") {
            if (pType !== "accessory" && pType !== "aksesoris") return false;
          } else {
            if (pType !== target) return false;
          }
        }

        // 2. Status Dropdown Filter
        if (
          statusFilter === "ready" &&
          (p.status === "sold" || p.status === "menunggu_persetujuan" || p.status === "ditolak")
        )
          return false;
        if (statusFilter === "sold" && p.status !== "sold") return false;
        if (
          statusFilter === "menunggu_persetujuan" &&
          p.status !== "menunggu_persetujuan"
        )
          return false;
        if (statusFilter === "ditolak" && p.status !== "ditolak") return false;

        // 3. Search query
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchSearch =
            p.name.toLowerCase().includes(q) ||
            (p.imei && p.imei.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.grade && p.grade.toLowerCase().includes(q)) ||
            (p.capacity && p.capacity.toLowerCase().includes(q)) ||
            (p.color && p.color.toLowerCase().includes(q)) ||
            (p.brandName && p.brandName.toLowerCase().includes(q)) ||
            (p.retailSupplier && p.retailSupplier.toLowerCase().includes(q));
          if (!matchSearch) return false;
        }

        // 4. Column Filters
        if (colFilters.imei.trim()) {
          const q = colFilters.imei.toLowerCase().trim();
          const matchImei =
            (p.imei && p.imei.toLowerCase().includes(q)) ||
            p.sku.toLowerCase().includes(q);
          if (!matchImei) return false;
        }

        if (colFilters.name.trim()) {
          const q = colFilters.name.toLowerCase().trim();
          const matchName =
            p.name.toLowerCase().includes(q) ||
            (p.brandName && p.brandName.toLowerCase().includes(q));
          if (!matchName) return false;
        }

        if (colFilters.grade.trim()) {
          const q = colFilters.grade.toLowerCase().trim();
          if (!p.grade || !p.grade.toLowerCase().includes(q)) return false;
        }

        if (colFilters.capacity.trim()) {
          const q = colFilters.capacity.toLowerCase().trim();
          if (!p.capacity || !p.capacity.toLowerCase().includes(q))
            return false;
        }

        if (colFilters.color.trim()) {
          const q = colFilters.color.toLowerCase().trim();
          if (!p.color || !p.color.toLowerCase().includes(q)) return false;
        }

        if (colFilters.completeness.trim()) {
          const q = colFilters.completeness.toLowerCase().trim();
          if (!p.completeness || !p.completeness.toLowerCase().includes(q))
            return false;
        }

        if (colFilters.retailSupplier.trim()) {
          const q = colFilters.retailSupplier.toLowerCase().trim();
          if (!p.retailSupplier || !p.retailSupplier.toLowerCase().includes(q))
            return false;
        }

        if (colFilters.status.length > 0) {
          const pStatusKey =
            p.status === "sold"
              ? "sold"
              : p.status === "menunggu_persetujuan"
                ? "menunggu_persetujuan"
                : p.status === "ditolak"
                  ? "ditolak"
                  : "ready";
          if (!colFilters.status.includes(pStatusKey)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortConfig.column || !sortConfig.direction) return 0;
        const dir = sortConfig.direction === "asc" ? 1 : -1;

        if (sortConfig.column === "entryDate") {
          return (
            (new Date(a.entryDate || 0).getTime() -
              new Date(b.entryDate || 0).getTime()) *
            dir
          );
        }
        if (sortConfig.column === "imei") {
          return (a.imei || a.sku).localeCompare(b.imei || b.sku) * dir;
        }
        if (sortConfig.column === "name") {
          return a.name.localeCompare(b.name) * dir;
        }
        if (sortConfig.column === "grade") {
          return (a.grade || "").localeCompare(b.grade || "") * dir;
        }
        if (sortConfig.column === "purchasePrice") {
          return (
            (Number(a.purchasePrice || 0) - Number(b.purchasePrice || 0)) * dir
          );
        }
        if (sortConfig.column === "sellingPrice") {
          return (
            (Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0)) * dir
          );
        }
        if (sortConfig.column === "capacity") {
          return (a.capacity || "").localeCompare(b.capacity || "") * dir;
        }
        if (sortConfig.column === "color") {
          return (a.color || "").localeCompare(b.color || "") * dir;
        }
        if (sortConfig.column === "retailSupplier") {
          return (
            (a.retailSupplier || "").localeCompare(b.retailSupplier || "") * dir
          );
        }
        if (sortConfig.column === "stock") {
          return ((a.stock || 0) - (b.stock || 0)) * dir;
        }
        return 0;
      });
  }, [
    activeProducts,
    productTypeFilter,
    statusFilter,
    search,
    colFilters,
    sortConfig,
  ]);

  const handleSort = (
    col:
      | "entryDate"
      | "imei"
      | "name"
      | "grade"
      | "capacity"
      | "color"
      | "completeness"
      | "retailSupplier"
      | "purchasePrice"
      | "sellingPrice"
      | "stock",
    direction: "asc" | "desc" | null,
  ) => {
    setSortConfig({
      column: direction ? col : null,
      direction: direction,
    });
  };

  const capacityOptions = useMemo(() => {
    const caps = Array.from(
      new Set(
        activeProducts.map((p) => p.capacity).filter(Boolean) as string[],
      ),
    ).sort();
    return caps.map((c) => ({ label: c, value: c }));
  }, [activeProducts]);

  const colorOptions = useMemo(() => {
    const cols = Array.from(
      new Set(activeProducts.map((p) => p.color).filter(Boolean) as string[]),
    ).sort();
    return cols.map((c) => ({ label: c, value: c }));
  }, [activeProducts]);

  const supplierOptions = useMemo(() => {
    const sups = Array.from(
      new Set(
        activeProducts.map((p) => p.retailSupplier).filter(Boolean) as string[],
      ),
    ).sort();
    return sups.map((s) => ({ label: s, value: s }));
  }, [activeProducts]);

  const gradeOptions = useMemo(() => {
    const grs = Array.from(
      new Set(activeProducts.map((p) => p.grade).filter(Boolean) as string[]),
    ).sort();
    return grs.map((g) => ({ label: g, value: g }));
  }, [activeProducts]);

  const completenessOptions = useMemo(() => {
    const comps = Array.from(
      new Set(
        activeProducts.map((p) => p.completeness).filter(Boolean) as string[],
      ),
    ).sort();
    return comps.map((c) => ({ label: c, value: c }));
  }, [activeProducts]);

  const statusOptions = [
    { label: "Ready", value: "ready" },
    { label: "Terjual", value: "sold" },
    { label: "Menunggu Persetujuan", value: "menunggu_persetujuan" },
    { label: "Ditolak", value: "ditolak" },
  ];

  const hasActiveColFilters =
    statusFilter !== "all" ||
    productTypeFilter !== "all" ||
    !!colFilters.imei ||
    !!colFilters.name ||
    !!colFilters.grade ||
    !!colFilters.capacity ||
    !!colFilters.color ||
    !!colFilters.completeness ||
    !!colFilters.retailSupplier ||
    colFilters.status.length > 0 ||
    !!sortConfig.column ||
    !!search;

  const resetAllFilters = () => {
    setStatusFilter("all");
    setProductTypeFilter("all");
    setSearch("");
    setColFilters({
      imei: "",
      name: "",
      grade: "",
      capacity: "",
      color: "",
      completeness: "",
      retailSupplier: "",
      status: [],
    });
    setSortConfig({ column: "entryDate", direction: "desc" });
  };

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
        prev.map((p) =>
          p.id === prod.id ? { ...p, isActive: !p.isActive } : p,
        ),
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (prod: ProductItem) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus produk "${prod.name}"? Produk tidak akan ditampilkan lagi.`,
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

        {!isCashier && (
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
              <span>Tambah Produk</span>
            </Button>
          </div>
        )}
      </div>

      {/* Alert Banner untuk Owner jika ada unit menunggu persetujuan */}
      {isOwner && countPending > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">
                Terdapat {countPending} Unit Menunggu Persetujuan Owner
              </p>
              <p className="text-[11px] text-muted-foreground">
                Staff gudang telah menginput unit baru. Silakan tinjau dan tetapkan Grade, HPP, serta Harga Jual untuk mengaktifkannya.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setStatusFilter("menunggu_persetujuan")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs gap-1.5 shrink-0 shadow-xs"
          >
            <span>Tinjau Unit ({countPending})</span>
          </Button>
        </div>
      )}

      {/* Alert Banner untuk Staff Gudang jika ada unit ditolak owner */}
      {isWarehouse && countRejected > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm text-rose-800 dark:text-rose-300">
                Terdapat {countRejected} Unit Ditolak oleh Owner
              </p>
              <p className="text-[11px] text-muted-foreground">
                Klik tombol <strong>Perbaiki Unit</strong> untuk membaca catatan penolakan dari owner dan melakukan perbaikan data.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setStatusFilter("ditolak")}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs gap-1.5 shrink-0 shadow-xs"
          >
            <span>Perbaiki Unit ({countRejected})</span>
          </Button>
        </div>
      )}

      {/* Filter Toolbar: Dropdown Status, Jenis Tipe (Semua/HP/Aksesoris), Search, & Reset */}
      <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dropdown Status Unit */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Status:
            </span>
            <div className="relative">
              <select
                id="product-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 pl-3 pr-8 text-xs font-medium rounded-xl bg-background border border-border text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:border-primary/40 transition"
              >
                {isCashier ? (
                  <option value="all">Ready ({countReady})</option>
                ) : (
                  <>
                    <option value="all">Semua Status ({countAll})</option>
                    <option value="ready">Ready ({countReady})</option>
                    <option value="sold">Terjual ({countSold})</option>
                    <option value="menunggu_persetujuan">
                      Menunggu Persetujuan ({countPending})
                    </option>
                    <option value="ditolak">
                      Ditolak ({countRejected})
                    </option>
                  </>
                )}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {/* Tag status aktif jika bukan 'all' */}
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
              title="Kembalikan ke Semua Status"
            >
              <span>
                {statusFilter === "ready"
                  ? "Ready"
                  : statusFilter === "sold"
                    ? "Terjual"
                    : statusFilter === "ditolak"
                      ? "Ditolak"
                      : "Menunggu Persetujuan"}
              </span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter Bar: Jenis Tipe & Search & Reset */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border border-border text-xs overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setProductTypeFilter("all")}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 ${
                productTypeFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua
            </button>
            {activeCatalogs.map((cat) => {
              const isSelected =
                productTypeFilter.toLowerCase() === cat.code.toLowerCase() ||
                (productTypeFilter === "phone" && cat.code === "handphone") ||
                (productTypeFilter === "accessory" && cat.code === "aksesoris");
              return (
                <button
                  key={cat.id || cat.code}
                  type="button"
                  onClick={() => setProductTypeFilter(cat.code)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 ${
                    isSelected
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {getCategoryIcon(cat.code)}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk / IMEI..."
              className="pl-8 text-xs rounded-xl h-8"
            />
          </div>

          {hasActiveColFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
              title="Reset Semua Filter"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabel produk terpadu */}
      <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">
                    No
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Tgl Masuk Unit"
                      sortType="date"
                      sortDirection={
                        sortConfig.column === "entryDate"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("entryDate", direction)}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="IMEI"
                      textFilterValue={colFilters.imei}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, imei: value }))
                      }
                      textFilterPlaceholder="Cari IMEI / SKU..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, imei: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold min-w-[160px]">
                    <TableColumnFilter
                      title="Nama Produk"
                      textFilterValue={colFilters.name}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, name: value }))
                      }
                      textFilterPlaceholder="Cari nama / merek..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, name: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Grade"
                      textFilterValue={colFilters.grade}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, grade: value }))
                      }
                      options={gradeOptions}
                      selectedOptions={colFilters.grade ? [colFilters.grade] : []}
                      onOptionToggle={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          grade: prev.grade === value ? "" : value,
                        }))
                      }
                      sortType="text"
                      sortDirection={
                        sortConfig.column === "grade"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("grade", direction)}
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, grade: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Kapasitas"
                      textFilterValue={colFilters.capacity}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, capacity: value }))
                      }
                      textFilterPlaceholder="Cari kapasitas..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, capacity: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Warna"
                      textFilterValue={colFilters.color}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, color: value }))
                      }
                      textFilterPlaceholder="Cari warna..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, color: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Kelengkapan"
                      textFilterValue={colFilters.completeness}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          completeness: value,
                        }))
                      }
                      options={completenessOptions}
                      selectedOptions={colFilters.completeness ? [colFilters.completeness] : []}
                      onOptionToggle={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          completeness: prev.completeness === value ? "" : value,
                        }))
                      }
                      sortType="text"
                      sortDirection={
                        sortConfig.column === "completeness"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("completeness", direction)}
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, completeness: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Supplier"
                      textFilterValue={colFilters.retailSupplier}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          retailSupplier: value,
                        }))
                      }
                      options={supplierOptions}
                      selectedOptions={colFilters.retailSupplier ? [colFilters.retailSupplier] : []}
                      onOptionToggle={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          retailSupplier: prev.retailSupplier === value ? "" : value,
                        }))
                      }
                      sortType="text"
                      sortDirection={
                        sortConfig.column === "retailSupplier"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("retailSupplier", direction)}
                      onReset={() =>
                        setColFilters((prev) => ({
                          ...prev,
                          retailSupplier: "",
                        }))
                      }
                    />
                  </TableHead>
                  {isOwner && (
                    <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                      <TableColumnFilter
                        title="HPP (Modal)"
                        align="right"
                        sortType="number"
                        sortDirection={
                          sortConfig.column === "purchasePrice"
                            ? sortConfig.direction
                            : null
                        }
                        onSort={(direction) =>
                          handleSort("purchasePrice", direction)
                        }
                      />
                    </TableHead>
                  )}
                  {!isWarehouse && (
                    <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                      <TableColumnFilter
                        title="Harga Jual"
                        align="right"
                        sortType="number"
                        sortDirection={
                          sortConfig.column === "sellingPrice"
                            ? sortConfig.direction
                            : null
                        }
                        onSort={(direction) =>
                          handleSort("sellingPrice", direction)
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">
                    <TableColumnFilter
                      title="Status"
                      align="center"
                      options={statusOptions}
                      selectedOptions={colFilters.status}
                      onOptionToggle={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          status: prev.status.includes(value)
                            ? prev.status.filter((item) => item !== value)
                            : [...prev.status, value],
                        }))
                      }
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, status: [] }))
                      }
                    />
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isWarehouse ? 10 : 13}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Smartphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm">
                        Belum ada unit handphone terdaftar
                      </p>
                      <p className="text-xs">
                        Klik &quot;Tambah Produk&quot; untuk menginput data
                        unit.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors text-xs"
                    >
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
                            <p className="text-xs font-bold leading-snug">
                              {p.name}
                            </p>
                            {p.brandName && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.brandName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Grade */}
                      <TableCell className="whitespace-nowrap">
                        {p.grade ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${
                              p.grade.toLowerCase().includes("a") ||
                              p.grade.toLowerCase().includes("new") ||
                              p.grade.toLowerCase().includes("bnib")
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : p.grade.toLowerCase().includes("b")
                                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {p.grade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>

                      {/* Kapasitas */}
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium"
                        >
                          {p.capacity || "-"}
                        </Badge>
                      </TableCell>

                      {/* Warna */}
                      <TableCell className="whitespace-nowrap text-muted-foreground font-medium">
                        {p.color || "-"}
                      </TableCell>

                      {/* Kelengkapan */}
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="text-xs">
                          {p.completeness || "Fullset"}
                        </span>
                      </TableCell>

                      {/* Retail (Supplier) */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Building2 className="h-3 w-3 text-muted-foreground/60" />
                          <span>{p.retailSupplier || "-"}</span>
                        </div>
                      </TableCell>

                      {/* HPP (Harga Modal) */}
                      {isOwner && (
                        <TableCell className="text-right whitespace-nowrap font-mono text-xs">
                          {p.purchasePrice ? (
                            formatRupiah(p.purchasePrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Harga Jual */}
                      {!isWarehouse && (
                        <TableCell className="text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatRupiah(p.sellingPrice)}
                        </TableCell>
                      )}

                      {/* Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        {p.status === "menunggu_persetujuan" ? (
                          isOwner ? (
                            <button
                              type="button"
                              onClick={() => handleOpenApprovalModal(p)}
                              className="focus:outline-none group/badge transition transform hover:scale-105"
                              title="Klik untuk review dan persetujuan unit ini"
                            >
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-[10px] gap-1 cursor-pointer hover:bg-amber-500/25">
                                <Clock className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                                <span>Menunggu Persetujuan</span>
                                <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                              </Badge>
                            </button>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-[10px] gap-1 cursor-default">
                              <Clock className="h-2.5 w-2.5 text-amber-600" />
                              <span>Menunggu Persetujuan</span>
                            </Badge>
                          )
                        ) : p.status === "ditolak" ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 text-[10px] gap-1 cursor-default">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>Ditolak</span>
                            </Badge>
                            {p.rejectionReason && (
                              <span
                                className="text-[10px] text-muted-foreground max-w-[130px] truncate"
                                title={`Alasan: ${p.rejectionReason}`}
                              >
                                {p.rejectionReason}
                              </span>
                            )}
                          </div>
                        ) : isOwner ? (
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(p)}
                            className="focus:outline-none group/badge transition transform hover:scale-105"
                            title="Klik untuk mengubah status produk"
                          >
                            {p.status === "sold" ? (
                              <Badge
                                variant="secondary"
                                className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] gap-1 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 text-zinc-500" />
                                <span>Terjual</span>
                                <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                              </Badge>
                            ) : (
                              <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] gap-1 cursor-pointer hover:bg-primary/20">
                                <PackageCheck className="h-2.5 w-2.5" />
                                <span>Ready</span>
                                <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                              </Badge>
                            )}
                          </button>
                        ) : p.status === "sold" ? (
                          <Badge
                            variant="secondary"
                            className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] gap-1 cursor-default"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-zinc-500" />
                            <span>Terjual</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] gap-1 cursor-default">
                            <PackageCheck className="h-2.5 w-2.5" />
                            <span>Ready</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isCashier ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : isWarehouse ? (
                            (p.status === "menunggu_persetujuan" || p.status === "ditolak" || p.createdBy === currentUserId) ? (
                              p.status === "ditolak" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 rounded-lg"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Perbaiki data produk yang ditolak"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Perbaiki</span>
                                </Button>
                              ) : p.status === "menunggu_persetujuan" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 rounded-lg"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit data produk yang masih menunggu persetujuan"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 gap-1 rounded-lg"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit data produk yang Anda input"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </Button>
                              )
                            ) : (
                              <span
                                className="text-xs text-muted-foreground/50 cursor-not-allowed select-none"
                                title="Hanya staf penginput atau barang menunggu persetujuan yang dapat diedit"
                              >
                                -
                              </span>
                            )
                          ) : p.status === "menunggu_persetujuan" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 rounded-lg"
                                onClick={() => handleOpenApprovalModal(p)}
                                title="Review dan tentukan harga/grade"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Review</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={() => handleOpenRejectModal(p)}
                                title="Tolak Produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Produk"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(p)}
                                title="Hapus Produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View (Opsi 1 - Anti-tertimpa & Elegan) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-border bg-card shadow-xs text-muted-foreground space-y-2">
                <Smartphone className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                <p className="font-semibold text-sm">Belum ada unit terdaftar</p>
                <p className="text-xs">Klik &quot;Tambah Produk&quot; untuk menginput data unit baru.</p>
              </div>
            ) : (
              filteredProducts.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-2.5"
                >
                  {/* Header: No Urut, Tanggal Masuk, & Badge Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                      <span className="font-mono font-bold text-foreground shrink-0">#{idx + 1}</span>
                      <span className="shrink-0">•</span>
                      <div className="flex items-center gap-1 font-medium truncate">
                        <Calendar className="h-3 w-3 text-primary/70 shrink-0" />
                        <span className="truncate">{formatDate(p.entryDate)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {p.status === "menunggu_persetujuan" ? (
                        isOwner ? (
                          <button
                            type="button"
                            onClick={() => handleOpenApprovalModal(p)}
                            className="focus:outline-none cursor-pointer"
                            title="Klik untuk review dan persetujuan unit"
                          >
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-[10px] gap-1">
                              <Clock className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                              <span>Menunggu Persetujuan</span>
                            </Badge>
                          </button>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 text-[10px] gap-1">
                            <Clock className="h-2.5 w-2.5 text-amber-600" />
                            <span>Menunggu Persetujuan</span>
                          </Badge>
                        )
                      ) : p.status === "ditolak" ? (
                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 text-[10px] gap-1">
                          <XCircle className="h-2.5 w-2.5 text-rose-600" />
                          <span>Ditolak</span>
                        </Badge>
                      ) : isOwner ? (
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(p)}
                          className="focus:outline-none cursor-pointer"
                          title="Klik untuk ubah status"
                        >
                          {p.status === "sold" ? (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] gap-1"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-zinc-500" />
                              <span>Terjual</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] gap-1">
                              <PackageCheck className="h-2.5 w-2.5" />
                              <span>Ready</span>
                            </Badge>
                          )}
                        </button>
                      ) : p.status === "sold" ? (
                        <Badge
                          variant="secondary"
                          className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] gap-1"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-zinc-500" />
                          <span>Terjual</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] gap-1">
                          <PackageCheck className="h-2.5 w-2.5" />
                          <span>Ready</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Body: Product Name & Specs Chips */}
                  <div>
                    <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {p.imei || p.sku}
                      </span>
                      {p.brandName && (
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {p.brandName}
                        </Badge>
                      )}
                      {p.capacity && (
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {p.capacity}
                        </Badge>
                      )}
                      {p.color && (
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                          {p.color}
                        </Badge>
                      )}
                      {p.grade && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          {p.grade}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Rejection Note Alert if status is ditolak */}
                  {p.status === "ditolak" && p.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>Catatan Penolakan Owner:</span>
                      </div>
                      <p className="text-[11px] italic bg-background/80 p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 text-foreground break-words">
                        &ldquo;{p.rejectionReason}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Detail Supplier & Kelengkapan */}
                  <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                    <span className="truncate">
                      {p.retailSupplier ? `Supplier: ${p.retailSupplier}` : "Supplier Toko"}
                    </span>
                    <span className="shrink-0 text-foreground/80 font-medium">
                      {p.completeness || "Fullset"}
                    </span>
                  </div>

                  {/* Kotak Harga Mandiri (Dedicated Price Box - Bebas Tertimpa) */}
                  {!isWarehouse && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wider">
                          Harga Jual
                        </span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatRupiah(p.sellingPrice)}
                        </span>
                      </div>
                      {isSuperAdmin && p.purchasePrice ? (
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wider">
                            Harga Beli (HPP)
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                            {formatRupiah(p.purchasePrice)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Thumb-friendly Action Buttons */}
                  <div className="pt-1 flex items-center justify-end gap-1.5">
                    {isCashier ? null : isWarehouse ? (
                      (p.status === "menunggu_persetujuan" || p.status === "ditolak" || p.createdBy === currentUserId) ? (
                        p.status === "ditolak" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-bold text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 rounded-xl w-full"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Perbaiki Unit</span>
                          </Button>
                        ) : p.status === "menunggu_persetujuan" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 rounded-xl w-full"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit Unit (Menunggu Persetujuan)</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 gap-1.5 rounded-xl w-full"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit Unit</span>
                          </Button>
                        )
                      ) : null
                    ) : p.status === "menunggu_persetujuan" ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 gap-1 rounded-xl"
                          onClick={() => handleOpenApprovalModal(p)}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-3 text-xs font-semibold gap-1 rounded-xl"
                          onClick={() => handleOpenRejectModal(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-xl gap-1.5 font-medium flex-1 sm:flex-none justify-center"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit Unit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDelete(p)}
                          title="Hapus Unit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Kolom tabel terpadu di atas dipakai untuk semua jenis produk. */}
      {false && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">
                    No
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Tgl Masuk"
                      sortType="date"
                      sortDirection={
                        sortConfig.column === "entryDate"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("entryDate", direction)}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="SKU / Barcode"
                      textFilterValue={colFilters.imei}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, imei: value }))
                      }
                      textFilterPlaceholder="Cari SKU..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, imei: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold min-w-[180px]">
                    <TableColumnFilter
                      title="Nama Produk"
                      textFilterValue={colFilters.name}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, name: value }))
                      }
                      textFilterPlaceholder="Cari nama / merek..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, name: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Jenis Aksesoris"
                      textFilterValue={colFilters.capacity}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({ ...prev, capacity: value }))
                      }
                      textFilterPlaceholder="Cari jenis..."
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, capacity: "" }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                    <TableColumnFilter
                      title="Retail (Supplier)"
                      textFilterValue={colFilters.retailSupplier}
                      onTextFilterChange={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          retailSupplier: value,
                        }))
                      }
                      textFilterPlaceholder="Cari supplier..."
                      onReset={() =>
                        setColFilters((prev) => ({
                          ...prev,
                          retailSupplier: "",
                        }))
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">
                    <TableColumnFilter
                      title="Stok"
                      align="center"
                      sortType="number"
                      sortDirection={
                        sortConfig.column === "stock"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) => handleSort("stock", direction)}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                    <TableColumnFilter
                      title="HPP (Modal)"
                      align="right"
                      sortType="number"
                      sortDirection={
                        sortConfig.column === "purchasePrice"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) =>
                        handleSort("purchasePrice", direction)
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                    <TableColumnFilter
                      title="Harga Jual"
                      align="right"
                      sortType="number"
                      sortDirection={
                        sortConfig.column === "sellingPrice"
                          ? sortConfig.direction
                          : null
                      }
                      onSort={(direction) =>
                        handleSort("sellingPrice", direction)
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-center whitespace-nowrap">
                    <TableColumnFilter
                      title="Status"
                      align="center"
                      options={statusOptions}
                      selectedOptions={colFilters.status}
                      onOptionToggle={(value) =>
                        setColFilters((prev) => ({
                          ...prev,
                          status: prev.status.includes(value)
                            ? prev.status.filter((item) => item !== value)
                            : [...prev.status, value],
                        }))
                      }
                      onReset={() =>
                        setColFilters((prev) => ({ ...prev, status: [] }))
                      }
                    />
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Headphones className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm">
                        Belum ada aksesoris terdaftar
                      </p>
                      <p className="text-xs">
                        Klik &quot;Tambah Aksesoris&quot; untuk mendaftarkan
                        charger, casing, tempered glass, dll.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors text-xs"
                    >
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
                        <p className="text-xs font-bold leading-snug">
                          {p.name}
                        </p>
                        {p.brandName && (
                          <span className="text-[10px] text-muted-foreground">
                            {p.brandName}
                          </span>
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
                          variant={
                            p.stock <= p.minStock ? "warning" : "success"
                          }
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
                          <span className="text-muted-foreground tracking-widest">
                            ••••••
                          </span>
                        )}
                      </TableCell>

                      {/* Harga Jual */}
                      <TableCell className="text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatRupiah(p.sellingPrice)}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(p)}
                          className="focus:outline-none group/badge transition transform hover:scale-105"
                          title="Klik untuk mengubah status produk"
                        >
                          {p.status === "sold" ? (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] gap-1 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-zinc-500" />
                              <span>Terjual</span>
                              <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] gap-1 cursor-pointer hover:bg-primary/20">
                              <PackageCheck className="h-2.5 w-2.5" />
                              <span>Ready</span>
                              <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isCashier ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : isWarehouse ? (
                            (p.status === "menunggu_persetujuan" || p.status === "ditolak" || p.createdBy === currentUserId) ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Aksesoris"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span
                                className="text-xs text-muted-foreground/50 cursor-not-allowed select-none"
                                title="Hanya staf penginput atau barang menunggu persetujuan yang dapat diedit"
                              >
                                -
                              </span>
                            )
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Produk"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(p)}
                                title="Hapus Produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
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
        catalogs={activeCatalogs}
        initialType={productTypeFilter !== "all" ? productTypeFilter : "phone"}
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
                  <p className="font-bold text-foreground text-sm font-sans">
                    {productToChangeStatus.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    {productToChangeStatus.brandName} •{" "}
                    {productToChangeStatus.capacity || ""}{" "}
                    {productToChangeStatus.color || ""}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-sans">
                    IMEI / Barcode:
                  </span>
                  <span className="font-semibold text-primary">
                    {productToChangeStatus.imei || productToChangeStatus.sku}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Pilih Status Unit:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("available")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                      selectedNewStatus === "available"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                        : "border-border bg-card text-muted-foreground hover:border-emerald-300"
                    }`}
                  >
                    <PackageCheck className="h-5 w-5 text-emerald-600" />
                    <span>Ready</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("sold")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                      selectedNewStatus === "sold"
                        ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ring-2 ring-zinc-500/20"
                        : "border-border bg-card text-muted-foreground hover:border-zinc-300"
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <span>Terjual</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Harga Jual Unit (Rp):
                </label>
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

      {/* DIALOG DETAIL TUKAR UNIT */}
      <ExchangeDetailDialog
        open={isExchangeDialogOpen}
        onOpenChange={setIsExchangeDialogOpen}
        data={exchangeDetail}
      />

      {/* MODAL REVIEW & PERSETUJUAN PRODUK OLEH OWNER */}
      <Dialog
        open={approvalModalOpen}
        onOpenChange={(open) => {
          if (!isProcessingApproval) {
            setApprovalModalOpen(open);
            if (!open) setProductToApprove(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="block">Review & Persetujuan Unit Masuk</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Tetapkan HPP (Modal) dan Harga Jual untuk menerbitkan produk
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {productToApprove && (
            <div className="space-y-4 pt-2">
              {/* Ringkasan Data Unit dari Gudang */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {productToApprove.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {productToApprove.brandName} • {productToApprove.capacity || "-"} {productToApprove.color ? `• ${productToApprove.color}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    Menunggu Persetujuan
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">IMEI / Barcode:</span>{" "}
                    <span className="font-mono font-bold text-primary">
                      {productToApprove.imei || productToApprove.sku}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade Kondisi:</span>{" "}
                    <span className="font-semibold text-primary">
                      {productToApprove.grade || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kelengkapan:</span>{" "}
                    <span className="font-medium text-foreground">
                      {productToApprove.completeness || "Fullset"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supplier:</span>{" "}
                    <span className="font-medium text-foreground">
                      {productToApprove.retailSupplier || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tgl Masuk:</span>{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(productToApprove.entryDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input dari Owner */}
              <div className="space-y-3.5">

                {/* HPP & Harga Jual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      HPP / Harga Modal (Rp) *
                    </label>
                    <CurrencyInput
                      value={approvalPurchasePrice}
                      onValueChange={(val) => setApprovalPurchasePrice(val)}
                      placeholder="0"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Harga beli dari supplier
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Harga Jual (Rp) *
                    </label>
                    <CurrencyInput
                      value={approvalSellingPrice}
                      onValueChange={(val) => setApprovalSellingPrice(val)}
                      placeholder="0"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Harga jual ke konsumen
                    </p>
                  </div>
                </div>

                {/* Kalkulasi Potensi Laba */}
                {approvalSellingPrice > 0 && approvalPurchasePrice > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between font-medium">
                    <span>Estimasi Margin / Laba Kotor:</span>
                    <span className="font-mono font-bold">
                      {formatRupiah(approvalSellingPrice - approvalPurchasePrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Tolak vs Setujui */}
              <div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isProcessingApproval}
                  onClick={() => handleOpenRejectModal(productToApprove)}
                  className="w-full sm:w-auto text-xs font-semibold gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Tolak Unit</span>
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProcessingApproval}
                    onClick={() => setApprovalModalOpen(false)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    disabled={isProcessingApproval}
                    onClick={handleApproveProduct}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                  >
                    {isProcessingApproval ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Setujui & Terbitkan</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Tolak Produk oleh Owner dengan Alasan */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Tolak Produk Masuk</span>
            </DialogTitle>
          </DialogHeader>

          {productToReject && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs space-y-1">
                <p className="font-semibold text-foreground">{productToReject.name}</p>
                <div className="flex items-center gap-2 text-muted-foreground font-mono">
                  <span>IMEI: {productToReject.imei || productToReject.sku}</span>
                  {productToReject.capacity && <span>• {productToReject.capacity}</span>}
                  {productToReject.color && <span>• {productToReject.color}</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alasan Penolakan <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Fisik ada dent/lecet tidak sesuai, kelengkapan kurang, atau IMEI belum sesuai faktur..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Catatan ini akan dilihat oleh staff gudang agar dapat diperbaiki dan diajukan ulang.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessingApproval}
                  onClick={() => {
                    setRejectModalOpen(false);
                    setProductToReject(null);
                  }}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isProcessingApproval || !rejectionReason.trim()}
                  onClick={handleConfirmReject}
                  className="text-xs font-semibold gap-1.5"
                >
                  {isProcessingApproval ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menolak...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Tolak Produk</span>
                    </>
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
