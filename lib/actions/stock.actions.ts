"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  StockInSchema,
  StockInFormValues,
  StockAdjustmentSchema,
  StockAdjustmentFormValues,
} from "@/lib/validations/stock.schema";

export interface StockMovementQuery {
  productId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

/**
 * Mencatat stok masuk dari supplier (Penerimaan Barang)
 */
export async function createStockIn(values: StockInFormValues) {
  const user = await requireAuth();

  const validated = StockInSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data input stok masuk tidak valid" };
  }

  const { supplierId, invoiceNo, purchaseDate, items } = validated.data;

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Buat record Purchase
      const purchase = await tx.purchase.create({
        data: {
          invoiceNo,
          supplierId,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          createdById: user.id,
        },
      });

      // 2. Simpan setiap item, tambahkan stok produk, dan catat riwayat movement in
      for (const item of items) {
        const subtotal = item.qty * item.unitCost;

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            qty: item.qty,
            unitCost: item.unitCost,
            subtotal,
          },
        });

        // Update stok produk & perbarui harga modal ke harga beli terbaru
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.qty },
            purchasePrice: item.unitCost,
          },
        });

        // Audit trail: Catat pergerakan stok masuk
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "in",
            quantity: item.qty,
            referenceType: "purchase",
            referenceId: purchase.id,
            note: `Penerimaan barang dari supplier (No. Faktur: ${invoiceNo})`,
            createdById: user.id,
          },
        });
      }

      return purchase;
    });

    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, purchaseId: result.id };
  } catch (error) {
    console.error("createStockIn error:", error);
    return { error: "Gagal memproses pencatatan stok masuk." };
  }
}

/**
 * Melakukan penyesuaian stok opname manual dengan alasan wajib
 */
export async function createStockAdjustment(values: StockAdjustmentFormValues) {
  const user = await requireAuth();

  const validated = StockAdjustmentSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data penyesuaian stok tidak valid" };
  }

  const { productId, type, quantity, note } = validated.data;

  try {
    await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error("Produk tidak ditemukan.");
      }

      let delta = 0;
      let newStock = product.stock;

      if (type === "increase") {
        delta = quantity;
        newStock = product.stock + quantity;
      } else if (type === "decrease") {
        if (product.stock < quantity) {
          throw new Error(`Stok saat ini (${product.stock}) tidak mencukupi untuk pengurangan sebesar ${quantity}.`);
        }
        delta = -quantity;
        newStock = product.stock - quantity;
      } else if (type === "set") {
        delta = quantity - product.stock;
        newStock = quantity;
      }

      // Pastikan aturan bisnis: stok tidak boleh minus
      if (newStock < 0) {
        throw new Error("Penyesuaian tidak valid: stok akhir tidak boleh minus.");
      }

      // Perbarui stok produk
      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // Audit trail: Catat pergerakan stok penyesuaian
      await tx.stockMovement.create({
        data: {
          productId,
          type: "adjustment",
          quantity: delta,
          referenceType: "manual",
          note: `Stok Opname: ${note} (Stok sebelum: ${product.stock} -> sesudah: ${newStock})`,
          createdById: user.id,
        },
      });
    });

    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("createStockAdjustment error:", error);
    return { error: error.message || "Gagal melakukan penyesuaian stok." };
  }
}

/**
 * Mengambil daftar riwayat pergerakan stok
 */
export async function getStockMovements(params?: StockMovementQuery) {
  await requireAuth();

  const { productId, type, page = 1, limit = 20 } = params || {};
  const skip = (page - 1) * limit;

  const where: any = {};
  if (productId && productId !== "all") {
    where.productId = productId;
  }
  if (type && type !== "all") {
    where.type = type;
  }

  const [total, movements] = await Promise.all([
    db.stockMovement.count({ where }),
    db.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true, variant: true } },
        creator: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    movements: movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      productSku: m.product.sku,
      productVariant: m.product.variant,
      type: m.type,
      quantity: m.quantity,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      note: m.note,
      creatorName: m.creator.name,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Menghasilkan Kartu Stok per Produk dengan Saldo Berjalan (Running Balance)
 */
export async function getProductStockCard(productId: string) {
  await requireAuth();

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  // Ambil seluruh mutasi stok kronologis dari yang terlama ke terbaru
  const rawMovements = await db.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    include: {
      creator: { select: { name: true } },
    },
  });

  let runningBalance = 0;
  const history = rawMovements.map((m) => {
    runningBalance += m.quantity;
    return {
      id: m.id,
      date: m.createdAt.toISOString(),
      type: m.type,
      referenceType: m.referenceType,
      note: m.note,
      creatorName: m.creator.name,
      inQty: m.quantity > 0 ? m.quantity : 0,
      outQty: m.quantity < 0 ? Math.abs(m.quantity) : 0,
      balance: runningBalance,
    };
  });

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      variant: product.variant,
      brandName: product.brandName || product.brand?.name || "-",
      categoryName: product.categoryName || product.category?.name || "-",
      currentStock: product.stock,
      minStock: product.minStock,
    },
    // Sajikan riwayat terbalik (terbaru di atas) untuk kemudahan membaca
    history: history.reverse(),
  };
}

/**
 * Mengambil daftar produk yang stoknya menipis (Low Stock Alert)
 */
export async function getLowStockProducts() {
  await requireAuth();

  const products = await db.product.findMany({
    where: {
      isActive: true,
      stock: { lte: db.product.fields.minStock },
    },
    orderBy: { stock: "asc" },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    variant: p.variant,
    brandName: p.brandName || p.brand?.name || "-",
    categoryName: p.categoryName || p.category?.name || "-",
    stock: p.stock,
    minStock: p.minStock,
    sellingPrice: Number(p.sellingPrice),
  }));
}
