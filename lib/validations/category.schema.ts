import { z } from "zod";

export const CategorySchema = z.object({
  name: z
    .string()
    .min(2, "Nama kategori minimal 2 karakter")
    .max(50, "Nama kategori maksimal 50 karakter")
    .trim(),
  description: z.string().max(255, "Deskripsi maksimal 255 karakter").optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof CategorySchema>;
