"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Smartphone,
  Tablet,
  Watch,
  Tag,
  Headphones,
  ScanBarcode,
  Calendar,
  ShieldCheck,
  Camera,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { CatalogItem } from "@/lib/actions/catalog.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ProductSchema,
  getProductSchema,
  ProductFormValues,
} from "@/lib/validations/product.schema";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "@/lib/actions/product.actions";
import {
  BarcodeScannerModal,
  scanBarcodeFromFile,
  promptCameraPermission,
} from "@/components/ui/barcode-scanner-modal";
import { compressImage } from "@/lib/image-compress";

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  imei?: string | null;
  productType?: string;
  capacity?: string | null;
  color?: string | null;
  completeness?: string | null;
  retailSupplier?: string | null;
  grade?: string | null;
  status?: string;
  warrantyDays?: number | null;
  warrantyExpiry?: string | null;
  entryDate?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  variant?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  catalogId?: string | null;
  sellingPrice: number;
  purchasePrice: number | null;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  description: string | null;
  rejectionReason?: string | null;
  createdBy?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: ProductItem | null;
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  catalogs?: CatalogItem[];
  isSuperAdmin: boolean;
  onSuccess: () => void;
  initialType?: string;
}

const DEFAULT_CATALOGS: CatalogItem[] = [
  { id: "cat-phone", name: "Handphone", code: "phone", hasImei: true, displayOrder: 1, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-tablet", name: "Tablet", code: "tablet", hasImei: true, displayOrder: 2, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-smartwatch", name: "SmartWatch", code: "smartwatch", hasImei: true, displayOrder: 3, description: "", isActive: true, createdAt: "", updatedAt: "" },
  { id: "cat-accessory", name: "Aksesoris", code: "accessory", hasImei: false, displayOrder: 4, description: "", isActive: true, createdAt: "", updatedAt: "" },
];

function resolveProductStatus(
  status?: string | null,
  isSuperAdmin = false
): "available" | "sold" | "menunggu_persetujuan" | "ditolak" {
  if (status === "sold") return "sold";
  if (status === "ditolak") return "ditolak";
  if (status === "menunggu_persetujuan") return "menunggu_persetujuan";
  if (status === "available") return "available";
  return isSuperAdmin ? "available" : "menunggu_persetujuan";
}

function getCategoryIcon(code: string) {
  const c = code.toLowerCase();
  if (c.includes("phone") || c.includes("hp")) return <Smartphone className="h-4 w-4" />;
  if (c.includes("tablet") || c.includes("pad")) return <Tablet className="h-4 w-4" />;
  if (c.includes("watch")) return <Watch className="h-4 w-4" />;
  if (c.includes("accessory") || c.includes("aksesoris")) return <Headphones className="h-4 w-4" />;
  return <Tag className="h-4 w-4" />;
}

const COMMON_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Oppo",
  "Vivo",
  "Realme",
  "Infinix",
  "Itel",
  "Tecno",
  "Asus",
  "Sony",
];

const COMMON_CAPACITIES = [
  "4/64GB",
  "4/128GB",
  "6/128GB",
  "8/128GB",
  "8/256GB",
  "12/256GB",
  "12/512GB",
  "16/512GB",
  "1TB",
];

const COMMON_COMPLETENESS = [
  "Fullset Original",
  "Unit Only",
  "Unit + Box",
  "Unit + Charger",
  "Unit Baru Segel (BNIB)",
];

const COMMON_GRADES = [
  "Grade A",
  "Grade B",
  "Grade C",
  "Like New",
  "Baru / BNIB",
];

const COMMON_ACCESSORY_CATEGORIES = [
  "Charger / Adapter",
  "Kabel Data",
  "Casing / Case",
  "Tempered Glass / Pelindung Layar",
  "TWS / Headset / Earphone",
  "Powerbank",
  "Holder / Mount",
  "Memory Card / Flashdisk",
  "Speaker Bluetooth",
];

