"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { BrandSchema, BrandFormValues } from "@/lib/validations/brand.schema";

export async function getBrands() {
  await requireAuth();
  return db.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function createBrand(values: BrandFormValues) {
  await requireAuth();
  const validated = BrandSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existing = await db.brand.findUnique({
      where: { name: validated.data.name },
    });
    if (existing) {
      return { error: `Brand dengan nama "${validated.data.name}" sudah ada.` };
    }

    await db.brand.create({
      data: {
        name: validated.data.name,
        logoUrl: validated.data.logoUrl || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/brands");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("createBrand error:", error);
    return { error: "Gagal menambahkan brand." };
  }
}

export async function updateBrand(id: string, values: BrandFormValues) {
  await requireAuth();
  const validated = BrandSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existing = await db.brand.findFirst({
      where: {
        name: validated.data.name,
        NOT: { id },
      },
    });
    if (existing) {
      return { error: `Brand dengan nama "${validated.data.name}" sudah digunakan.` };
    }

    await db.brand.update({
      where: { id },
      data: {
        name: validated.data.name,
        logoUrl: validated.data.logoUrl || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/brands");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("updateBrand error:", error);
    return { error: "Gagal memperbarui brand." };
  }
}

export async function toggleBrandStatus(id: string, currentStatus: boolean) {
  await requireAuth();
  try {
    await db.brand.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/brands");
    return { success: true };
  } catch (error) {
    console.error("toggleBrandStatus error:", error);
    return { error: "Gagal mengubah status brand." };
  }
}

export async function deleteBrand(id: string) {
  await requireAuth();
  try {
    const count = await db.product.count({ where: { brandId: id } });
    if (count > 0) {
      await db.brand.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/brands");
      return {
        success: true,
        message: "Brand memiliki produk terkait sehingga dinonaktifkan.",
      };
    }

    await db.brand.delete({ where: { id } });
    revalidatePath("/brands");
    return { success: true };
  } catch (error) {
    console.error("deleteBrand error:", error);
    return { error: "Gagal menghapus brand." };
  }
}
