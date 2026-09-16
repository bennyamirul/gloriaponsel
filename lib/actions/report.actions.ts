"use server";

import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createNotification } from "@/lib/actions/notification.actions";

export interface ReportDateFilter {
  startDate?: string;
  endDate?: string;
}

export interface SalesReportFilter extends ReportDateFilter {
  categoryId?: string;
  brandId?: string;
  paymentMethod?: string;
}

export interface StockReportFilter {
  categoryId?: string;
  brandId?: string;
  stockStatus?: "all" | "safe" | "low" | "out";
}

export interface BestSellerFilter extends ReportDateFilter {
  limit?: number;
  sortBy?: "qty" | "revenue";
}

/**
 * Helper untuk normalisasi rentang tanggal
 */
function resolveDateRange(startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (startDate) {
    start = new Date(`${startDate}T00:00:00.000`);
  } else {
    // Default: awal bulan berjalan
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  if (endDate) {
    end = new Date(`${endDate}T23:59:59.999`);
  } else {
    // Default: akhir hari ini
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  return { start, end };
}

/**
 * 1. LAPORAN PENJUALAN
 */
export async function getSalesReport(params?: SalesReportFilter) {
  await requireAuth();

  const { startDate, endDate, categoryId, brandId, paymentMethod } =
    params || {};
  const { start, end } = resolveDateRange(startDate, endDate);

  const whereSale: any = {
    status: "completed",
    createdAt: { gte: start, lte: end },
  };

  if (paymentMethod && paymentMethod !== "all") {
    whereSale.paymentMethod = paymentMethod;
  }

  const rawSales = await db.sale.findMany({
    where: whereSale,
    orderBy: { createdAt: "desc" },
    include: {
      cashier: { select: { id: true, name: true } },
      items: {
        where: { isReturned: false },
        include: {
          product: true,
        },
      },
    },
  });

  // Filter transaksi yang memiliki barang aktif (tidak kosong akibat retur)
  let filteredSales = rawSales.filter((s) => s.items.length > 0);
  if (categoryId && categoryId !== "all") {
    filteredSales = filteredSales.filter((s) =>
      s.items.some((it) => it.product.categoryName === categoryId),
    );
  }
  if (brandId && brandId !== "all") {
    filteredSales = filteredSales.filter((s) =>
      s.items.some((it) => it.product.brandName === brandId),
    );
  }

  let totalGrossRevenue = 0;
  let totalDiscount = 0;
  let totalNetRevenue = 0;
  let totalItemsSold = 0;

  const categoryAggregation: Record<string, { qty: number; revenue: number }> =
    {};
  const paymentAggregation: Record<string, { count: number; total: number }> =
    {};

  const mappedSales = filteredSales.map((s) => {
    const itemsGross = s.items.reduce(
      (acc, it) => acc + Number(it.subtotal),
      0,
    );
    const disc = Number(s.discount || 0);
    const fee = Number(s.additionalFee || 0);
    const net = Number(s.total);
    const itemsCount = s.items.reduce((acc, it) => acc + it.qty, 0);

    totalGrossRevenue += itemsGross;
    totalDiscount += disc;
    totalNetRevenue += net;
    totalItemsSold += itemsCount;

    // Hitung per metode pembayaran
    if (!paymentAggregation[s.paymentMethod]) {
      paymentAggregation[s.paymentMethod] = { count: 0, total: 0 };
    }
    paymentAggregation[s.paymentMethod].count += 1;
    paymentAggregation[s.paymentMethod].total += net;

    // Hitung per kategori
    for (const it of s.items) {
      const catName = it.product.categoryName || "Lainnya";
      if (!categoryAggregation[catName]) {
        categoryAggregation[catName] = { qty: 0, revenue: 0 };
      }
      categoryAggregation[catName].qty += it.qty;
      categoryAggregation[catName].revenue += Number(it.subtotal);
    }

    const totalHpp = s.items.reduce(
      (acc, it) => acc + Number(it.unitCost) * it.qty,
      0,
    );
    const sellingPrice = net;
    const commission = Number(s.commission || 0);
    const profit = sellingPrice - totalHpp - commission;

    return {
      id: s.id,
      invoiceNo: s.invoiceNo,
      date: s.createdAt.toISOString(),
      customerName: s.customerName || "Pelanggan Umum",
      customerPhone: s.customerPhone || "",
      cashierName: s.cashier.name,
      paymentMethod: s.paymentMethod,
      subtotal: itemsGross,
      discount: disc,
      additionalFee: Number(s.additionalFee || 0),
      additionalFeeNote: s.additionalFeeNote || "",
      total: net,
      itemsCount,
      totalHpp,
      sellingPrice,
      commission,
      profit,
      items: s.items.map((it) => ({
        id: it.id,
        name: it.product.name,
        color: it.product.color || null,
        variant: it.product.variant,
        category: it.product.categoryName,
        brand: it.product.brandName,
        qty: it.qty,
        unitCost: Number(it.unitCost),
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    };
  });

  const totalTransactions = mappedSales.length;
  const averageOrderValue =
    totalTransactions > 0 ? totalNetRevenue / totalTransactions : 0;

  const categoryBreakdown = Object.entries(categoryAggregation).map(
    ([categoryName, data]) => ({
      categoryName,
      qty: data.qty,
      revenue: data.revenue,
      percentage:
        totalNetRevenue > 0
          ? Math.round((data.revenue / totalNetRevenue) * 100)
          : 0,
    }),
  );

  const paymentBreakdown = Object.entries(paymentAggregation).map(
    ([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }),
  );

  return {
    summary: {
      totalGrossRevenue,
      totalDiscount,
      totalNetRevenue,
      totalTransactions,
      totalItemsSold,
      averageOrderValue,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    categoryBreakdown,
    paymentBreakdown,
    sales: mappedSales,
  };
}

/**
 * 2. LAPORAN STOK & VALUASI INVENTARIS
 */
export async function getStockReport(params?: StockReportFilter) {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin" || user.role === "owner";

  const { categoryId, brandId, stockStatus = "all" } = params || {};

  const where: any = { isActive: true };
  if (categoryId && categoryId !== "all") {
    where.categoryName = categoryId;
  }
  if (brandId && brandId !== "all") {
    where.brandName = brandId;
  }

  const rawProducts = await db.product.findMany({
    where,
    orderBy: { stock: "asc" },
  });

  // Filter status stok
  let filteredProducts = rawProducts;
  if (stockStatus === "safe") {
    filteredProducts = filteredProducts.filter((p) => p.stock > p.minStock);
  } else if (stockStatus === "low") {
    filteredProducts = filteredProducts.filter(
      (p) => p.stock > 0 && p.stock <= p.minStock,
    );
  } else if (stockStatus === "out") {
    filteredProducts = filteredProducts.filter((p) => p.stock === 0);
  }

  let totalPhysicalStock = 0;
  let lowStockSkus = 0;
  let outOfStockSkus = 0;
  let totalAssetRetailValue = 0;
  let totalAssetCostValue = 0;

  const products = filteredProducts.map((p) => {
    const sellingPrice = Number(p.sellingPrice);
    const purchasePrice = isSuperAdmin ? Number(p.purchasePrice) : null;
    const retailValuation = p.stock * sellingPrice;
    const costValuation =
      purchasePrice !== null ? p.stock * purchasePrice : null;

    totalPhysicalStock += p.stock;
    totalAssetRetailValue += retailValuation;
    if (costValuation !== null) {
      totalAssetCostValue += costValuation;
    }

    let statusLabel: "safe" | "low" | "out" = "safe";
    if (p.stock === 0) {
      statusLabel = "out";
      outOfStockSkus += 1;
    } else if (p.stock <= p.minStock) {
      statusLabel = "low";
      lowStockSkus += 1;
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      variant: p.variant,
      categoryName: p.categoryName || "-",
      brandName: p.brandName || "-",
      stock: p.stock,
      minStock: p.minStock,
      status: statusLabel,
      sellingPrice,
      purchasePrice, // Masked for non-super-admin
      retailValuation,
      costValuation, // Masked for non-super-admin
    };
  });

  const totalSkus = products.length;
  const potentialGrossProfit = isSuperAdmin
    ? totalAssetRetailValue - totalAssetCostValue
    : null;

  return {
    summary: {
      isSuperAdmin,
      totalPhysicalStock,
      totalSkus,
      lowStockSkus,
      outOfStockSkus,
      totalAssetRetailValue,
      totalAssetCostValue: isSuperAdmin ? totalAssetCostValue : null,
      potentialGrossProfit,
    },
    products,
  };
}

/**
 * 3. LAPORAN LABA-RUGI (SUPER ADMIN ONLY)
 */
export async function getProfitReport(params?: ReportDateFilter) {
  // Enforce security guard at API / server action level
  await requireRole(["super_admin", "owner", "staff_keuangan"]);

  const { startDate, endDate } = params || {};
  const { start, end } = resolveDateRange(startDate, endDate);

  const sales = await db.sale.findMany({
    where: {
      status: "completed",
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
    include: {
      cashier: { select: { id: true, name: true } },
      items: {
        where: {
          isReturned: false,
        },
        include: {
          product: true,
        },
      },
    },
  });

  // Kecualikan transaksi yang seluruh itemnya telah diretur
  const activeSales = sales.filter((sale) => sale.items.length > 0);

  let totalGrossRevenue = 0;
  let totalDiscount = 0;
  let totalNetRevenue = 0;
  let totalCogs = 0;
  let totalCommission = 0;

  const categoryProfitMap: Record<
    string,
    { categoryName: string; revenue: number; cogs: number; profit: number }
  > = {};

  const productProfitMap: Record<
    string,
    {
      productId: string;
      name: string;
      brand: string;
      qty: number;
      revenue: number;
      cogs: number;
      profit: number;
    }
  > = {};

  const transactionBreakdown = activeSales.map((sale) => {
    const itemsGross = sale.items.reduce(
      (acc, it) => acc + Number(it.subtotal),
      0,
    );
    const itemsCogs = sale.items.reduce(
      (acc, it) => acc + Number(it.unitCost) * it.qty,
      0,
    );
    const saleDisc = Number(sale.discount || 0);
    const saleAdditionalFee = Number(sale.additionalFee || 0);
    const saleSellingPrice = Number(sale.total);
    const saleCommission = Number((sale as any).commission || 0);

    totalGrossRevenue += itemsGross;
    totalDiscount += saleDisc;
    totalNetRevenue += saleSellingPrice;
    totalCommission += saleCommission;
    totalCogs += itemsCogs;

    for (const item of sale.items) {
      const itemQty = item.qty;
      const itemSubtotal = Number(item.subtotal);
      const itemCost = Number(item.unitCost) * itemQty;

      // Category breakdown
      const catName = item.product.categoryName || "Lainnya";
      if (!categoryProfitMap[catName]) {
        categoryProfitMap[catName] = {
          categoryName: catName,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
      }
      categoryProfitMap[catName].revenue += itemSubtotal;
      categoryProfitMap[catName].cogs += itemCost;
      categoryProfitMap[catName].profit += itemSubtotal - itemCost;

      // Product breakdown
      const pId = item.productId;
      if (!productProfitMap[pId]) {
        productProfitMap[pId] = {
          productId: pId,
          name: item.product.name,
          brand: item.product.brandName || "-",
          qty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
      }
      productProfitMap[pId].qty += itemQty;
      productProfitMap[pId].revenue += itemSubtotal;
      productProfitMap[pId].cogs += itemCost;
      productProfitMap[pId].profit += itemSubtotal - itemCost;
    }

    const saleGrossProfit = saleSellingPrice - itemsCogs;
    const saleNetProfit = saleGrossProfit - saleCommission;

    return {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      date: sale.createdAt.toISOString(),
      customerName: sale.customerName || "Pelanggan Umum",
      customerPhone: sale.customerPhone || null,
      cashierName: sale.cashier.name,
      items: sale.items.map((it) => ({
        id: it.id,
        name: it.product.name,
        color: it.product.color || null,
        qty: it.qty,
        unitCost: Number(it.unitCost),
        unitPrice: Number(it.unitPrice),
      })),
      netRevenue: saleSellingPrice,
      sellingPrice: saleSellingPrice,
      cogs: itemsCogs,
      grossProfit: saleGrossProfit,
      commission: saleCommission,
      commissionProofUrl: (sale as any).commissionProofUrl || null,
      netProfit: saleNetProfit,
      additionalFeeNote: sale.additionalFeeNote || null,
    };
  });

  const grossProfit = totalNetRevenue - totalCogs;
  const netProfit = grossProfit - totalCommission;

  const categoryBreakdown = Object.values(categoryProfitMap);
  const productBreakdown = Object.values(productProfitMap).sort(
    (a, b) => b.profit - a.profit,
  );

  return {
    summary: {
      totalGrossRevenue,
      totalDiscount,
      totalNetRevenue,
      totalCogs,
      grossProfit,
      totalCommission,
      netProfit,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    categoryBreakdown,
    productBreakdown,
    transactionBreakdown,
  };
}

/**
 * Upload bukti komisi oleh Owner / Super Admin
 */
export async function uploadCommissionProof(formData: FormData) {
  await requireRole(["super_admin", "owner"]);
  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "File bukti tidak ditemukan." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Hanya file gambar yang diperbolehkan." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 10MB." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads", "commissions");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    return { url: `/uploads/commissions/${filename}` };
  } catch (error) {
    console.error("uploadCommissionProof error:", error);
    return { error: "Gagal mengunggah bukti komisi." };
  }
}

/**
 * Update komisi pada transaksi penjualan (Super Admin / Owner)
 */
export async function updateSaleCommission(
  saleId: string,
  commission: number,
  proofUrl?: string | null,
) {
  try {
    await requireRole(["super_admin", "owner"]);
    const commValue = Math.max(0, Number(commission) || 0);

    const sale = await db.sale.update({
      where: { id: saleId },
      data: { commission: commValue },
      select: { id: true, invoiceNo: true, cashierId: true },
    });

    if (proofUrl !== undefined) {
      await db.$executeRaw`UPDATE sales SET commission_proof_url = ${proofUrl} WHERE id = ${saleId}::uuid`;
    }

    if (commValue > 0) {
      const formattedComm = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(commValue);

      await createNotification({
        userId: sale.cashierId || null,
        targetRole: sale.cashierId ? undefined : "admin_kasir",
        title: "Komisi Penjualan Diberikan",
        message: `Owner telah memberikan komisi sebesar ${formattedComm} untuk transaksi faktur ${sale.invoiceNo}.`,
        type: "commission",
        link: "/sales/history",
      });
    }

    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/sales/history");
    return { success: true, commission: commValue, commissionProofUrl: proofUrl };
  } catch (err: any) {
    return { error: err.message || "Gagal memperbarui komisi." };
  }
}

/**
 * 4. LAPORAN PRODUK TERLARIS (BEST SELLERS)
 */
export async function getBestSellersReport(params?: BestSellerFilter) {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin" || user.role === "owner";

  const { startDate, endDate, limit = 10, sortBy = "qty" } = params || {};
  const { start, end } = resolveDateRange(startDate, endDate);

  const saleItems = await db.saleItem.findMany({
    where: {
      isReturned: false,
      sale: {
        status: "completed",
        createdAt: { gte: start, lte: end },
      },
    },
    include: {
      product: true,
    },
  });

  const productMap: Record<
    string,
    {
      productId: string;
      name: string;
      sku: string;
      variant: string | null;
      brandName: string;
      categoryName: string;
      qty: number;
      revenue: number;
      cogs: number;
      profit: number;
      sellingPrice: number;
    }
  > = {};

  let grandTotalQty = 0;
  let grandTotalRevenue = 0;

  for (const item of saleItems) {
    const p = item.product;
    const qty = item.qty;
    const revenue = Number(item.subtotal);
    const cogs = Number(item.unitCost) * qty;

    grandTotalQty += qty;
    grandTotalRevenue += revenue;

    if (!productMap[p.id]) {
      productMap[p.id] = {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        variant: p.variant,
        brandName: p.brandName || "-",
        categoryName: p.categoryName || "-",
        qty: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
        sellingPrice: Number(p.sellingPrice),
      };
    }

    productMap[p.id].qty += qty;
    productMap[p.id].revenue += revenue;
    productMap[p.id].cogs += cogs;
    productMap[p.id].profit += revenue - cogs;
  }

  const list = Object.values(productMap);

  // Sorting
  if (sortBy === "revenue") {
    list.sort((a, b) => b.revenue - a.revenue);
  } else {
    list.sort((a, b) => b.qty - a.qty);
  }

  const topList = list.slice(0, limit).map((item, idx) => ({
    rank: idx + 1,
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    variant: item.variant,
    brandName: item.brandName,
    categoryName: item.categoryName,
    qty: item.qty,
    revenue: item.revenue,
    profit: isSuperAdmin ? item.profit : null, // Masked for Admin
    margin:
      isSuperAdmin && item.revenue > 0
        ? Math.round((item.profit / item.revenue) * 100)
        : null,
    sellingPrice: item.sellingPrice,
    sharePercentage:
      sortBy === "revenue"
        ? grandTotalRevenue > 0
          ? Math.round((item.revenue / grandTotalRevenue) * 100)
          : 0
        : grandTotalQty > 0
          ? Math.round((item.qty / grandTotalQty) * 100)
          : 0,
  }));

  return {
    isSuperAdmin,
    grandTotalQty,
    grandTotalRevenue,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    items: topList,
  };
}

/**
 * 5. PENGELUARAN HARIAN (DAILY EXPENSES)
 */
export async function getDailyExpenses(params?: {
  startDate?: string;
  endDate?: string;
}) {
  await requireRole(["super_admin", "owner", "staff_keuangan"]);

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  let start: Date;
  let end: Date | undefined;

  if (params?.startDate) {
    start = new Date(`${params.startDate}T00:00:00.000`);
  } else {
    // Default: awal bulan berjalan
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  if (params?.endDate) {
    end = new Date(`${params.endDate}T23:59:59.999`);
  } else {
    // Jika tidak ada batasan endDate, jangan dibatasi sampai hari ini saja
    // agar pencatatan pengeluaran dengan tanggal besok/setelah hari ini tetap masuk ke rekapitulasi harian!
    end = undefined;
  }

  const periodDateWhere: any = { gte: start };
  if (end) {
    periodDateWhere.lte = end;
  }

  const [todayExpensesRaw, periodExpensesRaw] = await Promise.all([
    db.dailyExpense.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true } },
      },
    }),
    db.dailyExpense.findMany({
      where: {
        date: periodDateWhere,
      },
      orderBy: { date: "desc" },
      include: {
        creator: { select: { name: true } },
      },
    }),
  ]);

  const todayExpenses = todayExpensesRaw.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    description: e.description,
    amount: Number(e.amount),
    createdByName: e.creator?.name || "Owner",
    createdAt: e.createdAt.toISOString(),
  }));

  const totalToday = todayExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Rekapitulasi Total Pengeluaran per Hari
  const dailyMap: Record<
    string,
    { dateStr: string; rawDate: string; count: number; totalAmount: number }
  > = {};

  for (const exp of periodExpensesRaw) {
    const d = new Date(exp.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        dateStr: formattedDate,
        rawDate: dateKey,
        count: 0,
        totalAmount: 0,
      };
    }

    dailyMap[dateKey].count += 1;
    dailyMap[dateKey].totalAmount += Number(exp.amount);
  }

  const dailyAggregates = Object.values(dailyMap).sort(
    (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
  );

  const totalPeriod = periodExpensesRaw.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  const periodExpenses = periodExpensesRaw.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    description: e.description,
    amount: Number(e.amount),
    createdByName: e.creator?.name || "Owner",
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    todayExpenses,
    periodExpenses,
    totalToday,
    dailyAggregates,
    totalPeriod,
    isFiltered: Boolean(params?.startDate || params?.endDate),
    startDate: start.toISOString(),
    endDate: end
      ? end.toISOString()
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}

export async function createDailyExpense(data: {
  description: string;
  amount: number;
  date?: string;
}) {
  const user = await requireRole(["super_admin", "owner", "staff_keuangan"]);

  if (!data.description || data.description.trim() === "") {
    return { error: "Keterangan pengeluaran wajib diisi." };
  }
  if (!data.amount || data.amount <= 0) {
    return { error: "Biaya pengeluaran harus lebih besar dari 0." };
  }

  let expenseDate: Date;
  if (data.date) {
    // Tangani input YYYY-MM-DD dengan jam 12 siang lokal agar tidak bergeser tanggal saat konversi UTC
    expenseDate = new Date(`${data.date}T12:00:00`);
  } else {
    expenseDate = new Date();
  }

  // Pastikan user valid ada di database
  const actor =
    (await db.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    })) ||
    (user.email
      ? await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        })
      : null) ||
    (await db.user.findFirst({ select: { id: true } }));

  if (!actor) {
    return { error: "Pengguna tidak valid di database." };
  }

  const record = await db.dailyExpense.create({
    data: {
      description: data.description.trim(),
      amount: data.amount,
      date: expenseDate,
      createdById: actor.id,
    },
  });

  revalidatePath("/reports");
  revalidatePath("/reports/expenses");
  revalidatePath("/reports/financial");
  revalidatePath("/reports/sales");

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(record.amount));

  if (user.role !== "owner" && user.role !== "super_admin") {
    await createNotification({
      targetRole: "owner",
      title: "Transaksi Kas Keluar",
      message: `Pengeluaran kas "${record.description}" sebesar ${formattedAmount} telah dicatat.`,
      type: "expense_out",
      link: "/reports/expenses",
      excludeUserId: user.id,
    });
  }

  return {
    success: true,
    data: {
      id: record.id,
      description: record.description,
      amount: Number(record.amount),
      date: record.date.toISOString(),
      createdById: record.createdById,
      createdAt: record.createdAt.toISOString(),
    },
  };
}

