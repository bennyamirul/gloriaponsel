"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  CreateSaleSchema,
  CreateSaleFormValues,
} from "@/lib/validations/sale.schema";
import { createNotification } from "@/lib/actions/notification.actions";

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
  const existing = await db.sale.findUnique({
    where: { invoiceNo: candidate },
  });
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
    return {
      error: validated.error.errors[0]?.message || "Data transaksi tidak valid",
    };
  }

  const {
    customerId,
    customerName,
    customerPhone,
    paymentMethod,
    discount,
    additionalFee = 0,
    additionalFeeNote,
    warrantyDays = 0,
    items,
  } = validated.data;

  try {
    const { sale: result, productSnapshots } = await db.$transaction(async (tx) => {
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

        // Validasi status: Hanya produk berstatus Ready / Available yang boleh ditransaksikan
        if (product.status !== "available" && product.status !== "ready") {
          throw new Error(
            `Produk "${product.name}" belum disetujui atau tidak dalam status Ready (status saat ini: ${product.status}).`,
          );
        }

        // Aturan Bisnis #7: Stok tidak boleh minus
        if (product.stock < item.qty) {
          throw new Error(
            `Stok untuk "${product.name}" tidak mencukupi! Tersedia: ${product.stock}, diminta: ${item.qty}.`,
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
        throw new Error(
          "Jumlah diskon tidak boleh melebihi subtotal transaksi.",
        );
      }

      const finalCustomerName =
        customerName && customerName.trim() ? customerName.trim() : "Pelanggan Umum";
      const finalCustomerPhone =
        customerPhone && customerPhone.trim() ? customerPhone.trim() : null;

      const total = Math.max(0, calculatedSubtotal - discount + additionalFee);
      const invoiceNo = await generateInvoiceNumber();

      const now = new Date();
      const warrantyExpiry =
        warrantyDays > 0
          ? new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000)
          : null;

      // 2. Simpan record transaksi Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          subtotal: calculatedSubtotal,
          discount,
          additionalFee,
          additionalFeeNote:
            additionalFeeNote && additionalFeeNote.trim()
              ? additionalFeeNote.trim()
              : null,
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

      return { sale, productSnapshots };
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(result.total));

    const itemSummary = productSnapshots
      .map((p) => `${p.product?.name || "Produk"}${p.qty > 1 ? ` (x${p.qty})` : ""}`)
      .join(", ");

    await createNotification({
      targetRoles: ["owner", "admin_kasir", "staff_gudang", "staff_keuangan"],
      title: "Barang Terjual / Transaksi Kasir",
      message: `Barang terjual: ${itemSummary || "Unit produk"} (No. Faktur: ${result.invoiceNo}) senilai ${formattedTotal} oleh ${user.name || "Kasir"}.`,
      type: "transaction_out",
      link: "/sales/history",
    }).catch((err) => {
      console.warn("createNotification sale error:", err);
    });

    return {
      success: true,
      saleId: result.id,
      invoiceNo: result.invoiceNo,
      cashierName: user.name,
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
          throw new Error(
            "Akses Ditolak: Anda hanya dapat membatalkan transaksi yang Anda input sendiri.",
          );
        }

        const saleDate = new Date(sale.createdAt).toDateString();
        const today = new Date().toDateString();
        if (saleDate !== today) {
          throw new Error(
            "Akses Ditolak: Kasir hanya dapat membatalkan transaksi pada hari yang sama. Hubungi Super Admin.",
          );
        }
      }

      // 1. Ubah status transaksi menjadi cancelled
      await tx.sale.update({
        where: { id: saleId },
        data: { status: "cancelled" },
      });

      // 2. Kembalikan stok produk dan catat movement in (pengembalian)
      let actorId = user.id;
      const actorExists = await tx.user.findUnique({
        where: { id: actorId },
        select: { id: true },
      });

      if (!actorExists) {
        const userByEmail = user.email
          ? await tx.user.findUnique({
              where: { email: user.email },
              select: { id: true },
            })
          : null;

        if (userByEmail) {
          actorId = userByEmail.id;
        } else {
          const cashierUser = sale.cashierId
            ? await tx.user.findUnique({
                where: { id: sale.cashierId },
                select: { id: true },
              })
            : null;
          if (cashierUser) {
            actorId = cashierUser.id;
          } else {
            const firstAdmin = await tx.user.findFirst({
              select: { id: true },
            });
            if (firstAdmin) {
              actorId = firstAdmin.id;
            }
          }
        }
      }

      for (const item of sale.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });
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
            createdById: actorId,
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
 * Menghapus transaksi penjualan dan mengembalikan stok barang yang belum direfund
 */
