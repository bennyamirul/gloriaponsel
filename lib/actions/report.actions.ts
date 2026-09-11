"use server";

import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

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
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return { start, end };
}

/**
 * 1. LAPORAN PENJUALAN
 */
export async function getSalesReport(params?: SalesReportFilter) {
  await requireAuth();

  const { startDate, endDate, categoryId, brandId, paymentMethod } = params || {};
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
      customer: { select: { id: true, name: true, phone: true } },
      cashier: { select: { id: true, name: true } },
      items: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Filter berdasarkan categoryId / brandId jika dipilih
  let filteredSales = rawSales;
  if (categoryId && categoryId !== "all") {
    filteredSales = filteredSales.filter((s) =>
      s.items.some((it) => it.product.categoryId === categoryId)
    );
  }
  if (brandId && brandId !== "all") {
    filteredSales = filteredSales.filter((s) =>
      s.items.some((it) => it.product.brandId === brandId)
    );
  }

  let totalGrossRevenue = 0;
  let totalDiscount = 0;
  let totalNetRevenue = 0;
  let totalItemsSold = 0;

  const categoryAggregation: Record<string, { qty: number; revenue: number }> = {};
  const paymentAggregation: Record<string, { count: number; total: number }> = {};

  const mappedSales = filteredSales.map((s) => {
    const gross = Number(s.subtotal);
    const disc = Number(s.discount);
    const net = Number(s.total);
    const itemsCount = s.items.reduce((acc, it) => acc + it.qty, 0);

    totalGrossRevenue += gross;
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
      const catName = it.product.category?.name || "Lainnya";
      if (!categoryAggregation[catName]) {
        categoryAggregation[catName] = { qty: 0, revenue: 0 };
      }
      categoryAggregation[catName].qty += it.qty;
      categoryAggregation[catName].revenue += Number(it.subtotal);
    }

    return {
      id: s.id,
      invoiceNo: s.invoiceNo,
      date: s.createdAt.toISOString(),
      customerName: s.customer?.name || "Pelanggan Umum",
      cashierName: s.cashier.name,
      paymentMethod: s.paymentMethod,
      subtotal: gross,
      discount: disc,
      total: net,
      itemsCount,
      items: s.items.map((it) => ({
        id: it.id,
        name: it.product.name,
        variant: it.product.variant,
        category: it.product.category?.name,
        brand: it.product.brand?.name,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
    };
  });

  const totalTransactions = mappedSales.length;
  const averageOrderValue = totalTransactions > 0 ? totalNetRevenue / totalTransactions : 0;

  const categoryBreakdown = Object.entries(categoryAggregation).map(([categoryName, data]) => ({
    categoryName,
    qty: data.qty,
    revenue: data.revenue,
    percentage: totalNetRevenue > 0 ? Math.round((data.revenue / totalNetRevenue) * 100) : 0,
  }));

  const paymentBreakdown = Object.entries(paymentAggregation).map(([method, data]) => ({
    method,
    count: data.count,
    total: data.total,
  }));

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
  const isSuperAdmin = user.role === "super_admin";

  const { categoryId, brandId, stockStatus = "all" } = params || {};

  const where: any = { isActive: true };
  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }
  if (brandId && brandId !== "all") {
    where.brandId = brandId;
  }

  const rawProducts = await db.product.findMany({
    where,
    orderBy: { stock: "asc" },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
  });

  // Filter status stok
  let filteredProducts = rawProducts;
  if (stockStatus === "safe") {
    filteredProducts = filteredProducts.filter((p) => p.stock > p.minStock);
  } else if (stockStatus === "low") {
    filteredProducts = filteredProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock);
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
    const costValuation = purchasePrice !== null ? p.stock * purchasePrice : null;

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
      categoryName: p.category.name,
      brandName: p.brand.name,
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
  const potentialGrossProfit = isSuperAdmin ? totalAssetRetailValue - totalAssetCostValue : null;

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
  await requireRole(["super_admin"]);

  const { startDate, endDate } = params || {};
  const { start, end } = resolveDateRange(startDate, endDate);

  const sales = await db.sale.findMany({
    where: {
      status: "completed",
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      cashier: { select: { name: true } },
      items: {
        include: {
          product: {
            include: {
              category: { select: { name: true } },
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  let totalGrossRevenue = 0;
  let totalDiscount = 0;
  let totalNetRevenue = 0;
  let totalCogs = 0;

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

  const transactionBreakdown = sales.map((sale) => {
    const saleNet = Number(sale.total);
    const saleGross = Number(sale.subtotal);
    const saleDisc = Number(sale.discount);

    totalGrossRevenue += saleGross;
    totalDiscount += saleDisc;
    totalNetRevenue += saleNet;

    let saleCogs = 0;

    for (const item of sale.items) {
      const itemQty = item.qty;
      const itemSubtotal = Number(item.subtotal);
      const itemCost = Number(item.unitCost) * itemQty;

      saleCogs += itemCost;

      // Category breakdown
      const catName = item.product.category?.name || "Lainnya";
      if (!categoryProfitMap[catName]) {
        categoryProfitMap[catName] = { categoryName: catName, revenue: 0, cogs: 0, profit: 0 };
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
          brand: item.product.brand?.name || "-",
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

    totalCogs += saleCogs;
    const saleGrossProfit = saleNet - saleCogs;
    const saleMargin = saleNet > 0 ? Math.round((saleGrossProfit / saleNet) * 100) : 0;

    return {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      date: sale.createdAt.toISOString(),
      customerName: sale.customer?.name || "Pelanggan Umum",
      cashierName: sale.cashier.name,
      netRevenue: saleNet,
      cogs: saleCogs,
      grossProfit: saleGrossProfit,
      margin: saleMargin,
    };
  });

  const grossProfit = totalNetRevenue - totalCogs;
  const profitMargin = totalNetRevenue > 0 ? Math.round((grossProfit / totalNetRevenue) * 100) : 0;

  const categoryBreakdown = Object.values(categoryProfitMap).map((cat) => ({
    ...cat,
    margin: cat.revenue > 0 ? Math.round((cat.profit / cat.revenue) * 100) : 0,
  }));

  const productBreakdown = Object.values(productProfitMap)
    .map((prod) => ({
      ...prod,
      margin: prod.revenue > 0 ? Math.round((prod.profit / prod.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  return {
    summary: {
      totalGrossRevenue,
      totalDiscount,
      totalNetRevenue,
      totalCogs,
      grossProfit,
      profitMargin,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    categoryBreakdown,
    productBreakdown,
    transactionBreakdown,
  };
}

/**
 * 4. LAPORAN PRODUK TERLARIS (BEST SELLERS)
 */
export async function getBestSellersReport(params?: BestSellerFilter) {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin";

  const { startDate, endDate, limit = 10, sortBy = "qty" } = params || {};
  const { start, end } = resolveDateRange(startDate, endDate);

  const saleItems = await db.saleItem.findMany({
    where: {
      sale: {
        status: "completed",
        createdAt: { gte: start, lte: end },
      },
    },
    include: {
      product: {
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
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
        brandName: p.brand.name,
        categoryName: p.category.name,
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
    margin: isSuperAdmin && item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : null,
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
