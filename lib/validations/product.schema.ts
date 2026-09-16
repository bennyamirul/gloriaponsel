import { z } from "zod";

export const ProductSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama produk minimal 2 karakter")
      .max(150, "Nama produk maksimal 150 karakter")
      .trim(),
    productType: z.enum(["phone", "accessory"]).default("phone"),
    imei: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
    capacity: z.string().max(50).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    completeness: z.string().max(100).optional().nullable(),
    retailSupplier: z.string().max(100).optional().nullable(),
    grade: z.string().max(50).optional().nullable(),
    entryDate: z.string().optional().nullable(),
    brandName: z.string().max(100).optional().nullable(),
    categoryName: z.string().max(100).optional().nullable(),
    brandId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    sku: z
      .string()
      .max(60)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
    variant: z.string().max(100).optional().nullable(),
    purchasePrice: z.coerce
      .number({ invalid_type_error: "Harga modal harus berupa angka" })
      .min(0, "Harga modal tidak boleh negatif")
      .default(0),
    sellingPrice: z.coerce
      .number({ invalid_type_error: "Harga jual harus berupa angka" })
      .min(0, "Harga jual tidak boleh negatif")
      .default(0),
    stock: z.coerce
      .number({ invalid_type_error: "Stok harus berupa angka" })
      .int("Stok harus bilangan bulat")
      .min(0, "Stok tidak boleh negatif")
      .default(1),
    minStock: z.coerce
      .number({ invalid_type_error: "Batas minimum stok harus berupa angka" })
      .int("Batas minimum stok harus bilangan bulat")
      .min(0, "Batas minimum stok tidak boleh negatif")
      .default(5),
    imageUrl: z.string().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    status: z
      .preprocess((val) => {
        if (val === "sold") return "sold";
        if (val === "menunggu_persetujuan") return "menunggu_persetujuan";
        if (val === "ditolak") return "ditolak";
        return "available";
      }, z.enum(["available", "sold", "menunggu_persetujuan", "ditolak"]))
      .default("available"),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.productType === "phone" && !data.imei) {
        return false;
      }
      return true;
    },
    {
      message: "Nomor IMEI wajib diisi untuk produk handphone",
      path: ["imei"],
    }
  )
  .refine(
    (data) => {
      if (data.status === "menunggu_persetujuan" || data.status === "ditolak") return true;
      return data.sellingPrice >= data.purchasePrice;
    },
    {
      message: "Harga jual tidak boleh lebih kecil dari harga modal",
      path: ["sellingPrice"],
    }
  )
  .refine(
    (data) => {
      if (data.status === "menunggu_persetujuan" || data.status === "ditolak") return true;
      return data.sellingPrice >= 100;
    },
    {
      message: "Harga jual minimal Rp 100",
      path: ["sellingPrice"],
    }
  );

export type ProductFormValues = z.infer<typeof ProductSchema>;

export const ApproveProductSchema = z
  .object({
    grade: z.string().min(1, "Grade produk wajib dipilih/diisi"),
    purchasePrice: z.coerce
      .number({ invalid_type_error: "HPP harus berupa angka" })
      .min(0, "Harga modal (HPP) tidak boleh negatif"),
    sellingPrice: z.coerce
      .number({ invalid_type_error: "Harga jual harus berupa angka" })
      .min(100, "Harga jual minimal Rp 100"),
  })
  .refine((data) => data.sellingPrice >= data.purchasePrice, {
    message: "Harga jual tidak boleh lebih kecil dari harga modal (HPP)",
    path: ["sellingPrice"],
  });

export type ApproveProductValues = z.infer<typeof ApproveProductSchema>;
