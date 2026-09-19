"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Printer,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Eye,
  Smartphone,
  Tag,
  Store,
  Layers,
  Sparkles,
  Pencil,
  RotateCcw,
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  Camera,
  ScanLine,
  Check,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  MessageSquare,
  Phone,
  Download,
} from "lucide-react";
import html2canvas from "html2canvas";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarcodeScannerModal,
  promptCameraPermission,
} from "@/components/ui/barcode-scanner-modal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { TableColumnFilter } from "@/components/ui/table-column-filter";
import { cn } from "@/lib/utils";
import {
  updateSaleItemTransaction,
  getAvailableExchangeProducts,
  deleteSale,
  deleteAllSales,
} from "@/lib/actions/sale.actions";
import {
  ExchangeDetailDialog,
  parseExchangeData,
  ExchangeDetailData,
} from "@/components/sales/exchange-detail-dialog";
import {
  CommissionDetailDialog,
  CommissionSaleInfo,
} from "@/components/sales/commission-detail-dialog";
import {
  CommissionEditDialog,
  CommissionEditSaleInfo,
} from "@/components/sales/commission-edit-dialog";
import { PaymentProofModal } from "@/components/sales/payment-proof-modal";

export interface PrintableSaleItem {
  id: string;
  productId?: string;
  productName: string;
  productSku: string;
  productImei?: string | null;
  capacity?: string | null;
  color?: string | null;
  variant?: string | null;
  completeness?: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
  isReturned?: boolean;
  returnReason?: string | null;
  returnedAt?: string | null;
}

export interface PrintableSale {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress?: string | null;
  cashierName: string;
  cashierId: string;
  subtotal: number;
  discount: number;
  additionalFee?: number;
  additionalFeeNote?: string | null;
  warrantyDays?: number;
  warrantyExpiry?: string | null;
  total: number;
  commission?: number;
  commissionProofUrl?: string | null;
  paymentProofUrl?: string | null;
  paymentMethod: "cash" | "transfer" | "edc" | "qris" | string;
  status: "completed" | "cancelled" | string;
  createdAt: string;
  itemCount: number;
  items: PrintableSaleItem[];
}

export interface StoreSettingData {
  id?: string;
  storeName?: string;
  phone?: string;
  address?: string;
  receiptFooter?: string;
  logoUrl?: string;
  defaultMinStock?: number;
}

interface SalesInvoicePrintClientProps {
  sales: PrintableSale[];
  storeSettings?: StoreSettingData;
  readyProducts?: any[];
  currentUserRole?: string;
}

export type ItemStatusType = "warranty" | "refund" | "exchange" | "ok";

export interface ItemStatusInfo {
  type: ItemStatusType;
  label: string;
  badgeClass: string;
  icon?: React.ReactNode;
}

export function getSaleItemStatus(
  item: PrintableSaleItem,
  sale: PrintableSale,
): ItemStatusInfo {
  // 1. Refund
  if (item.isReturned) {
    return {
      type: "refund",
      label: "Refund",
      badgeClass:
        "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
      icon: <RotateCcw className="h-3 w-3" />,
    };
  }

  // 2. Tukar Unit
  const reason = (item.returnReason || "").toLowerCase();
  if (
    reason.includes("tukar") ||
    reason.includes("exchange") ||
    reason.startsWith("ditukar")
  ) {
    return {
      type: "exchange",
      label: "Tukar Unit",
      badgeClass:
        "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
      icon: <ArrowLeftRight className="h-3 w-3" />,
    };
  }

  // 3. Garansi (7 hari dll)
  const warrantyDays = sale.warrantyDays || 0;
  if (warrantyDays > 0) {
    const saleDate = new Date(sale.createdAt).getTime();
    const expiryDate = sale.warrantyExpiry
      ? new Date(sale.warrantyExpiry).getTime()
      : saleDate + warrantyDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now <= expiryDate) {
      const remainingMs = expiryDate - now;
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return {
        type: "warranty",
        label: `Garansi (${remainingDays > 0 ? remainingDays : warrantyDays} Hari)`,
        badgeClass:
          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
        icon: <ShieldCheck className="h-3 w-3" />,
      };
    }
  }

  // 4. Oke (lewat masa garansi / selesai)
  return {
    type: "ok",
    label: "Oke",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    icon: (
      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
    ),
  };
}

