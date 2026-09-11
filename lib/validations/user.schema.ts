import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Nama pengguna minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "super_admin"], {
    errorMap: () => ({ message: "Role harus admin atau super_admin" }),
  }),
});

export type CreateUserFormValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid("ID Pengguna tidak valid"),
  role: z.enum(["admin", "super_admin"]),
});

export type UpdateUserRoleValues = z.infer<typeof UpdateUserRoleSchema>;

export const ResetPasswordSchema = z.object({
  userId: z.string().uuid("ID Pengguna tidak valid"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;
