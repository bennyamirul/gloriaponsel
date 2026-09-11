import { z } from "zod";

export const CustomerSchema = z.object({
  name: z
    .string()
    .min(2, "Nama pelanggan minimal 2 karakter")
    .max(100, "Nama pelanggan maksimal 100 karakter")
    .trim(),
  phone: z.string().max(20, "Nomor telepon maksimal 20 digit").optional().nullable(),
  address: z.string().max(255, "Alamat maksimal 255 karakter").optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof CustomerSchema>;
