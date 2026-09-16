"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  ProductSchema,
  ProductFormValues,
  ApproveProductSchema,
  ApproveProductValues,
} from "@/lib/validations/product.schema";
import { createNotification } from "@/lib/actions/notification.actions";

export interface GetProductsParams {
  query?: string;
  productType?: "phone" | "accessory" | "all";
  status?: "available" | "sold" | "menunggu_persetujuan" | "all";
  page?: number;
  limit?: number;
}

export async function getProducts(params?: GetProductsParams) {
  const user = await requireAuth();
  const isOwner = user.role === "owner" || user.role === "super_admin";
  const isWarehouse = user.role === "staff_gudang";

  const {
    query,
    productType = "all",
    status = "all",
    page = 1,
    limit = 50,
  } = params || {};

  const skip = (page - 1) * limit;

  const where: any = {
    isActive: true,
  };

  if (query && query.trim() !== "") {
    const q = query.trim();
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { imei: { contains: q } },
      { capacity: { contains: q } },
      { color: { contains: q } },
      { brandName: { contains: q } },
      { retailSupplier: { contains: q } },
    ];
  }

  if (productType && productType !== "all") {
    where.productType = productType;
  }

  if (status && status !== "all") {
    where.status = status;
  }

  const [total, rawProducts] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        saleItems: {
          orderBy: { sale: { createdAt: "desc" } },
          take: 1,
          select: {
            warrantyDays: true,
            warrantyExpiry: true,
            isReturned: true,
          },
        },
      },
    }),
  ]);

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imei: p.imei,
    productType: (p.productType as "phone" | "accessory") || "phone",
    capacity: p.capacity,
    color: p.color,
    completeness: p.completeness,
    retailSupplier: p.retailSupplier,
    grade: isWarehouse ? null : ((p as any).grade ?? null),
    status: p.status || "available",
    warrantyDays: p.saleItems[0]?.warrantyDays ?? null,
    warrantyExpiry: p.saleItems[0]?.warrantyExpiry?.toISOString() ?? null,
    entryDate: p.entryDate
      ? p.entryDate.toISOString()
      : p.createdAt.toISOString(),
    variant: p.variant,
    brandName: p.brandName || "-",
    categoryName:
      p.categoryName ||
      (p.productType === "phone" ? "Handphone" : "Aksesoris"),
    sellingPrice: isWarehouse ? 0 : Number(p.sellingPrice),
    purchasePrice: isOwner ? Number(p.purchasePrice) : null,
    stock: p.stock,
    minStock: p.minStock,
    imageUrl: p.imageUrl,
    description: p.description,
    rejectionReason: (p as any).rejectionReason || null,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    isSuperAdmin: isOwner,
    currentUserRole: user.role,
  };
}

/**
 * Mencari produk secara cepat berdasarkan nomor IMEI atau SKU untuk Kasir POS
 */
