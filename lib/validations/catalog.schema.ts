import { z } from "zod";

export const CatalogSchema = z.object({
  name: z
    .string()
    .min(2, "Nama kategori minimal 2 karakter")
    .max(100, "Nama kategori maksimal 100 karakter")
    .trim(),
  code: z
    .string()
    .min(2, "Kode unik minimal 2 karakter")
    .max(50, "Kode unik maksimal 50 karakter")
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_-]+$/,
      "Kode hanya boleh huruf kecil, angka, garis bawah, dan tanda hubung",
    ),
  hasImei: z.boolean().default(true),
  description: z.string().max(1000).optional().nullable(),
  displayOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

export type CatalogFormValues = z.infer<typeof CatalogSchema>;
