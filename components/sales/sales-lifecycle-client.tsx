"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Boxes,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Smartphone,
  Headphones,
  ArrowRight,
  User,
  Calendar,
  Receipt,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  FileText,
  BadgePercent,
  RotateCcw,
  Loader2,
  AlertCircle,
  Pencil,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
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
  ReadyItemData,
  WarrantyItemData,
  SoldItemData,
  returnWarrantyItem,
} from "@/lib/actions/sale.actions";
import { updateProductStatus } from "@/lib/actions/product.actions";

interface SalesLifecycleClientProps {
  initialReadyItems: ReadyItemData[];
  initialWarrantyItems: WarrantyItemData[];
  initialSoldItems: SoldItemData[];
  userRole?: string;
}

/**
 * Komponen Countdown Timer Real-Time untuk Garansi Unit
 */
function WarrantyCountdownTimer({
  expiryDateStr,
  saleDateStr,
}: {
  expiryDateStr: string;
  saleDateStr: string;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    progressPercent: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    progressPercent: 100,
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryDateStr).getTime();
      const start = new Date(saleDateStr).getTime();
      const totalDuration = Math.max(1, expiry - start);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          progressPercent: 100,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const elapsed = now - start;
      const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        progressPercent,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiryDateStr, saleDateStr]);

  if (timeLeft.isExpired) {
    return (
      <Badge variant="outline" className="border-border text-muted-foreground bg-muted/40 font-mono text-[10px] py-0.5 px-1.5 whitespace-nowrap">
        Habis
      </Badge>
    );
  }

  // Visual severity based on remaining days
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;
  const isNear = timeLeft.days <= 2;

  const colorClasses = isUrgent
    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200/80"
    : isNear
    ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/80"
    : "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80";

  return (
    <div className="space-y-1 w-fit max-w-[125px]">
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-mono font-medium leading-tight ${colorClasses}`}>
        <Clock className="h-3 w-3 shrink-0 animate-pulse" />
        <span className="tabular-nums whitespace-nowrap">
          {timeLeft.days > 0 && `${timeLeft.days}h `}
          {String(timeLeft.hours).padStart(2, "0")}:
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Progress Bar Sisa Garansi */}
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isUrgent ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${100 - timeLeft.progressPercent}%` }}
          title={`Sisa waktu: ${Math.round(100 - timeLeft.progressPercent)}%`}
        />
      </div>
    </div>
  );
}

