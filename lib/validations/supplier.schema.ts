import { z } from "zod";

export const SupplierSchema = z.object({
  name: z
    .string()
    .min(2, "Nama supplier minimal 2 karakter")
    .max(100, "Nama supplier maksimal 100 karakter")
    .trim(),
  phone: z
    .string()
    .min(6, "Nomor telepon minimal 6 digit")
    .max(20, "Nomor telepon maksimal 20 digit")
    .trim(),
  address: z.string().max(255, "Alamat maksimal 255 karakter").optional().nullable(),
  isActive: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof SupplierSchema>;
