"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ProductSchema, ProductFormValues } from "@/lib/validations/product.schema";
import { createProduct, updateProduct, uploadProductImage } from "@/lib/actions/product.actions";

interface Option {
  id: string;
  name: string;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  variant: string | null;
  brandId: string;
  categoryId: string;
  brandName: string;
  categoryName: string;
  sellingPrice: number;
  purchasePrice: number | null;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: ProductItem | null;
  categories: Option[];
  brands: Option[];
  isSuperAdmin: boolean;
  onSuccess: () => void;
}

export function ProductFormSheet({
  open,
  onOpenChange,
  editingProduct,
  categories,
  brands,
  isSuperAdmin,
  onSuccess,
}: ProductFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: "",
      brandId: "",
      categoryId: "",
      sku: "",
      variant: "",
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 5,
      imageUrl: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (editingProduct) {
      form.reset({
        name: editingProduct.name,
        brandId: editingProduct.brandId,
        categoryId: editingProduct.categoryId,
        sku: editingProduct.sku,
        variant: editingProduct.variant || "",
        purchasePrice: editingProduct.purchasePrice ?? 0,
        sellingPrice: editingProduct.sellingPrice,
        stock: editingProduct.stock,
        minStock: editingProduct.minStock,
        imageUrl: editingProduct.imageUrl || "",
        description: editingProduct.description || "",
        isActive: editingProduct.isActive,
      });
      setPreviewImage(editingProduct.imageUrl);
    } else {
      form.reset({
        name: "",
        brandId: brands[0]?.id || "",
        categoryId: categories[0]?.id || "",
        sku: "",
        variant: "",
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        minStock: 5,
        imageUrl: "",
        description: "",
        isActive: true,
      });
      setPreviewImage(null);
    }
  }, [editingProduct, brands, categories, form, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadProductImage(formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.url) {
        form.setValue("imageUrl", res.url);
        setPreviewImage(res.url);
        toast.success("Foto produk berhasil diunggah!");
      }
    } catch {
      toast.error("Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsLoading(true);
    try {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Data produk berhasil diperbarui!");
          onSuccess();
          onOpenChange(false);
        }
      } else {
        const res = await createProduct(values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Produk baru berhasil ditambahkan!");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-6"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground">
            {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
          </SheetTitle>
          <SheetDescription>
            Lengkapi data spesifikasi, harga, stok, dan gambar produk.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
            {/* Nama Produk */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk *</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: iPhone 15 Pro, Galaxy S24..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand & Kategori Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>Pilih Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="" disabled>Pilih Kategori</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SKU & Varian Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode SKU / Barcode *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: APL-IP15P-128" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varian (Warna / Storage)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: 8/256GB Black..."
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Harga Modal & Harga Jual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <span>Harga Modal (Rp)</span>
                      {!isSuperAdmin && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">
                          Super Admin only
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        disabled={!isSuperAdmin && !!editingProduct}
                        {...field}
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
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stok & Batas Minimum Stok Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Awal (Unit) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
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
                    <FormLabel>Batas Minimum Stok (Low Stock) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Foto Produk (Upload / URL) */}
            <div className="space-y-2">
              <Label>Foto Produk</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 overflow-hidden">
                  {previewImage ? (
                    <>
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage(null);
                          form.setValue("imageUrl", "");
                        }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-accent transition">
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{isUploading ? "Mengunggah..." : "Unggah Gambar"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <Input
                        placeholder="Atau tempel URL gambar..."
                        className="text-xs h-8"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          setPreviewImage(e.target.value || null);
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi / Catatan Garansi</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Keterangan spesifikasi singkat, garansi resmi, dll..."
                      className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tombol Simpan & Batal */}
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
                className="bg-indigo-600 hover:bg-indigo-500 font-semibold px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingProduct ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Produk"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
