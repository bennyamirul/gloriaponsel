"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { CreateSaleSchema, CreateSaleFormValues } from "@/lib/validations/sale.schema";

export interface SalesQueryParams {
  query?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Generate nomor invoice unik harian: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePrefix = `INV-${yyyy}${mm}${dd}`;

  // Hitung jumlah transaksi yang dibuat hari ini untuk penomoran urut
  const countToday = await db.sale.count({
    where: {
      invoiceNo: { startsWith: datePrefix },
    },
  });

  const nextNumber = String(countToday + 1).padStart(4, "0");
  const candidate = `${datePrefix}-${nextNumber}`;

  // Pastikan tidak ada tabrakan invoice
  const existing = await db.sale.findUnique({ where: { invoiceNo: candidate } });
  if (existing) {
    return `${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return candidate;
}

/**
 * Membuat transaksi penjualan kasir (POS) secara atomik
 */
export async function createSale(values: CreateSaleFormValues) {
  const user = await requireAuth();

  const validated = CreateSaleSchema.safeParse(values);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data transaksi tidak valid" };
  }

  const { customerId, customerName, paymentMethod, discount, additionalFee = 0, warrantyDays = 0, items } = validated.data;

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Validasi ketersediaan stok fisik di DB untuk setiap produk
      let calculatedSubtotal = 0;
      const productSnapshots: {
        product: any;
        qty: number;
        unitPrice: number;
      }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error("Satu atau lebih produk tidak ditemukan di sistem.");
        }

        if (!product.isActive) {
          throw new Error(`Produk "${product.name}" sedang nonaktif.`);
        }

        // Aturan Bisnis #7: Stok tidak boleh minus
        if (product.stock < item.qty) {
          throw new Error(
            `Stok untuk "${product.name}" tidak mencukupi! Tersedia: ${product.stock}, diminta: ${item.qty}.`
          );
        }

        calculatedSubtotal += item.qty * item.unitPrice;
        productSnapshots.push({
          product,
          qty: item.qty,
          unitPrice: item.unitPrice,
        });
      }

      // Validasi diskon tidak boleh melebihi subtotal
      if (discount > calculatedSubtotal) {
        throw new Error("Jumlah diskon tidak boleh melebihi subtotal transaksi.");
      }

      // Tentukan customerId (jika diinput nama manual, cari atau buat otomatis)
      let finalCustomerId = customerId || null;
      if (!finalCustomerId && customerName && customerName.trim()) {
        const trimmed = customerName.trim();
        if (
          trimmed.toLowerCase() !== "pelanggan umum" &&
          trimmed.toLowerCase() !== "umum" &&
          trimmed.toLowerCase() !== "walk-in"
        ) {
          let existingCust = await tx.customer.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" } },
          });
          if (!existingCust) {
            existingCust = await tx.customer.create({
              data: { name: trimmed },
            });
          }
          finalCustomerId = existingCust.id;
        }
      }

      const total = Math.max(0, calculatedSubtotal - discount + additionalFee);
      const invoiceNo = await generateInvoiceNumber();

      const now = new Date();
      const warrantyExpiry =
        warrantyDays > 0 ? new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000) : null;

      // 2. Simpan record transaksi Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          customerId: finalCustomerId,
          subtotal: calculatedSubtotal,
          discount,
          additionalFee,
          warrantyDays,
          warrantyExpiry,
          total,
          paymentMethod,
          status: "completed",
          cashierId: user.id,
        },
      });

      // 3. Simpan item transaksi, kurangi stok produk, dan buat movement out
      for (const snap of productSnapshots) {
        const itemSubtotal = snap.qty * snap.unitPrice;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: snap.product.id,
            qty: snap.qty,
            unitPrice: snap.unitPrice,
            unitCost: snap.product.purchasePrice, // Snapshot harga modal saat transaksi
            subtotal: itemSubtotal,
            warrantyDays,
            warrantyExpiry,
          },
        });

        // Kurangi stok produk & update status untuk unit hp
        await tx.product.update({
          where: { id: snap.product.id },
          data: {
            stock: { decrement: snap.qty },
            ...(snap.product.productType === "phone" ? { status: "sold" } : {}),
          },
        });

        // Catat mutasi stok keluar (out)
        await tx.stockMovement.create({
          data: {
            productId: snap.product.id,
            type: "out",
            quantity: -snap.qty,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Penjualan Kasir (Faktur: ${invoiceNo})`,
            createdById: user.id,
          },
        });
      }

      return sale;
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return {
      success: true,
      saleId: result.id,
      invoiceNo: result.invoiceNo,
    };
  } catch (error: any) {
    console.error("createSale error:", error);
    return { error: error.message || "Gagal memproses transaksi penjualan." };
  }
}

