"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { CustomerSchema, CustomerFormValues } from "@/lib/validations/customer.schema";

export async function getCustomers() {
  await requireAuth();
  return db.customer.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCustomer(values: CustomerFormValues) {
  await requireAuth();
  const validated = CustomerSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    await db.customer.create({
      data: {
        name: validated.data.name,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
      },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("createCustomer error:", error);
    return { error: "Gagal menambahkan pelanggan." };
  }
}

export async function updateCustomer(id: string, values: CustomerFormValues) {
  await requireAuth();
  const validated = CustomerSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    await db.customer.update({
      where: { id },
      data: {
        name: validated.data.name,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
      },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("updateCustomer error:", error);
    return { error: "Gagal memperbarui data pelanggan." };
  }
}

export async function deleteCustomer(id: string) {
  await requireAuth();
  try {
    await db.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("deleteCustomer error:", error);
    return { error: "Gagal menghapus pelanggan." };
  }
}