export async function getProductByImei(identifier: string) {
  await requireAuth();
  if (!identifier || identifier.trim() === "") return null;

  const cleaned = identifier.trim();

  const product = await db.product.findFirst({
    where: {
      OR: [{ imei: cleaned }, { sku: cleaned }],
      isActive: true,
      status: "available",
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imei: product.imei,
    productType: product.productType || "phone",
    capacity: product.capacity,
    color: product.color,
    completeness: product.completeness,
    retailSupplier: product.retailSupplier,
    grade: (product as any).grade ?? null,
    status: product.status,
    brandName: product.brandName || "-",
    categoryName:
      product.categoryName ||
      (product.productType === "phone" ? "Handphone" : "Aksesoris"),
    sellingPrice: Number(product.sellingPrice),
    purchasePrice: Number(product.purchasePrice),
    stock: product.stock,
    imageUrl: product.imageUrl,
  };
}

/**
 * Mengambil daftar stok yang berstatus tersedia untuk cetak label barcode SKU
 */
export async function getAvailableStockForBarcodes(
  productType?: "phone" | "accessory" | "all",
) {
  await requireAuth();

  const where: any = {
    isActive: true,
  };

  if (productType === "phone") {
    where.productType = "phone";
    where.status = { in: ["available", "retur"] };
    where.stock = { gt: 0 };
  } else if (productType === "accessory") {
    where.productType = "accessory";
    where.stock = { gt: 0 };
  } else {
    where.OR = [
      {
        productType: "phone",
        status: { in: ["available", "retur"] },
        stock: { gt: 0 },
      },
      { productType: "accessory", stock: { gt: 0 } },
    ];
  }

  const rawProducts = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      sku: true,
      imei: true,
      productType: true,
      capacity: true,
      color: true,
      completeness: true,
      retailSupplier: true,
      status: true,
      sellingPrice: true,
      stock: true,
      brandName: true,
      entryDate: true,
      createdAt: true,
    },
  });

  return rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imei: p.imei || p.sku,
    productType: p.productType || "phone",
    capacity: p.capacity,
    color: p.color,
    completeness: p.completeness,
    retailSupplier: p.retailSupplier,
    status: p.status,
    sellingPrice: Number(p.sellingPrice),
    stock: p.stock,
    brandName: p.brandName || "Gloria Ponsel",
    entryDate: p.entryDate
      ? p.entryDate.toISOString()
      : p.createdAt.toISOString(),
  }));
}

