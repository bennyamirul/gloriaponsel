import { z } from "zod";

export const BrandSchema = z.object({
  name: z
    .string()
    .min(2, "Nama brand minimal 2 karakter")
    .max(50, "Nama brand maksimal 50 karakter")
    .trim(),
  logoUrl: z.string().url("URL logo tidak valid").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type BrandFormValues = z.infer<typeof BrandSchema>;