/**
 * Membatalkan transaksi penjualan dan mengembalikan stok otomatis
 */
export async function cancelSale(saleId: string) {
  const user = await requireAuth();

  try {
    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          items: true,
        },
      });

      if (!sale) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (sale.status === "cancelled") {
        throw new Error("Transaksi ini sudah dibatalkan sebelumnya.");
      }

      // Aturan Hak Akses Pembatalan (FRD Matriks Hak Akses):
      // Admin hanya bisa membatalkan transaksinya sendiri di hari yang sama
      if (user.role === "admin") {
        if (sale.cashierId !== user.id) {
          throw new Error("Akses Ditolak: Anda hanya dapat membatalkan transaksi yang Anda input sendiri.");
        }

        const saleDate = new Date(sale.createdAt).toDateString();
        const today = new Date().toDateString();
        if (saleDate !== today) {
          throw new Error("Akses Ditolak: Kasir hanya dapat membatalkan transaksi pada hari yang sama. Hubungi Super Admin.");
        }
      }

      // 1. Ubah status transaksi menjadi cancelled
      await tx.sale.update({
        where: { id: saleId },
        data: { status: "cancelled" },
      });

      // 2. Kembalikan stok produk dan catat movement in (pengembalian)
      for (const item of sale.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.qty },
            ...(prod?.productType === "phone" ? { status: "available" } : {}),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "in",
            quantity: item.qty,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Pembatalan Transaksi Penjualan (Faktur: ${sale.invoiceNo})`,
            createdById: user.id,
          },
        });
      }
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("cancelSale error:", error);
    return { error: error.message || "Gagal membatalkan transaksi." };
  }
}

/**
 * Mengambil riwayat transaksi penjualan
 */
export async function getSales(params?: SalesQueryParams) {
  const user = await requireAuth();

  const { query, status, startDate, endDate, page = 1, limit = 20 } = params || {};
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query && query.trim() !== "") {
    where.OR = [
      { invoiceNo: { contains: query.trim(), mode: "insensitive" } },
      { customer: { name: { contains: query.trim(), mode: "insensitive" } } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, sales] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imei: true,
                capacity: true,
                color: true,
                variant: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    sales: sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerName: s.customer?.name || "Pelanggan Umum",
      customerPhone: s.customer?.phone || null,
      cashierName: s.cashier.name,
      cashierId: s.cashierId,
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      additionalFee: Number(s.additionalFee || 0),
      warrantyDays: s.warrantyDays,
      warrantyExpiry: s.warrantyExpiry ? s.warrantyExpiry.toISOString() : null,
      total: Number(s.total),
      paymentMethod: s.paymentMethod,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
      items: s.items.map((it) => ({
        id: it.id,
        productName: it.product.name,
        productSku: it.product.sku,
        productImei: it.product.imei,
        capacity: it.product.capacity,
        color: it.product.color,
        variant: it.product.variant,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    currentUserId: user.id,
    currentUserRole: user.role,
  };
}

/**
 * Mengambil detail 1 transaksi lengkap
 */
export async function getSaleDetail(saleId: string) {
  const user = await requireAuth();

  const sale = await db.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      cashier: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, variant: true } },
        },
      },
    },
  });

  if (!sale) {
    return { error: "Transaksi tidak ditemukan." };
  }

  return {
    sale: {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      customerName: sale.customer?.name || "Pelanggan Umum",
      customerPhone: sale.customer?.phone || "-",
      customerAddress: sale.customer?.address || "-",
      cashierName: sale.cashier.name,
      cashierId: sale.cashierId,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      additionalFee: Number(sale.additionalFee || 0),
      warrantyDays: sale.warrantyDays,
      warrantyExpiry: sale.warrantyExpiry ? sale.warrantyExpiry.toISOString() : null,
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((it) => ({
        id: it.id,
        name: it.product.name,
        sku: it.product.sku,
        variant: it.product.variant,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    },
    currentUserId: user.id,
    currentUserRole: user.role,
  };
}

export interface ReadyItemData {
  id: string;
  name: string;
  brandName: string;
  categoryName: string;
  sku: string;
  imei: string | null;
  productType: string;
  capacity: string | null;
  color: string | null;
  completeness: string | null;
  retailSupplier: string | null;
  status: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  entryDate: string;
  createdAt: string;
}

export interface WarrantyItemData {
  id: string;
  saleId: string;
  invoiceNo: string;
  saleDate: string;
  productId: string;
  productName: string;
  imei: string | null;
  sku: string;
  productType: string;
  capacity: string | null;
  color: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
  customerName: string;
  customerPhone: string | null;
  cashierName: string;
  warrantyDays: number;
  warrantyExpiry: string;
}

export interface SoldItemData {
  id: string;
  saleId: string;
  invoiceNo: string;
  saleDate: string;
  productId: string;
  productName: string;
  imei: string | null;
  sku: string;
  productType: string;
  capacity: string | null;
  color: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
  customerName: string;
  customerPhone: string | null;
  cashierName: string;
  warrantyDays: number;
  warrantyExpiry: string | null;
  paymentMethod: string;
  statusNote: string;
  isReturned: boolean;
  returnReason: string | null;
  returnedAt: string | null;
}

/**
 * Mengembalikan barang dalam masa garansi ke stok toko dengan status "retur".
 */
export async function returnWarrantyItem(input: {
  saleItemId: string;
  returnReason?: string;
}) {
  const session = await requireAuth();

  return await db.$transaction(async (tx) => {
    const saleItem = await tx.saleItem.findUnique({
      where: { id: input.saleItemId },
      include: {
        product: true,
        sale: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!saleItem) {
      throw new Error("Item transaksi tidak ditemukan.");
    }

    if (saleItem.isReturned) {
      throw new Error("Item ini sudah pernah diretur sebelumnya.");
    }

    const reason = input.returnReason?.trim() || "Klaim Garansi Toko";
    const now = new Date();

    // 1. Update Product: kembalikan ke stok dengan status 'retur'
    await tx.product.update({
      where: { id: saleItem.productId },
      data: {
        stock: { increment: saleItem.qty },
        status: "retur",
      },
    });

    // 2. Tandai item penjualan sebagai diretur
    await tx.saleItem.update({
      where: { id: input.saleItemId },
      data: {
        isReturned: true,
        returnReason: reason,
        returnedAt: now,
      },
    });

    // 3. Catat mutasi stok masuk (retur)
    await tx.stockMovement.create({
      data: {
        productId: saleItem.productId,
        type: "in",
        quantity: saleItem.qty,
        referenceType: "sale",
        referenceId: saleItem.saleId,
        note: `Retur Garansi [${saleItem.sale.invoiceNo}] - ${reason}`,
        createdById: session.id,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/sales");
    revalidatePath("/products");

    return {
      success: true,
      message: `Unit "${saleItem.product.name}" berhasil dikembalikan ke stok dengan status Retur.`,
    };
  });
}

/**
 * Mengambil data siklus hidup unit barang untuk Riwayat Penjualan:
 * 1. Ready: Barang ready stok (available atau retur, stock > 0)
 * 2. Garansi: Barang terjual dengan masa garansi aktif (warrantyDays > 0, warrantyExpiry > now, belum diretur)
 * 3. Sold: Barang terjual yang garansinya telah habis, tanpa garansi, atau yang telah diretur ke stok
 */
export async function getSalesLifecycleData() {
  await requireAuth();

  const now = new Date();

  const [readyProducts, activeWarrantyItems, soldItems] = await Promise.all([
    // 1. Ready: available / retur products with stock > 0
    db.product.findMany({
      where: {
        status: { in: ["available", "retur"] },
        stock: { gt: 0 },
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),

    // 2. Garansi: completed sales where warrantyDays > 0, warrantyExpiry > now, dan isReturned = false
    db.saleItem.findMany({
      where: {
        isReturned: false,
        sale: {
          status: "completed",
          warrantyDays: { gt: 0 },
          warrantyExpiry: { gt: now },
        },
      },
      orderBy: { sale: { warrantyExpiry: "asc" } },
      include: {
        product: true,
        sale: {
          include: {
            customer: true,
            cashier: { select: { id: true, name: true } },
          },
        },
      },
    }),

    // 3. Sold: completed sales where warranty has expired OR warrantyDays === 0, dan belum diretur (isReturned = false)
    db.saleItem.findMany({
      where: {
        isReturned: false,
        sale: {
          status: "completed",
          OR: [
            { warrantyDays: 0 },
            { warrantyExpiry: { lte: now } },
            { warrantyExpiry: null },
          ],
        },
      },
      orderBy: { sale: { createdAt: "desc" } },
      take: 200,
      include: {
        product: true,
        sale: {
          include: {
            customer: true,
            cashier: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const readyItems: ReadyItemData[] = readyProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brandName: p.brand?.name || p.brandName || "-",
    categoryName: p.category?.name || p.categoryName || "-",
    sku: p.sku,
    imei: p.imei,
    productType: p.productType,
    capacity: p.capacity,
    color: p.color,
    completeness: p.completeness,
    retailSupplier: p.retailSupplier,
    status: p.status,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    stock: p.stock,
    entryDate: p.entryDate.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  const warrantyItems: WarrantyItemData[] = activeWarrantyItems.map((it) => {
    const days = it.warrantyDays || it.sale.warrantyDays || 0;
    const expiry = it.warrantyExpiry || it.sale.warrantyExpiry;
    return {
      id: it.id,
      saleId: it.saleId,
      invoiceNo: it.sale.invoiceNo,
      saleDate: it.sale.createdAt.toISOString(),
      productId: it.productId,
      productName: it.product.name,
      imei: it.product.imei,
      sku: it.product.sku,
      productType: it.product.productType,
      capacity: it.product.capacity,
      color: it.product.color,
      qty: it.qty,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      customerName: it.sale.customer?.name || "Pelanggan Umum",
      customerPhone: it.sale.customer?.phone || null,
      cashierName: it.sale.cashier.name,
      warrantyDays: days,
      warrantyExpiry: expiry ? expiry.toISOString() : new Date().toISOString(),
    };
  });

  const soldItemsList: SoldItemData[] = soldItems.map((it) => {
    const days = it.warrantyDays || it.sale.warrantyDays || 0;
    const expiry = it.warrantyExpiry || it.sale.warrantyExpiry;
    return {
      id: it.id,
      saleId: it.saleId,
      invoiceNo: it.sale.invoiceNo,
      saleDate: it.sale.createdAt.toISOString(),
      productId: it.productId,
      productName: it.product.name,
      imei: it.product.imei,
      sku: it.product.sku,
      productType: it.product.productType,
      capacity: it.product.capacity,
      color: it.product.color,
      qty: it.qty,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      customerName: it.sale.customer?.name || "Pelanggan Umum",
      customerPhone: it.sale.customer?.phone || null,
      cashierName: it.sale.cashier.name,
      warrantyDays: days,
      warrantyExpiry: expiry ? expiry.toISOString() : null,
      paymentMethod: it.sale.paymentMethod,
      statusNote: days > 0 ? "Garansi Selesai" : "Tanpa Garansi",
      isReturned: false,
      returnReason: null,
      returnedAt: null,
    };
  });

  return {
    readyItems,
    warrantyItems,
    soldItems: soldItemsList,
    summary: {
      readyCount: readyItems.length,
      warrantyCount: warrantyItems.length,
      soldCount: soldItemsList.length,
    },
  };
}