export async function deleteSale(saleId: string) {
  await requireAuth();

  try {
    const result = await db.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!sale) {
          throw new Error("Transaksi tidak ditemukan.");
        }

        // 1. Kembalikan stok untuk item yang belum direfund/retur
        const stockRestores = new Map<
          string,
          { quantity: number; isPhone: boolean }
        >();
        for (const item of sale.items) {
          if (!item.isReturned && item.product) {
            const restore = stockRestores.get(item.productId) || {
              quantity: 0,
              isPhone: item.product.productType === "phone",
            };
            restore.quantity += item.qty;
            stockRestores.set(item.productId, restore);
          }
        }

        for (const [productId, restore] of stockRestores) {
          await tx.product.update({
            where: { id: productId },
            data: {
              stock: { increment: restore.quantity },
              ...(restore.isPhone ? { status: "available" } : {}),
            },
          });
        }

        // 2. Hapus mutasi stok terkait transaksi penjualan ini
        await tx.stockMovement.deleteMany({
          where: {
            referenceType: "sale",
            referenceId: sale.id,
          },
        });

        // 3. Hapus seluruh item penjualan
        await tx.saleItem.deleteMany({
          where: { saleId: sale.id },
        });

        // 4. Hapus record penjualan
        await tx.sale.delete({
          where: { id: sale.id },
        });

        return {
          success: true as const,
          invoiceNo: sale.invoiceNo,
          message: `Transaksi ${sale.invoiceNo} berhasil dihapus.`,
        };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return result;
  } catch (error: any) {
    console.error("deleteSale error:", error);
    return {
      success: false as const,
      error: error.message || "Gagal menghapus transaksi.",
    };
  }
}

/**
 * Menghapus seluruh riwayat transaksi penjualan
 */
