import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
