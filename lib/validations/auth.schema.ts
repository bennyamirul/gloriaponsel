import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