export async function deleteAllSales() {
  await requireAuth();

  try {
    const result = await db.$transaction(
      async (tx) => {
        // 1. Kembalikan stok untuk semua item penjualan yang belum direfund
        const unreturnedItems = await tx.saleItem.findMany({
          where: { isReturned: false },
          include: { product: true },
        });

        const stockRestores = new Map<
          string,
          { quantity: number; isPhone: boolean }
        >();
        for (const item of unreturnedItems) {
          if (item.product) {
            const restore = stockRestores.get(item.productId) || {
              quantity: 0,
              isPhone: item.product.productType === "phone",
            };
            restore.quantity += item.qty;
            stockRestores.set(item.productId, restore);
          }
        }

        for (const [productId, restore] of stockRestores) {
          await tx.product.update({
            where: { id: productId },
            data: {
              stock: { increment: restore.quantity },
              ...(restore.isPhone ? { status: "available" } : {}),
            },
          });
        }

        // 2. Hapus seluruh mutasi stok bertipe referensi sale
        await tx.stockMovement.deleteMany({
          where: { referenceType: "sale" },
        });

        // 3. Hapus seluruh item penjualan
        await tx.saleItem.deleteMany({});

        // 4. Hapus seluruh transaksi penjualan
        const deletedSales = await tx.sale.deleteMany({});

        return {
          success: true as const,
          count: deletedSales.count,
          message: `Semua riwayat transaksi (${deletedSales.count} transaksi) berhasil dihapus.`,
        };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return result;
  } catch (error: any) {
    console.error("deleteAllSales error:", error);
    return {
      success: false as const,
      error: error.message || "Gagal menghapus semua transaksi.",
    };
  }
}

/**
 * Mengambil riwayat transaksi penjualan
 */
export async function getSales(params?: SalesQueryParams) {
  const user = await requireAuth();

  const {
    query,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = params || {};
  const skip = (page - 1) * limit;

  const where: any = {};

  // Jika admin_kasir, hanya tampilkan transaksi yang dilakukan oleh kasir yang bersangkutan
  if (user.role === "admin_kasir") {
    where.cashierId = user.id;
  }

  if (query && query.trim() !== "") {
    where.OR = [
      { invoiceNo: { contains: query.trim() } },
      { customerName: { contains: query.trim() } },
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
                completeness: true,
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
      customerName: s.customerName || "Pelanggan Umum",
      customerPhone: s.customerPhone || null,
      cashierName: s.cashier.name,
      cashierId: s.cashierId,
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      additionalFee: Number(s.additionalFee || 0),
      additionalFeeNote: s.additionalFeeNote || null,
      warrantyDays: s.warrantyDays,
      warrantyExpiry: s.warrantyExpiry ? s.warrantyExpiry.toISOString() : null,
      total: Number(s.total),
      commission: Number((s as any).commission || 0),
      commissionProofUrl: (s as any).commissionProofUrl || null,
      paymentProofUrl: (s as any).paymentProofUrl || null,
      paymentMethod: s.paymentMethod,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
      items: s.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        productSku: it.product.sku,
        productImei: it.product.imei,
        capacity: it.product.capacity,
        color: it.product.color,
        variant: it.product.variant,
        completeness: (it.product as any)?.completeness || null,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
        isReturned: it.isReturned,
        returnReason: it.returnReason,
        returnedAt: it.returnedAt ? it.returnedAt.toISOString() : null,
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
      cashier: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              variant: true,
              imei: true,
              capacity: true,
              color: true,
              completeness: true,
            },
          },
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
      customerName: sale.customerName || "Pelanggan Umum",
      customerPhone: sale.customerPhone || "-",
      customerAddress: "-",
      cashierName: sale.cashier.name,
      cashierId: sale.cashierId,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      additionalFee: Number(sale.additionalFee || 0),
      additionalFeeNote: sale.additionalFeeNote || null,
      warrantyDays: sale.warrantyDays,
      warrantyExpiry: sale.warrantyExpiry
        ? sale.warrantyExpiry.toISOString()
        : null,
      total: Number(sale.total),
      paymentProofUrl: (sale as any).paymentProofUrl || null,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((it) => ({
        id: it.id,
        name: it.product.name,
        sku: it.product.sku,
        variant: it.product.variant,
        imei: it.product.imei,
        capacity: it.product.capacity,
        color: it.product.color,
        completeness: (it.product as any)?.completeness || null,
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
        sale: true,
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

      // 1. Update Product: kembalikan ke stok dengan status 'available' (Ready)
      await tx.product.update({
        where: { id: saleItem.productId },
        data: {
          stock: { increment: saleItem.qty },
          status: "available",
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

    const refundedSubtotal = Number(saleItem.subtotal);
    const newSubtotal = Math.max(
      0,
      Number(saleItem.sale.subtotal) - refundedSubtotal,
    );
    const newTotal = Math.max(
      0,
      newSubtotal -
        Number(saleItem.sale.discount || 0) +
        Number(saleItem.sale.additionalFee || 0),
    );
    await tx.sale.update({
      where: { id: saleItem.saleId },
      data: { subtotal: newSubtotal, total: newTotal },
    });

    // 3. Catat mutasi stok masuk (retur)
    // Pastikan user ID valid dan ada di tabel users agar tidak melanggar foreign key
    let actorId = session.id;
    const actorExists = await tx.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    });

    if (!actorExists) {
      const userByEmail = session.email
        ? await tx.user.findUnique({
            where: { email: session.email },
            select: { id: true },
          })
        : null;

      if (userByEmail) {
        actorId = userByEmail.id;
      } else {
        const cashierUser = saleItem.sale.cashierId
          ? await tx.user.findUnique({
              where: { id: saleItem.sale.cashierId },
              select: { id: true },
            })
          : null;
        if (cashierUser) {
          actorId = cashierUser.id;
        } else {
          const firstAdmin = await tx.user.findFirst({ select: { id: true } });
          if (firstAdmin) {
            actorId = firstAdmin.id;
          }
        }
      }
    }

    await tx.stockMovement.create({
      data: {
        productId: saleItem.productId,
        type: "in",
        quantity: saleItem.qty,
        referenceType: "sale",
        referenceId: saleItem.saleId,
        note: `Retur Garansi [${saleItem.sale.invoiceNo}] - ${reason}`,
        createdById: actorId,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      message: `Unit "${saleItem.product.name}" berhasil dikembalikan ke stok dengan status Retur.`,
    };
  });
}

export interface UpdateSaleItemInput {
  saleItemId: string;
  action: "return" | "exchange";
  returnReason?: string;
  replacementProductId?: string;
}

/**
 * Mengubah status item pada riwayat transaksi: Retur atau Tukar Unit
 */
export async function updateSaleItemTransaction(input: UpdateSaleItemInput) {
  const session = await requireAuth();

  return await db.$transaction(async (tx) => {
    const saleItem = await tx.saleItem.findUnique({
      where: { id: input.saleItemId },
      include: {
        product: true,
        sale: {
          include: {
            cashier: true,
          },
        },
      },
    });

    if (!saleItem) {
      throw new Error("Item transaksi tidak ditemukan.");
    }

    if (saleItem.isReturned) {
      throw new Error(
        "Item transaksi ini sudah pernah diretur sebelumnya dan tidak dapat diubah.",
      );
    }

    // Resolusi actorId agar tidak melanggar foreign key stock_movements
    let actorId = session.id;
    const actorExists = await tx.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    });

    if (!actorExists) {
      const userByEmail = session.email
        ? await tx.user.findUnique({
            where: { email: session.email },
            select: { id: true },
          })
        : null;

      if (userByEmail) {
        actorId = userByEmail.id;
      } else {
        const cashierUser = saleItem.sale.cashierId
          ? await tx.user.findUnique({
              where: { id: saleItem.sale.cashierId },
              select: { id: true },
            })
          : null;
        if (cashierUser) {
          actorId = cashierUser.id;
        } else {
          const firstAdmin = await tx.user.findFirst({ select: { id: true } });
          if (firstAdmin) {
            actorId = firstAdmin.id;
          }
        }
      }
    }

    const now = new Date();

    if (input.action === "return") {
      const reason = input.returnReason?.trim() || "Refund Transaksi";

      // 1. Update Product: kembalikan ke stok dengan status 'available' (Ready)
      await tx.product.update({
        where: { id: saleItem.productId },
        data: {
          stock: { increment: saleItem.qty },
          status: "available",
        },
      });

      // 2. Tandai item penjualan sebagai direfund (isReturned = true)
      await tx.saleItem.update({
        where: { id: input.saleItemId },
        data: {
          isReturned: true,
          returnReason: reason,
          returnedAt: now,
        },
      });

      // 3. Kurangi subtotal dan total pada faktur transaksi penjualan
      const itemSubtotal = Number(saleItem.subtotal);
      const currentSaleSubtotal = Number(saleItem.sale.subtotal);
      const currentDiscount = Number(saleItem.sale.discount || 0);
      const currentAdditionalFee = Number(saleItem.sale.additionalFee || 0);

      const newSubtotal = Math.max(0, currentSaleSubtotal - itemSubtotal);
      const newTotal = Math.max(
        0,
        newSubtotal - currentDiscount + currentAdditionalFee,
      );

      await tx.sale.update({
        where: { id: saleItem.saleId },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
        },
      });

      // 4. Catat mutasi stok masuk
      await tx.stockMovement.create({
        data: {
          productId: saleItem.productId,
          type: "in",
          quantity: saleItem.qty,
          referenceType: "sale",
          referenceId: saleItem.saleId,
          note: `Refund Transaksi [${saleItem.sale.invoiceNo}] - ${reason}`,
          createdById: actorId,
        },
      });

      revalidatePath("/stock");
      revalidatePath("/sales");
      revalidatePath("/products");
      revalidatePath("/reports");
      revalidatePath("/dashboard");

      return {
        success: true,
        message: `Unit "${saleItem.product.name}" berhasil direfund dan kembali ready. Total transaksi berkurang sebesar Rp ${itemSubtotal.toLocaleString("id-ID")}.`,
      };
    } else if (input.action === "exchange") {
      if (!input.replacementProductId) {
        throw new Error("Silakan pilih unit pengganti yang akan ditukar.");
      }

      if (input.replacementProductId === saleItem.productId) {
        throw new Error(
          "Unit pengganti tidak boleh sama dengan unit yang sedang ditukar.",
        );
      }

      const replacementProduct = await tx.product.findUnique({
        where: { id: input.replacementProductId },
      });

      if (!replacementProduct) {
        throw new Error("Unit pengganti tidak ditemukan di database.");
      }

      if (!replacementProduct.isActive) {
        throw new Error(
          `Unit pengganti "${replacementProduct.name}" sedang nonaktif.`,
        );
      }

      if (replacementProduct.stock < saleItem.qty) {
        throw new Error(
          `Stok unit pengganti "${replacementProduct.name}" tidak mencukupi (tersedia: ${replacementProduct.stock}).`,
        );
      }

      const reason = input.returnReason?.trim() || "Tukar Unit Pelanggan";

      const oldUnitPrice = Number(saleItem.unitPrice);
      const newUnitPrice = Number(replacementProduct.sellingPrice);
      const oldItemSubtotal = Number(saleItem.subtotal);
      const newItemSubtotal = newUnitPrice * saleItem.qty;
      const priceDiff = newItemSubtotal - oldItemSubtotal;

      const currentSaleSubtotal = Number(saleItem.sale.subtotal);
      const currentDiscount = Number(saleItem.sale.discount || 0);
      const currentAdditionalFee = Number(saleItem.sale.additionalFee || 0);

      const newSaleSubtotal = Math.max(0, currentSaleSubtotal - oldItemSubtotal + newItemSubtotal);
      const newSaleTotal = Math.max(0, newSaleSubtotal - currentDiscount + currentAdditionalFee);

      const exchangeData = {
        type: "exchange",
        invoiceNo: saleItem.sale.invoiceNo,
        customerName: saleItem.sale.customerName || "Pelanggan Umum",
        exchangedAt: now.toISOString(),
        reason: reason,
        oldProduct: {
          id: saleItem.productId,
          name: saleItem.product.name,
          imei: saleItem.product.imei || saleItem.product.sku,
          price: oldUnitPrice,
        },
        replacementProduct: {
          id: replacementProduct.id,
          name: replacementProduct.name,
          imei: replacementProduct.imei || replacementProduct.sku,
          price: newUnitPrice,
        },
        priceDiff: priceDiff,
        oldSaleTotal: Number(saleItem.sale.total),
        newSaleTotal: newSaleTotal,
      };

      // 1. Kembalikan unit lama ke gudang dengan status 'available' (Ready)
      await tx.product.update({
        where: { id: saleItem.productId },
        data: {
          stock: { increment: saleItem.qty },
          status: "available",
          description: `[Tukar Unit INV-${saleItem.sale.invoiceNo}] Ditukar dengan: ${replacementProduct.name} (${replacementProduct.imei || replacementProduct.sku}) | Selisih: Rp ${priceDiff.toLocaleString("id-ID")} | Alasan: ${reason} | Tanggal: ${now.toLocaleDateString("id-ID")} ||EXCHANGE_JSON:${JSON.stringify(exchangeData)}||`,
        },
      });

      // Catat mutasi stok masuk untuk unit lama
      await tx.stockMovement.create({
        data: {
          productId: saleItem.productId,
          type: "in",
          quantity: saleItem.qty,
          referenceType: "sale",
          referenceId: saleItem.saleId,
          note: `Tukar Unit Masuk [${saleItem.sale.invoiceNo}] - Ditukar dengan ${replacementProduct.name} (${replacementProduct.imei || replacementProduct.sku}) - Alasan: ${reason}`,
          createdById: actorId,
        },
      });

      // 2. Kurangi stok unit pengganti dan tandai status 'sold' jika ponsel
      await tx.product.update({
        where: { id: replacementProduct.id },
        data: {
          stock: { decrement: saleItem.qty },
          ...(replacementProduct.productType === "phone"
            ? { status: "sold" }
            : {}),
        },
      });

      // Catat mutasi stok keluar untuk unit baru
      await tx.stockMovement.create({
        data: {
          productId: replacementProduct.id,
          type: "out",
          quantity: -saleItem.qty,
          referenceType: "sale",
          referenceId: saleItem.saleId,
          note: `Tukar Unit Keluar [${saleItem.sale.invoiceNo}] - Menggantikan ${saleItem.product.name} (${saleItem.product.imei || saleItem.product.sku})`,
          createdById: actorId,
        },
      });

      // 3. Update item transaksi dengan unit pengganti dan harga baru
      await tx.saleItem.update({
        where: { id: input.saleItemId },
        data: {
          productId: replacementProduct.id,
          unitPrice: newUnitPrice,
          unitCost: replacementProduct.purchasePrice,
          subtotal: newItemSubtotal,
          returnReason: `[TUKAR_UNIT] Ditukar dari: ${saleItem.product.name} (${saleItem.product.imei || saleItem.product.sku}) [Rp ${oldUnitPrice.toLocaleString("id-ID")}] -> Ditukar ke: ${replacementProduct.name} (${replacementProduct.imei || replacementProduct.sku}) [Rp ${newUnitPrice.toLocaleString("id-ID")}] | Selisih: Rp ${priceDiff.toLocaleString("id-ID")} | Alasan: ${reason} | Tanggal: ${now.toLocaleDateString("id-ID")} ||EXCHANGE_JSON:${JSON.stringify(exchangeData)}||`,
          isReturned: false,
        },
      });

      // 4. Update total dan subtotal pada faktur transaksi penjualan
      await tx.sale.update({
        where: { id: saleItem.saleId },
        data: {
          subtotal: newSaleSubtotal,
          total: newSaleTotal,
        },
      });

      revalidatePath("/stock");
      revalidatePath("/sales");
      revalidatePath("/sales/history");
      revalidatePath("/products");
      revalidatePath("/reports");
      revalidatePath("/dashboard");

      const diffText =
        priceDiff > 0
          ? `(Pelanggan tambah bayar: Rp ${priceDiff.toLocaleString("id-ID")})`
          : priceDiff < 0
          ? `(Pengembalian dana ke pelanggan: Rp ${Math.abs(priceDiff).toLocaleString("id-ID")})`
          : `(Tidak ada selisih harga)`;

      return {
        success: true,
        message: `Unit "${saleItem.product.name}" berhasil ditukar dengan "${replacementProduct.name}". Total transaksi berubah menjadi Rp ${newSaleTotal.toLocaleString("id-ID")} ${diffText}.`,
        updatedTotal: newSaleTotal,
        updatedSubtotal: newSaleSubtotal,
        exchangeData,
      };
    } else {
      throw new Error("Aksi transaksi tidak dikenali.");
    }
  });
}

/**
 * Mengambil daftar produk ready stock yang tersedia untuk tukar unit
 */
export async function getAvailableExchangeProducts() {
  await requireAuth();

  const products = await db.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      status: "available",
    },
    orderBy: [{ productType: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      imei: true,
      productType: true,
      capacity: true,
      color: true,
      variant: true,
      sellingPrice: true,
      purchasePrice: true,
      stock: true,
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imei: p.imei,
    productType: p.productType,
    capacity: p.capacity,
    color: p.color,
    variant: p.variant,
    sellingPrice: Number(p.sellingPrice),
    purchasePrice: Number(p.purchasePrice),
    stock: p.stock,
  }));
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
            cashier: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const readyItems: ReadyItemData[] = readyProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brandName: p.brandName || "-",
    categoryName: p.categoryName || "-",
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
      customerName: it.sale.customerName || "Pelanggan Umum",
      customerPhone: it.sale.customerPhone || null,
      cashierName:
        it.sale.cashier.name || (it.sale.cashier as any).username || "Kasir",
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
      customerName: it.sale.customerName || "Pelanggan Umum",
      customerPhone: it.sale.customerPhone || null,
      cashierName:
        it.sale.cashier.name || (it.sale.cashier as any).username || "Kasir",
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

/**
 * Upload dan perbarui bukti pembayaran transaksi penjualan
 */
export async function uploadSalePaymentProof(saleId: string, formData: FormData) {
  const user = await requireAuth();

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "File bukti pembayaran tidak ditemukan." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Hanya file gambar yang diperbolehkan." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 10MB." };
  }

  try {
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        cashierId: true,
        invoiceNo: true,
        createdAt: true,
        total: true,
        customerName: true,
        cashier: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, imei: true, sku: true } },
          },
        },
      },
    });

    if (!sale) {
      return { error: "Transaksi tidak ditemukan." };
    }

    // Role check: Admin Kasir (Staff Marketing) hanya bisa upload bukti transaksinya sendiri.
    // Staff Gudang (Staff Admin) read-only.
    // Owner / Super Admin bisa upload/update semua.
    if (user.role === "staff_gudang") {
      return { error: "Staff Admin hanya memiliki akses melihat bukti pembayaran." };
    }
    if (user.role === "admin_kasir" && sale.cashierId !== user.id) {
      return {
        error: "Anda hanya dapat mengunggah bukti pembayaran untuk transaksi Anda sendiri.",
      };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads", "payments");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `pay-${sale.invoiceNo}-${Date.now()}.${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);
    const paymentProofUrl = `/uploads/payments/${filename}`;

    await db.sale.update({
      where: { id: saleId },
      data: { paymentProofUrl },
    });

    revalidatePath("/sales");
    revalidatePath("/sales/history");
    revalidatePath("/dashboard");

    return {
      success: true,
      paymentProofUrl,
    };
  } catch (error: any) {
    console.error("uploadSalePaymentProof error:", error);
    return { error: error.message || "Gagal mengunggah bukti pembayaran." };
  }
}

