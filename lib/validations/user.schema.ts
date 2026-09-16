import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, underscore, atau minus"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["owner", "admin_kasir", "staff_gudang", "staff_keuangan"], {
    errorMap: () => ({ message: "Role harus Owner, Staff Marketing, Staff Admin, atau Staff Keuangan" }),
  }),
});

export type CreateUserFormValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1, "ID Pengguna wajib diisi"),
  role: z.enum(["owner", "admin_kasir", "staff_gudang", "super_admin", "admin", "staff_keuangan"], {
    errorMap: () => ({ message: "Pilihan role tidak valid" }),
  }),
});

export type UpdateUserRoleValues = z.infer<typeof UpdateUserRoleSchema>;

export const ResetPasswordSchema = z.object({
  userId: z.string().uuid("ID Pengguna tidak valid"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, underscore, atau minus")
    .optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export type UpdateProfileValues = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok dengan password baru",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