function SaleStatusCell({
  sale,
  onOpenExchangeDetail,
}: {
  sale: PrintableSale;
  onOpenExchangeDetail?: (item: PrintableSaleItem, sale: PrintableSale) => void;
}) {
  const items = sale.items || [];
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  if (items.length === 1) {
    const st = getSaleItemStatus(items[0], sale);
    if (st.type === "exchange" && onOpenExchangeDetail) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenExchangeDetail(items[0], sale);
          }}
          className="focus:outline-none transition transform hover:scale-105"
          title="Klik untuk melihat detail tukar unit"
        >
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold gap-1 px-2 py-0.5 cursor-pointer shadow-xs hover:ring-2 hover:ring-sky-400/40",
              st.badgeClass,
            )}
          >
            {st.icon}
            <span>{st.label}</span>
          </Badge>
        </button>
      );
    }
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-semibold gap-1 px-2 py-0.5",
          st.badgeClass,
        )}
      >
        {st.icon}
        <span>{st.label}</span>
      </Badge>
    );
  }

  const statusList = items.map((it) => ({
    item: it,
    status: getSaleItemStatus(it, sale),
  }));

  const uniqueTypes = Array.from(new Set(statusList.map((s) => s.status.type)));

  if (uniqueTypes.length === 1) {
    const st = statusList[0].status;
    if (st.type === "exchange" && onOpenExchangeDetail) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenExchangeDetail(items[0], sale);
          }}
          className="focus:outline-none transition transform hover:scale-105"
          title="Klik untuk melihat detail tukar unit"
        >
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold gap-1 px-2 py-0.5 cursor-pointer shadow-xs hover:ring-2 hover:ring-sky-400/40",
              st.badgeClass,
            )}
          >
            {st.icon}
            <span>
              {st.label} ({items.length} Unit)
            </span>
          </Badge>
        </button>
      );
    }
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-semibold gap-1 px-2 py-0.5",
          st.badgeClass,
        )}
      >
        {st.icon}
        <span>
          {st.label} ({items.length} Unit)
        </span>
      </Badge>
    );
  }

  const counts = {
    warranty: statusList.reduce(
      (sum, s) => sum + (s.status.type === "warranty" ? s.item.qty : 0),
      0,
    ),
    refund: statusList.reduce(
      (sum, s) => sum + (s.status.type === "refund" ? s.item.qty : 0),
      0,
    ),
    exchange: statusList.reduce(
      (sum, s) => sum + (s.status.type === "exchange" ? s.item.qty : 0),
      0,
    ),
    ok: statusList.reduce(
      (sum, s) => sum + (s.status.type === "ok" ? s.item.qty : 0),
      0,
    ),
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-1 cursor-pointer group focus:outline-none"
          title="Klik untuk melihat status per unit"
        >
          <div className="flex items-center justify-center gap-1 flex-wrap max-w-[160px]">
            {counts.refund > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-800 border-rose-200"
              >
                {counts.refund} Refund
              </Badge>
            )}
            {counts.exchange > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0.2 bg-sky-100 text-sky-800 border-sky-200"
              >
                {counts.exchange} Tukar
              </Badge>
            )}
            {counts.warranty > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border-amber-200"
              >
                {counts.warranty} Garansi
              </Badge>
            )}
            {counts.ok > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border-emerald-200"
              >
                ✓ {counts.ok} Oke
              </Badge>
            )}
          </div>
          <span className="text-[9px] text-primary group-hover:underline font-semibold flex items-center gap-0.5">
            <span>Rincian {items.length} unit</span>
            <span>▼</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 shadow-xl z-50">
        <div className="border-b border-border pb-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            Status Per Unit ({items.length} Item)
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {sale.invoiceNo}
          </span>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {statusList.map(({ item, status }, idx) => (
            <div
              key={idx}
              className="p-2 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">
                  {item.productName}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {item.productImei
                    ? `IMEI: ${item.productImei}`
                    : `SKU: ${item.productSku}`}
                  {item.capacity ? ` • ${item.capacity}` : ""}
                </p>
              </div>
              {status.type === "exchange" && onOpenExchangeDetail ? (
                <button
                  type="button"
                  onClick={() => onOpenExchangeDetail(item, sale)}
                  className="focus:outline-none transition transform hover:scale-105"
                  title="Klik untuk melihat rincian tukar unit"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold gap-1 shrink-0 px-2 py-0.5 cursor-pointer shadow-xs hover:ring-2 hover:ring-sky-400/40",
                      status.badgeClass,
                    )}
                  >
                    {status.icon}
                    <span>{status.label}</span>
                  </Badge>
                </button>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold gap-1 shrink-0 px-2 py-0.5",
                    status.badgeClass,
                  )}
                >
                  {status.icon}
                  <span>{status.label}</span>
                </Badge>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SalesInvoicePrintClient({
  sales,
  storeSettings,
  readyProducts = [],
  currentUserRole = "admin_kasir",
}: SalesInvoicePrintClientProps) {
  const router = useRouter();
  const isOwner = currentUserRole === "owner" || currentUserRole === "super_admin";
  const isStaffAdmin = currentUserRole === "staff_gudang";
  const isStaffMarketing = currentUserRole === "admin_kasir";

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<PrintableSale | null>(null);
  const [printFormat, setPrintFormat] = useState<"standard" | "thermal">(
    "thermal",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(
    new Set(),
  );

  // State untuk modal Bukti Pembayaran
  const [paymentProofSale, setPaymentProofSale] = useState<PrintableSale | null>(null);
  const [isPaymentProofModalOpen, setIsPaymentProofModalOpen] = useState(false);
  const [proofOverrides, setProofOverrides] = useState<Map<string, string>>(new Map());

  const handleProofUploaded = (saleId: string, newUrl: string) => {
    setProofOverrides((prev) => new Map(prev).set(saleId, newUrl));
    router.refresh();
  };

  // Interactive Column Filters & Sorting
  const [sortConfig, setSortConfig] = useState<{
    column:
      | "invoiceNo"
      | "createdAt"
      | "customer"
      | "total"
      | "commission"
      | "paymentMethod"
      | null;
    direction: "asc" | "desc" | null;
  }>({ column: "createdAt", direction: "desc" });

  const [colFilters, setColFilters] = useState<{
    invoiceNo: string;
    transactionDate: string;
    customer: string;
    items: string;
    total: string;
    commission: string;
    paymentMethod: string[];
    status: string[];
  }>({
    invoiceNo: "",
    transactionDate: "",
    customer: "",
    items: "",
    total: "",
    commission: "",
    paymentMethod: [],
    status: [],
  });

  // State Modal Edit Transaksi
  const [editModalSale, setEditModalSale] = useState<PrintableSale | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrintableSaleItem | null>(
    null,
  );
  const [editActionType, setEditActionType] = useState<
    "return" | "exchange" | null
  >(null);
  const [returnReasonInput, setReturnReasonInput] = useState("");
  const [selectedReplacementId, setSelectedReplacementId] = useState("");
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Scanner & Search Tukar Unit
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState("");
  const [isExchangeCameraScannerOpen, setIsExchangeCameraScannerOpen] =
    useState(false);

  // State Hapus Transaksi
  const [deletingSale, setDeletingSale] = useState<PrintableSale | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // State Modal Detail & Edit Komisi
  const [commissionDetailSale, setCommissionDetailSale] =
    useState<CommissionSaleInfo | null>(null);
  const [commissionEditSale, setCommissionEditSale] =
    useState<CommissionEditSaleInfo | null>(null);
  const [commissionOverrides, setCommissionOverrides] = useState<
    Map<string, { commission: number; commissionProofUrl: string | null }>
  >(new Map());
  const [confirmDeleteAllText, setConfirmDeleteAllText] = useState("");
  const [deletedSaleIds, setDeletedSaleIds] = useState<Set<string>>(new Set());

  // State Dialog Detail Tukar Unit
  const [exchangeDetail, setExchangeDetail] = useState<ExchangeDetailData | null>(null);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);

  const handleOpenExchangeDetail = (item: PrintableSaleItem, sale: PrintableSale) => {
    const parsed = parseExchangeData(item.returnReason, {
      invoiceNo: sale.invoiceNo,
      customerName: sale.customerName,
      exchangedAt: item.returnedAt || sale.createdAt,
      newSaleTotal: sale.total,
      replacementProduct: {
        name: item.productName,
        imei: item.productImei || item.productSku,
        price: item.unitPrice,
      },
      reason: item.returnReason || "Tukar Unit Pelanggan",
    });
    setExchangeDetail(parsed);
    setIsExchangeDialogOpen(true);
  };

  const printAreaRef = useRef<HTMLDivElement>(null);
  const offscreenPrintRef = useRef<HTMLDivElement>(null);
  const [activeCaptureSale, setActiveCaptureSale] = useState<PrintableSale | null>(null);
  const [isDownloadingJpg, setIsDownloadingJpg] = useState(false);
  const [isSendingWaImage, setIsSendingWaImage] = useState(false);

  const toggleExpandSale = (saleId: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const handleOpenEditModal = (sale: PrintableSale) => {
    setEditModalSale(sale);
    setIsEditModalOpen(true);
    setEditingItem(null);
    setEditActionType(null);
    setReturnReasonInput("");
    setSelectedReplacementId("");
    setExchangeSearchQuery("");
  };

  const handleSelectItemForAction = async (
    item: PrintableSaleItem,
    action: "return" | "exchange",
  ) => {
    setEditingItem(item);
    setEditActionType(action);
    setReturnReasonInput("");
    setSelectedReplacementId("");
    setExchangeSearchQuery("");

    if (action === "exchange") {
      setIsLoadingUnits(true);
      try {
        const units = await getAvailableExchangeProducts();
        setAvailableUnits(units);
      } catch {
        setAvailableUnits(readyProducts || []);
      } finally {
        setIsLoadingUnits(false);
      }
    }
  };

  // Filter unit pengganti berdasarkan nama, IMEI, atau SKU
  const filteredExchangeUnits = useMemo(() => {
    if (!editingItem) return [];
    const pool = availableUnits.filter((u) => u.id !== editingItem.productId);
    const q = exchangeSearchQuery.toLowerCase().trim();
    if (!q) return pool.slice(0, 8);
    return pool.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.imei && u.imei.toLowerCase().includes(q)) ||
        (u.sku && u.sku.toLowerCase().includes(q)) ||
        (u.color && u.color.toLowerCase().includes(q)) ||
        (u.brandName && u.brandName.toLowerCase().includes(q)),
    );
  }, [availableUnits, editingItem, exchangeSearchQuery]);

  const handleBarcodeScanExchange = (scannedValue: string) => {
    const trimmed = scannedValue.trim();
    if (!trimmed) return;

    const found = availableUnits.find(
      (u) =>
        u.id !== editingItem?.productId &&
        ((u.imei && u.imei.toLowerCase() === trimmed.toLowerCase()) ||
          (u.sku && u.sku.toLowerCase() === trimmed.toLowerCase()) ||
          (u.imei && u.imei.includes(trimmed))),
    );

    if (found) {
      setSelectedReplacementId(found.id);
      setIsExchangeCameraScannerOpen(false);
      setExchangeSearchQuery("");
      toast.success(
        `Unit berhasil di-scan: ${found.name} (IMEI: ${found.imei || found.sku})`,
      );
    } else {
      toast.error(
        `Unit dengan IMEI/Barcode "${trimmed}" tidak ditemukan pada stok ready.`,
      );
    }
  };

  const handleScanEnterExchange = (query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;

    const exact = availableUnits.find(
      (u) =>
        u.id !== editingItem?.productId &&
        ((u.imei && u.imei.toLowerCase() === trimmed) ||
          (u.sku && u.sku.toLowerCase() === trimmed)),
    );

    if (exact) {
      setSelectedReplacementId(exact.id);
      setExchangeSearchQuery("");
      toast.success(
        `Unit dipilih: ${exact.name} (IMEI: ${exact.imei || exact.sku})`,
      );
      return;
    }

    if (filteredExchangeUnits.length === 1) {
      setSelectedReplacementId(filteredExchangeUnits[0].id);
      setExchangeSearchQuery("");
      toast.success(
        `Unit dipilih: ${filteredExchangeUnits[0].name} (IMEI: ${
          filteredExchangeUnits[0].imei || filteredExchangeUnits[0].sku
        })`,
      );
    }
  };

  const handleSubmitEditAction = async () => {
    if (!editingItem || !editActionType || !editModalSale) return;

    if (editActionType === "return" && !returnReasonInput.trim()) {
      toast.error("Alasan refund barang wajib diisi.");
      return;
    }

    if (editActionType === "exchange" && !selectedReplacementId) {
      toast.error(
        "Silakan cari atau scan IMEI unit pengganti dari ready stock.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateSaleItemTransaction({
        saleItemId: editingItem.id,
        action: editActionType,
        returnReason: returnReasonInput.trim(),
        replacementProductId:
          editActionType === "exchange" ? selectedReplacementId : undefined,
      });

      if (res.success) {
        toast.success(res.message);
        if (editActionType === "return" && editModalSale) {
          const itemSubtotal = Number(editingItem.subtotal);
          setEditModalSale((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              subtotal: Math.max(0, prev.subtotal - itemSubtotal),
              total: Math.max(0, prev.total - itemSubtotal),
              items: prev.items.map((it) =>
                it.id === editingItem.id
                  ? {
                      ...it,
                      isReturned: true,
                      returnReason: returnReasonInput.trim(),
                    }
                  : it,
              ),
            };
          });
        } else if (editActionType === "exchange" && editModalSale) {
          const repProd = availableUnits.find((u) => u.id === selectedReplacementId);
          setEditModalSale((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              subtotal: (res as any).updatedSubtotal ?? prev.subtotal,
              total: (res as any).updatedTotal ?? prev.total,
              items: prev.items.map((it) =>
                it.id === editingItem.id
                  ? {
                      ...it,
                      productId: selectedReplacementId,
                      productName: repProd ? repProd.name : it.productName,
                      productImei: repProd ? repProd.imei : it.productImei,
                      unitPrice: repProd ? Number(repProd.sellingPrice) : it.unitPrice,
                      subtotal: repProd ? Number(repProd.sellingPrice) * it.qty : it.subtotal,
                      returnReason: (res as any).exchangeData
                        ? `||EXCHANGE_JSON:${JSON.stringify((res as any).exchangeData)}||`
                        : `[TUKAR_UNIT] Ditukar dari: ${it.productName} -> Ditukar ke: ${repProd?.name}`,
                    }
                  : it,
              ),
            };
          });
        }
        setIsEditModalOpen(false);
        setEditingItem(null);
        setEditActionType(null);
        router.refresh();
      } else {
        toast.error((res as any).error || "Gagal memperbarui transaksi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (sale: PrintableSale) => {
    setDeletingSale(sale);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSale) return;
    setIsDeleting(true);
    try {
      const res = await deleteSale(deletingSale.id);
      if (res.success) {
        setDeletedSaleIds((prev) => new Set(prev).add(deletingSale.id));
        toast.success(`Transaksi ${deletingSale.invoiceNo} berhasil dihapus.`);
        setIsDeleteDialogOpen(false);
        setDeletingSale(null);
        router.refresh();
      } else {
        toast.error((res as any).error || "Gagal menghapus transaksi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghapus transaksi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (confirmDeleteAllText.trim() !== "HAPUS") {
      toast.error(
        "Ketik 'HAPUS' untuk konfirmasi penghapusan seluruh transaksi.",
      );
      return;
    }
    setIsDeletingAll(true);
    try {
      const res = await deleteAllSales();
      if (res.success) {
        setDeletedSaleIds(new Set(sales.map((s) => s.id)));
        toast.success("Semua riwayat transaksi berhasil dihapus.");
        setIsDeleteAllDialogOpen(false);
        setConfirmDeleteAllText("");
        router.refresh();
      } else {
        toast.error((res as any).error || "Gagal menghapus semua transaksi.");
      }
    } catch (err: any) {
      toast.error(
        err.message || "Terjadi kesalahan saat menghapus semua transaksi.",
      );
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter & sort sales list
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => !deletedSaleIds.has(s.id))
      .filter((s) => {
        // 1. Global Search filter
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          s.invoiceNo.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.cashierName.toLowerCase().includes(q) ||
          s.items.some(
            (it) =>
              it.productName.toLowerCase().includes(q) ||
              (it.productImei && it.productImei.toLowerCase().includes(q)) ||
              (it.productSku && it.productSku.toLowerCase().includes(q)),
          );
        if (!matchesSearch) return false;

        // 2. Global Date filter
        if (dateFilter) {
          const saleDateStr = new Date(s.createdAt).toISOString().split("T")[0];
          if (saleDateStr !== dateFilter) return false;
        }

        if (colFilters.transactionDate.trim()) {
          const dateQuery = colFilters.transactionDate.trim().toLowerCase();
          const transactionDate = new Date(s.createdAt);
          const dateText = transactionDate
            .toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            .toLowerCase();
          if (
            !dateText.includes(dateQuery) &&
            !s.createdAt.toLowerCase().includes(dateQuery)
          ) {
            return false;
          }
        }

        // 3. Global Payment filter
        if (paymentFilter !== "all" && s.paymentMethod !== paymentFilter) {
          return false;
        }

        // 4. Column Filter: invoiceNo
        if (colFilters.invoiceNo.trim()) {
          if (
            !s.invoiceNo
              .toLowerCase()
              .includes(colFilters.invoiceNo.trim().toLowerCase())
          ) {
            return false;
          }
        }

        // 5. Column Filter: customer
        if (colFilters.customer.trim()) {
          const cQ = colFilters.customer.trim().toLowerCase();
          const matchCust =
            s.customerName.toLowerCase().includes(cQ) ||
            (s.customerPhone && s.customerPhone.toLowerCase().includes(cQ));
          if (!matchCust) return false;
        }

        // 6. Column Filter: items
        if (colFilters.items.trim()) {
          const iQ = colFilters.items.trim().toLowerCase();
          const matchItems = s.items.some(
            (it) =>
              it.productName.toLowerCase().includes(iQ) ||
              (it.productImei && it.productImei.toLowerCase().includes(iQ)) ||
              (it.productSku && it.productSku.toLowerCase().includes(iQ)),
          );
          if (!matchItems) return false;
        }

        if (colFilters.total.trim()) {
          const totalQuery = colFilters.total.trim().toLowerCase();
          const totalText = `${formatRupiah(s.total)} ${s.total}`.toLowerCase();
          if (!totalText.includes(totalQuery)) return false;
        }

        // Column Filter: commission
        if (colFilters.commission.trim()) {
          const commQuery = colFilters.commission.trim().toLowerCase();
          const commVal =
            commissionOverrides.get(s.id)?.commission ?? s.commission ?? 0;
          const commText = `${formatRupiah(commVal)} ${commVal}`.toLowerCase();
          if (!commText.includes(commQuery)) return false;
        }

        // 7. Column Filter: paymentMethod
        if (colFilters.paymentMethod.length > 0) {
          if (
            !colFilters.paymentMethod.includes(s.paymentMethod.toLowerCase())
          ) {
            return false;
          }
        }

        // 8. Column Filter: status
        if (colFilters.status.length > 0) {
          const itemStatuses = s.items.map(
            (it) => getSaleItemStatus(it, s).type,
          );
          const hasMatchingStatus = colFilters.status.some((st) =>
            itemStatuses.includes(st as ItemStatusType),
          );
          if (!hasMatchingStatus) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortConfig.column || !sortConfig.direction) return 0;
        const dir = sortConfig.direction === "asc" ? 1 : -1;

        if (sortConfig.column === "createdAt") {
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
        }
        if (sortConfig.column === "total") {
          return (a.total - b.total) * dir;
        }
        if (sortConfig.column === "commission") {
          const aComm =
            commissionOverrides.get(a.id)?.commission ?? a.commission ?? 0;
          const bComm =
            commissionOverrides.get(b.id)?.commission ?? b.commission ?? 0;
          return (aComm - bComm) * dir;
        }
        if (sortConfig.column === "invoiceNo") {
          return a.invoiceNo.localeCompare(b.invoiceNo) * dir;
        }
        if (sortConfig.column === "customer") {
          return a.customerName.localeCompare(b.customerName) * dir;
        }
        if (sortConfig.column === "paymentMethod") {
          return a.paymentMethod.localeCompare(b.paymentMethod) * dir;
        }
        return 0;
      });
  }, [
    sales,
    search,
    dateFilter,
    paymentFilter,
    deletedSaleIds,
    colFilters,
    sortConfig,
    commissionOverrides,
  ]);

  // Statistics
  const totalInvoices = filteredSales.length;
  const totalCompleted = filteredSales.filter(
    (s) => s.status === "completed",
  ).length;
  const totalAmount = filteredSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.total, 0);

  const handleOpenPrintModal = (sale: PrintableSale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (isoString?: string | null) => {
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

  const cleanCashierName = (name?: string | null) => {
    if (!name) return "Staff";
    const trimmed = name.trim();
    if (/^kasir$/i.test(trimmed)) return "Staff";
    const cleaned = trimmed.replace(/\bkasir\b/gi, "").replace(/[_]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "Staff";
  };

  const handleDownloadJpg = async () => {
    if (!selectedSale) return;
    setIsDownloadingJpg(true);
    try {
      setActiveCaptureSale(selectedSale);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const targetElement = offscreenPrintRef.current || printAreaRef.current;
      if (!targetElement) return;

      const canvas = await html2canvas(targetElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: targetElement.scrollWidth || 360,
        height: targetElement.scrollHeight,
        windowWidth: 380,
        windowHeight: (targetElement.scrollHeight || 1000) + 200,
        scrollX: 0,
        scrollY: 0,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `Invoice_${selectedSale.invoiceNo}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Struk invoice ${selectedSale.invoiceNo} berhasil disimpan sebagai gambar (JPG).`);
    } catch (err) {
      console.error("Download receipt image error:", err);
      toast.error("Gagal mengunduh gambar struk invoice.");
    } finally {
      setIsDownloadingJpg(false);
    }
  };

  const handleSendInvoiceWhatsApp = async (sale: PrintableSale, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!sale.customerPhone) {
      toast.error("Nomor WhatsApp pelanggan tidak tersedia untuk transaksi ini.");
      return;
    }

    let phone = sale.customerPhone.trim().replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    } else if (phone.startsWith("8")) {
      phone = "62" + phone;
    }

    const rawName = sale.customerName?.trim() || "Pelanggan";
    const formattedName = rawName.toLowerCase().startsWith("kak ")
      ? rawName.slice(4).trim()
      : rawName;

    const waMessage = `Terimakasih Kak ${formattedName} telah belanja di gloria ponsel bekasi.\n\nSimpan bukti pembayaran ini untuk klaim garansi ya ka\n\nApabila ada pertanyaan lain bisa kontak admin langsung di 081219172792.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;

    setIsSendingWaImage(true);
    const toastId = toast.loading("Menyiapkan pesan WhatsApp pelanggan...");

    try {
      setActiveCaptureSale(sale);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const targetElement = offscreenPrintRef.current || printAreaRef.current;

      if (targetElement) {
        try {
          const canvas = await html2canvas(targetElement, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: targetElement.scrollWidth || 340,
            height: targetElement.scrollHeight,
            windowWidth: 360,
            windowHeight: (targetElement.scrollHeight || 1000) + 200,
            scrollX: 0,
            scrollY: 0,
          });

          // 1. Salin gambar struk ke clipboard jika didukung browser (bisa langsung Ctrl + V di chat WhatsApp)
          try {
            const pngBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), "image/png");
            });
            if (pngBlob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": pngBlob }),
              ]);
            }
          } catch {}

          // 2. Download file JPG struk otomatis sebagai arsip
          try {
            const downloadLink = document.createElement("a");
            downloadLink.href = canvas.toDataURL("image/jpeg", 0.95);
            downloadLink.download = `Struk_${sale.invoiceNo}.jpg`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          } catch {}
        } catch (canvasErr) {
          console.warn("Gagal membuat canvas struk:", canvasErr);
        }
      }

      toast.success(
        "Membuka chat WhatsApp pelanggan... Gambar struk tersalin di clipboard (bisa langsung Ctrl + V).",
        { id: toastId, duration: 5000 }
      );

      // LANGSUNG TERDIRECT KE NO PELANGGAN DENGAN PESAN LENGKAP
      window.open(waUrl, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengarahkan ke WhatsApp.", { id: toastId });
      if (phone) {
        window.open(waUrl, "_blank");
      }
    } finally {
      setIsSendingWaImage(false);
    }
  };

  // Dedicated Print Function
  const executePrint = () => {
    if (!selectedSale || !printAreaRef.current) {
      window.print();
      return;
    }

    const contentHtml = printAreaRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    const isThermal = printFormat === "thermal";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice_${selectedSale.invoiceNo}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isThermal ? "58mm auto" : "A4 portrait"};
              margin: 0mm !important;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
            }
            p, div, span, h1, h2, h3, h4, h5, h6, table, tr, td, th {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1.25 !important;
              box-sizing: border-box !important;
            }
            body {
              font-family: ${
                isThermal
                  ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              };
              ${
                isThermal
                  ? `
                    width: 48mm !important;
                    max-width: 48mm !important;
                    font-size: 8.2px !important;
                    line-height: 1.2 !important;
                    letter-spacing: -0.03em !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    color: #000000 !important;
                  `
                  : `
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 15px;
                    color: #000000;
                  `
              }
            }
            .no-print, .print\\:hidden { display: none !important; }

            /* HILANGKAN WATERMARK KETIKA DICETAK (SESUAI PERMINTAAN USER) */
            .watermark-container, .watermark-row, .watermark-text {
              display: none !important;
            }

            ${isThermal ? `
              /* PADA PRINTER THERMAL: HITAM SOLID PEKAT UNTUK KONTEN UTAMA */
              .thermal-receipt-body {
                position: relative !important;
                z-index: 2 !important;
              }
              .thermal-receipt-body, .thermal-receipt-body * {
                color: #000000 !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              .border-b, .border-dashed {
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                border-bottom: 1px dashed #000000 !important;
              }
              .border-t {
                border-bottom: none !important;
                border-left: none !important;
                border-right: none !important;
                border-top: 1px solid #000000 !important;
              }
              .font-bold, .font-semibold {
                font-weight: 700 !important;
              }
            ` : `
              .border-b {
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                border-bottom: 1px solid #cbd5e1 !important;
              }
              .border-b.border-dashed, .border-dashed {
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                border-bottom: 1px dashed #94a3b8 !important;
              }
            `}

            table { width: 100%; border-collapse: collapse; }
            ${
              isThermal
                ? `
                  th, td { padding: 0 !important; border: none !important; vertical-align: top !important; line-height: 1.2 !important; }
                  td.align-top { vertical-align: top !important; }
                `
                : `
                  th, td { padding: 8px 10px; text-align: left; }
                  th { border-bottom: 1px solid #000; font-weight: 700; }
                  td { border-bottom: 1px solid #000; }
                `
            }
            .align-top { vertical-align: top !important; }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: 700 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-normal { font-weight: 400 !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
            .uppercase { text-transform: uppercase !important; }
            .flex { display: flex !important; }
            .flex-col { flex-direction: column !important; }
            .flex-1 { flex: 1 1 0% !important; }
            .min-w-0 { min-width: 0px !important; }
            .break-words { word-break: break-word !important; }
            .shrink-0 { flex-shrink: 0 !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-center { justify-content: center !important; text-align: center !important; }
            .justify-end { justify-content: flex-end !important; text-align: right !important; }
            .items-center { align-items: center !important; }
            .items-start { align-items: flex-start !important; }
            .whitespace-pre-line { white-space: pre-line !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .block { display: block !important; }
            .inline-block { display: inline-block !important; }
            .leading-tight { line-height: 1.2 !important; }
            .line-through { text-decoration: line-through !important; }

            .space-y-0 > * + * { margin-top: 0px !important; }
            .space-y-0\\.5 > * + * { margin-top: 2px !important; }
            .space-y-1 > * + * { margin-top: 3px !important; }
            .space-y-1\\.5 > * + * { margin-top: 4px !important; }
            .space-y-2 > * + * { margin-top: 6px !important; }
            .space-y-3 > * + * { margin-top: 10px !important; }
            .gap-1 { gap: 4px !important; }
            .gap-2 { gap: 8px !important; }
            .py-1\\.5 { padding-top: 3px !important; padding-bottom: 3px !important; }
            .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
            .pb-3 { padding-bottom: 5px !important; }
            .pt-0\\.5 { padding-top: 2px !important; }
            .pt-1 { padding-top: 3px !important; }
            .pt-2 { padding-top: 5px !important; }
            .pt-3 { padding-top: 6px !important; }
            .pr-1 { padding-right: 3px !important; }
            .pl-1 { padding-left: 3px !important; }
            .text-\\[8px\\] { font-size: 7.8px !important; line-height: 1.15 !important; }
            .text-\\[8\\.5px\\] { font-size: 8.2px !important; line-height: 1.2 !important; }
            .text-\\[9px\\] { font-size: 8.2px !important; line-height: 1.2 !important; }
            .text-\\[9\\.5px\\] { font-size: 8.8px !important; line-height: 1.2 !important; }
            .text-\\[10px\\] { font-size: 8.2px !important; line-height: 1.2 !important; }
            .text-\\[10\\.5px\\] { font-size: 9.5px !important; line-height: 1.2 !important; }
            .text-\\[11px\\] { font-size: 9.5px !important; line-height: 1.2 !important; }
            .text-xs { font-size: 8.2px !important; line-height: 1.2 !important; }
            .text-sm { font-size: 9.5px !important; line-height: 1.2 !important; }
            .text-base { font-size: 10.5px !important; }
            img { max-width: ${isThermal ? "95px" : "140px"} !important; max-height: ${isThermal ? "28px" : "55px"} !important; height: auto !important; object-fit: contain !important; display: block !important; margin: 0 auto 3px auto !important; }
            .print-wrapper {
              position: relative !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              ${
                isThermal
                  ? `
                    width: 48mm !important;
                    max-width: 48mm !important;
                    margin: 0 !important;
                    padding: 1mm 2.2mm 3mm 4.8mm !important;
                  `
                  : `
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 auto !important;
                    padding: 0 !important;
                  `
              }
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${contentHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Riwayat Transaksi</span>
          </h3>
        </div>

        {/* Mini Stats Badges & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs flex items-center gap-2 shadow-xs">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Total Transaksi:</span>
            <span className="font-bold text-foreground font-mono">
              {totalInvoices}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs flex items-center gap-2 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-muted-foreground">Total Pendapatan:</span>
            <span className="font-bold text-emerald-600 font-mono">
              {formatRupiah(totalAmount)}
            </span>
          </div>
          {isOwner && totalInvoices > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmDeleteAllText("");
                setIsDeleteAllDialogOpen(true);
              }}
              className="h-8 px-2.5 rounded-xl gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold shadow-xs"
              title="Hapus Semua Riwayat Transaksi"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Semua</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice (INV-...), nama pelanggan, kasir, IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Date Picker Filter */}
          <div className="relative">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl text-xs bg-background w-[145px]"
            />
          </div>

          {/* Payment Method Filter */}
          {/* <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground cursor-pointer"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="transfer">Transfer Bank</option>
            <option value="qris">QRIS</option>
            <option value="edc">Kartu EDC</option>
          </select> */}

          {(search ||
            dateFilter ||
            paymentFilter !== "all" ||
            colFilters.invoiceNo ||
            colFilters.transactionDate ||
            colFilters.customer ||
            colFilters.items ||
            colFilters.total ||
            colFilters.commission ||
            colFilters.paymentMethod.length > 0 ||
            colFilters.status.length > 0 ||
            sortConfig.column !== "createdAt" ||
            sortConfig.direction !== "desc") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setPaymentFilter("all");
                setColFilters({
                  invoiceNo: "",
                  transactionDate: "",
                  customer: "",
                  items: "",
                  total: "",
                  commission: "",
                  paymentMethod: [],
                  status: [],
                });
                setSortConfig({ column: "createdAt", direction: "desc" });
              }}
              className="h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] font-bold text-xs">
                  <TableColumnFilter
                    title="No. Faktur / Invoice"
                    sortDirection={
                      sortConfig.column === "invoiceNo"
                        ? sortConfig.direction
                        : null
                    }
                    onSort={(dir) =>
                      setSortConfig({
                        column: dir ? "invoiceNo" : null,
                        direction: dir,
                      })
                    }
                    textFilterValue={colFilters.invoiceNo}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({ ...prev, invoiceNo: val }))
                    }
                    textFilterPlaceholder="Cari nomor invoice..."
                    onReset={() => {
                      setColFilters((prev) => ({ ...prev, invoiceNo: "" }));
                      if (sortConfig.column === "invoiceNo")
                        setSortConfig({ column: null, direction: null });
                    }}
                  />
                </TableHead>

                <TableHead className="w-[160px] font-bold text-xs">
                  <TableColumnFilter
                    title="Tanggal Transaksi"
                    sortType="date"
                    sortDirection={
                      sortConfig.column === "createdAt"
                        ? sortConfig.direction
                        : null
                    }
                    onSort={(dir) =>
                      setSortConfig({
                        column: dir ? "createdAt" : null,
                        direction: dir,
                      })
                    }
                    textFilterValue={colFilters.transactionDate}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({
                        ...prev,
                        transactionDate: val,
                      }))
                    }
                    textFilterPlaceholder="Cari tanggal transaksi..."
                    onReset={() => {
                      setColFilters((prev) => ({
                        ...prev,
                        transactionDate: "",
                      }));
                      if (sortConfig.column === "createdAt")
                        setSortConfig({ column: null, direction: null });
                    }}
                  />
                </TableHead>

                <TableHead className="font-bold text-xs">
                  <TableColumnFilter
                    title="Pelanggan"
                    sortDirection={
                      sortConfig.column === "customer"
                        ? sortConfig.direction
                        : null
                    }
                    onSort={(dir) =>
                      setSortConfig({
                        column: dir ? "customer" : null,
                        direction: dir,
                      })
                    }
                    textFilterValue={colFilters.customer}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({ ...prev, customer: val }))
                    }
                    textFilterPlaceholder="Cari nama / nomor..."
                    onReset={() => {
                      setColFilters((prev) => ({ ...prev, customer: "" }));
                      if (sortConfig.column === "customer")
                        setSortConfig({ column: null, direction: null });
                    }}
                  />
                </TableHead>

                <TableHead className="font-bold text-xs">
                  <TableColumnFilter
                    title="Unit / Rincian Barang"
                    textFilterValue={colFilters.items}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({ ...prev, items: val }))
                    }
                    textFilterPlaceholder="Cari produk / IMEI..."
                    onReset={() =>
                      setColFilters((prev) => ({ ...prev, items: "" }))
                    }
                  />
                </TableHead>

                <TableHead className="w-[140px] font-bold text-xs text-right">
                  <TableColumnFilter
                    title="Total Transaksi"
                    align="right"
                    sortType="number"
                    sortDirection={
                      sortConfig.column === "total"
                        ? sortConfig.direction
                        : null
                    }
                    onSort={(dir) =>
                      setSortConfig({
                        column: dir ? "total" : null,
                        direction: dir,
                      })
                    }
                    textFilterValue={colFilters.total}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({ ...prev, total: val }))
                    }
                    textFilterPlaceholder="Cari nominal transaksi..."
                    onReset={() => {
                      setColFilters((prev) => ({ ...prev, total: "" }));
                      if (sortConfig.column === "total")
                        setSortConfig({ column: null, direction: null });
                    }}
                  />
                </TableHead>

                <TableHead className="w-[120px] font-bold text-xs text-right">
                  <TableColumnFilter
                    title="Komisi"
                    align="right"
                    sortType="number"
                    sortDirection={
                      sortConfig.column === "commission"
                        ? sortConfig.direction
                        : null
                    }
                    onSort={(dir) =>
                      setSortConfig({
                        column: dir ? "commission" : null,
                        direction: dir,
                      })
                    }
                    textFilterValue={colFilters.commission}
                    onTextFilterChange={(val) =>
                      setColFilters((prev) => ({ ...prev, commission: val }))
                    }
                    textFilterPlaceholder="Cari nominal komisi..."
                    onReset={() => {
                      setColFilters((prev) => ({ ...prev, commission: "" }));
                      if (sortConfig.column === "commission")
                        setSortConfig({ column: null, direction: null });
                    }}
                  />
                </TableHead>

                <TableHead className="w-[110px] font-bold text-xs text-center">
                  <TableColumnFilter
                    title="Metode"
                    align="center"
                    options={[
                      { label: "Tunai (Cash)", value: "cash" },
                      { label: "Transfer Bank", value: "transfer" },
                      { label: "QRIS", value: "qris" },
                      { label: "Kartu EDC", value: "edc" },
                    ]}
                    selectedOptions={colFilters.paymentMethod}
                    onOptionToggle={(val) =>
                      setColFilters((prev) => ({
                        ...prev,
                        paymentMethod: prev.paymentMethod.includes(val)
                          ? prev.paymentMethod.filter((x) => x !== val)
                          : [...prev.paymentMethod, val],
                      }))
                    }
                    onReset={() =>
                      setColFilters((prev) => ({ ...prev, paymentMethod: [] }))
                    }
                  />
                </TableHead>

                <TableHead className="w-[140px] font-bold text-xs text-center">
                  <TableColumnFilter
                    title="Status"
                    align="center"
                    options={[
                      { label: "Garansi", value: "warranty" },
                      { label: "Refund", value: "refund" },
                      { label: "Tukar Unit", value: "exchange" },
                      { label: "Oke", value: "ok" },
                    ]}
                    selectedOptions={colFilters.status}
                    onOptionToggle={(val) =>
                      setColFilters((prev) => ({
                        ...prev,
                        status: prev.status.includes(val)
                          ? prev.status.filter((x) => x !== val)
                          : [...prev.status, val],
                      }))
                    }
                    onReset={() =>
                      setColFilters((prev) => ({ ...prev, status: [] }))
                    }
                  />
                </TableHead>

                {isOwner && (
                  <TableHead className="w-[130px] font-bold text-xs text-center">
                    Bukti Pembayaran
                  </TableHead>
                )}

                <TableHead className="w-[120px] font-bold text-xs text-center">
                  Kasir
                </TableHead>

                <TableHead className="w-[220px] font-bold text-xs text-center">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isOwner ? 11 : 10}
                    className="text-center py-12 text-muted-foreground text-xs"
                  >
                    <FileText className="h-10 w-10 mx-auto mb-2.5 opacity-30" />
                    <p className="font-semibold text-sm">
                      Tidak ada riwayat transaksi ditemukan
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {search || dateFilter || paymentFilter !== "all"
                        ? "Coba ubah kata kunci pencarian atau reset filter tanggal."
                        : "Lakukan transaksi kasir POS baru untuk menghasilkan transaksi penjualan."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-muted/40 transition"
                  >
                    {/* No Invoice */}
                    <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                      {sale.invoiceNo}
                      {sale.status === "cancelled" && (
                        <span className="block text-[10px] text-destructive font-normal font-sans">
                          (Dibatalkan)
                        </span>
                      )}
                    </TableCell>

                    {/* Tanggal */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 opacity-60 shrink-0" />
                        <span>{formatDate(sale.createdAt)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                        Kasir: {sale.cashierName}
                      </span>
                    </TableCell>

                    {/* Pelanggan */}
                    <TableCell className="text-xs">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{sale.customerName}</span>
                      </p>
                      {sale.customerPhone ? (
                        <button
                          type="button"
                          onClick={(e) => handleSendInvoiceWhatsApp(sale, e)}
                          title="Klik untuk langsung chat WhatsApp ke pelanggan dengan pesan terima kasih & struk"
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer text-left mt-1 group"
                        >
                          <MessageSquare className="h-3 w-3 text-[#25D366] shrink-0 group-hover:scale-110 transition-transform" />
                          <span>{sale.customerPhone}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic mt-0.5 block">
                          -
                        </span>
                      )}
                    </TableCell>

                    {/* Rincian Barang */}
                    <TableCell className="text-xs max-w-[320px]">
                      {(() => {
                        const isExpanded = expandedSaleIds.has(sale.id);
                        const displayedItems = isExpanded
                          ? sale.items
                          : sale.items.slice(0, 2);
                        const remainingCount = sale.items.length - 2;

                        return (
                          <div className="space-y-1.5">
                            {displayedItems.map((it, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 flex-wrap leading-tight ${
                                  it.isReturned ? "opacity-60" : ""
                                }`}
                              >
                                <span
                                  className={`font-semibold text-foreground truncate max-w-[180px] ${
                                    it.isReturned
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {it.productName}
                                </span>
                                {(it.capacity || it.color) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {[it.capacity, it.color]
                                      .filter(Boolean)
                                      .join(" ")}
                                  </span>
                                )}
                                {(it.productImei || it.productSku) && (
                                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded shrink-0">
                                    {it.productImei || it.productSku}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                                  x{it.qty}
                                </span>
                                {it.isReturned && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                    Refund
                                  </span>
                                )}
                                {!it.isReturned &&
                                  (it.returnReason?.includes("Tukar") ||
                                    it.returnReason?.includes("tukar") ||
                                    it.returnReason?.startsWith("Ditukar dari")) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenExchangeDetail(it, sale);
                                      }}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200 cursor-pointer shadow-xs"
                                      title="Klik untuk melihat rincian tukar unit"
                                    >
                                      Tukar Unit
                                    </button>
                                  )}
                              </div>
                            ))}

                            {sale.items.length > 2 && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandSale(sale.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Sembunyikan</span>
                                      <span>▲</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>
                                        +{remainingCount} barang lainnya (
                                        {sale.itemCount} total)
                                      </span>
                                      <span>▼</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-right whitespace-nowrap">
                      <p className="font-bold text-sm text-foreground font-mono">
                        {formatRupiah(sale.total)}
                      </p>
                      {sale.discount > 0 && (
                        <p className="text-[10px] text-destructive">
                          Diskon: -{formatRupiah(sale.discount)}
                        </p>
                      )}
                      {sale.additionalFee && sale.additionalFee > 0 ? (
                        <p className="text-[10px] text-primary">
                          Biaya: +{formatRupiah(sale.additionalFee)}
                        </p>
                      ) : null}
                    </TableCell>

                    {/* Komisi */}
                    <TableCell className="text-right whitespace-nowrap">
                      {(() => {
                        const effectiveComm =
                          commissionOverrides.get(sale.id)?.commission ??
                          sale.commission ??
                          0;
                        const effectiveProofUrl = commissionOverrides.has(sale.id)
                          ? commissionOverrides.get(sale.id)!.commissionProofUrl
                          : sale.commissionProofUrl;

                        const displaySale: CommissionSaleInfo = {
                          id: sale.id,
                          invoiceNo: sale.invoiceNo,
                          customerName: sale.customerName,
                          cashierName: sale.cashierName,
                          total: sale.total,
                          commission: effectiveComm,
                          commissionProofUrl: effectiveProofUrl,
                          createdAt: sale.createdAt,
                        };

                        return (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCommissionDetailSale(displaySale);
                              }}
                              className="text-right hover:opacity-80 transition cursor-pointer"
                              title="Klik untuk melihat rincian komisi & bukti transfer"
                            >
                              <span
                                className={`font-bold text-xs font-mono block ${
                                  effectiveComm > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {effectiveComm > 0
                                  ? formatRupiah(effectiveComm)
                                  : "Rp 0"}
                              </span>
                              {effectiveProofUrl ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Camera className="h-2.5 w-2.5" />
                                  <span>Bukti Ada</span>
                                </span>
                              ) : effectiveComm > 0 ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                  Belum Ada Bukti
                                </span>
                              ) : null}
                            </button>

                            {isOwner && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommissionEditSale(displaySale);
                                }}
                                className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                                title="Edit Komisi Transaksi"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Metode Pembayaran */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-semibold gap-1"
                      >
                        {sale.paymentMethod === "cash" && (
                          <Banknote className="h-2.5 w-2.5" />
                        )}
                        {sale.paymentMethod === "transfer" && (
                          <CreditCard className="h-2.5 w-2.5" />
                        )}
                        {sale.paymentMethod === "qris" && (
                          <QrCode className="h-2.5 w-2.5" />
                        )}
                        {sale.paymentMethod === "edc" && (
                          <CreditCard className="h-2.5 w-2.5" />
                        )}
                        <span>{sale.paymentMethod}</span>
                      </Badge>
                    </TableCell>

                    {/* Status Transaksi / Unit */}
                    <TableCell className="text-center whitespace-nowrap">
                      <SaleStatusCell
                        sale={sale}
                        onOpenExchangeDetail={handleOpenExchangeDetail}
                      />
                    </TableCell>

                    {/* Bukti Pembayaran (Khusus Owner ada kolom tersendiri) */}
                    {isOwner && (
                      <TableCell className="text-center whitespace-nowrap">
                        {(() => {
                          const effectiveProofUrl =
                            proofOverrides.get(sale.id) ?? sale.paymentProofUrl;
                          return effectiveProofUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentProofSale(sale);
                                setIsPaymentProofModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold hover:ring-2 hover:ring-emerald-400 transition cursor-pointer"
                              title="Lihat / Ubah Bukti Pembayaran"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Lihat Bukti</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentProofSale(sale);
                                setIsPaymentProofModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-medium transition cursor-pointer"
                              title="Unggah Bukti Pembayaran"
                            >
                              <UploadCloud className="w-3 h-3 text-muted-foreground" />
                              <span>Upload Bukti</span>
                            </button>
                          );
                        })()}
                      </TableCell>
                    )}

                    {/* Kasir */}
                    <TableCell className="text-center whitespace-nowrap text-xs font-medium">
                      <Badge variant="outline" className="text-[11px] font-medium bg-muted/30">
                        {sale.cashierName || "Kasir"}
                      </Badge>
                    </TableCell>

                    {/* Tombol Aksi sesuai Role */}
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(sale)}
                            className="h-8 px-2.5 rounded-xl gap-1 border-border text-xs font-semibold hover:bg-muted"
                            title="Edit Transaksi (Refund / Tukar Unit)"
                          >
                            <Pencil className="h-3.5 w-3.5 text-primary" />
                            <span>Edit</span>
                          </Button>
                        )}

                        {/* Tombol Cetak: Hanya untuk Owner dan Staff Admin (Staff Marketing TIDAK BISA cetak) */}
                        {!isStaffMarketing && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPrintModal(sale)}
                            className="h-8 px-2.5 rounded-xl gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
                            title="Cetak Invoice / Struk"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Cetak</span>
                          </Button>
                        )}

                        {/* Tombol Bukti Pembayaran: Untuk Staff Marketing (menggantikan tombol cetak) dan Staff Admin (melihat bukti) */}
                        {(isStaffMarketing || isStaffAdmin) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPaymentProofSale(sale);
                              setIsPaymentProofModalOpen(true);
                            }}
                            className={cn(
                              "h-8 px-2.5 rounded-xl gap-1 text-xs font-semibold shadow-xs",
                              isStaffMarketing
                                ? "border-teal-200 text-[#055B5A] bg-teal-50/50 hover:bg-teal-100 hover:text-[#044a49] dark:border-teal-800 dark:text-teal-300 dark:bg-teal-950/40"
                                : "border-border text-foreground hover:bg-muted"
                            )}
                            title={
                              isStaffAdmin
                                ? "Lihat Bukti Pembayaran"
                                : "Lihat / Unggah Bukti Pembayaran"
                            }
                          >
                            <ImageIcon className="h-3.5 w-3.5 text-[#055B5A] dark:text-teal-400" />
                            <span>Bukti Pembayaran</span>
                          </Button>
                        )}

                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDeleteModal(sale)}
                            className="h-8 px-2.5 rounded-xl gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold"
                            title="Hapus Riwayat Transaksi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </Button>
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

      {/* MODAL PREVIEW & CETAK INVOICE */}
      {selectedSale && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  <span>Pratinjau & Cetak Invoice</span>
                </DialogTitle>
                {/* Format Selector: Standar A4 vs Struk Thermal */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border text-xs w-fit">
                  <button
                    type="button"
                    onClick={() => setPrintFormat("standard")}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      printFormat === "standard"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Faktur Standar (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat("thermal")}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      printFormat === "thermal"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Struk Thermal (58/80mm)
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* AREA DOKUMEN CETAK (PRINTABLE CONTAINER) */}
            <div
              ref={printAreaRef}
              className={`relative overflow-hidden rounded-xl border border-border p-4 transition ${
                printFormat === "thermal"
                  ? "max-w-[340px] mx-auto bg-white dark:bg-zinc-900 font-mono text-[11px] text-slate-900 dark:text-zinc-100 shadow-inner"
                  : "bg-white text-slate-800 shadow-sm p-6"
              }`}
            >
              {/* WATERMARK DIAGONAL GLORIA PONSEL (TAMPIL DI PREVIEW & CETAK) */}
              <div className="watermark-container pointer-events-none select-none absolute inset-0 z-0 flex flex-col justify-between overflow-hidden py-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`watermark-row flex justify-around items-center whitespace-nowrap w-[140%] ${
                      i % 2 === 0 ? "-ml-8" : "-ml-2"
                    }`}
                  >
                    <span className="watermark-text transform -rotate-25 font-black text-[11px] tracking-[0.2em] text-[#055B5A]/15 uppercase whitespace-nowrap">
                      GLORIA PONSEL
                    </span>
                    <span className="watermark-text transform -rotate-25 font-black text-[11px] tracking-[0.2em] text-[#055B5A]/15 uppercase whitespace-nowrap">
                      GLORIA PONSEL
                    </span>
                    <span className="watermark-text transform -rotate-25 font-black text-[11px] tracking-[0.2em] text-[#055B5A]/15 uppercase whitespace-nowrap">
                      GLORIA PONSEL
                    </span>
                  </div>
                ))}
              </div>

              {/* === TAMPILAN FORMAT THERMAL (STRUKTUR IDENTIK PRATINJAU PENGATURAN PROFIL/TOKO) === */}
              {printFormat === "thermal" ? (
                <div className="relative z-10 thermal-receipt-body space-y-0 text-[10px] font-mono text-slate-800 dark:text-zinc-100">
                  {/* Header Toko Thermal */}
                  <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                    {storeSettings?.logoUrl && (
                      <div className="flex justify-center mb-1.5">
                        <img
                          src={storeSettings.logoUrl}
                          alt="Logo"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      </div>
                    )}
                    <p className="font-bold text-xs uppercase">
                      {storeSettings?.storeName || "GLORIA PONSEL"}
                    </p>
                    <div className="text-[10px] text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-tight">
                      {(storeSettings?.address || "Alamat Toko")
                        .replace(/\r\n/g, "\n")
                        .split("\n")
                        .map((line: string, idx: number) => (
                          <span key={idx} className="block">
                            {line || "\u00A0"}
                          </span>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400">
                      Telp: {storeSettings?.phone || "-"}
                    </p>
                  </div>

                  {/* Meta Transaksi Thermal (Format Identik Preview Pengaturan Toko) */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600 dark:text-zinc-400">
                    <div className="flex justify-center">
                      <span>{formatDate(selectedSale.createdAt)}</span>
                    </div>
                    <div className="flex justify-center font-bold text-slate-900 dark:text-zinc-100">
                      <span>{selectedSale.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>Kasir: {cleanCashierName(selectedSale.cashierName)}</span>
                      <span>Pelanggan: {selectedSale.customerName || "Umum"}</span>
                    </div>
                    {selectedSale.customerPhone && (
                      <div className="flex justify-end font-mono">
                        <span>{selectedSale.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Rincian Item Thermal (Format Identik Preview Pengaturan Toko) */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                    {selectedSale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`space-y-0.5 ${item.isReturned ? "opacity-60" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 pr-1">
                            <p
                              className={`font-semibold leading-tight ${
                                item.isReturned
                                  ? "line-through text-slate-500"
                                  : "text-slate-900 dark:text-zinc-100"
                              }`}
                            >
                              {item.productName}{" "}
                              {item.isReturned ? "(DIREFUND)" : ""}
                            </p>
                            {(item.capacity || item.color) && (
                              <p className="text-[9px] text-slate-500 dark:text-zinc-400 leading-tight">
                                {[item.capacity, item.color].filter(Boolean).join(" • ")}
                              </p>
                            )}
                            {(item.productImei || item.productSku) && (
                              <p className="text-[9px] font-mono text-slate-500 dark:text-zinc-400 leading-tight">
                                IMEI: {item.productImei || item.productSku}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 pt-0.5">
                              {item.qty} x {formatRupiah(item.unitPrice)}
                            </p>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap text-right text-[10px]">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ringkasan Total & Pembayaran Thermal (Format Identik Preview Pengaturan Toko) */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600 dark:text-zinc-400">
                    {selectedSale.discount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatRupiah(selectedSale.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span>Diskon</span>
                          <span>-{formatRupiah(selectedSale.discount)}</span>
                        </div>
                      </>
                    )}
                    {selectedSale.additionalFee && selectedSale.additionalFee > 0 ? (
                      <div className="flex justify-between">
                        <span>Biaya Lain</span>
                        <span>+{formatRupiah(selectedSale.additionalFee)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold text-xs pt-1 text-slate-900 dark:text-zinc-100">
                      <span>TOTAL</span>
                      <span>{formatRupiah(selectedSale.total)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 dark:text-zinc-400">
                      <span className="uppercase">{selectedSale.paymentMethod || "Tunai"}</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {formatRupiah(selectedSale.total)} (LUNAS)
                      </span>
                    </div>
                    {selectedSale.warrantyDays && selectedSale.warrantyDays > 0 ? (
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-zinc-400">
                        <span>Garansi Toko</span>
                        <span>
                          {selectedSale.warrantyDays} Hari
                          {selectedSale.warrantyExpiry
                            ? ` (s/d ${formatDateOnly(selectedSale.warrantyExpiry)})`
                            : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Catatan Footer Struk Thermal */}
                  <div className="pt-3 text-center space-y-1">
                    <p className="whitespace-pre-line text-[10px] text-slate-600 dark:text-zinc-400 leading-tight">
                      {storeSettings?.receiptFooter ||
                        "Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar."}
                    </p>
                  </div>
                </div>
              ) : (
                /* === TAMPILAN FORMAT STANDAR A4 === */
                <div className="relative z-10 space-y-5 text-slate-800">
                  {/* Kop Surat / Header Faktur */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {storeSettings?.logoUrl ? (
                          <img
                            src={storeSettings.logoUrl}
                            alt="Logo"
                            className="h-8 max-w-[120px] object-contain"
                          />
                        ) : (
                          <Store className="h-6 w-6 text-[#055B5A]" />
                        )}
                        <h2 className="text-2xl font-black tracking-tight text-[#055B5A]">
                          {storeSettings?.storeName || "GLORIA PONSEL"}
                        </h2>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">
                        {(storeSettings?.address || "Jl. Toko Gloria Ponsel")
                          .replace(/\r\n/g, "\n")
                          .split("\n")
                          .map((line: string, idx: number) => (
                            <span key={idx} className="block">
                              {line || "\u00A0"}
                            </span>
                          ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Telp/WA: {storeSettings?.phone || "0812-3456-7890"}
                      </p>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="inline-block px-3 py-1 rounded bg-[#055B5A] text-white font-extrabold text-xs tracking-wider uppercase">
                        FAKTUR PENJUALAN
                      </span>
                      <p className="font-mono font-bold text-base text-slate-900 mt-1">
                        {selectedSale.invoiceNo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tanggal: {formatDate(selectedSale.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Informasi Pelanggan & Kasir */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">
                        Ditujukan Kepada:
                      </p>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {selectedSale.customerName}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        No. Telepon: {selectedSale.customerPhone || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">
                        Petugas Kasir:
                      </p>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {selectedSale.cashierName}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Status Pembayaran:{" "}
                        <span className="font-bold text-emerald-700 uppercase">
                          LUNAS ({selectedSale.paymentMethod})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Tabel Rincian Barang A4 */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-3 text-center w-10">No</th>
                          <th className="py-2 px-3">Nama Produk / Unit</th>
                          <th className="py-2 px-3">No. IMEI / Barcode</th>
                          <th className="py-2 px-3 text-center w-16">Qty</th>
                          <th className="py-2 px-3 text-right w-28">
                            Harga Satuan
                          </th>
                          <th className="py-2 px-3 text-right w-32">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSale.items.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/50 ${item.isReturned ? "bg-rose-50/40 opacity-70" : ""}`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <p
                                className={`font-bold text-slate-900 ${item.isReturned ? "line-through text-slate-500" : ""}`}
                              >
                                {item.productName}{" "}
                                {item.isReturned ? "(DIREFUND)" : ""}
                              </p>
                              {(item.capacity || item.color) && (
                                <p className="text-[11px] text-slate-500">
                                  {[item.capacity, item.color]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#055B5A]">
                              {item.productImei || item.productSku || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {item.qty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(item.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rincian Total & Garansi Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                    {/* Kotak Informasi Garansi */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-[#055B5A]" />
                        <span>Ketentuan Garansi Toko:</span>
                      </p>
                      <p className="text-slate-700">
                        Masa Garansi Unit:{" "}
                        <span className="font-bold text-slate-900">
                          {selectedSale.warrantyDays &&
                          selectedSale.warrantyDays > 0
                            ? `${selectedSale.warrantyDays} Hari (Hingga ${formatDateOnly(selectedSale.warrantyExpiry)})`
                            : "Tanpa Garansi"}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 whitespace-pre-line pt-1">
                        {storeSettings?.receiptFooter ||
                          "Nota asli dan segel toko wajib utuh & tidak rusak saat klaim garansi."}
                      </p>
                    </div>

                    {/* Ringkasan Angka Pembayaran */}
                    <div className="space-y-1.5 text-xs text-right p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Barang:</span>
                        <span className="font-mono">
                          {formatRupiah(selectedSale.subtotal)}
                        </span>
                      </div>
                      {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Potongan Diskon:</span>
                          <span className="font-mono">
                            -{formatRupiah(selectedSale.discount)}
                          </span>
                        </div>
                      )}
                      {selectedSale.additionalFee &&
                      selectedSale.additionalFee > 0 ? (
                        <div className="flex justify-between text-[#055B5A] font-semibold">
                          <span>Biaya Tambahan:</span>
                          <span className="font-mono">
                            +{formatRupiah(selectedSale.additionalFee)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300 font-bold text-sm text-slate-900">
                        <span>TOTAL AKHIR:</span>
                        <span className="font-mono text-base text-[#055B5A]">
                          {formatRupiah(selectedSale.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                    <div>
                      <p className="text-slate-500">Tanda Tangan Pelanggan,</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40 mx-auto">
                        {selectedSale.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Hormat Kami (Kasir),</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40 mx-auto">
                        {selectedSale.cashierName}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Banner Tips Cetak Printer Thermal */}
            {printFormat === "thermal" && (
              <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Tips Cetak Struk RPP02N (Thermal 58mm):</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                    Di dialog cetak browser (Ctrl + P), pastikan pilih <strong>Margin: None (Tidak Ada)</strong> dan <strong>hilangkan centang Headers & Footers</strong> agar struk tidak miring atau terpotong.
                  </p>
                </div>
              </div>
            )}

            {/* Tombol Aksi Modal */}
            <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border flex-wrap sm:flex-nowrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isDownloadingJpg}
                onClick={handleDownloadJpg}
                className="w-full sm:w-auto gap-1.5 border-slate-300 dark:border-zinc-700 font-semibold text-xs"
                title="Simpan struk invoice sebagai file gambar JPG"
              >
                {isDownloadingJpg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-slate-700 dark:text-zinc-300" />
                )}
                <span>{isDownloadingJpg ? "Menyimpan..." : "Simpan Gambar"}</span>
              </Button>
              {selectedSale.customerPhone && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingWaImage}
                  onClick={() => handleSendInvoiceWhatsApp(selectedSale)}
                  className="w-full sm:w-auto gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 font-semibold text-xs"
                  title="Kirim gambar struk invoice ke WhatsApp pelanggan"
                >
                  {isSendingWaImage ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#25D366]" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-[#25D366]" />
                  )}
                  <span>{isSendingWaImage ? "Menyiapkan..." : "Kirim Gambar ke WA"}</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={executePrint}
                className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Invoice Sekarang</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL EDIT TRANSAKSI (RETUR & TUKAR UNIT) */}
      {editModalSale && (
        <Dialog
          open={isEditModalOpen}
          onOpenChange={(open) => {
            if (!isSubmitting) {
              setIsEditModalOpen(open);
              if (!open) {
                setEditingItem(null);
                setEditActionType(null);
              }
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  <span>Edit Transaksi: {editModalSale.invoiceNo}</span>
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* Informasi Singkat Transaksi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl text-xs border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px]">
                  Pelanggan:
                </span>
                <span className="font-bold text-foreground">
                  {editModalSale.customerName}
                </span>
                {editModalSale.customerPhone && (
                  <span className="block text-muted-foreground font-mono text-[10px]">
                    {editModalSale.customerPhone}
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">
                  Kasir:
                </span>
                <span className="font-semibold text-foreground">
                  {editModalSale.cashierName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">
                  Total Transaksi:
                </span>
                <span className="font-bold text-primary font-mono">
                  {formatRupiah(editModalSale.total)}
                </span>
              </div>
            </div>

            {/* Jika Belum Memilih Aksi Pada Item, Tampilkan Daftar Barang */}
            {!editingItem ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-foreground">
                  Pilih Barang yang Ingin Di-Refund atau Ditukar Unit:
                </p>

                <div className="space-y-2">
                  {editModalSale.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isReturned
                          ? "bg-muted/30 border-dashed border-border"
                          : "bg-card border-border hover:border-primary/40 shadow-xs"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              item.isReturned
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {item.productName}
                          </span>
                          {item.isReturned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Sudah Direfund
                            </span>
                          )}
                          {!item.isReturned &&
                            item.returnReason?.startsWith("Ditukar dari") && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                                Hasil Tukar Unit
                              </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {(item.capacity || item.color) && (
                            <span>
                              {[item.capacity, item.color]
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          )}
                          {(item.productImei || item.productSku) && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                              IMEI: {item.productImei || item.productSku}
                            </span>
                          )}
                          <span>Qty: {item.qty}</span>
                          <span className="font-mono font-semibold text-foreground">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                        {item.isReturned && item.returnReason && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 italic">
                            Alasan Refund: {item.returnReason}
                          </p>
                        )}
                        {!item.isReturned &&
                          item.returnReason?.startsWith("Ditukar dari") && (
                            <p className="text-[11px] text-sky-700 dark:text-sky-300 italic">
                              {item.returnReason}
                            </p>
                          )}
                      </div>

                      {/* Tombol Aksi Item */}
                      {!item.isReturned && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSelectItemForAction(item, "return")
                            }
                            className="h-8 text-xs font-bold gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Refund</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSelectItemForAction(item, "exchange")
                            }
                            className="h-8 text-xs font-bold gap-1 text-sky-600 border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-sky-900 dark:hover:bg-sky-950/40 cursor-pointer"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            <span>Tukar Unit</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Form Sub-Aksi (Refund atau Tukar Unit) */
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    {editActionType === "return" ? (
                      <RotateCcw className="h-5 w-5 text-rose-600" />
                    ) : (
                      <ArrowLeftRight className="h-5 w-5 text-sky-600" />
                    )}
                    <h4 className="font-bold text-sm text-foreground">
                      {editActionType === "return"
                        ? "Konfirmasi Refund Barang"
                        : "Form Tukar Unit"}
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEditingItem(null);
                      setEditActionType(null);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Kembali ke Daftar
                  </Button>
                </div>

                {/* Unit yang Diproses */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    Unit yang Diproses:
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {editingItem.productName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    IMEI/Barcode:{" "}
                    {editingItem.productImei || editingItem.productSku || "-"} |
                    Subtotal: {formatRupiah(editingItem.subtotal)}
                  </p>
                </div>

                {/* Jika REFUND */}
                {editActionType === "return" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Alasan Refund Barang{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="Contoh: Layar sentuh tidak merespons / Cacat pabrik"
                        value={returnReasonInput}
                        onChange={(e) => setReturnReasonInput(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        Unit ini akan dikembalikan ke stok toko/gudang, total
                        transaksi pada faktur ini akan otomatis berkurang
                        sebesar{" "}
                        <strong>{formatRupiah(editingItem.subtotal)}</strong>,
                        dan status unit otomatis menjadi <strong>Refund</strong>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {/* Jika TUKAR UNIT */}
                {editActionType === "exchange" && (
                  <div className="space-y-3">
                    {/* Jika Unit Pengganti Sudah Dipilih */}
                    {selectedReplacementId ? (
                      (() => {
                        const selectedProd = availableUnits.find(
                          (u) => u.id === selectedReplacementId,
                        );
                        if (!selectedProd) return null;
                        return (
                          <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-sky-600" />
                                <span>Unit Pengganti Terpilih</span>
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setSelectedReplacementId("");
                                  setExchangeSearchQuery("");
                                }}
                                className="h-6 px-2 text-[11px] text-sky-700 hover:text-sky-900 dark:text-sky-300 hover:bg-sky-100/60 cursor-pointer"
                              >
                                Ganti Unit Lain
                              </Button>
                            </div>
                            <div>
                              <p className="font-bold text-sm text-sky-950 dark:text-sky-100">
                                {selectedProd.name}{" "}
                                {selectedProd.color
                                  ? `(${selectedProd.color})`
                                  : ""}
                              </p>
                              <p className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300 mt-0.5">
                                IMEI/Barcode:{" "}
                                {selectedProd.imei || selectedProd.sku}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-sky-800 dark:text-sky-300 mt-1">
                                <span>Stok: {selectedProd.stock}</span>
                                <span>•</span>
                                <span>
                                  Harga:{" "}
                                  {formatRupiah(selectedProd.sellingPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* Jika Belum Dipilih: Input Nama / IMEI / Scan Barcode */
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground">
                          Cari / Scan IMEI Unit Pengganti{" "}
                          <span className="text-rose-500">*</span>
                        </label>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Ketik nama unit, no. IMEI, atau scan barcode..."
                              value={exchangeSearchQuery}
                              onChange={(e) =>
                                setExchangeSearchQuery(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleScanEnterExchange(exchangeSearchQuery);
                                }
                              }}
                              disabled={isSubmitting || isLoadingUnits}
                              className="pl-9 h-10 text-xs rounded-xl"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmitting || isLoadingUnits}
                            onClick={() => {
                              promptCameraPermission();
                              setIsExchangeCameraScannerOpen(true);
                            }}
                            className="h-10 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold gap-1.5 text-xs shrink-0 cursor-pointer"
                            title="Scan Barcode / IMEI dengan Kamera"
                          >
                            <Camera className="h-4 w-4" />
                            <span>Scan Kamera</span>
                          </Button>
                        </div>

                        {/* Hasil Rekomendasi Unit Ready */}
                        {isLoadingUnits ? (
                          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Memuat daftar unit ready stock...</span>
                          </div>
                        ) : availableUnits.length === 0 ? (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                            Tidak ada unit ready stock yang tersedia di toko
                            saat ini.
                          </div>
                        ) : filteredExchangeUnits.length === 0 ? (
                          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground text-center">
                            Tidak ada unit ready stock yang cocok dengan
                            pencarian / IMEI tersebut.
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-1.5 bg-muted/20">
                            <p className="text-[10px] text-muted-foreground font-semibold px-1 pt-0.5">
                              {exchangeSearchQuery.trim()
                                ? `Hasil Pencarian (${filteredExchangeUnits.length} unit):`
                                : `Pilih Unit Ready Stock (${filteredExchangeUnits.length} unit tersedia):`}
                            </p>
                            {filteredExchangeUnits.map((u) => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setSelectedReplacementId(u.id);
                                  setExchangeSearchQuery("");
                                }}
                                className="flex items-center justify-between p-2 rounded-lg bg-card hover:bg-primary/5 hover:border-primary/40 border border-border transition cursor-pointer text-xs"
                              >
                                <div className="pr-2">
                                  <p className="font-bold text-foreground truncate max-w-[240px]">
                                    {u.name} {u.color ? `(${u.color})` : ""}
                                  </p>
                                  <p className="text-[11px] font-mono font-semibold text-primary">
                                    IMEI: {u.imei || u.sku}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-mono font-bold text-foreground">
                                    {formatRupiah(u.sellingPrice)}
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] rounded-md font-bold mt-0.5 bg-primary text-primary-foreground"
                                  >
                                    Pilih Unit
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Alasan / Catatan Tukar Unit
                      </label>
                      <Input
                        placeholder="Contoh: Klaim garansi toko - tukar unit baru"
                        value={returnReasonInput}
                        onChange={(e) => setReturnReasonInput(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        Unit lama akan dikembalikan ke gudang dengan status{" "}
                        <strong>Refund</strong>. Unit pengganti baru akan
                        otomatis masuk ke transaksi ini dan{" "}
                        <strong>tercatat pada Status</strong> menggantikan unit
                        lama.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tombol Aksi Submit Form */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEditingItem(null);
                      setEditActionType(null);
                    }}
                    className="text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isSubmitting ||
                      (editActionType === "return" &&
                        !returnReasonInput.trim()) ||
                      (editActionType === "exchange" && !selectedReplacementId)
                    }
                    onClick={handleSubmitEditAction}
                    className={`text-xs rounded-xl font-bold gap-1.5 cursor-pointer ${
                      editActionType === "return"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-sky-600 hover:bg-sky-700 text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : editActionType === "return" ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Simpan Refund</span>
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span>Simpan Tukar Unit</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Modal Edit */}
            {!editingItem && (
              <DialogFooter className="pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-full sm:w-auto text-xs cursor-pointer"
                >
                  Tutup
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Scanner Kamera untuk Tukar Unit */}
      <BarcodeScannerModal
        open={isExchangeCameraScannerOpen}
        onOpenChange={setIsExchangeCameraScannerOpen}
        onScanSuccess={(val) => handleBarcodeScanExchange(val)}
        title="Scan Barcode / IMEI Unit Pengganti"
        description="Arahkan kamera ke stiker barcode IMEI atau nomor barcode pada kotak unit pengganti."
      />

      {/* MODAL KONFIRMASI HAPUS TRANSAKSI */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Riwayat Transaksi</span>
            </DialogTitle>
          </DialogHeader>

          {deletingSale && (
            <div className="space-y-3 py-2 text-xs text-muted-foreground">
              <p>
                Apakah Anda yakin ingin menghapus riwayat transaksi dengan nomor
                faktur{" "}
                <strong className="text-foreground font-mono">
                  {deletingSale.invoiceNo}
                </strong>
                ?
              </p>
              <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-1">
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold text-foreground">
                    {deletingSale.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Transaksi:</span>
                  <span className="font-bold text-foreground font-mono">
                    {formatRupiah(deletingSale.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Jumlah Barang:</span>
                  <span className="font-bold text-foreground">
                    {deletingSale.items.length} item
                  </span>
                </div>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                <strong>Perhatian:</strong> Riwayat transaksi ini akan dihapus
                secara permanen. Unit barang yang belum direfund akan
                dikembalikan secara otomatis ke stok inventaris.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingSale(null);
              }}
              disabled={isDeleting}
              className="rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Ya, Hapus Transaksi</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS SEMUA TRANSAKSI */}
      <Dialog
        open={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Semua Riwayat Transaksi</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              Apakah Anda yakin ingin menghapus{" "}
              <strong>seluruh data riwayat transaksi penjualan</strong>?
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
              <strong>Peringatan:</strong> Tindakan ini akan menghapus semua
              faktur penjualan dan mutasi stok penjualan terkait. Seluruh stok
              unit yang belum direfund akan dikembalikan ke stok aktif. Data
              master seperti produk, pelanggan, dan pengguna tidak akan
              terhapus.
            </div>
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-foreground block">
                Ketik{" "}
                <span className="text-rose-600 font-mono font-black">
                  HAPUS
                </span>{" "}
                untuk konfirmasi:
              </label>
              <Input
                value={confirmDeleteAllText}
                onChange={(e) => setConfirmDeleteAllText(e.target.value)}
                placeholder="Ketik HAPUS"
                className="h-9 text-xs rounded-xl border-rose-300 focus-visible:ring-rose-500 font-mono uppercase"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDeleteAllDialogOpen(false);
                setConfirmDeleteAllText("");
              }}
              disabled={isDeletingAll}
              className="rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAll}
              disabled={
                isDeletingAll || confirmDeleteAllText.trim() !== "HAPUS"
              }
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menghapus Semua...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Semua Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DETAIL TUKAR UNIT */}
      <ExchangeDetailDialog
        open={isExchangeDialogOpen}
        onOpenChange={setIsExchangeDialogOpen}
        data={exchangeDetail}
      />

      {/* DIALOG DETAIL KOMISI & BUKTI FOTO */}
      <CommissionDetailDialog
        open={Boolean(commissionDetailSale)}
        onOpenChange={(open) => !open && setCommissionDetailSale(null)}
        sale={commissionDetailSale}
        isOwner={isOwner}
        onEditCommission={(s) => {
          setCommissionDetailSale(null);
          setCommissionEditSale(s);
        }}
      />

      {/* DIALOG EDIT KOMISI & UNGGAH BUKTI (OWNER ONLY) */}
      <CommissionEditDialog
        open={Boolean(commissionEditSale)}
        onOpenChange={(open) => !open && setCommissionEditSale(null)}
        sale={commissionEditSale}
        onSuccess={(updated) => {
          setCommissionOverrides((prev) => {
            const next = new Map(prev);
            next.set(updated.id, {
              commission: updated.commission,
              commissionProofUrl: updated.commissionProofUrl,
            });
            return next;
          });
          router.refresh();
        }}
      />

      {/* DIALOG BUKTI PEMBAYARAN TRANSAKSI */}
      {paymentProofSale && (
        <PaymentProofModal
          isOpen={isPaymentProofModalOpen}
          onClose={() => {
            setIsPaymentProofModalOpen(false);
            setPaymentProofSale(null);
          }}
          saleId={paymentProofSale.id}
          invoiceNo={paymentProofSale.invoiceNo}
          customerPhone={paymentProofSale.customerPhone}
          initialProofUrl={
            proofOverrides.get(paymentProofSale.id) ??
            paymentProofSale.paymentProofUrl
          }
          readOnly={isStaffAdmin}
          userRole={currentUserRole}
          onUploaded={(newUrl) =>
            handleProofUploaded(paymentProofSale.id, newUrl)
          }
          transactionDate={paymentProofSale.createdAt}
          customerName={paymentProofSale.customerName}
          cashierName={paymentProofSale.cashierName}
          total={paymentProofSale.total}
          items={paymentProofSale.items}
        />
      )}

      {/* OFFSCREEN THERMAL RECEIPT RENDERER FOR INSTANT IMAGE EXPORT */}
      <div
        style={{
          position: "absolute",
          left: "0px",
          top: "0px",
          width: "360px",
          zIndex: -99999,
          pointerEvents: "none",
          opacity: 1,
          visibility: "visible",
          overflow: "visible",
          background: "#ffffff",
        }}
        aria-hidden="true"
      >
        <div ref={offscreenPrintRef} className="bg-white p-4 font-mono text-slate-800" style={{ width: "340px", minWidth: "340px" }}>
          {(activeCaptureSale || selectedSale) && (
            <div className="relative z-10 thermal-receipt-body space-y-0 text-[10px] font-mono text-slate-800 bg-white">
              {/* Header Toko Thermal */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                {storeSettings?.logoUrl && (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={storeSettings.logoUrl}
                      alt="Logo"
                      className="h-8 max-w-[120px] object-contain"
                    />
                  </div>
                )}
                <p className="font-bold text-xs uppercase">
                  {storeSettings?.storeName || "GLORIA PONSEL"}
                </p>
                <div className="text-[10px] text-slate-600 whitespace-pre-line leading-tight">
                  {(storeSettings?.address || "Alamat Toko")
                    .replace(/\r\n/g, "\n")
                    .split("\n")
                    .map((line: string, idx: number) => (
                      <span key={idx} className="block">
                        {line || "\u00A0"}
                      </span>
                    ))}
                </div>
                <p className="text-[10px] text-slate-600">
                  Telp: {storeSettings?.phone || "-"}
                </p>
              </div>

              {/* Meta Transaksi Thermal (Format Identik Preview Pengaturan Toko) */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600">
                <div className="flex justify-center">
                  <span>{formatDate((activeCaptureSale || selectedSale)!.createdAt)}</span>
                </div>
                <div className="flex justify-center font-bold text-slate-900">
                  <span>{(activeCaptureSale || selectedSale)!.invoiceNo}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span>Kasir: {cleanCashierName((activeCaptureSale || selectedSale)!.cashierName)}</span>
                  <span>Pelanggan: {(activeCaptureSale || selectedSale)!.customerName || "Umum"}</span>
                </div>
                {(activeCaptureSale || selectedSale)!.customerPhone && (
                  <div className="flex justify-end font-mono">
                    <span>{(activeCaptureSale || selectedSale)!.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Rincian Item Thermal (Format Identik Preview Pengaturan Toko) */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                {(activeCaptureSale || selectedSale)!.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`space-y-0.5 ${item.isReturned ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 pr-1">
                        <p
                          className={`font-semibold leading-tight ${
                            item.isReturned ? "line-through text-slate-500" : "text-slate-900"
                          }`}
                        >
                          {item.productName}{" "}
                          {item.isReturned ? "(DIREFUND)" : ""}
                        </p>
                        {(item.capacity || item.color) && (
                          <p className="text-[9px] text-slate-500 leading-tight">
                            {[item.capacity, item.color].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {(item.productImei || item.productSku) && (
                          <p className="text-[9px] font-mono text-slate-500 leading-tight">
                            IMEI: {item.productImei || item.productSku}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 pt-0.5">
                          {item.qty} x {formatRupiah(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 whitespace-nowrap text-right text-[10px]">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ringkasan Total & Pembayaran Thermal (Format Identik Preview Pengaturan Toko) */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600">
                {(activeCaptureSale || selectedSale)!.discount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah((activeCaptureSale || selectedSale)!.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon</span>
                      <span>-{formatRupiah((activeCaptureSale || selectedSale)!.discount)}</span>
                    </div>
                  </>
                )}
                {(activeCaptureSale || selectedSale)!.additionalFee && (activeCaptureSale || selectedSale)!.additionalFee! > 0 ? (
                  <div className="flex justify-between">
                    <span>Biaya Lain</span>
                    <span>+{formatRupiah((activeCaptureSale || selectedSale)!.additionalFee!)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-xs pt-1 text-slate-900">
                  <span>TOTAL</span>
                  <span>{formatRupiah((activeCaptureSale || selectedSale)!.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span className="uppercase">{(activeCaptureSale || selectedSale)!.paymentMethod || "Tunai"}</span>
                  <span className="font-medium text-slate-800">
                    {formatRupiah((activeCaptureSale || selectedSale)!.total)} (LUNAS)
                  </span>
                </div>
                {(activeCaptureSale || selectedSale)!.warrantyDays && (activeCaptureSale || selectedSale)!.warrantyDays! > 0 ? (
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Garansi Toko</span>
                    <span>
                      {(activeCaptureSale || selectedSale)!.warrantyDays} Hari
                      {(activeCaptureSale || selectedSale)!.warrantyExpiry
                        ? ` (s/d ${formatDateOnly((activeCaptureSale || selectedSale)!.warrantyExpiry)})`
                        : ""}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Catatan Footer Struk Thermal */}
              <div className="pt-3 text-center space-y-1">
                <p className="whitespace-pre-line text-[10px] text-slate-600 leading-tight">
                  {storeSettings?.receiptFooter ||
                    "Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