export function SalesLifecycleClient({
  initialReadyItems,
  initialWarrantyItems,
  initialSoldItems,
  userRole = "super_admin",
}: SalesLifecycleClientProps) {
  const router = useRouter();
  const isSuperAdmin = userRole === "super_admin";
  const [activeTab, setActiveTab] = useState<"ready" | "warranty" | "sold">("ready");
  const currentTab = !isSuperAdmin ? "ready" : activeTab;
  const [searchQuery, setSearchQuery] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<"all" | "phone" | "accessory">("all");

  // Local synced state for instant UI responsiveness
  const [readyItems, setReadyItems] = useState<ReadyItemData[]>(initialReadyItems);
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItemData[]>(initialWarrantyItems);
  const [soldItems, setSoldItems] = useState<SoldItemData[]>(initialSoldItems);

  useEffect(() => {
    setReadyItems(initialReadyItems);
  }, [initialReadyItems]);

  useEffect(() => {
    setWarrantyItems(initialWarrantyItems);
  }, [initialWarrantyItems]);

  useEffect(() => {
    setSoldItems(initialSoldItems);
  }, [initialSoldItems]);

  // Retur Barang Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [itemToReturn, setItemToReturn] = useState<WarrantyItemData | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState("");

  const handleReturnSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemToReturn) return;

    try {
      setIsSubmittingReturn(true);
      setReturnError("");
      const res = await returnWarrantyItem({
        saleItemId: itemToReturn.id,
        returnReason: returnReason.trim() || "Klaim Garansi Toko",
      });

      if (res.success) {
        toast.success(res.message);

        // Optimistic UI updates
        setWarrantyItems((prev) => prev.filter((it) => it.id !== itemToReturn.id));
        setReadyItems((prev) => {
          const existingIdx = prev.findIndex((p) => p.id === itemToReturn.productId);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = {
              ...copy[existingIdx],
              stock: copy[existingIdx].stock + itemToReturn.qty,
              status: "retur",
            };
            return copy;
          } else {
            return [
              {
                id: itemToReturn.productId,
                name: itemToReturn.productName,
                brandName: "-",
                categoryName: "-",
                sku: itemToReturn.sku,
                imei: itemToReturn.imei,
                productType: itemToReturn.productType,
                capacity: itemToReturn.capacity,
                color: itemToReturn.color,
                completeness: null,
                retailSupplier: null,
                status: "retur",
                purchasePrice: 0,
                sellingPrice: itemToReturn.unitPrice,
                stock: itemToReturn.qty,
                entryDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }
        });

        setReturnModalOpen(false);
        setItemToReturn(null);
        setReturnReason("");
        router.refresh();
      }
    } catch (err: any) {
      setReturnError(err?.message || "Terjadi kesalahan saat memproses retur barang.");
      toast.error(err?.message || "Gagal memproses retur barang.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Edit Status Unit Modal State (Tab Ready)
  const [editStatusModalOpen, setEditStatusModalOpen] = useState(false);
  const [itemToEditStatus, setItemToEditStatus] = useState<ReadyItemData | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<"available" | "retur" | "sold">("available");
  const [editPriceValue, setEditPriceValue] = useState<number>(0);
  const [isSubmittingEditStatus, setIsSubmittingEditStatus] = useState(false);

  const handleOpenEditStatus = (item: ReadyItemData) => {
    if (!isSuperAdmin) return;
    setItemToEditStatus(item);
    setEditStatusValue(((item.status as any) || "available") as "available" | "retur" | "sold");
    setEditPriceValue(item.sellingPrice);
    setEditStatusModalOpen(true);
  };

  const handleSaveEditStatus = async () => {
    if (!itemToEditStatus) return;
    try {
      setIsSubmittingEditStatus(true);
      const res = await updateProductStatus(
        itemToEditStatus.id,
        editStatusValue,
        editPriceValue !== itemToEditStatus.sellingPrice ? editPriceValue : undefined
      );

      if (res.success) {
        toast.success(res.message);
        if (editStatusValue === "sold") {
          setReadyItems((prev) => prev.filter((p) => p.id !== itemToEditStatus.id));
        } else {
          setReadyItems((prev) =>
            prev.map((p) =>
              p.id === itemToEditStatus.id
                ? { ...p, status: editStatusValue, sellingPrice: editPriceValue || p.sellingPrice }
                : p
            )
          );
        }
        setEditStatusModalOpen(false);
        setItemToEditStatus(null);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengubah status unit.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmittingEditStatus(false);
    }
  };

  // Selected item detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<{
    invoiceNo: string;
    saleDate: string;
    customerName: string;
    customerPhone: string | null;
    cashierName: string;
    productName: string;
    imei: string | null;
    sku: string;
    warrantyDays: number;
    warrantyExpiry: string | null;
    unitPrice: number;
    qty: number;
    subtotal: number;
  } | null>(null);

  // Dynamic filter for Tab Ready
  const filteredReadyItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return readyItems.filter((item) => {
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.imei && item.imei.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q) ||
        item.brandName.toLowerCase().includes(q);

      const matchType =
        productTypeFilter === "all" || item.productType === productTypeFilter;

      return matchQuery && matchType;
    });
  }, [readyItems, searchQuery, productTypeFilter]);

  // Dynamic filter for Tab Garansi
  const filteredWarrantyItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return warrantyItems.filter((item) => {
      const matchQuery =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.imei && item.imei.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q) ||
        item.invoiceNo.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q);

      const matchType =
        productTypeFilter === "all" || item.productType === productTypeFilter;

      return matchQuery && matchType;
    });
  }, [warrantyItems, searchQuery, productTypeFilter]);

  // Dynamic filter for Tab Sold
  const filteredSoldItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return soldItems.filter((item) => {
      const matchQuery =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.imei && item.imei.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q) ||
        item.invoiceNo.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q);

      const matchType =
        productTypeFilter === "all" || item.productType === productTypeFilter;

      return matchQuery && matchType;
    });
  }, [soldItems, searchQuery, productTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Header & 3-Tab Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="h-5 w-5 text-primary" />
            <span>Manajemen Unit</span>
          </h2>
        </div>

        {/* Tab Controls with live counters */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ready")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === "ready"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Ready</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                currentTab === "ready" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {readyItems.length}
            </span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("warranty")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  currentTab === "warranty"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Garansi</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    currentTab === "warranty" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {warrantyItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sold")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  currentTab === "sold"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Sold</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    currentTab === "sold" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {soldItems.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "ready"
                ? "Cari nama unit, IMEI, atau SKU..."
                : "Cari nomor faktur, nama pembeli, atau IMEI/SKU..."
            }
            className="pl-10 h-10 text-xs rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => setProductTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                productTypeFilter === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Tipe
            </button>
            <button
              type="button"
              onClick={() => setProductTypeFilter("phone")}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                productTypeFilter === "phone"
                  ? "bg-background text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Handphone</span>
            </button>
            <button
              type="button"
              onClick={() => setProductTypeFilter("accessory")}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                productTypeFilter === "accessory"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Aksesoris</span>
            </button>
          </div>

          {isSuperAdmin && currentTab === "ready" && (
            <Button asChild className="h-10 text-xs font-bold gap-2 rounded-xl">
              <Link href="/sales">
                <ShoppingBag className="h-4 w-4" />
                <span>Buka Kasir POS</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: BARANG READY */}
      {currentTab === "ready" && (
        <Card className="border-border overflow-hidden shadow-xs rounded-2xl">
          <div className="p-3.5 bg-muted/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-foreground">Unit Ready ({filteredReadyItems.length})</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Produk / Spesifikasi</TableHead>
                  <TableHead className="text-xs font-semibold">Tipe</TableHead>
                  <TableHead className="text-xs font-semibold">Barcode / IMEI / SKU</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Harga Jual</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadyItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-xs">
                      Tidak ada barang ready yang sesuai dengan pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReadyItems.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition">
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.brandName} • {item.capacity || ""} {item.color || ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.productType === "phone" ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                            HP
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Aksesoris
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.imei ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">IMEI: {item.imei}</span>
                            <span className="block text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                          </div>
                        ) : (
                          <span className="text-foreground">SKU: {item.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(item.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditStatus(item)}
                            className="focus:outline-none group/badge transition transform hover:scale-105"
                            title="Klik untuk mengubah status unit / harga"
                          >
                            {item.status === "retur" ? (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold gap-1.5 cursor-pointer hover:bg-amber-500/25">
                                <RotateCcw className="h-3 w-3" />
                                <span>Retur</span>
                                <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold gap-1.5 cursor-pointer hover:bg-emerald-600/25">
                                <span>Ready Stock</span>
                                <Pencil className="h-2.5 w-2.5 opacity-60 group-hover/badge:opacity-100" />
                              </Badge>
                            )}
                          </button>
                        ) : (
                          <div className="inline-flex">
                            {item.status === "retur" ? (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold gap-1.5 cursor-default">
                                <RotateCcw className="h-3 w-3" />
                                <span>Retur</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold gap-1.5 cursor-default">
                                <span>Ready Stock</span>
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 text-xs font-bold text-primary gap-1">
                          <Link href="/sales">
                            <span>Jual</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 2: BARANG GARANSI (COUNTDOWN AKTIF) */}
      {isSuperAdmin && currentTab === "warranty" && (
        <Card className="border-border overflow-hidden shadow-xs rounded-2xl">
          <div className="p-3.5 bg-muted/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">
                Masa Garansi ({filteredWarrantyItems.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Produk & Spesifikasi</TableHead>
                  <TableHead className="text-xs font-semibold">IMEI / SKU</TableHead>
                  <TableHead className="text-xs font-semibold">Pelanggan & Faktur</TableHead>
                  <TableHead className="text-xs font-semibold">Oleh</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap w-24">Garansi</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap w-32">Sisa Garansi</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Harga Jual</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarrantyItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-xs">
                      Tidak ada unit yang sedang dalam masa garansi aktif saat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarrantyItems.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition">
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.capacity || ""} {item.color || ""}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.imei ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">IMEI: {item.imei}</span>
                            <span className="block text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                          </div>
                        ) : (
                          <span className="text-foreground">SKU: {item.sku}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{item.customerName}</span>
                          </p>
                          <p className="text-[10px] font-mono text-primary font-semibold">
                            {item.invoiceNo}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.saleDate).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.cashierName || "Admin"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs">
                          {item.warrantyDays} Hari
                        </span>
                      </TableCell>
                      <TableCell className="py-2 whitespace-nowrap">
                        <WarrantyCountdownTimer
                          expiryDateStr={item.warrantyExpiry}
                          saleDateStr={item.saleDate}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                        {formatRupiah(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedInvoice({
                                invoiceNo: item.invoiceNo,
                                saleDate: item.saleDate,
                                customerName: item.customerName,
                                customerPhone: item.customerPhone,
                                cashierName: item.cashierName,
                                productName: item.productName,
                                imei: item.imei,
                                sku: item.sku,
                                warrantyDays: item.warrantyDays,
                                warrantyExpiry: item.warrantyExpiry,
                                unitPrice: item.unitPrice,
                                qty: item.qty,
                                subtotal: item.subtotal,
                              })
                            }
                            className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Faktur</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setItemToReturn(item);
                              setReturnReason("");
                              setReturnError("");
                              setReturnModalOpen(true);
                            }}
                            className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-400"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                            <span>Retur</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* TAB 3: BARANG SOLD (TERJUAL / GARANSI HABIS) */}
      {isSuperAdmin && currentTab === "sold" && (
        <Card className="border-border overflow-hidden shadow-xs rounded-2xl">
          <div className="p-3.5 bg-muted/20 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">
                Unit Terjual ({filteredSoldItems.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Produk & Spesifikasi</TableHead>
                  <TableHead className="text-xs font-semibold">IMEI / SKU</TableHead>
                  <TableHead className="text-xs font-semibold">Pelanggan & Faktur</TableHead>
                  <TableHead className="text-xs font-semibold">Oleh</TableHead>
                  <TableHead className="text-xs font-semibold">Status Garansi</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Harga Transaksi</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Metode</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSoldItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-xs">
                      Belum ada unit terjual yang tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSoldItems.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition">
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.capacity || ""} {item.color || ""}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.imei ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">IMEI: {item.imei}</span>
                            <span className="block text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                          </div>
                        ) : (
                          <span className="text-foreground">SKU: {item.sku}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{item.customerName}</span>
                          </p>
                          <p className="text-[10px] font-mono text-primary font-semibold">
                            {item.invoiceNo}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.saleDate).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.cashierName || "Admin"}
                      </TableCell>
                      <TableCell>
                        {item.warrantyDays > 0 ? (
                          <Badge variant="outline" className="border-border text-muted-foreground bg-muted/30 text-[10px]">
                            Garansi {item.warrantyDays} Hari (Selesai)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground bg-muted/20 text-[10px]">
                            Tanpa Garansi
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                        {formatRupiah(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground font-mono">
                          {item.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedInvoice({
                              invoiceNo: item.invoiceNo,
                              saleDate: item.saleDate,
                              customerName: item.customerName,
                              customerPhone: item.customerPhone,
                              cashierName: item.cashierName,
                              productName: item.productName,
                              imei: item.imei,
                              sku: item.sku,
                              warrantyDays: item.warrantyDays,
                              warrantyExpiry: item.warrantyExpiry,
                              unitPrice: item.unitPrice,
                              qty: item.qty,
                              subtotal: item.subtotal,
                            })
                          }
                          className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Faktur</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* DETAIL MODAL FAKTUR */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Receipt className="h-5 w-5 text-primary" />
                <span>Informasi Faktur & Garansi</span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 bg-muted/30 rounded-xl border border-border text-xs space-y-3 font-mono">
              <div className="flex justify-between border-b border-border pb-2">
                <div>
                  <span className="text-muted-foreground text-[10px] block">No. Faktur:</span>
                  <span className="font-bold text-foreground text-sm">{selectedInvoice.invoiceNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] block">Tanggal Beli:</span>
                  <span className="font-bold text-foreground">
                    {new Date(selectedInvoice.saleDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-bold text-foreground">{selectedInvoice.customerName}</span>
                </div>
                {selectedInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telepon:</span>
                    <span>{selectedInvoice.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kasir:</span>
                  <span>{selectedInvoice.cashierName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold">{selectedInvoice.productName}</span>
                  <span className="font-bold">{formatRupiah(selectedInvoice.subtotal)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedInvoice.imei ? `IMEI: ${selectedInvoice.imei}` : `SKU: ${selectedInvoice.sku}`} ({selectedInvoice.qty}x)
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Masa Garansi Toko:</span>
                  <span className="font-bold text-primary">
                    {selectedInvoice.warrantyDays > 0
                      ? `${selectedInvoice.warrantyDays} Hari`
                      : "Tanpa Garansi"}
                  </span>
                </div>
                {selectedInvoice.warrantyExpiry && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Garansi Berakhir:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedInvoice.warrantyExpiry).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSelectedInvoice(null)}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL KONFIRMASI RETUR BARANG */}
      <Dialog
        open={returnModalOpen}
        onOpenChange={(open) => {
          if (!isSubmittingReturn) {
            setReturnModalOpen(open);
            if (!open) {
              setItemToReturn(null);
              setReturnReason("");
              setReturnError("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <span className="block">Retur Barang ke Stok</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Kembalikan barang bergaransi ke stok Ready dengan status &quot;Retur&quot;
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {itemToReturn && (
            <div className="space-y-4 pt-2">
              {returnError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{returnError}</span>
                </div>
              )}

              <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-2 font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground text-sm font-sans">{itemToReturn.productName}</p>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      {itemToReturn.capacity || ""} {itemToReturn.color || ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50/50 text-[10px]">
                    Garansi {itemToReturn.warrantyDays} Hari
                  </Badge>
                </div>
                <div className="text-[11px] space-y-1 pt-1.5 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">No. Faktur:</span>
                    <span className="font-semibold text-primary">{itemToReturn.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Pelanggan:</span>
                    <span className="text-foreground">{itemToReturn.customerName}</span>
                  </div>
                  {itemToReturn.imei && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">IMEI:</span>
                      <span className="font-semibold text-foreground">{itemToReturn.imei}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Jumlah Unit:</span>
                    <span className="font-bold text-foreground">{itemToReturn.qty} Unit</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Unit ini akan dimasukkan kembali ke daftar stok <strong>Ready</strong> dengan status <strong>Retur</strong>. Riwayat penjualan akan mencatat bahwa barang telah diretur.
                </span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="returnReason" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Alasan Retur / Kendala Barang (Opsional)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Maks. 200 karakter</span>
                </label>
                <textarea
                  id="returnReason"
                  rows={2}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Kerusakan kamera / klaim garansi layar / tombol tidak merespon"
                  className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-muted-foreground"
                  maxLength={200}
                  disabled={isSubmittingReturn}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmittingReturn}
                  onClick={() => setReturnModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isSubmittingReturn}
                  onClick={() => handleReturnSubmit()}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
                >
                  {isSubmittingReturn ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Konfirmasi Retur</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL UBAH STATUS UNIT (TAB READY) */}
      {isSuperAdmin && (
        <Dialog
          open={editStatusModalOpen}
          onOpenChange={(open) => {
            if (!isSubmittingEditStatus) {
              setEditStatusModalOpen(open);
              if (!open) setItemToEditStatus(null);
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
                  <span className="block">Ubah Status Unit Ready</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Ubah status unit antara Ready Stock / Retur atau sesuaikan harga jual
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>

            {itemToEditStatus && (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5 font-mono">
                  <div>
                    <p className="font-bold text-foreground text-sm font-sans">{itemToEditStatus.name}</p>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      {itemToEditStatus.brandName} • {itemToEditStatus.capacity || ""} {itemToEditStatus.color || ""}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-border flex justify-between text-[11px]">
                    <span className="text-muted-foreground font-sans">IMEI / Barcode:</span>
                    <span className="font-semibold text-primary">{itemToEditStatus.imei || itemToEditStatus.sku}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Pilih Status Unit:</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditStatusValue("available")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        editStatusValue === "available"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                          : "border-border bg-card text-muted-foreground hover:border-emerald-300"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Ready Stock</span>
                      <span className="text-[10px] font-normal opacity-80">Unit Normal Siap Jual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditStatusValue("retur")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        editStatusValue === "retur"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                          : "border-border bg-card text-muted-foreground hover:border-amber-300"
                      }`}
                    >
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                      <span>Retur</span>
                      <span className="text-[10px] font-normal opacity-80">Unit Bekas Retur Garansi</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Harga Jual Unit (Rp):</label>
                  <CurrencyInput
                    value={editPriceValue}
                    onValueChange={(val) => setEditPriceValue(val)}
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
                    disabled={isSubmittingEditStatus}
                    onClick={() => setEditStatusModalOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingEditStatus}
                    onClick={handleSaveEditStatus}
                    className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold gap-1.5"
                  >
                    {isSubmittingEditStatus ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Perubahan</span>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
