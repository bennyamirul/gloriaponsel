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
  Phone,
  Printer,
  Smartphone,
  Tablet,
  Watch,
  Tag,
  Headphones,
  Search,
  X,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Download,
  Loader2,
  Store,
  MessageSquare,
  Share2,
  UploadCloud,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
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
import { createSale, uploadSalePaymentProof } from "@/lib/actions/sale.actions";
import { getProductByImei } from "@/lib/actions/product.actions";
import {
  BarcodeScannerModal,
  scanBarcodeFromFile,
  promptCameraPermission,
} from "@/components/ui/barcode-scanner-modal";
import {
  formatWhatsAppProofCaption,
} from "@/lib/utils/payment-proof-composer";

export interface PosProductItem {
  id: string;
  name: string;
  sku: string;
  imei?: string | null;
  productType?: string;
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

function getCategoryLabel(type?: string): string {
  const t = (type || "").toLowerCase();
  if (t === "phone" || t === "handphone") return "HP";
  if (t === "tablet") return "Tablet";
  if (t === "smartwatch") return "SmartWatch";
  if (t === "accessory" || t === "aksesoris") return "Aksesoris";
  return type || "Produk";
}

function getCategoryIcon(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("phone") || t.includes("hp")) return <Smartphone className="h-4 w-4 text-primary shrink-0" />;
  if (t.includes("tablet") || t.includes("pad")) return <Tablet className="h-4 w-4 text-blue-500 shrink-0" />;
  if (t.includes("watch")) return <Watch className="h-4 w-4 text-amber-500 shrink-0" />;
  if (t.includes("accessory") || t.includes("aksesoris")) return <Headphones className="h-4 w-4 text-muted-foreground shrink-0" />;
  return <Tag className="h-4 w-4 text-muted-foreground shrink-0" />;
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
  storeSettings?: any;
  currentUserRole?: string;
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
  storeSettings,
  currentUserRole,
  onSaleCreated,
}: SalesPosClientProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [additionalFeeNote, setAdditionalFeeNote] = useState<string>("");
  const [warrantyDays, setWarrantyDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "edc" | "qris"
  >("cash");
  const [cashAmount, setCashAmount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isDownloadingJpg, setIsDownloadingJpg] = useState(false);
  const [printFormat, setPrintFormat] = useState<"standard" | "thermal">(
    "thermal",
  );
  const receiptRef = useRef<HTMLDivElement>(null);

  // Completed receipt modal state
  const [completedSale, setCompletedSale] = useState<{
    saleId?: string;
    invoiceNo: string;
    items: CartLineItem[];
    subtotal: number;
    discount: number;
    additionalFee?: number;
    additionalFeeNote?: string | null;
    warrantyDays?: number;
    total: number;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string | null;
    cashierName?: string;
    date: string;
    createdAt?: string;
    paymentProofUrl?: string | null;
  } | null>(null);

  // State upload bukti pembayaran di POS
  const [isUploadingPosProof, setIsUploadingPosProof] = useState(false);
  const [posProofPreviewUrl, setPosProofPreviewUrl] = useState<string | null>(null);
  const uploadedProofFileRef = useRef<File | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasUserInteractedRef = useRef(false);

  // Focus scanner input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => {
      hasUserInteractedRef.current = true;
    }, 200);
    return () => clearTimeout(timer);
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
    const isReadyProduct = (p: PosProductItem) =>
      (p.status === "available" || p.status === "ready") && p.stock > 0;

    const q = barcodeInput.trim().toLowerCase();
    if (!q) {
      // Saat input kosong / baru diklik, langsung munculkan produk siap jual
      const available = products.filter(isReadyProduct);
      return available.slice(0, 20);
    }
    return products
      .filter((p) => {
        if (!isReadyProduct(p)) return false;
        const matchName = p.name.toLowerCase().includes(q);
        const matchImei = p.imei ? p.imei.toLowerCase().includes(q) : false;
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchBrand = p.brandName
          ? p.brandName.toLowerCase().includes(q)
          : false;
        const matchCapacity = p.capacity
          ? p.capacity.toLowerCase().includes(q)
          : false;
        const matchColor = p.color ? p.color.toLowerCase().includes(q) : false;
        return (
          matchName ||
          matchImei ||
          matchSku ||
          matchBrand ||
          matchCapacity ||
          matchColor
        );
      })
      .slice(0, 20);
  }, [barcodeInput, products]);

  // Add product to transaction lines
  const addItemToTransaction = useCallback((product: PosProductItem) => {
    // Validasi status siap jual (hanya status ready / available)
    if (product.status !== "available" && product.status !== "ready") {
      toast.error(
        `Produk "${product.name}" belum disetujui atau tidak berstatus ready (Status: ${product.status}).`,
      );
      return;
    }

    // Stock validation
    if (product.stock <= 0) {
      toast.error(`Stok "${product.name}" habis.`);
      return;
    }

    const isSerialized =
      Boolean(product.imei && product.imei.trim()) ||
      ((product.productType || "phone") !== "accessory" &&
        (product.productType || "phone") !== "aksesoris");

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id,
      );

      if (existingIdx >= 0) {
        if (isSerialized) {
          toast.warning(
            `Unit ${getCategoryLabel(product.productType)} (IMEI: ${product.imei || product.sku}) sudah ada dalam daftar transaksi.`,
          );
          return prev;
        }

        // Aksesoris: tambah qty
        const currentQty = prev[existingIdx].qty;
        if (currentQty + 1 > product.stock) {
          toast.warning(
            `Stok aksesoris tidak mencukupi (Tersedia: ${product.stock}).`,
          );
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
      toast.success(
        `Unit ${product.name} (${product.imei || product.sku}) ditambahkan.`,
      );
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  // Handle scanned/typed barcode, IMEI, or product name
  const handleBarcodeProcess = async (code: string) => {
    const rawCode = code.trim();
    if (!rawCode) return;

    // 1. Cek exact match IMEI atau SKU di list lokal
    const foundExact = products.find(
      (p) =>
        (p.imei && p.imei.toLowerCase() === rawCode.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === rawCode.toLowerCase()),
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
        (p.brandName &&
          p.brandName.toLowerCase().includes(rawCode.toLowerCase())),
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
      }),
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
      setAdditionalFeeNote("");
      setWarrantyDays(7);
      setCashAmount("");
      setCustomerName("");
      setCustomerPhone("");
    }
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.qty,
    0,
  );
  const total = Math.max(0, subtotal - discount + additionalFee);
  const totalUnits = cart.reduce((sum, item) => sum + item.qty, 0);

  const changeAmount =
    paymentMethod === "cash" &&
    typeof cashAmount === "number" &&
    cashAmount >= total
      ? cashAmount - total
      : 0;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error(
        "Transaksi masih kosong. Scan barcode unit atau masukkan item.",
      );
      return;
    }

    if (!customerName.trim()) {
      toast.error("Nama pelanggan wajib diisi sebelum memproses transaksi.");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Nomor telepon / WhatsApp pelanggan wajib diisi sebelum memproses transaksi.");
      return;
    }

    if (
      paymentMethod === "cash" &&
      typeof cashAmount === "number" &&
      cashAmount < total
    ) {
      toast.error("Nominal uang tunai kurang dari total belanja.");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customerName: customerName.trim() || "",
        customerPhone: customerPhone.trim() || null,
        paymentMethod,
        discount,
        additionalFee,
        additionalFeeNote: additionalFeeNote.trim() || null,
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
          saleId: res.saleId,
          invoiceNo: res.invoiceNo,
          items: [...cart],
          subtotal,
          discount,
          additionalFee,
          additionalFeeNote: additionalFeeNote.trim() || null,
          warrantyDays,
          total,
          paymentMethod,
          customerName: customerName.trim() || "",
          customerPhone: customerPhone.trim() || null,
          cashierName: (res as any).cashierName || "Kasir",
          date: new Date().toLocaleString("id-ID"),
          createdAt: new Date().toISOString(),
          paymentProofUrl: null,
        });

        toast.success(`Transaksi berhasil disimpan! Faktur: ${res.invoiceNo}`);
        setCart([]);
        setDiscount(0);
        setAdditionalFee(0);
        setAdditionalFeeNote("");
        setWarrantyDays(7);
        setCashAmount("");
        setCustomerName("");
        setCustomerPhone("");

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

  const WA_GROUP_LINK =
    "https://chat.whatsapp.com/GAhjmAUfSXV0z1wkA8MZWG?s=cl&p=a&mlu=4&ilr=4";

  const handleAutoUploadProof = async (file: File): Promise<string | null> => {
    if (!file || !completedSale?.saleId) return null;

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan.");
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB.");
      return null;
    }

    try {
      setIsUploadingPosProof(true);
      const previewUrl = URL.createObjectURL(file);
      setPosProofPreviewUrl(previewUrl);

      // Pilihan ke-2: Gabungkan foto bukti di atas dan rincian transaksi di bawah
      uploadedProofFileRef.current = file;
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadSalePaymentProof(completedSale.saleId, formData);
      if (res.error) {
        toast.error(res.error);
        return null;
      }
      if (res.success && res.paymentProofUrl) {
        setCompletedSale((prev) =>
          prev ? { ...prev, paymentProofUrl: res.paymentProofUrl } : null
        );

        toast.success("Foto bukti pembayaran berhasil disimpan!");
        return res.paymentProofUrl;
      }
      return null;
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah bukti pembayaran.");
      return null;
    } finally {
      setIsUploadingPosProof(false);
    }
  };

  const handleSendWhatsAppGroup = async () => {
    if (!completedSale) return;

    const fullProofUrl = completedSale.paymentProofUrl
      ? completedSale.paymentProofUrl.startsWith("http")
        ? completedSale.paymentProofUrl
        : `${window.location.origin}${completedSale.paymentProofUrl}`
      : "";

    let fileToShare = uploadedProofFileRef.current;

    // Jika belum ada file bukti pembayaran sama sekali, ingatkan kasir
    if (!fileToShare && !fullProofUrl) {
      toast.error("Silakan pilih atau unggah foto bukti pembayaran terlebih dahulu.");
      return;
    }

    if (!fileToShare && fullProofUrl) {
      try {
        const res = await fetch(fullProofUrl);
        const blob = await res.blob();
        fileToShare = new File([blob], `bukti-${completedSale.invoiceNo}.jpg`, {
          type: blob.type || "image/jpeg",
        });
        uploadedProofFileRef.current = fileToShare;
      } catch {
        // Abaikan jika fetch gagal
      }
    }

    // Salin rincian transaksi ke clipboard (sebagai cadangan jika kasir butuh teks di tempat lain)
    const messageCaption = formatWhatsAppProofCaption({
      invoiceNo: completedSale.invoiceNo,
      transactionDate: completedSale.createdAt || completedSale.date,
      cashierName: completedSale.cashierName,
      customerName: completedSale.customerName,
      customerPhone: completedSale.customerPhone,
      total: completedSale.total,
      items: (completedSale.items || []).map((it: any) => ({
        productName: it.product?.name || it.productName || it.name || "Produk",
        productImei: it.product?.imei || it.imei || it.productImei || null,
        productSku: it.product?.sku || it.sku || it.productSku || null,
        capacity: it.product?.capacity || it.capacity || null,
        color: it.product?.color || it.color || null,
        completeness: it.product?.completeness || it.completeness || null,
        qty: it.quantity || it.qty || 1,
      })),
    });

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(messageCaption);
      } catch {
        // ignore clipboard error
      }
    }

    // Bagikan 1 file gambar komposit (foto di atas, rincian di bawah) via Web Share API di HP
    if (
      fileToShare &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [fileToShare] })
    ) {
      try {
        await navigator.share({
          files: [fileToShare],
          title: `Bukti Pembayaran ${completedSale.invoiceNo}`,
          text: messageCaption,
        });
        toast.success("Foto bukti transaksi siap dikirim ke WhatsApp!");
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return; // Staf membatalkan dialog share
      }
    }

    // Fallback untuk Desktop atau browser yang tidak mendukung share file:
    toast.success("Membuka grup WhatsApp...");
    window.open(WA_GROUP_LINK, "_blank");
  };

  const handleSendInvoiceToCustomer = () => {
    if (!completedSale) return;
    if (!completedSale.customerPhone) {
      toast.error("Nomor WhatsApp pelanggan tidak tersedia untuk transaksi ini.");
      return;
    }

    let phone = completedSale.customerPhone.trim().replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    } else if (phone.startsWith("8")) {
      phone = "62" + phone;
    }

    const rawName = completedSale.customerName?.trim() || "Pelanggan";
    const formattedName = rawName.toLowerCase().startsWith("kak ")
      ? rawName.slice(4).trim()
      : rawName;

    const message = `Terimakasih Kak ${formattedName} telah belanja di gloria ponsel bekasi.\n\nSimpan bukti pembayaran ini untuk klaim garansi ya ka\n\nApabila ada pertanyaan lain bisa kontak admin langsung di 081219172792.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    toast.success("Membuka WhatsApp pelanggan...");
    window.open(waUrl, "_blank");
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

  const handleDownloadJpg = async () => {
    if (!receiptRef.current || !completedSale) return;
    setIsDownloadingJpg(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `Invoice_${completedSale.invoiceNo}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Invoice berhasil diunduh dalam format JPG");
    } catch {
      toast.error("Gagal mengunduh gambar invoice.");
    } finally {
      setIsDownloadingJpg(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
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
      return "-";
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

  const executePrint = () => {
    if (!receiptRef.current || !completedSale) {
      window.print();
      return;
    }

    const contentHtml = receiptRef.current.innerHTML;
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
          <title>Invoice_${completedSale.invoiceNo}</title>
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
    <div className="space-y-4">
      {/* UNIFIED CONTAINER: TRANSAKSI PENJUALAN */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* SCAN BARCODE & SEARCH PRODUK INPUT HERO SECTION */}
        <div className="p-4 sm:p-5 bg-primary/5 border-b border-border">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
              <Input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onClick={() => setIsSearchDropdownOpen(true)}
                onFocus={() => {
                  if (hasUserInteractedRef.current) {
                    setIsSearchDropdownOpen(true);
                  }
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
                      setIsSearchDropdownOpen(true);
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
              {isSearchDropdownOpen && (
                <div
                  ref={searchDropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl overflow-hidden divide-y divide-border/60 max-h-80 overflow-y-auto"
                >
                  <div className="p-2.5 bg-muted/60 text-[11px] font-semibold text-muted-foreground flex items-center justify-between border-b border-border/50">
                    <span>
                      {barcodeInput.trim()
                        ? `Hasil Pencarian (${searchMatches.length})`
                        : `Daftar Produk Tersedia (${searchMatches.length})`}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80">
                      Klik produk untuk memasukkan ke keranjang
                    </span>
                  </div>

                  {searchMatches.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      {barcodeInput.trim()
                        ? `Tidak ada produk yang cocok dengan "${barcodeInput}".`
                        : "Belum ada data produk tersedia."}
                    </div>
                  ) : (
                    searchMatches.map((p) => {
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
                              <span className="text-xs font-bold text-foreground">
                                {p.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 py-0 px-1.5 border-primary/30 text-primary font-medium"
                              >
                                {getCategoryLabel(p.productType)}
                              </Badge>
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
                            <span
                              className={`text-[10px] ${isSold ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                            >
                              {isSold
                                ? "Stok Habis / Terjual"
                                : `Stok: ${p.stock}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => setIsManualSearchOpen(true)}
                className="h-12 px-3 sm:px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2"
                title="Cari Manual Produk"
              >
                <Search className="h-4 w-4" />
                <span>Cari Manual</span>
              </Button> */}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  promptCameraPermission();
                  setIsCameraScannerOpen(true);
                }}
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
                    const toastId = toast.loading(
                      "Membaca barcode dari foto...",
                    );
                    try {
                      const val = await scanBarcodeFromFile(file);
                      if (val) {
                        toast.dismiss(toastId);
                        handleBarcodeProcess(val);
                      } else {
                        toast.error(
                          "Barcode tidak terdeteksi. Silakan foto barcode lebih dekat dan jelas.",
                          { id: toastId },
                        );
                      }
                    } catch {
                      toast.error("Gagal membaca barcode dari foto.", {
                        id: toastId,
                      });
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </label>

              {cart.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearCart}
                  className="h-12 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-medium"
                  title="Kosongkan Keranjang"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span>Kosongkan</span>
                </Button>
              )}
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
                <TableHead className="w-12 text-center text-xs font-semibold">
                  No
                </TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap">
                  Barcode / IMEI
                </TableHead>
                <TableHead className="text-xs font-semibold min-w-[200px]">
                  Nama Produk / Spesifikasi
                </TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                  Harga Satuan
                </TableHead>
                <TableHead className="text-xs font-semibold text-center w-32 whitespace-nowrap">
                  Qty
                </TableHead>
                <TableHead className="text-xs font-semibold text-right whitespace-nowrap">
                  Subtotal
                </TableHead>
                <TableHead className="w-12 text-center text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <ScanBarcode className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-sm text-foreground">
                      Transaksi Masih Kosong
                    </p>
                    <p className="text-xs mt-1">
                      Arahkan barcode scanner ke stiker IMEI handphone atau
                      masukkan kode SKU untuk memulai transaksi.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                cart.map((item, idx) => {
                  const isSerialized =
                    Boolean(item.product.imei && item.product.imei.trim()) ||
                    ((item.product.productType || "phone") !== "accessory" &&
                      (item.product.productType || "phone") !== "aksesoris");
                  const itemSubtotal = item.product.sellingPrice * item.qty;

                  return (
                    <TableRow
                      key={item.product.id}
                      className="hover:bg-muted/20 transition-colors text-xs"
                    >
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
                          {getCategoryIcon(item.product.productType)}
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
                        {isSerialized ? (
                          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted">
                            1 Unit
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQty(item.product.id, item.qty - 1)
                              }
                              className="h-6 w-6 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold w-6 text-center text-xs">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQty(item.product.id, item.qty + 1)
                              }
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
                {/* Customer Manual Input (Wajib) */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Nama Pelanggan</span>
                    <span className="text-rose-500 font-bold">*</span>
                    <span className="text-[10px] text-rose-500 font-normal lowercase">
                      (wajib)
                    </span>
                  </label>
                  <Input
                    list="pos-customer-list"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      const matched = customers.find(
                        (c) =>
                          c.name.toLowerCase() === val.trim().toLowerCase(),
                      );
                      if (matched && matched.phone && !customerPhone) {
                        setCustomerPhone(matched.phone);
                      }
                    }}
                    placeholder="Nama lengkap pelanggan (wajib diisi)..."
                    className="h-10 text-xs rounded-xl bg-background border-input"
                    required
                  />
                  {customers && customers.length > 0 && (
                    <datalist id="pos-customer-list">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.phone ? `${c.name} (${c.phone})` : c.name}
                        </option>
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Customer Phone (Wajib) */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>No. Telepon Pelanggan</span>
                    <span className="text-rose-500 font-bold">*</span>
                    <span className="text-[10px] text-rose-500 font-normal lowercase">
                      (wajib)
                    </span>
                  </label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Nomor telepon / WhatsApp pelanggan (wajib diisi)..."
                    className="h-10 text-xs rounded-xl bg-background border-input"
                    required
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
                        onValueChange={(val) =>
                          setCashAmount(val === 0 ? "" : val)
                        }
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
                  <span className="font-semibold text-foreground">
                    {totalUnits} Unit
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatRupiah(subtotal)}
                  </span>
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
                <div className="space-y-1.5">
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

                  {/* Keterangan Biaya Tambahan */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium block">
                      Keterangan :
                    </label>
                    <Input
                      value={additionalFeeNote}
                      onChange={(e) => setAdditionalFeeNote(e.target.value)}
                      placeholder="Contoh: COD, JNE, dll..."
                      className="h-7 text-[11px] rounded-lg bg-background border-input"
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
                        onChange={(e) =>
                          setWarrantyDays(
                            Math.max(0, parseInt(e.target.value, 10) || 0),
                          )
                        }
                        placeholder="0"
                        className="h-7 text-xs font-mono text-right w-16"
                      />
                      <span className="text-[11px] font-semibold text-foreground">
                        Hari
                      </span>
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
                  <span className="text-sm font-bold text-foreground">
                    Total Tagihan:
                  </span>
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
                  <span>
                    {isProcessing
                      ? "Menyimpan Transaksi..."
                      : "Selesaikan Transaksi & Cetak Faktur"}
                  </span>
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
            <DialogTitle className="text-lg font-bold">
              Pilih Produk Manual
            </DialogTitle>
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
                        isSold
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-muted/40 cursor-pointer"
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
                        <p className="text-xs font-bold text-foreground">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {p.imei ? `IMEI: ${p.imei}` : `SKU: ${p.sku}`} •{" "}
                          {p.capacity || ""} {p.color || ""}
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

      {/* MODAL TRANSAKSI BERHASIL (STAFF MARKETING - TANPA CETAK, UPLOAD BUKTI & WA) */}
      {completedSale && currentUserRole === "admin_kasir" && (
        <Dialog
          open={!!completedSale}
          onOpenChange={(open) => {
            if (!open) {
              uploadedProofFileRef.current = null;
              setCompletedSale(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="text-center sm:text-center pb-2 border-b border-border">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <DialogTitle className="text-lg font-bold text-center">
                Transaksi Berhasil!
              </DialogTitle>
              <p className="text-xs text-muted-foreground text-center">
                Faktur: <span className="font-mono font-semibold text-foreground">{completedSale.invoiceNo}</span> • {completedSale.date}
              </p>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Ringkasan Transaksi */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-semibold text-foreground">
                    {completedSale.customerName || "Pelanggan Umum"}
                    {completedSale.customerPhone ? ` (${completedSale.customerPhone})` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Kasir:</span>
                  <span className="font-semibold text-foreground">
                    {completedSale.cashierName || "Staff Marketing"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Metode Pembayaran:</span>
                  <Badge variant="outline" className="uppercase text-[10px] font-bold">
                    {completedSale.paymentMethod}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total Transaksi:</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(completedSale.total)}
                  </span>
                </div>
              </div>

              {/* Upload Bukti Pembayaran (Otomatis Tersimpan & Tanpa Preview) */}
              <div className="rounded-xl border border-border p-3.5 space-y-2.5 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <UploadCloud className="w-4 h-4 text-primary dark:text-teal-400" />
                    Upload Bukti Pembayaran
                  </span>
                  {completedSale.paymentProofUrl ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Tersimpan
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                      Belum Ada
                    </Badge>
                  )}
                </div>

                {isUploadingPosProof ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-[#055B5A] dark:text-teal-300">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                    <span className="font-medium">Sedang mengunggah dan menyimpan bukti pembayaran...</span>
                  </div>
                ) : completedSale.paymentProofUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Bukti pembayaran berhasil tersimpan & menyatu</span>
                      </div>
                      <label className="text-[11px] text-primary dark:text-teal-400 hover:underline font-semibold cursor-pointer shrink-0">
                        <span>Ganti Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAutoUploadProof(f);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview gambar komposit */}
                    <div className="relative rounded-xl overflow-hidden border border-border bg-black/5 dark:bg-black/40 max-h-48 flex items-center justify-center">
                      <img
                        src={completedSale.paymentProofUrl}
                        alt="Bukti Pembayaran"
                        className="w-full h-auto max-h-48 object-contain"
                      />
                      <a
                        href={completedSale.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm text-[10px] flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Penuh</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAutoUploadProof(f);
                      }}
                      disabled={isUploadingPosProof}
                      className="block w-full text-xs text-slate-500
                        file:mr-2.5 file:py-2 file:px-3
                        file:rounded-lg file:border-0
                        file:text-xs file:font-semibold
                        file:bg-teal-50 file:text-[#055B5A]
                        hover:file:bg-teal-100
                        dark:file:bg-teal-950 dark:file:text-teal-300
                        cursor-pointer border border-border rounded-xl p-1 bg-muted/20"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      Pilih file atau ambil dari kamera. Rincian transaksi akan dikirim sebagai caption foto di WhatsApp.
                    </p>
                  </div>
                )}
              </div>


              {/* Kirim Invoice ke WhatsApp Pelanggan */}
              {completedSale.customerPhone && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <MessageSquare className="w-4 h-4 text-[#25D366]" />
                      Kirim Pesan & Invoice ke Pelanggan
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Kirim pesan terima kasih & klaim garansi langsung ke no.{" "}
                      <span className="font-mono text-foreground font-semibold">
                        {completedSale.customerPhone}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendInvoiceToCustomer}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs h-10 gap-2 shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Kirim ke WhatsApp Pelanggan</span>
                  </Button>
                </div>
              )}

              {/* Kirim Bukti Transaksi ke Grup WhatsApp */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Share2 className="w-4 h-4 text-[#25D366]" />
                    Kirim Bukti ke Grup WhatsApp
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Format: <span className="font-mono text-foreground font-semibold">Bukti Pembayaran [{completedSale.invoiceNo}]</span>
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSendWhatsAppGroup}
                  disabled={isUploadingPosProof}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs h-10 gap-2 shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim Bukti ke Grup WhatsApp</span>
                </Button>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium text-center bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-emerald-300/50">
                  💡 <strong>Foto Asli & Caption WhatsApp:</strong> Foto bukti pembayaran diunggah bersih tanpa watermark. Rincian transaksi otomatis tersalin dan dikirim sebagai caption teks.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                onClick={() => {
                  uploadedProofFileRef.current = null;
                  setCompletedSale(null);
                }}
                className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs h-9"
              >
                Selesai & Transaksi Baru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: PRATINJAU & CETAK INVOICE TRANSAKSI SELESAI (OWNER / SUPER ADMIN) */}
      {completedSale && currentUserRole !== "admin_kasir" && (
        <Dialog
          open={!!completedSale}
          onOpenChange={() => setCompletedSale(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Printer className="h-4 w-4 text-primary" />
                    <span>Pratinjau Cetak Faktur</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invoice:{" "}
                    <span className="font-mono font-semibold">
                      {completedSale.invoiceNo}
                    </span>
                  </p>
                </div>

                {/* Switch Format Cetak: Standar vs Thermal */}
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
              ref={receiptRef}
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
                <div className="relative z-10 thermal-receipt-body space-y-0 text-[8.5px] font-mono text-slate-900 dark:text-zinc-100">
                  {/* Header Toko Thermal */}
                  <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
                    {(storeSettings?.logoUrl || "/logoGP.png") && (
                      <div className="flex justify-center mb-1.5">
                        <img
                          src={storeSettings?.logoUrl || "/logoGP.png"}
                          alt="Logo"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      </div>
                    )}
                    <p className="font-bold text-[11px] uppercase">
                      {storeSettings?.storeName || "GLORIA PONSEL"}
                    </p>
                    <div className="text-[8.5px] text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-tight">
                      {(storeSettings?.address || "Alamat Toko")
                        .replace(/\r\n/g, "\n")
                        .split("\n")
                        .map((line: string, idx: number) => (
                          <span key={idx} className="block">
                            {line || "\u00A0"}
                          </span>
                        ))}
                    </div>
                    <p className="text-[8.5px] text-slate-600 dark:text-zinc-400">
                      Telp: {storeSettings?.phone || "-"}
                    </p>
                  </div>

                  {/* Meta Transaksi Thermal (Format Identik Preview Pengaturan Toko) */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[8.5px] text-slate-600 dark:text-zinc-400">
                    <div className="text-center">
                      <span>{completedSale.date}</span>
                    </div>
                    <div className="text-center font-bold text-slate-900 dark:text-zinc-100">
                      <span>{completedSale.invoiceNo}</span>
                    </div>
                    <div className="pt-0.5 space-y-0.5 text-[8.5px]">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-600 dark:text-zinc-400 whitespace-nowrap">Kasir:</span>
                        <span className="text-right font-medium text-slate-900 dark:text-zinc-100 break-words pl-2">
                          {cleanCashierName(completedSale.cashierName)}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-slate-600 dark:text-zinc-400 whitespace-nowrap">Pelanggan:</span>
                        <span className="text-right font-medium text-slate-900 dark:text-zinc-100 break-words pl-2">
                          {completedSale.customerName || "Pelanggan Umum"}
                        </span>
                      </div>
                      {completedSale.customerPhone && (
                        <div className="flex justify-between items-start">
                          <span className="text-slate-600 dark:text-zinc-400 whitespace-nowrap">No. Telp:</span>
                          <span className="text-right font-mono text-slate-700 dark:text-zinc-300 break-words pl-2">
                            {completedSale.customerPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rincian Item Thermal (Format Identik Preview Pengaturan Toko) */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                    {completedSale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="space-y-0.5"
                      >
                        <table
                          className="w-full border-collapse"
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <tbody>
                            <tr>
                              <td className="align-top text-left p-0 pr-1">
                                <span className="font-semibold break-words text-slate-900 dark:text-zinc-100 leading-tight block">
                                  {item.product.name}
                                </span>
                              </td>
                              <td className="align-top text-right p-0 pl-1 whitespace-nowrap font-bold text-slate-900 dark:text-zinc-100 text-[8.5px]">
                                {formatRupiah(item.product.sellingPrice * item.qty)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        {(item.product.capacity || item.product.color) && (
                          <div className="text-[8px] text-slate-500 dark:text-zinc-400 leading-tight">
                            {[item.product.capacity, item.product.color]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        )}
                        {(item.product.imei || item.product.sku) && (
                          <div className="text-[8px] font-mono text-slate-600 dark:text-zinc-400 leading-tight">
                            IMEI: {item.product.imei || item.product.sku}
                          </div>
                        )}
                        <div className="text-[8.5px] text-slate-600 dark:text-zinc-400 leading-tight pt-0.5">
                          {item.qty} x {formatRupiah(item.product.sellingPrice)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ringkasan Total & Pembayaran Thermal */}
                  <div className="py-2 border-b border-dashed border-slate-300">
                    <table className="w-full border-collapse text-[8.5px]" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {completedSale.discount > 0 && (
                          <>
                            <tr>
                              <td className="text-left text-slate-600 dark:text-zinc-400 p-0 pb-0.5 whitespace-nowrap">Subtotal</td>
                              <td className="text-right text-slate-600 dark:text-zinc-400 p-0 pb-0.5 whitespace-nowrap">{formatRupiah(completedSale.subtotal)}</td>
                            </tr>
                            <tr>
                              <td className="text-left text-rose-600 p-0 pb-0.5 whitespace-nowrap">Diskon</td>
                              <td className="text-right text-rose-600 p-0 pb-0.5 whitespace-nowrap">-{formatRupiah(completedSale.discount)}</td>
                            </tr>
                          </>
                        )}
                        {completedSale.additionalFee && completedSale.additionalFee > 0 ? (
                          <tr>
                            <td className="text-left text-slate-600 dark:text-zinc-400 p-0 pb-0.5 whitespace-nowrap">Biaya Lain</td>
                            <td className="text-right text-slate-600 dark:text-zinc-400 p-0 pb-0.5 whitespace-nowrap">+{formatRupiah(completedSale.additionalFee)}</td>
                          </tr>
                        ) : null}
                        <tr>
                          <td className="text-left font-bold text-[9.5px] pt-1 pb-0.5 text-slate-900 dark:text-zinc-100 whitespace-nowrap">TOTAL</td>
                          <td className="text-right font-bold text-[10.5px] tracking-tight pt-1 pb-0.5 text-slate-900 dark:text-zinc-100 whitespace-nowrap">{formatRupiah(completedSale.total)}</td>
                        </tr>
                        <tr>
                          <td className="text-left text-slate-600 dark:text-zinc-400 pt-0.5 pb-0.5 whitespace-nowrap">Metode Bayar</td>
                          <td className="text-right uppercase font-semibold text-slate-800 dark:text-zinc-200 pt-0.5 pb-0.5 whitespace-nowrap">
                            {completedSale.paymentMethod} (LUNAS)
                          </td>
                        </tr>
                        {completedSale.warrantyDays && completedSale.warrantyDays > 0 ? (
                          <tr>
                            <td className="align-top text-left text-slate-600 dark:text-zinc-400 pt-0.5 whitespace-nowrap">Garansi Toko</td>
                            <td className="align-top text-right font-semibold text-slate-800 dark:text-zinc-200 pt-0.5 whitespace-nowrap">
                              {completedSale.warrantyDays} Hari
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {/* Catatan Footer Struk Thermal */}
                  <div className="pt-2.5 text-center space-y-1">
                    <p className="whitespace-pre-line text-[8.5px] text-slate-600 dark:text-zinc-400 leading-tight">
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
                        {storeSettings?.logoUrl || "/logoGP.png" ? (
                          <img
                            src={storeSettings?.logoUrl || "/logoGP.png"}
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
                        {completedSale.invoiceNo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tanggal: {completedSale.date}
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
                        {completedSale.customerName || "Pelanggan Umum"}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        No. Telepon: {completedSale.customerPhone || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">
                        Petugas Kasir:
                      </p>
                      <p className="font-bold text-sm text-slate-900 mt-0.5">
                        {completedSale.cashierName || "Kasir"}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Status Pembayaran:{" "}
                        <span className="font-bold text-emerald-700 uppercase">
                          LUNAS ({completedSale.paymentMethod})
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
                        {completedSale.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900">
                                {item.product.name}
                              </p>
                              {(item.product.capacity ||
                                item.product.color) && (
                                <p className="text-[11px] text-slate-500">
                                  {[item.product.capacity, item.product.color]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#055B5A]">
                              {item.product.imei || item.product.sku || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {item.qty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(item.product.sellingPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(
                                item.product.sellingPrice * item.qty,
                              )}
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
                          {completedSale.warrantyDays &&
                          completedSale.warrantyDays > 0
                            ? `${completedSale.warrantyDays} Hari`
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
                          {formatRupiah(completedSale.subtotal)}
                        </span>
                      </div>
                      {completedSale.discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Potongan Diskon:</span>
                          <span className="font-mono">
                            -{formatRupiah(completedSale.discount)}
                          </span>
                        </div>
                      )}
                      {completedSale.additionalFee &&
                      completedSale.additionalFee > 0 ? (
                        <div className="flex justify-between text-[#055B5A] font-semibold">
                          <span>Biaya Tambahan:</span>
                          <span className="font-mono">
                            +{formatRupiah(completedSale.additionalFee)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300 font-bold text-sm text-slate-900">
                        <span>TOTAL AKHIR:</span>
                        <span className="font-mono text-base text-[#055B5A]">
                          {formatRupiah(completedSale.total)}
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
                        {completedSale.customerName || "Pelanggan Umum"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Hormat Kami (Kasir),</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40 mx-auto">
                        {completedSale.cashierName || "Kasir"}
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
            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border flex flex-col sm:flex-row justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompletedSale(null)}
                className="w-full sm:w-auto text-xs"
              >
                Tutup
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial gap-1.5 border-slate-300 font-semibold text-xs"
                  disabled={isDownloadingJpg}
                  onClick={handleDownloadJpg}
                >
                  {isDownloadingJpg ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-slate-700" />
                  )}
                  <span>
                    {isDownloadingJpg ? "Menyimpan..." : "Download JPG"}
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={executePrint}
                  className="flex-1 sm:flex-initial gap-2 bg-[#055B5A] hover:bg-[#044847] text-white font-bold text-xs shadow-md shadow-primary/20"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak Invoice Sekarang</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