export async function createProduct(values: ProductFormValues) {
  const user = await requireAuth();
  const isWarehouse = user.role === "staff_gudang";

  const validated = ProductSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const data = validated.data;
  if (isWarehouse) {
    data.status = "menunggu_persetujuan";
    data.purchasePrice = 0;
    data.sellingPrice = 0;
    data.grade = null;
  }

  // For Phone, stock is 1 unit per unique IMEI
  const stock = data.productType === "phone" ? 1 : data.stock;
  const imei = data.productType === "phone" ? data.imei : null;

  // Auto generate SKU if not manually specified
  let sku = data.sku;
  if (!sku || sku.trim() === "") {
    if (imei) {
      sku = imei;
    } else {
      sku = `GP-ACC-${Date.now().toString().slice(-6)}`;
    }
  }

  try {
    // Check SKU duplicate
    const existingSku = await db.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      return { error: `SKU "${sku}" sudah digunakan oleh produk lain.` };
    }

    // Check IMEI duplicate if phone
    if (imei) {
      const existingImei = await db.product.findUnique({
        where: { imei },
      });
      if (existingImei) {
        return { error: `Nomor IMEI "${imei}" sudah terdaftar di sistem.` };
      }
    }

    const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();

    // Perform atomic transaction: Create product AND Record initial stock movement
    await db.$transaction(async (tx) => {
      const targetGrade = data.grade || null;
      let newProduct: any;

      try {
        newProduct = await tx.product.create({
          data: {
            name: data.name,
            sku,
            imei,
            productType: data.productType,
            capacity: data.capacity || null,
            color: data.color || null,
            completeness: data.completeness || null,
            retailSupplier: data.retailSupplier || null,
            grade: targetGrade,
            status: data.status || "available",
            entryDate,
            brandName: data.brandName || null,
            categoryName:
              data.categoryName ||
              (data.productType === "phone" ? "Handphone" : "Aksesoris"),
            variant: data.variant || null,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            stock,
            minStock: data.minStock,
            imageUrl: data.imageUrl || null,
            description: data.description || null,
            isActive: data.isActive,
          },
        });
      } catch (err: any) {
        if (
          err?.message?.includes("grade") ||
          err?.message?.includes("Unknown argument") ||
          err?.message?.includes("invocation")
        ) {
          newProduct = await tx.product.create({
            data: {
              name: data.name,
              sku,
              imei,
              productType: data.productType,
              capacity: data.capacity || null,
              color: data.color || null,
              completeness: data.completeness || null,
              retailSupplier: data.retailSupplier || null,
              status: data.status || "available",
              entryDate,
              brandName: data.brandName || null,
              categoryName:
                data.categoryName ||
                (data.productType === "phone" ? "Handphone" : "Aksesoris"),
              variant: data.variant || null,
              purchasePrice: data.purchasePrice,
              sellingPrice: data.sellingPrice,
              stock,
              minStock: data.minStock,
              imageUrl: data.imageUrl || null,
              description: data.description || null,
              isActive: data.isActive,
            },
          });
          if (targetGrade) {
            await tx.$executeRaw`UPDATE products SET grade = ${targetGrade} WHERE id = ${newProduct.id}::uuid`;
          }
        } else {
          throw err;
        }
      }

      // Automatically record initial incoming stock movement
      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: newProduct.id,
            type: "in",
            quantity: stock,
            referenceType: "manual",
            referenceId: newProduct.id,
            note: `Stok awal masuk unit dari ${data.retailSupplier || "Supplier"}`,
            createdById: user.id,
            createdAt: entryDate,
          },
        });
      }
    });

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    if (isWarehouse) {
      await createNotification({
        targetRole: "owner",
        title: "Barang Masuk Perlu Persetujuan",
        message: `Produk "${data.name}" (${sku}) telah diinput oleh staf gudang (${user.name || "Gudang"}) dan menunggu persetujuan Anda.`,
        type: "stock_approval",
        link: "/products",
      });
    } else {
      // Owner yang input langsung berstatus ready -> Kirim notifikasi ke Admin Kasir
      if ((data.status === "available" || !data.status) && stock > 0) {
        await createNotification({
          targetRole: "admin_kasir",
          title: "Barang Baru Ready",
          message: `Unit "${data.name}" (${sku}) telah ditambahkan dan siap dijual (Ready).`,
          type: "stock_status",
          link: "/sales",
          excludeUserId: user.id,
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("createProduct error:", error);
    return { error: error?.message || "Gagal menambahkan produk baru." };
  }
}

export async function updateProduct(id: string, values: ProductFormValues) {
  const user = await requireAuth();
  const isOwner = user.role === "owner" || user.role === "super_admin";
  const isWarehouse = user.role === "staff_gudang";

  const validated = ProductSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input tidak valid" };
  }

  const data = validated.data;
  const imei = data.productType === "phone" ? data.imei : null;

  try {
    const currentProduct = await db.product.findUnique({ where: { id } });
    if (!currentProduct) {
      return { error: "Produk tidak ditemukan." };
    }

    if (isWarehouse && currentProduct.status !== "ditolak") {
      return { error: "Staff gudang hanya memiliki izin untuk mengedit produk yang ditolak oleh Owner." };
    }

    // Check SKU collision
    if (data.sku && data.sku !== currentProduct.sku) {
      const existingSku = await db.product.findFirst({
        where: {
          sku: data.sku,
          NOT: { id },
        },
      });
      if (existingSku) {
        return { error: `SKU "${data.sku}" sudah digunakan oleh produk lain.` };
      }
    }

    // Check IMEI collision
    if (imei && imei !== currentProduct.imei) {
      const existingImei = await db.product.findFirst({
        where: {
          imei,
          NOT: { id },
        },
      });
      if (existingImei) {
        return { error: `Nomor IMEI "${imei}" sudah digunakan.` };
      }
    }

    const purchasePrice = isOwner
      ? data.purchasePrice
      : currentProduct.purchasePrice;

    const sellingPrice = isOwner
      ? data.sellingPrice
      : currentProduct.sellingPrice;

    const entryDate = data.entryDate
      ? new Date(data.entryDate)
      : currentProduct.entryDate;

    const targetGrade =
      data.grade !== undefined
        ? data.grade || null
        : (currentProduct as any).grade;

    const finalStatus = isWarehouse ? "menunggu_persetujuan" : (data.status || currentProduct.status);
    const finalRejectionReason = isWarehouse ? null : ((currentProduct as any).rejectionReason || null);

    try {
      await db.product.update({
        where: { id },
        data: {
          name: data.name,
          sku:
            data.sku ||
            (data.productType === "phone" ? imei : null) ||
            currentProduct.sku,
          imei,
          productType: data.productType,
          capacity: data.capacity || null,
          color: data.color || null,
          completeness: data.completeness || null,
          retailSupplier: data.retailSupplier || null,
          grade: targetGrade,
          entryDate,
          brandName: data.brandName || null,
          categoryName:
            data.categoryName ||
            (data.productType === "phone"
              ? "Handphone"
              : currentProduct.categoryName || "Aksesoris"),
          variant: data.variant || null,
          purchasePrice,
          sellingPrice,
          stock: data.productType === "phone" ? currentProduct.stock : data.stock,
          minStock: data.minStock,
          imageUrl: data.imageUrl || null,
          description: data.description || null,
          status: finalStatus,
          rejectionReason: finalRejectionReason,
          isActive: data.isActive,
        },
      });
    } catch (err: any) {
      if (
        err?.message?.includes("grade") ||
        err?.message?.includes("Unknown argument") ||
        err?.message?.includes("invocation")
      ) {
        await db.product.update({
          where: { id },
          data: {
            name: data.name,
            sku:
              data.sku ||
              (data.productType === "phone" ? imei : null) ||
              currentProduct.sku,
            imei,
            productType: data.productType,
            capacity: data.capacity || null,
            color: data.color || null,
            completeness: data.completeness || null,
            retailSupplier: data.retailSupplier || null,
            entryDate,
            brandName: data.brandName || null,
            categoryName:
              data.categoryName ||
              (data.productType === "phone"
                ? "Handphone"
                : currentProduct.categoryName || "Aksesoris"),
            variant: data.variant || null,
            purchasePrice,
            sellingPrice,
            stock: data.productType === "phone" ? currentProduct.stock : data.stock,
            minStock: data.minStock,
            imageUrl: data.imageUrl || null,
            description: data.description || null,
            status: finalStatus,
            rejectionReason: finalRejectionReason,
            isActive: data.isActive,
          },
        });
        if (targetGrade !== undefined) {
          await db.$executeRaw`UPDATE products SET grade = ${targetGrade} WHERE id = ${id}::uuid`;
        }
      } else {
        throw err;
      }
    }

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    if (isWarehouse) {
      await createNotification({
        targetRole: "owner",
        title: "Barang Masuk Diajukan Ulang",
        message: `Produk "${data.name}" (${data.sku || currentProduct.sku}) telah diperbaiki oleh staf gudang dan menunggu persetujuan ulang Anda.`,
        type: "stock_approval",
        link: "/products",
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateProduct error:", error);
    return { error: error?.message || "Gagal memperbarui produk." };
  }
}

/**
 * Memperbarui status produk (available / sold) secara langsung dan opsional harga jual
 */
export async function updateProductStatus(
  id: string,
  status: "available" | "sold" | string,
  sellingPrice?: number,
) {
  await requireRole(["owner", "super_admin"]);

  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return { error: "Produk tidak ditemukan." };
    }

    const normalizedStatus = status === "sold" ? "sold" : "available";
    const updateData: any = { status: normalizedStatus };
    if (
      typeof sellingPrice === "number" &&
      !isNaN(sellingPrice) &&
      sellingPrice > 0
    ) {
      updateData.sellingPrice = sellingPrice;
    }

    await db.product.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    const statusLabel = normalizedStatus === "available" ? "Ready" : "Terjual";

    return {
      success: true,
      message: `Status produk "${product.name}" berhasil diubah menjadi "${statusLabel}".`,
    };
  } catch (error: any) {
    console.error("updateProductStatus error:", error);
    return { error: error?.message || "Gagal mengubah status produk." };
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
  const user = await requireAuth();
  if (user.role === "staff_gudang") {
    return { error: "Staff gudang tidak memiliki izin untuk menghapus produk." };
  }

  try {
    const saleItemsCount = await db.saleItem.count({
      where: { productId: id },
    });

    if (saleItemsCount > 0) {
      await db.product.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/products");
      revalidatePath("/stock");
      revalidatePath("/dashboard");
      revalidatePath("/sales");
      return {
        success: true,
        message:
          "Produk dinonaktifkan dan dihapus dari katalog karena memiliki riwayat transaksi.",
      };
    }

    await db.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({
        where: { productId: id },
      });
      await tx.product.delete({
        where: { id },
      });
    });

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/sales");
    return { success: true, message: "Produk berhasil dihapus." };
  } catch (error: any) {
    console.error("deleteProduct error:", error);
    return { error: error?.message || "Gagal menghapus produk." };
  }
}

/**
 * Persetujuan produk oleh Owner (input grade, HPP, harga jual)
 */
export async function approveProduct(id: string, values: ApproveProductValues) {
  await requireRole(["owner", "super_admin"]);

  const validated = ApproveProductSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Input persetujuan tidak valid." };
  }

  const { grade, purchasePrice, sellingPrice } = validated.data;

  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return { error: "Produk tidak ditemukan." };
    }

    try {
      await db.product.update({
        where: { id },
        data: {
          grade,
          purchasePrice,
          sellingPrice,
          status: "available",
        },
      });
    } catch {
      await db.product.update({
        where: { id },
        data: {
          purchasePrice,
          sellingPrice,
          status: "available",
        },
      });
      await db.$executeRaw`UPDATE products SET grade = ${grade} WHERE id = ${id}::uuid`;
    }

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    await createNotification({
      targetRole: "staff_gudang",
      title: "Barang Masuk Disetujui",
      message: `Produk "${product.name}" (${product.sku}) telah disetujui oleh Owner dan kini aktif (Ready).`,
      type: "stock_status",
      link: "/products",
    });

    await createNotification({
      targetRole: "admin_kasir",
      title: "Barang Baru Ready",
      message: `Unit "${product.name}" (${product.sku}) telah disetujui dan kini siap dijual (Ready).`,
      type: "stock_status",
      link: "/sales",
    });

    return {
      success: true,
      message: `Produk "${product.name}" berhasil disetujui dan kini berstatus aktif (Ready).`,
    };
  } catch (error: any) {
    console.error("approveProduct error:", error);
    return { error: error?.message || "Gagal menyetujui produk." };
  }
}

