"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ScanBarcode,
  Camera,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Banknote,
  CreditCard,
  QrCode,
  User,
  Printer,
  Smartphone,
  Headphones,
  Search,
  X,
  ShoppingBag,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { createSale } from "@/lib/actions/sale.actions";
import { getProductByImei } from "@/lib/actions/product.actions";
import { BarcodeScannerModal, scanBarcodeFromFile } from "@/components/ui/barcode-scanner-modal";

export interface PosProductItem {
  id: string;
  name: string;
  sku: string;
  imei?: string | null;
  productType?: "phone" | "accessory";
  capacity?: string | null;
  color?: string | null;
  completeness?: string | null;
  retailSupplier?: string | null;
  status?: string;
  sellingPrice: number;
  stock: number;
  brandName?: string | null;
  categoryName?: string | null;
}

export interface PosCustomerItem {
  id: string;
  name: string;
  phone: string | null;
}

interface CartLineItem {
  product: PosProductItem;
  qty: number;
}

interface SalesPosClientProps {
  products: PosProductItem[];
  customers: PosCustomerItem[];
  onSaleCreated?: (invoiceNo: string) => void;
}

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function SalesPosClient({
  products,
  customers,
  onSaleCreated,
}: SalesPosClientProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("Pelanggan Umum");
  const [discount, setDiscount] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [warrantyDays, setWarrantyDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "edc" | "qris">("cash");
  const [cashAmount, setCashAmount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Completed receipt modal state
  const [completedSale, setCompletedSale] = useState<{
    invoiceNo: string;
    items: CartLineItem[];
    subtotal: number;
    discount: number;
    additionalFee?: number;
    warrantyDays?: number;
    total: number;
    paymentMethod: string;
    customerName?: string;
    date: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  // Focus scanner input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        barcodeInputRef.current &&
        !barcodeInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Live filtered products based on barcode / IMEI / Name / Brand
  const searchMatches = useMemo(() => {
    const q = barcodeInput.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchImei = p.imei ? p.imei.toLowerCase().includes(q) : false;
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchBrand = p.brandName ? p.brandName.toLowerCase().includes(q) : false;
        const matchCapacity = p.capacity ? p.capacity.toLowerCase().includes(q) : false;
        const matchColor = p.color ? p.color.toLowerCase().includes(q) : false;
        return matchName || matchImei || matchSku || matchBrand || matchCapacity || matchColor;
      })
      .slice(0, 8);
  }, [barcodeInput, products]);

  // Add product to transaction lines
  const addItemToTransaction = useCallback(
    (product: PosProductItem) => {
      // Stock validation
      if (product.stock <= 0) {
        toast.error(`Stok "${product.name}" habis.`);
        return;
      }

      if (product.status === "sold") {
        toast.error(`Unit handphone (IMEI: ${product.imei}) sudah berstatus TERJUAL.`);
        return;
      }

      const isPhone = (product.productType || "phone") === "phone";

      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id);

        if (existingIdx >= 0) {
          if (isPhone) {
            toast.warning(`Unit HP (IMEI: ${product.imei}) sudah ada dalam daftar transaksi.`);
            return prev;
          }

          // Aksesoris: tambah qty
          const currentQty = prev[existingIdx].qty;
          if (currentQty + 1 > product.stock) {
            toast.warning(`Stok aksesoris tidak mencukupi (Tersedia: ${product.stock}).`);
            return prev;
          }

          playScanBeep();
          toast.success(`Jumlah ${product.name} bertambah (+1).`);
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: currentQty + 1,
          };
          return updated;
        }

        playScanBeep();
        toast.success(`Unit ${product.name} (${product.imei || product.sku}) ditambahkan.`);
        return [...prev, { product, qty: 1 }];
      });
    },
    []
  );

  // Handle scanned/typed barcode, IMEI, or product name
  const handleBarcodeProcess = async (code: string) => {
    const rawCode = code.trim();
    if (!rawCode) return;

    // 1. Cek exact match IMEI atau SKU di list lokal
    const foundExact = products.find(
      (p) =>
        (p.imei && p.imei.toLowerCase() === rawCode.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === rawCode.toLowerCase())
    );

    if (foundExact) {
      addItemToTransaction(foundExact);
      setBarcodeInput("");
      setIsSearchDropdownOpen(false);
      barcodeInputRef.current?.focus();
      return;
    }

    // 2. Cek apakah cocok dengan nama atau brand produk
    const nameMatches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(rawCode.toLowerCase()) ||
        (p.brandName && p.brandName.toLowerCase().includes(rawCode.toLowerCase()))
    );

    // Jika tepat 1 produk cocok dengan nama yang diketik, langsung tambahkan
    if (nameMatches.length === 1) {
      addItemToTransaction(nameMatches[0]);
      setBarcodeInput("");
      setIsSearchDropdownOpen(false);
      barcodeInputRef.current?.focus();
      return;
    }

    // Jika ada beberapa produk yang cocok, buka dropdown hasil pencarian agar kasir bisa memilih
    if (nameMatches.length > 1) {
      setIsSearchDropdownOpen(true);
      return;
    }

    // 3. Cari ke database via getProductByImei (mencakup barcode/IMEI dari DB)
    try {
      const dbProduct = await getProductByImei(rawCode);
      if (dbProduct) {
        addItemToTransaction(dbProduct as PosProductItem);
      } else {
        toast.error(`Produk "${rawCode}" tidak ditemukan di database.`);
      }
    } catch {
      toast.error("Gagal memproses kode / pencarian produk.");
    }

    setBarcodeInput("");
    setIsSearchDropdownOpen(false);
    barcodeInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeProcess(barcodeInput);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (newQty > item.product.stock) {
            toast.warning(`Maksimal stok tercapai (${item.product.stock}).`);
            return { ...item, qty: item.product.stock };
          }
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Kosongkan daftar transaksi penjualan ini?")) {
      setCart([]);
      setDiscount(0);
      setAdditionalFee(0);
      setWarrantyDays(7);
      setCashAmount("");
      setCustomerName("Pelanggan Umum");
    }
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.qty,
    0
  );
  const total = Math.max(0, subtotal - discount + additionalFee);
  const totalUnits = cart.reduce((sum, item) => sum + item.qty, 0);

  const changeAmount =
    paymentMethod === "cash" && typeof cashAmount === "number" && cashAmount >= total
      ? cashAmount - total
      : 0;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Transaksi masih kosong. Scan barcode unit atau masukkan item.");
      return;
    }

    if (paymentMethod === "cash" && typeof cashAmount === "number" && cashAmount < total) {
      toast.error("Nominal uang tunai kurang dari total belanja.");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customerName: customerName.trim() || "Pelanggan Umum",
        paymentMethod,
        discount,
        additionalFee,
        warrantyDays,
        items: cart.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          unitPrice: item.product.sellingPrice,
        })),
      };

      const res = await createSale(payload);
      if (res.error) {
        toast.error(res.error);
      } else if (res.success && res.invoiceNo) {
        setCompletedSale({
          invoiceNo: res.invoiceNo,
          items: [...cart],
          subtotal,
          discount,
          additionalFee,
          warrantyDays,
          total,
          paymentMethod,
          customerName: customerName.trim() || "Pelanggan Umum",
          date: new Date().toLocaleString("id-ID"),
        });

        toast.success(`Transaksi berhasil disimpan! Faktur: ${res.invoiceNo}`);
        setCart([]);
        setDiscount(0);
        setAdditionalFee(0);
        setWarrantyDays(7);
        setCashAmount("");
        setCustomerName("Pelanggan Umum");

        if (onSaleCreated) {
          onSaleCreated(res.invoiceNo);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memproses transaksi.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual search filtered list
  const manualFilteredProducts = products.filter((p) => {
    if (!manualSearchQuery.trim()) return true;
    const q = manualSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.imei && p.imei.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.capacity && p.capacity.toLowerCase().includes(q)) ||
      (p.color && p.color.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* UNIFIED CONTAINER: TRANSAKSI PENJUALAN */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Container Top Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Transaksi Penjualan
              </h3>
              <p className="text-xs text-muted-foreground">
                Scan barcode stiker / IMEI atau cari produk. Item otomatis masuk ke daftar belanja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManualSearchOpen(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold h-9"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Cari Manual</span>
            </Button>

            {cart.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                className="text-xs text-destructive hover:text-destructive h-9"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span>Kosongkan</span>
              </Button>
            )}
          </div>
        </div>

        {/* SCAN BARCODE & SEARCH PRODUK INPUT HERO SECTION */}
        <div className="p-4 sm:p-5 bg-primary/5 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (barcodeInput.trim()) setIsSearchDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Scan barcode/IMEI atau cari nama produk (mis. iPhone 15, Adaptor 20W)..."
                className="pl-11 pr-28 h-12 text-sm font-mono tracking-wide bg-background border-2 border-primary/30 focus-visible:border-primary shadow-xs rounded-xl"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeInput("");
                      setIsSearchDropdownOpen(false);
                      barcodeInputRef.current?.focus();
                    }}
                    className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center mr-1"
                    title="Hapus pencarian"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleBarcodeProcess(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                  className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold rounded-lg"
                >
                  Cari / Scan
                </Button>
              </div>

              {/* LIVE AUTOCOMPLETE DROPDOWN RESULTS */}
              {isSearchDropdownOpen && searchMatches.length > 0 && (
                <div
                  ref={searchDropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl overflow-hidden divide-y divide-border/60 max-h-80 overflow-y-auto"
                >
                  <div className="p-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                    <span>Hasil Pencarian ({searchMatches.length})</span>
                  </div>
                  {searchMatches.map((p) => {
                    const isSold = p.status === "sold" || p.stock <= 0;
                    return (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!isSold) {
                            addItemToTransaction(p);
                            setBarcodeInput("");
                            setIsSearchDropdownOpen(false);
                            barcodeInputRef.current?.focus();
                          }
                        }}
                        className={`p-3 flex items-center justify-between transition select-none ${
                          isSold
                            ? "opacity-50 cursor-not-allowed bg-muted/20"
                            : "hover:bg-primary/10 cursor-pointer"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{p.name}</span>
                            {p.productType === "phone" ? (
                              <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 border-primary/30 text-primary">
                                HP
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 border-muted-foreground/30 text-muted-foreground">
                                Aksesoris
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {p.imei ? `IMEI: ${p.imei}` : `SKU: ${p.sku}`}
                            {p.capacity ? ` • ${p.capacity}` : ""}
                            {p.color ? ` • ${p.color}` : ""}
                            {p.brandName ? ` • ${p.brandName}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(p.sellingPrice)}
                          </p>
                          <span className={`text-[10px] ${isSold ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            {isSold ? "Stok Habis / Terjual" : `Stok: ${p.stock}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraScannerOpen(true)}
                className="h-12 px-3 sm:px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2"
                title="Buka Kamera Scanner Modal"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Kamera</span>
              </Button>

              <label
                className="h-12 px-3 sm:px-4 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-xs sm:text-sm"
                title="Buka Kamera HP Langsung (Autofokus & Flash)"
              >
                <Smartphone className="h-4 w-4" />
                <span>Foto HP</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const toastId = toast.loading("Membaca barcode dari foto...");
                    try {
                      const val = await scanBarcodeFromFile(file);
                      if (val) {
                        toast.dismiss(toastId);
                        handleBarcodeProcess(val);
                      } else {
                        toast.error(
                          "Barcode tidak terdeteksi. Silakan foto barcode lebih dekat dan jelas.",
                          { id: toastId }
                        );
                      }
                    } catch {
                      toast.error("Gagal membaca barcode dari foto.", { id: toastId });
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
            <span className="flex items-center gap-1.5">
              <ScanBarcode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Scan barcode atau ketik IMEI / SKU</span>
            </span>
            <span className="font-mono text-primary font-semibold">Siap</span>
          </div>
        </div>

        {/* DAFTAR ITEM TRANSAKSI PENJUALAN */}
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap">Barcode / IMEI</TableHead>
                <TableHead className="text-xs font-semibold min-w-[200px]">Nama Produk / Spesifikasi</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Harga Satuan</TableHead>
                <TableHead className="text-xs font-semibold text-center w-32 whitespace-nowrap">Qty</TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Subtotal</TableHead>
                <TableHead className="w-12 text-center text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <ScanBarcode className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-sm text-foreground">Transaksi Masih Kosong</p>
                    <p className="text-xs mt-1">
                      Arahkan barcode scanner ke stiker IMEI handphone atau masukkan kode SKU untuk memulai transaksi.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                cart.map((item, idx) => {
                  const isPhone = (item.product.productType || "phone") === "phone";
                  const itemSubtotal = item.product.sellingPrice * item.qty;

                  return (
                    <TableRow key={item.product.id} className="hover:bg-muted/20 transition-colors text-xs">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      {/* Barcode / IMEI */}
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {item.product.imei || item.product.sku}
                        </span>
                      </TableCell>

                      {/* Nama Produk & Detail */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isPhone ? (
                            <Smartphone className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Headphones className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-foreground text-xs leading-snug">
                              {item.product.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {[
                                item.product.capacity,
                                item.product.color,
                                item.product.completeness,
                                item.product.brandName,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Harga Satuan */}
                      <TableCell className="text-right whitespace-nowrap font-mono">
                        {formatRupiah(item.product.sellingPrice)}
                      </TableCell>

                      {/* Qty Controls */}
                      <TableCell className="text-center">
                        {isPhone ? (
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted">
                            1 Unit
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.qty - 1)}
                              className="h-6 w-6 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-xs">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.qty + 1)}
                              className="h-6 w-6 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </TableCell>

                      {/* Subtotal */}
                      <TableCell className="text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(itemSubtotal)}
                      </TableCell>

                      {/* Delete */}
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* INTEGRATED PAYMENT & CHECKOUT SECTION INSIDE TRANSAKSI PENJUALAN */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-border bg-muted/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Settings: Pelanggan & Metode Pembayaran */}
              <div className="lg:col-span-6 space-y-4">
                {/* Customer Manual Input */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Nama Pelanggan</span>
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan (default: Pelanggan Umum)..."
                    className="h-10 text-xs rounded-xl bg-background border-input"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === "cash"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Banknote className="h-4 w-4 mb-1" />
                      <span>Tunai</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === "transfer"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="h-4 w-4 mb-1" />
                      <span>Transfer Bank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("edc")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === "edc"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="h-4 w-4 mb-1" />
                      <span>Kartu Debit / EDC</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                        paymentMethod === "qris"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <QrCode className="h-4 w-4 mb-1" />
                      <span>QRIS</span>
                    </button>
                  </div>
                </div>

                {/* Cash Tendered & Change (if cash) */}
                {paymentMethod === "cash" && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-background">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Uang Tunai Diterima (Rp)
                      </label>
                      <CurrencyInput
                        placeholder="0"
                        value={cashAmount}
                        onValueChange={(val) => setCashAmount(val === 0 ? "" : val)}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Kembalian (Rp)
                      </label>
                      <div className="h-8 flex items-center px-2 rounded-lg bg-muted text-xs font-mono font-bold text-emerald-600">
                        {formatRupiah(changeAmount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Summary & Action Button */}
              <div className="lg:col-span-6 space-y-3 bg-background p-4 rounded-2xl border border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Item:</span>
                  <span className="font-semibold text-foreground">{totalUnits} Unit</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">{formatRupiah(subtotal)}</span>
                </div>

                {/* Diskon */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Potongan Diskon:</span>
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-[10px]">Rp</span>
                    <CurrencyInput
                      value={discount}
                      onValueChange={(val) => setDiscount(val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono text-right"
                    />
                  </div>
                </div>

                {/* Biaya Tambahan */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Biaya Tambahan:</span>
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-[10px]">Rp</span>
                    <CurrencyInput
                      value={additionalFee}
                      onValueChange={(val) => setAdditionalFee(val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono text-right"
                    />
                  </div>
                </div>

                {/* Masa Garansi Toko */}
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Garansi Toko:</span>
                    </span>
                    <div className="flex items-center gap-1.5 w-32 justify-end">
                      <Input
                        type="number"
                        min={0}
                        value={warrantyDays}
                        onChange={(e) => setWarrantyDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="0"
                        className="h-7 text-xs font-mono text-right w-16"
                      />
                      <span className="text-[11px] font-semibold text-foreground">Hari</span>
                    </div>
                  </div>
                  {/* Preset Cepat Garansi */}
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    {[
                      { label: "Tanpa Garansi", days: 0 },
                      { label: "7 Hari", days: 7 },
                      { label: "14 Hari", days: 14 },
                      { label: "30 Hari", days: 30 },
                      { label: "90 Hari", days: 90 },
                    ].map((p) => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => setWarrantyDays(p.days)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition ${
                          warrantyDays === p.days
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                            : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-baseline justify-between">
                  <span className="text-sm font-bold text-foreground">Total Tagihan:</span>
                  <span className="text-2xl font-mono font-extrabold text-primary">
                    {formatRupiah(total)}
                  </span>
                </div>

                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCheckout}
                  className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 mt-2"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  <span>{isProcessing ? "Menyimpan Transaksi..." : "Selesaikan Transaksi & Cetak Faktur"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: SCAN KAMERA */}
      <BarcodeScannerModal
        open={isCameraScannerOpen}
        onOpenChange={setIsCameraScannerOpen}
        onScanSuccess={(val) => handleBarcodeProcess(val)}
        title="Scan Barcode Transaksi (1D Garis & 2D QR)"
        description="Arahkan kamera ke stiker barcode garis (IMEI / SKU) atau barcode kotak (QR Code)."
      />

      {/* MODAL: CARI MANUAL PRODUK */}
      <Dialog open={isManualSearchOpen} onOpenChange={setIsManualSearchOpen}>
        <DialogContent className="sm:max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Pilih Produk Manual</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Cari nama unit, spesifikasi, atau aksesoris..."
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-xl">
              {manualFilteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Produk tidak ditemukan.
                </div>
              ) : (
                manualFilteredProducts.map((p) => {
                  const isSold = p.status === "sold" || p.stock <= 0;
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 px-3 flex items-center justify-between transition ${
                        isSold ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!isSold) {
                          addItemToTransaction(p);
                          setIsManualSearchOpen(false);
                          setManualSearchQuery("");
                        }
                      }}
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {p.imei ? `IMEI: ${p.imei}` : `SKU: ${p.sku}`} • {p.capacity || ""} {p.color || ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-emerald-600">
                          {formatRupiah(p.sellingPrice)}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {isSold ? "Habis/Terjual" : `Stok: ${p.stock}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: STRUK INVOICE TRANSAKSI SELESAI */}
      {completedSale && (
        <Dialog open={!!completedSale} onOpenChange={() => setCompletedSale(null)}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-center font-bold text-lg text-emerald-600 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Transaksi Berhasil</span>
              </DialogTitle>
            </DialogHeader>

            {/* Printable Receipt Layout */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-border text-xs space-y-3 font-mono">
              <div className="text-center border-b border-border pb-2">
                <p className="font-extrabold text-sm uppercase text-[#055B5A]">GLORIA PONSEL</p>
                <p className="text-[10px] text-muted-foreground">Spesialis Smartphone & Aksesoris</p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                  Faktur: {completedSale.invoiceNo}
                </p>
                <p className="text-[10px] text-muted-foreground">{completedSale.date}</p>
                <p className="text-[10px] text-foreground font-semibold mt-0.5">
                  Pelanggan: {completedSale.customerName || "Pelanggan Umum"}
                </p>
              </div>

              <div className="space-y-1.5 divide-y divide-border/60">
                {completedSale.items.map((item) => (
                  <div key={item.product.id} className="pt-1 flex justify-between text-[11px]">
                    <div>
                      <p className="font-bold">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.product.imei || item.product.sku} ({item.qty}x)
                      </p>
                    </div>
                    <span className="font-bold">
                      {formatRupiah(item.product.sellingPrice * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border space-y-1 text-right">
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(completedSale.subtotal)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-destructive text-[10px]">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(completedSale.discount)}</span>
                  </div>
                )}
                {completedSale.additionalFee && completedSale.additionalFee > 0 ? (
                  <div className="flex justify-between text-primary text-[10px]">
                    <span>Biaya Tambahan:</span>
                    <span>+{formatRupiah(completedSale.additionalFee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-xs font-bold text-foreground pt-1 border-t border-dashed border-border">
                  <span>TOTAL:</span>
                  <span className="text-emerald-600">{formatRupiah(completedSale.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Metode:</span>
                  <span className="uppercase">{completedSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Garansi Toko:</span>
                  <span className="font-semibold text-foreground">
                    {completedSale.warrantyDays && completedSale.warrantyDays > 0
                      ? `${completedSale.warrantyDays} Hari`
                      : "Tanpa Garansi"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-border">
                Terima kasih telah berbelanja di Gloria Ponsel!
              </p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setCompletedSale(null)}
              >
                Tutup
              </Button>
              <Button
                type="button"
                className="w-full gap-2 bg-primary text-primary-foreground font-bold"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Struk</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
