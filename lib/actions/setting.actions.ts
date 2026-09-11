"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { StoreSettingSchema, StoreSettingFormValues } from "@/lib/validations/setting.schema";

/**
 * Mengambil informasi profil & konfigurasi toko (Bisa diakses seluruh user terautentikasi untuk struk)
 */
export async function getStoreSettings() {
  await requireAuth();

  let settings = await db.storeSetting.findFirst();

  if (!settings) {
    settings = await db.storeSetting.create({
      data: {
        storeName: "Toko Handphone Sejahtera",
        phone: "0812-3456-7890",
        address: "Jl. Sudirman No. 45, Jakarta Pusat",
        receiptFooter: "Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.",
        defaultMinStock: 5,
      },
    });
  }

  return {
    id: settings.id,
    storeName: settings.storeName,
    phone: settings.phone || "",
    address: settings.address || "",
    logoUrl: settings.logoUrl || "",
    receiptFooter: settings.receiptFooter || "",
    defaultMinStock: settings.defaultMinStock,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

/**
 * Memperbarui profil toko dan konfigurasi default (Super Admin Only)
 */
export async function updateStoreSettings(formData: FormData) {
  await requireRole(["super_admin"]);

  const storeName = formData.get("storeName") as string;
  const phone = (formData.get("phone") as string) || "";
  const address = (formData.get("address") as string) || "";
  const receiptFooter = (formData.get("receiptFooter") as string) || "";
  const defaultMinStock = parseInt((formData.get("defaultMinStock") as string) || "5", 10);
  const logoFile = formData.get("logo") as File | null;

  const validated = StoreSettingSchema.safeParse({
    storeName,
    phone,
    address,
    receiptFooter,
    defaultMinStock,
  });

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input pengaturan tidak valid" };
  }

  try {
    let logoUrl: string | undefined = undefined;

    // Handle logo upload jika ada file baru diunggah
    if (logoFile && logoFile.size > 0 && typeof logoFile.name === "string") {
      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      const cleanFileName = `logo_${Date.now()}_${logoFile.name.replace(/\s+/g, "_")}`;
      const filePath = join(uploadDir, cleanFileName);
      await writeFile(filePath, buffer);

      logoUrl = `/uploads/${cleanFileName}`;
    }

    const currentSetting = await db.storeSetting.findFirst();

    if (currentSetting) {
      await db.storeSetting.update({
        where: { id: currentSetting.id },
        data: {
          storeName: validated.data.storeName,
          phone: validated.data.phone || null,
          address: validated.data.address || null,
          receiptFooter: validated.data.receiptFooter || null,
          defaultMinStock: validated.data.defaultMinStock,
          ...(logoUrl ? { logoUrl } : {}),
        },
      });
    } else {
      await db.storeSetting.create({
        data: {
          storeName: validated.data.storeName,
          phone: validated.data.phone || null,
          address: validated.data.address || null,
          receiptFooter: validated.data.receiptFooter || null,
          defaultMinStock: validated.data.defaultMinStock,
          logoUrl: logoUrl || null,
        },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("updateStoreSettings error:", error);
    return { error: error.message || "Gagal menyimpan pengaturan toko." };
  }
}