/**
 * Tolak produk oleh Owner (jika ditolak, barang langsung dihapus sehingga tidak masuk ke data)
 */
export async function rejectProduct(id: string, reason?: string) {
  await requireRole(["owner", "super_admin"]);

  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return { error: "Produk tidak ditemukan." };
    }

    const rejectionNote = reason && reason.trim() ? reason.trim() : "Ditolak oleh Owner";

    await db.product.update({
      where: { id },
      data: {
        status: "ditolak",
        rejectionReason: rejectionNote,
      },
    });

    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/sales");

    await createNotification({
      targetRole: "staff_gudang",
      title: "Barang Masuk Ditolak",
      message: `Produk "${product.name}" ditolak oleh Owner. Alasan: ${rejectionNote}`,
      type: "stock_status",
      link: "/products",
    });

    return {
      success: true,
      message: `Produk "${product.name}" ditolak dengan catatan: "${rejectionNote}". Data dikembalikan ke Staf Gudang untuk diperbaiki.`,
    };
  } catch (error: any) {
    console.error("rejectProduct error:", error);
    return { error: error?.message || "Gagal menolak produk." };
  }
}

export async function uploadProductImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAuth();

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "File tidak ditemukan." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "File harus berupa gambar (JPG, PNG, WebP)." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 10MB." };
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
