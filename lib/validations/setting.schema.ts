import { z } from "zod";

export const StoreSettingSchema = z.object({
  storeName: z.string().min(2, "Nama toko minimal 2 karakter"),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  receiptFooter: z.string().optional().or(z.literal("")),
  defaultMinStock: z
    .number({ invalid_type_error: "Batas minimum stok harus berupa angka" })
    .int("Batas stok harus bilangan bulat")
    .min(0, "Batas stok tidak boleh negatif")
    .default(5),
});

export type StoreSettingFormValues = z.infer<typeof StoreSettingSchema>;
