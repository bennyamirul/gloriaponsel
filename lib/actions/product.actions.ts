"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProductSchema, ProductFormValues } from "@/lib/validations/product.schema";

export interface GetProductsParams {
  query?: string;
  categoryId?: string;
  brandId?: string;
  page?: number;
  limit?: number;
}

export async function getProducts(params?: GetProductsParams) {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin";

  const { query, categoryId, brandId, page = 1, limit = 20 } = params || {};
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query && query.trim() !== "") {
    where.OR = [
      { name: { contains: query.trim(), mode: "insensitive" } },
      { sku: { contains: query.trim(), mode: "insensitive" } },
      { variant: { contains: query.trim(), mode: "insensitive" } },
    ];
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  if (brandId && brandId !== "all") {
    where.brandId = brandId;
  }

  const [total, rawProducts] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, logoUrl: true } },
      },
    }),
  ]);

  // Sanitize sensitive field: purchasePrice is stripped if user is NOT super_admin
  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    variant: p.variant,
    brandId: p.brandId,
    categoryId: p.categoryId,
    brandName: p.brand.name,
    categoryName: p.category.name,
    sellingPrice: Number(p.sellingPrice),
    purchasePrice: isSuperAdmin ? Number(p.purchasePrice) : null, // Masked for Admin
    stock: p.stock,
    minStock: p.minStock,
    imageUrl: p.imageUrl,
    description: p.description,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    isSuperAdmin,
  };
}

export async function createProduct(values: ProductFormValues) {
  const user = await requireAuth();

  const validated = ProductSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existingSku = await db.product.findUnique({
      where: { sku: validated.data.sku },
    });
    if (existingSku) {
      return { error: `SKU "${validated.data.sku}" sudah digunakan oleh produk lain.` };
    }

    await db.product.create({
      data: {
        name: validated.data.name,
        brandId: validated.data.brandId,
        categoryId: validated.data.categoryId,
        sku: validated.data.sku,
        variant: validated.data.variant || null,
        purchasePrice: validated.data.purchasePrice,
        sellingPrice: validated.data.sellingPrice,
        stock: validated.data.stock,
        minStock: validated.data.minStock,
        imageUrl: validated.data.imageUrl || null,
        description: validated.data.description || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("createProduct error:", error);
    return { error: "Gagal menambahkan produk baru." };
  }
}

export async function updateProduct(id: string, values: ProductFormValues) {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin";

  const validated = ProductSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  try {
    const existingSku = await db.product.findFirst({
      where: {
        sku: validated.data.sku,
        NOT: { id },
      },
    });
    if (existingSku) {
      return { error: `SKU "${validated.data.sku}" sudah digunakan oleh produk lain.` };
    }

    const currentProduct = await db.product.findUnique({ where: { id } });
    if (!currentProduct) {
      return { error: "Produk tidak ditemukan." };
    }

    // If non-super_admin edits, preserve existing purchase price
    const purchasePrice = isSuperAdmin
      ? validated.data.purchasePrice
      : currentProduct.purchasePrice;

    await db.product.update({
      where: { id },
      data: {
        name: validated.data.name,
        brandId: validated.data.brandId,
        categoryId: validated.data.categoryId,
        sku: validated.data.sku,
        variant: validated.data.variant || null,
        purchasePrice,
        sellingPrice: validated.data.sellingPrice,
        stock: validated.data.stock,
        minStock: validated.data.minStock,
        imageUrl: validated.data.imageUrl || null,
        description: validated.data.description || null,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateProduct error:", error);
    return { error: "Gagal memperbarui produk." };
  }
}

export async function toggleProductStatus(id: string, currentStatus: boolean) {
  await requireAuth();
  try {
    await db.product.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("toggleProductStatus error:", error);
    return { error: "Gagal mengubah status produk." };
  }
}

export async function deleteProduct(id: string) {
  await requireAuth();
  try {
    // Sesuai Aturan Bisnis #7: Produk yang sudah bertransaksi dinonaktifkan alih-alih dihapus permanen
    // Saat ini di Phase 2 belum ada tabel transaksi, jadi soft-deactivate digunakan
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, message: "Produk dinonaktifkan." };
  } catch (error) {
    console.error("deleteProduct error:", error);
    return { error: "Gagal menonaktifkan produk." };
  }
}

export async function uploadProductImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAuth();

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "File tidak ditemukan." };
  }

  // Validate mime type
  if (!file.type.startsWith("image/")) {
    return { error: "File harus berupa gambar (JPG, PNG, WebP)." };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 5MB." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    return { url: `/uploads/${filename}` };
  } catch (error) {
    console.error("uploadProductImage error:", error);
    return { error: "Gagal mengunggah gambar." };
  }
}
