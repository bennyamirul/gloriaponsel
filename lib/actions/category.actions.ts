"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { CategorySchema, CategoryFormValues } from "@/lib/validations/category.schema";

export async function getCategories() {
  await requireAuth();
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function createCategory(values: CategoryFormValues) {
  await requireAuth();
  const validated = CategorySchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existing = await db.category.findUnique({
      where: { name: validated.data.name },
    });
    if (existing) {
      return { error: `Kategori dengan nama "${validated.data.name}" sudah ada.` };
    }

    await db.category.create({
      data: {
        name: validated.data.name,
        description: validated.data.description,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/categories");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("createCategory error:", error);
    return { error: "Gagal menambahkan kategori." };
  }
}

export async function updateCategory(id: string, values: CategoryFormValues) {
  await requireAuth();
  const validated = CategorySchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existing = await db.category.findFirst({
      where: {
        name: validated.data.name,
        NOT: { id },
      },
    });
    if (existing) {
      return { error: `Kategori dengan nama "${validated.data.name}" sudah digunakan.` };
    }

    await db.category.update({
      where: { id },
      data: {
        name: validated.data.name,
        description: validated.data.description,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/categories");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("updateCategory error:", error);
    return { error: "Gagal memperbarui kategori." };
  }
}

export async function toggleCategoryStatus(id: string, currentStatus: boolean) {
  await requireAuth();
  try {
    await db.category.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("toggleCategoryStatus error:", error);
    return { error: "Gagal mengubah status kategori." };
  }
}

export async function deleteCategory(id: string) {
  await requireAuth();
  try {
    // Check if category has products
    const count = await db.product.count({ where: { categoryId: id } });
    if (count > 0) {
      // Soft-deactivate if products exist
      await db.category.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/categories");
      return {
        success: true,
        message: "Kategori memiliki produk terkait sehingga dinonaktifkan.",
      };
    }

    await db.category.delete({ where: { id } });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("deleteCategory error:", error);
    return { error: "Gagal menghapus kategori." };
  }
}