export async function deleteDailyExpense(id: string) {
  try {
    await requireRole(["super_admin", "owner", "staff_keuangan"]);
    await db.dailyExpense.delete({ where: { id } });
    revalidatePath("/reports");
    revalidatePath("/reports/expenses");
    revalidatePath("/reports/financial");
    revalidatePath("/reports/sales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Gagal menghapus pengeluaran harian." };
  }
}

/**
 * 6. LAPORAN KEUANGAN BULANAN (FINANCIAL REPORT)
 */
export async function getMonthlyFinancialReport(month: number, year: number) {
  await requireRole(["super_admin", "owner", "staff_keuangan"]);

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [sales, dailyExpensesInMonthRaw, monthlyExpensesRaw] =
    await Promise.all([
      db.sale.findMany({
        where: {
          status: "completed",
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { createdAt: "asc" },
        include: {
          items: {
            where: { isReturned: false },
            include: {
              product: true,
            },
          },
          cashier: { select: { name: true } },
        },
      }),
      db.dailyExpense.findMany({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { date: "asc" },
        include: {
          creator: { select: { name: true } },
        },
      }),
      db.monthlyExpense.findMany({
        where: {
          month,
          year,
        },
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { name: true } },
        },
      }),
    ]);

  // 1. Rincian & Agregasi Penjualan (Hanya transaksi dengan barang aktif yang tidak diretur)
  const activeSales = sales.filter((s) => s.items.length > 0);

  let totalGrossRevenue = 0;
  let totalDiscount = 0;
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalCommission = 0;
  let totalItemsSold = 0;

  const paymentBreakdownMap: Record<string, { count: number; total: number }> =
    {};
  const categoryBreakdownMap: Record<
    string,
    { qty: number; revenue: number; cogs: number; profit: number }
  > = {};

  for (const sale of activeSales) {
    const itemsGross = sale.items.reduce(
      (acc, it) => acc + Number(it.subtotal),
      0,
    );
    const disc = Number(sale.discount || 0);
    const fee = Number(sale.additionalFee || 0);
    const net = Number(sale.total);
    const comm = Number((sale as any).commission || 0);

    totalGrossRevenue += itemsGross;
    totalDiscount += disc;
    totalRevenue += net;
    totalCommission += comm;

    // Payment Method
    const pm = sale.paymentMethod || "cash";
    if (!paymentBreakdownMap[pm]) {
      paymentBreakdownMap[pm] = { count: 0, total: 0 };
    }
    paymentBreakdownMap[pm].count += 1;
    paymentBreakdownMap[pm].total += net;

    for (const item of sale.items) {
      const itemQty = item.qty;
      const itemSubtotal = Number(item.subtotal);
      const itemCost = Number(item.unitCost) * itemQty;

      totalItemsSold += itemQty;
      totalCogs += itemCost;

      // Category breakdown
      const catName = item.product.categoryName || "Lainnya";
      if (!categoryBreakdownMap[catName]) {
        categoryBreakdownMap[catName] = {
          qty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
      }
      categoryBreakdownMap[catName].qty += itemQty;
      categoryBreakdownMap[catName].revenue += itemSubtotal;
      categoryBreakdownMap[catName].cogs += itemCost;
      categoryBreakdownMap[catName].profit += itemSubtotal - itemCost;
    }
  }

  const grossSalesProfit = totalRevenue - totalCogs;
  const netSalesProfit = grossSalesProfit - totalCommission;

  const paymentBreakdown = Object.entries(paymentBreakdownMap).map(
    ([method, val]) => ({
      method,
      count: val.count,
      total: val.total,
    }),
  );

  const categoryBreakdown = Object.entries(categoryBreakdownMap).map(
    ([categoryName, val]) => ({
      categoryName,
      qty: val.qty,
      revenue: val.revenue,
      cogs: val.cogs,
      profit: val.profit,
    }),
  );

  // 2. Rincian & Agregasi Pengeluaran Harian per Hari
  const dailyMap: Record<
    string,
    {
      dateStr: string;
      rawDate: string;
      count: number;
      totalAmount: number;
      items: {
        description: string;
        amount: number;
        time: string;
        creatorName: string;
      }[];
    }
  > = {};

  for (const exp of dailyExpensesInMonthRaw) {
    const d = new Date(exp.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        dateStr: formattedDate,
        rawDate: dateKey,
        count: 0,
        totalAmount: 0,
        items: [],
      };
    }

    const amt = Number(exp.amount);
    dailyMap[dateKey].count += 1;
    dailyMap[dateKey].totalAmount += amt;
    dailyMap[dateKey].items.push({
      description: exp.description,
      amount: amt,
      time: d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      creatorName: exp.creator?.name || "Staff",
    });
  }

  const dailyExpenseBreakdown = Object.values(dailyMap).sort(
    (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
  );

  const totalDailyExpenses = dailyExpensesInMonthRaw.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  // 3. Pengeluaran Tambahan Bulanan
  const monthlyExpenses = monthlyExpensesRaw.map((m) => ({
    id: m.id,
    month: m.month,
    year: m.year,
    description: m.description,
    amount: Number(m.amount),
    createdByName: m.creator?.name || "Owner",
    createdAt: m.createdAt.toISOString(),
  }));

  const totalMonthlyExpenses = monthlyExpenses.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );

  // 4. Konsolidasi Akhir Laba Bersih Toko
  const totalOperationalExpenses = totalDailyExpenses + totalMonthlyExpenses;
  const netStoreProfit = netSalesProfit - totalOperationalExpenses;

  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    startOfMonth,
  );

  return {
    month,
    year,
    monthName,
    salesSummary: {
      transactionCount: sales.length,
      totalGrossRevenue,
      totalDiscount,
      totalRevenue,
      totalCogs,
      grossSalesProfit,
      totalCommission,
      netSalesProfit,
      totalItemsSold,
      paymentBreakdown,
      categoryBreakdown,
    },
    expensesSummary: {
      totalDailyExpenses,
      dailyExpenseCount: dailyExpensesInMonthRaw.length,
      dailyExpenseBreakdown,
      totalMonthlyExpenses,
      monthlyExpenses,
      totalOperationalExpenses,
    },
    netStoreProfit,
  };
}