export function ProductFormSheet({
  open,
  onOpenChange,
  editingProduct,
  catalogs,
  isSuperAdmin,
  onSuccess,
  initialType = "phone",
}: ProductFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanTarget, setActiveScanTarget] = useState<"imei" | "sku">(
    "imei",
  );
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const handleDirectPhotoScan = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "imei" | "sku",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    const toastId = toast.loading("Membaca barcode dari foto...");
    try {
      const val = await scanBarcodeFromFile(file);
      if (val) {
        form.setValue(target, val);
        toast.success(
          target === "imei"
            ? `IMEI berhasil di-scan: ${val}`
            : `SKU / Barcode berhasil di-scan: ${val}`,
          { id: toastId },
        );
      } else {
        toast.error(
          "Barcode tidak terdeteksi. Pastikan foto tegak, jelas, dan dekat.",
          {
            id: toastId,
          },
        );
      }
    } catch {
      toast.error("Gagal membaca barcode dari foto.", { id: toastId });
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = "";
    }
  };

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(getProductSchema(isSuperAdmin)),
    defaultValues: {
      name: "",
      productType: initialType,
      imei: "",
      entryDate: getTodayString(),
      brandName: "",
      capacity: "",
      color: "",
      completeness: "Fullset Original",
      retailSupplier: "",
      grade: "",
      categoryName: "",
      catalogId: "",
      sku: "",
      variant: "",
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 1,
      minStock: 5,
      imageUrl: "",
      description: "",
      status: isSuperAdmin ? "available" : "menunggu_persetujuan",
      isActive: true,
    },
  });

  const selectedProductType = form.watch("productType") || "phone";

  const activeCatalogs = (catalogs && catalogs.length > 0 ? catalogs : DEFAULT_CATALOGS).filter(
    (c) => c.isActive
  );

  const currentCatalog =
    activeCatalogs.find((c) => c.code === selectedProductType) ||
    activeCatalogs.find(
      (c) =>
        c.code === "phone" &&
        (selectedProductType === "handphone" || selectedProductType === "phone")
    ) ||
    activeCatalogs.find(
      (c) =>
        c.code === "accessory" &&
        (selectedProductType === "aksesoris" || selectedProductType === "accessory")
    ) ||
    (selectedProductType === "accessory" || selectedProductType === "aksesoris"
      ? { hasImei: false, name: "Aksesoris", code: "accessory" }
      : { hasImei: true, name: selectedProductType, code: selectedProductType });

  const isImeiCategory = currentCatalog?.hasImei ?? (selectedProductType !== "accessory");
  const isSmartwatch =
    selectedProductType.toLowerCase().includes("smartwatch") ||
    selectedProductType.toLowerCase().includes("watch") ||
    currentCatalog?.code === "smartwatch";

  useEffect(() => {
    if (editingProduct) {
      const type = editingProduct.productType || "phone";
      const cleanStr = (val?: string | null) => {
        if (!val || val.trim() === "" || val.trim() === "-") return "";
        return val.trim();
      };
      const formatEntryDate = (val?: string | null) => {
        if (!val) return getTodayString();
        try {
          const d = new Date(val);
          if (isNaN(d.getTime())) return getTodayString();
          return d.toISOString().split("T")[0];
        } catch {
          return getTodayString();
        }
      };

      const editCat =
        activeCatalogs.find((c) => c.code === type) ||
        (type === "accessory" ? { hasImei: false } : { hasImei: true });
      const editHasImei = editCat.hasImei ?? (type !== "accessory");

      const resolvedImei =
        cleanStr(editingProduct.imei) ||
        (editHasImei ? cleanStr(editingProduct.sku) : "");

      form.reset({
        name: editingProduct.name || "",
        productType: type,
        imei: resolvedImei,
        entryDate: formatEntryDate(editingProduct.entryDate),
        brandName: cleanStr(editingProduct.brandName),
        capacity: cleanStr(editingProduct.capacity),
        color: cleanStr(editingProduct.color),
        completeness:
          cleanStr(editingProduct.completeness) || "Fullset Original",
        retailSupplier: cleanStr(editingProduct.retailSupplier),
        grade: cleanStr((editingProduct as any).grade),
        categoryName: cleanStr(editingProduct.categoryName),
        catalogId: cleanStr(editingProduct.catalogId),
        sku:
          cleanStr(editingProduct.sku) ||
          (editHasImei ? resolvedImei : ""),
        variant: cleanStr(editingProduct.variant),
        purchasePrice: editingProduct.purchasePrice ?? 0,
        sellingPrice: editingProduct.sellingPrice ?? 0,
        stock:
          typeof editingProduct.stock === "number"
            ? editingProduct.stock
            : editHasImei
              ? 1
              : 10,
        minStock:
          typeof editingProduct.minStock === "number"
            ? editingProduct.minStock
            : 5,
        imageUrl: editingProduct.imageUrl || "",
        description: cleanStr(editingProduct.description),
        status:
          editingProduct.status === "ditolak"
            ? "menunggu_persetujuan"
            : resolveProductStatus(editingProduct.status, isSuperAdmin),
        isActive: editingProduct.isActive ?? true,
      });
      setPreviewImage(editingProduct.imageUrl || null);
    } else {
      form.reset({
        name: "",
        productType: initialType,
        imei: "",
        entryDate: getTodayString(),
        brandName: "",
        capacity: "",
        color: "",
        completeness: "Fullset Original",
        retailSupplier: "",
        categoryName:
          initialType === "phone"
            ? "Handphone"
            : initialType === "tablet"
              ? "Tablet"
              : initialType === "smartwatch"
                ? "SmartWatch"
                : initialType === "accessory"
                  ? "Aksesoris"
                  : "",
        catalogId:
          initialType === "tablet"
            ? "cat-tablet"
            : initialType === "smartwatch"
              ? "cat-smartwatch"
              : initialType === "accessory"
                ? "cat-accessory"
                : "cat-phone",
        sku: "",
        variant: "",
        purchasePrice: 0,
        sellingPrice: 0,
        stock: initialType === "phone" ? 1 : 10,
        minStock: 5,
        imageUrl: "",
        description: "",
        status: isSuperAdmin ? "available" : "menunggu_persetujuan",
        isActive: true,
      });
      setPreviewImage(null);
    }
  }, [editingProduct, initialType, form, open, isSuperAdmin]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Tampilkan preview lokal instan (0ms) sehingga pengguna langsung melihat foto
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewImage(localPreviewUrl);
    setIsUploading(true);

    try {
      // 2. Kompres gambar di browser (5MB-15MB -> ~80KB-120KB dalam ~30ms)
      const compressedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
      });

      // 3. Upload file ringan yang sudah dikompresi ke server
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await uploadProductImage(formData);
      if (res.error) {
        toast.error(res.error);
        setPreviewImage(null);
      } else if (res.url) {
        form.setValue("imageUrl", res.url);
        setPreviewImage(res.url);
        toast.success("Foto produk berhasil diunggah!");
      }
    } catch {
      toast.error("Gagal mengunggah gambar.");
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsLoading(true);
    try {
      const payload: ProductFormValues = {
        ...values,
        status: isSuperAdmin
          ? (values.status || "available")
          : editingProduct
            ? (editingProduct.status === "ditolak" ? "menunggu_persetujuan" : resolveProductStatus(editingProduct.status, false))
            : "menunggu_persetujuan",
        purchasePrice: isSuperAdmin
          ? values.purchasePrice
          : (editingProduct?.purchasePrice ?? 0),
        sellingPrice: isSuperAdmin
          ? values.sellingPrice
          : (editingProduct?.sellingPrice ?? 0),
        grade: values.grade || null,
        capacity: isSmartwatch ? null : (values.capacity || null),
      };

      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, payload);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Data produk berhasil diperbarui!");
          onSuccess();
          onOpenChange(false);
        }
      } else {
        const res = await createProduct(payload);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(
            isSuperAdmin
              ? "Produk baru berhasil ditambahkan & stok awal tercatat!"
              : "Produk berhasil disimpan dan menunggu persetujuan Owner.",
          );
          onSuccess();
          onOpenChange(false);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menyimpan produk.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-6"
        >
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-xl font-bold text-foreground">
              {editingProduct
                ? "Edit Unit Produk"
                : "Input Produk & Stok Masuk"}
            </SheetTitle>
            <SheetDescription>
              Tambah unit handphone atau aksesoris. Stok masuk akan otomatis
              terdata dalam sistem.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                const firstError = Object.values(errors)[0]?.message;
                if (firstError) toast.error(String(firstError));
              })}
              className="space-y-5 pt-4"
            >
              {/* Alert Catatan Penolakan dari Owner jika status ditolak */}
              {editingProduct?.status === "ditolak" && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Catatan Penolakan dari Owner:</span>
                  </div>
                  <p className="text-xs font-semibold pl-6 text-foreground bg-background/80 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 whitespace-pre-wrap">
                    &ldquo;{editingProduct.rejectionReason || "Data unit belum sesuai ketentuan, silakan perbaiki."}&rdquo;
                  </p>
                  <p className="text-[11px] text-muted-foreground pl-6">
                    Perbaiki data di bawah sesuai catatan owner. Setelah disimpan, status produk akan otomatis kembali menjadi <strong className="text-foreground">Menunggu Persetujuan</strong> dan diajukan ulang ke owner.
                  </p>
                </div>
              )}

              {/* Product Type Selection via Dynamic Catalogs */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Kategori / Tipe Produk
                </Label>
                <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-xl border border-border">
                  {activeCatalogs.map((cat) => {
                    const currentCatalogId = form.watch("catalogId");
                    const isSelected =
                      (currentCatalogId && currentCatalogId === cat.id) ||
                      selectedProductType === cat.code ||
                      (cat.code === "phone" && (selectedProductType === "handphone" || selectedProductType === "phone")) ||
                      (cat.code === "accessory" && (selectedProductType === "aksesoris" || selectedProductType === "accessory"));

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          form.setValue("catalogId", cat.id);
                          form.setValue("productType", cat.code);
                          form.setValue("categoryName", cat.name);
                          if (cat.hasImei) {
                            const currentSku = form.getValues("sku");
                            if (currentSku && !form.getValues("imei")) {
                              form.setValue("imei", currentSku);
                            }
                            if (!form.getValues("stock") || form.getValues("stock") <= 0) {
                              form.setValue("stock", 1);
                            }
                          } else {
                            const currentImei = form.getValues("imei");
                            if (currentImei && !form.getValues("sku")) {
                              form.setValue("sku", currentImei);
                            }
                            if (!form.getValues("stock") || form.getValues("stock") <= 1) {
                              form.setValue("stock", 10);
                            }
                          }
                        }}
                        className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {getCategoryIcon(cat.code)}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tgl Masuk Unit & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>Tgl Masuk Unit *</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || getTodayString()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand / Merk *</FormLabel>
                      <FormControl>
                        <div className="space-y-1.5">
                          <Input
                            placeholder="Contoh: Apple, Samsung, Xiaomi..."
                            {...field}
                            value={field.value || ""}
                          />
                          <div className="flex flex-wrap gap-1">
                            {COMMON_BRANDS.slice(0, 6).map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => form.setValue("brandName", b)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition border border-border/50 text-muted-foreground"
                              >
                                + {b}
                              </button>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* KHUSUS GADGET DENGAN IMEI: IMEI DENGAN SCAN BARCODE */}
              {isImeiCategory && (
                <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
                  <FormField
                    control={form.control}
                    name="imei"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <FormLabel className="text-sm font-bold text-foreground flex items-center gap-2">
                            <ScanBarcode className="h-4 w-4 text-primary" />
                            <span>Nomor IMEI / Serial ({currentCatalog?.name || "Unit"}) *</span>
                          </FormLabel>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                promptCameraPermission();
                                setActiveScanTarget("imei");
                                setIsScannerOpen(true);
                              }}
                              className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary hover:text-white"
                            >
                              <ScanBarcode className="h-3.5 w-3.5" />
                              <span>Scan Kamera</span>
                            </Button>
                            <label className="h-7 px-2 text-xs gap-1 inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer transition font-medium">
                              {isProcessingPhoto ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Camera className="h-3.5 w-3.5" />
                              )}
                              <span>Foto Unit</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={isProcessingPhoto}
                                onChange={(e) =>
                                  handleDirectPhotoScan(e, "imei")
                                }
                              />
                            </label>
                          </div>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Scan barcode IMEI/Serial dus atau ketik manual..."
                              className="font-mono text-sm tracking-wider h-10 pr-24 bg-background"
                              {...field}
                              value={field.value || ""}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                              Auto-Barcode
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-[11px] text-muted-foreground">
                          IMEI / Serial akan otomatis diubah menjadi barcode Code 128
                          untuk ditempel pada unit.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* KHUSUS NON-IMEI (AKSESORIS): SKU / BARCODE & JENIS */}
              {!isImeiCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>Kode SKU / Barcode</FormLabel>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveScanTarget("sku");
                                setIsScannerOpen(true);
                              }}
                              className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:bg-primary/10"
                            >
                              <ScanBarcode className="h-3 w-3" />
                              <span>Scan</span>
                            </Button>
                            <label className="h-6 px-1.5 text-[11px] gap-1 inline-flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer transition font-medium">
                              <Camera className="h-3 w-3" />
                              <span>Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={isProcessingPhoto}
                                onChange={(e) =>
                                  handleDirectPhotoScan(e, "sku")
                                }
                              />
                            </label>
                          </div>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="Contoh: ACC-CHG-25W (Kosongkan utk auto)"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Aksesoris *</FormLabel>
                        <FormControl>
                          <div className="space-y-1.5">
                            <Input
                              placeholder="Contoh: Charger, Casing, TWS..."
                              {...field}
                              value={field.value || ""}
                            />
                            <div className="flex flex-wrap gap-1">
                              {COMMON_ACCESSORY_CATEGORIES.slice(0, 4).map(
                                (c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() =>
                                      form.setValue("categoryName", c)
                                    }
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition border border-border/50 text-muted-foreground"
                                  >
                                    + {c.split(" ")[0]}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Nama Produk */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          isImeiCategory
                            ? "Contoh: iPhone 15 Pro, Galaxy Tab S9, Apple Watch Ultra..."
                            : "Contoh: Fast Charger 25W Type-C, Tempered Glass Anti-Spy..."
                        }
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SPESIFIKASI KHUSUS UNIT BER-IMEI (Kapasitas, Warna, Kelengkapan, Grade) */}
              {isImeiCategory && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/20">
                  <div className={`grid grid-cols-1 ${!isSmartwatch ? "sm:grid-cols-2" : ""} gap-4`}>
                    {/* Kapasitas (RAM/ROM) - Disembunyikan untuk SmartWatch */}
                    {!isSmartwatch && (
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kapasitas (RAM / Storage) *</FormLabel>
                            <FormControl>
                              <div className="space-y-1.5">
                                <Input
                                  placeholder="Contoh: 8/256GB, 12/512GB..."
                                  {...field}
                                  value={field.value || ""}
                                />
                                <div className="flex flex-wrap gap-1">
                                  {COMMON_CAPACITIES.slice(3, 7).map((cap) => (
                                    <button
                                      key={cap}
                                      type="button"
                                      onClick={() =>
                                        form.setValue("capacity", cap)
                                      }
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-primary/10 hover:text-primary border border-border text-muted-foreground transition"
                                    >
                                      {cap}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Warna */}
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warna *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Contoh: Titanium Black, Deep Purple..."
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Kelengkapan */}
                    <FormField
                      control={form.control}
                      name="completeness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kelengkapan Unit *</FormLabel>
                          <FormControl>
                            <div className="space-y-1.5">
                              <Input
                                placeholder="Contoh: Fullset Original, Batangan, Unit + Box..."
                                {...field}
                                value={field.value || ""}
                              />
                              <div className="flex flex-wrap gap-1">
                                {COMMON_COMPLETENESS.map((comp) => (
                                  <button
                                    key={comp}
                                    type="button"
                                    onClick={() =>
                                      form.setValue("completeness", comp)
                                    }
                                    className="text-[10px] px-2 py-0.5 rounded bg-background hover:bg-primary/10 hover:text-primary border border-border text-muted-foreground transition"
                                  >
                                    {comp}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Grade Unit */}
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade Kondisi Unit</FormLabel>
                          <FormControl>
                            <div className="space-y-1.5">
                              <Input
                                placeholder="Contoh: Grade A, Grade B, Like New..."
                                {...field}
                                value={field.value || ""}
                              />
                              <div className="flex flex-wrap gap-1">
                                {COMMON_GRADES.map((gr) => (
                                  <button
                                    key={gr}
                                    type="button"
                                    onClick={() =>
                                      form.setValue("grade", gr)
                                    }
                                    className="text-[10px] px-2 py-0.5 rounded bg-background hover:bg-primary/10 hover:text-primary border border-border text-muted-foreground transition"
                                  >
                                    {gr}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Retail / Supplier */}
              <FormField
                control={form.control}
                name="retailSupplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retail / Supplier (Asal Unit) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Erajaya, TAM, Digimap, Supplier Toko..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Harga Modal (HPP) & Harga Jual Grid - Hanya untuk Super Admin / Owner */}
              {isSuperAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          <span>HPP (Harga Modal) *</span>
                        </FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="0"
                            value={field.value}
                            onValueChange={(val) => field.onChange(val)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Jual (Rp) *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="0"
                            value={field.value}
                            onValueChange={(val) => field.onChange(val)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Status Unit */}
              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Produk</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="available">Ready</option>
                          <option value="sold">Terjual</option>
                          <option value="menunggu_persetujuan">Menunggu Persetujuan</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Catatan untuk Staff Admin bahwa HPP & Harga Jual dikelola Owner */}
              {!isSuperAdmin && (
                <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>Informasi Harga & Status</span>
                  </div>
                  <p>
                    HPP (Harga Modal) dan Harga Jual dikelola secara eksklusif oleh Owner. Anda dapat mengedit spesifikasi unit, grade, kelengkapan, nomor IMEI/SKU, dan foto barang (termasuk barang yang masih menunggu persetujuan maupun yang Anda input).
                  </p>
                </div>
              )}

              {/* Aksesoris: Stok Awal & Min Stok (HP auto 1 stok) */}
              {selectedProductType === "accessory" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stok Awal Masuk (Pcs) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            value={field.value ?? 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batas Minimum Stok *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            value={field.value ?? 5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Foto Produk */}
              <div className="space-y-2">
                <Label>Foto Unit / Dus (Opsional)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 overflow-hidden">
                    {previewImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewImage}
                          alt="Preview Produk"
                          className="h-full w-full object-cover"
                        />
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-[9px] mt-1 font-semibold">
                              Mengompres
                            </span>
                          </div>
                        )}
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(null);
                              form.setValue("imageUrl", "");
                            }}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition shadow-sm"
                            title="Hapus Foto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-accent transition">
                        {isUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isUploading ? "Memproses..." : "Pilih dari Galeri"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>

                      {/* Tombol Foto Kamera HP Langsung */}
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95">
                        <Camera className="h-3.5 w-3.5" />
                        <span>Ambil Foto HP</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Foto otomatis dioptimalkan cepat (WebP) agar hemat memori
                      dan proses upload instan.
                    </p>
                  </div>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="bg-primary text-primary-foreground font-semibold px-6 shadow-md shadow-primary/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingProduct ? (
                    "Simpan Perubahan"
                  ) : (
                    "Simpan & Masukkan Stok"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Barcode Scanner Modal for IMEI & SKU */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={(scannedVal) => {
          if (activeScanTarget === "imei") {
            form.setValue("imei", scannedVal);
            toast.success(`IMEI berhasil di-scan: ${scannedVal}`);
          } else {
            form.setValue("sku", scannedVal);
            toast.success(`SKU / Barcode berhasil di-scan: ${scannedVal}`);
          }
        }}
        title={
          activeScanTarget === "imei"
            ? "Scan Barcode IMEI Unit"
            : "Scan Barcode SKU Aksesoris"
        }
        description={
          activeScanTarget === "imei"
            ? "Arahkan kamera ke barcode garis (1D) IMEI dus HP atau unit perangkat."
            : "Arahkan kamera ke barcode garis (EAN-13 / Code 128) atau QR pada kemasan aksesoris."
        }
      />
    </>
  );
}
