"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SupplierSchema, SupplierFormValues } from "@/lib/validations/supplier.schema";

export async function getSuppliers() {
  await requireAuth();
  return db.supplier.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(values: SupplierFormValues) {
  await requireAuth();
  const validated = SupplierSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    await db.supplier.create({
      data: {
        name: validated.data.name,
        phone: validated.data.phone,
        address: validated.data.address || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("createSupplier error:", error);
    return { error: "Gagal menambahkan supplier." };
  }
}

export async function updateSupplier(id: string, values: SupplierFormValues) {
  await requireAuth();
  const validated = SupplierSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    await db.supplier.update({
      where: { id },
      data: {
        name: validated.data.name,
        phone: validated.data.phone,
        address: validated.data.address || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("updateSupplier error:", error);
    return { error: "Gagal memperbarui data supplier." };
  }
}

export async function toggleSupplierStatus(id: string, currentStatus: boolean) {
  await requireAuth();
  try {
    await db.supplier.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("toggleSupplierStatus error:", error);
    return { error: "Gagal mengubah status supplier." };
  }
}

export async function deleteSupplier(id: string) {
  await requireAuth();
  try {
    await db.supplier.delete({ where: { id } });
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("deleteSupplier error:", error);
    return { error: "Gagal menghapus supplier." };
  }
}