export async function createMonthlyExpense(data: {
  month: number;
  year: number;
  description: string;
  amount: number;
}) {
  const user = await requireRole(["super_admin", "owner", "staff_keuangan"]);

  if (!data.description || data.description.trim() === "") {
    return { error: "Keterangan pengeluaran bulanan wajib diisi." };
  }
  if (!data.amount || data.amount <= 0) {
    return { error: "Biaya harus lebih besar dari 0." };
  }

  const actor =
    (await db.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    })) ||
    (user.email
      ? await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        })
      : null) ||
    (await db.user.findFirst({ select: { id: true } }));

  if (!actor) {
    return { error: "Pengguna tidak valid di database." };
  }

  const record = await db.monthlyExpense.create({
    data: {
      month: data.month,
      year: data.year,
      description: data.description.trim(),
      amount: data.amount,
      createdById: actor.id,
    },
  });

  revalidatePath("/reports");
  revalidatePath("/reports/expenses");
  revalidatePath("/reports/financial");
  revalidatePath("/reports/sales");
  return {
    success: true,
    data: {
      id: record.id,
      month: record.month,
      year: record.year,
      description: record.description,
      amount: Number(record.amount),
      createdById: record.createdById,
      createdAt: record.createdAt.toISOString(),
    },
  };
}

export async function deleteMonthlyExpense(id: string) {
  try {
    await requireRole(["super_admin", "owner", "staff_keuangan"]);
    await db.monthlyExpense.delete({ where: { id } });
    revalidatePath("/reports");
    revalidatePath("/reports/expenses");
    revalidatePath("/reports/financial");
    revalidatePath("/reports/sales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Gagal menghapus pengeluaran bulanan." };
  }
}
