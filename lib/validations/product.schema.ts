import { z } from "zod";

export const ProductSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama produk minimal 2 karakter")
      .max(150, "Nama produk maksimal 150 karakter")
      .trim(),
    brandId: z.string().uuid("Pilih brand yang valid"),
    categoryId: z.string().uuid("Pilih kategori yang valid"),
    sku: z
      .string()
      .min(3, "SKU minimal 3 karakter")
      .max(50, "SKU maksimal 50 karakter")
      .regex(/^[A-Za-z0-9-_]+$/, "SKU hanya boleh berisi huruf, angka, tanda hubung (-), dan garis bawah (_)")
      .trim(),
    variant: z.string().max(100, "Varian maksimal 100 karakter").optional().nullable(),
    purchasePrice: z.coerce
      .number({ invalid_type_error: "Harga modal harus berupa angka" })
      .min(0, "Harga modal tidak boleh negatif"),
    sellingPrice: z.coerce
      .number({ invalid_type_error: "Harga jual harus berupa angka" })
      .min(100, "Harga jual minimal Rp 100"),
    stock: z.coerce
      .number({ invalid_type_error: "Stok harus berupa angka" })
      .int("Stok harus bilangan bulat")
      .min(0, "Stok tidak boleh negatif")
      .default(0),
    minStock: z.coerce
      .number({ invalid_type_error: "Batas minimum stok harus berupa angka" })
      .int("Batas minimum stok harus bilangan bulat")
      .min(0, "Batas minimum stok tidak boleh negatif")
      .default(5),
    imageUrl: z.string().optional().nullable(),
    description: z.string().max(1000, "Deskripsi maksimal 1000 karakter").optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => data.sellingPrice >= data.purchasePrice,
    {
      message: "Harga jual tidak boleh lebih kecil dari harga modal",
      path: ["sellingPrice"],
    }
  );

export type ProductFormValues = z.infer<typeof ProductSchema>;
