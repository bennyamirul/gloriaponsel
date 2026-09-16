"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export interface AdminPerformanceItem {
  id: string;
  name: string;
  email: string;
  transactionsMonthCount: number;
  omzetMonth: number;
  transactionsTodayCount: number;
  contributionPercentage: number;
}

export async function getDashboardSummary() {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin" || user.role === "owner";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const endOfYesterday = new Date(startOfToday.getTime() - 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 1. Ambil transaksi hari ini, kemarin, bulan ini, bulan lalu & admin kasir
  const [
    salesThisMonth,
    salesLastMonth,
    salesToday,
    salesYesterday,
    adminUsers,
    lowStockCount,
    totalActiveProducts,
    earliestSale,
  ] = await Promise.all([
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfMonth },
      },
      select: {
        id: true,
        total: true,
        commission: true,
        cashierId: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfToday },
      },
      include: { items: true },
    }),
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfYesterday, lte: endOfYesterday },
      },
      select: { total: true },
    }),
    db.user.findMany({
      where: {
        role: { in: ["admin", "admin_kasir"] }, // Hanya admin kasir
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
    db.product.count({
      where: {
        isActive: true,
        stock: { lte: db.product.fields.minStock },
      },
    }),
    db.product.count({
      where: { isActive: true },
    }),
    db.sale.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const earliestYear = earliestSale ? earliestSale.createdAt.getFullYear() : now.getFullYear();
  const currentYear = now.getFullYear();
  const availableYears: number[] = [];
  for (let y = Math.min(earliestYear, currentYear - 1); y <= currentYear + 1; y++) {
    availableYears.push(y);
  }

  // Perhitungan Omzet Hari Ini
  const omzetToday = salesToday.reduce((acc, s) => acc + Number(s.total), 0);
  const omzetYesterday = salesYesterday.reduce((acc, s) => acc + Number(s.total), 0);
  const transactionsTodayCount = salesToday.length;

  let revenueChangePercentage = 0;
  if (omzetYesterday > 0) {
    revenueChangePercentage = Math.round(((omzetToday - omzetYesterday) / omzetYesterday) * 100);
  } else if (omzetToday > 0) {
    revenueChangePercentage = 100;
  }

  // Perhitungan Omzet Bulan Ini
  const omzetThisMonth = salesThisMonth.reduce((acc, s) => acc + Number(s.total), 0);
  const omzetLastMonth = salesLastMonth.reduce((acc, s) => acc + Number(s.total), 0);
  const transactionsThisMonthCount = salesThisMonth.length;
  const transactionsLastMonthCount = salesLastMonth.length;

  let monthRevenueChangePercentage = 0;
  if (omzetLastMonth > 0) {
    monthRevenueChangePercentage = Math.round(((omzetThisMonth - omzetLastMonth) / omzetLastMonth) * 100);
  } else if (omzetThisMonth > 0) {
    monthRevenueChangePercentage = 100;
  }

  // Hitung Kinerja Masing-Masing Admin Kasir (Owner dikecualikan)
  const salesByCashier = new Map<string, { count: number; totalOmzet: number; todayCount: number }>();
  for (const s of salesThisMonth) {
    const cid = s.cashierId;
    const current = salesByCashier.get(cid) || { count: 0, totalOmzet: 0, todayCount: 0 };
    current.count += 1;
    current.totalOmzet += Number(s.total);
    if (s.createdAt >= startOfToday) {
      current.todayCount += 1;
    }
    salesByCashier.set(cid, current);
  }

  const adminPerformance: AdminPerformanceItem[] = adminUsers.map((admin) => {
    const stats = salesByCashier.get(admin.id) || { count: 0, totalOmzet: 0, todayCount: 0 };
    const contributionPercentage =
      transactionsThisMonthCount > 0
        ? Math.round((stats.count / transactionsThisMonthCount) * 100)
        : 0;

    return {
      id: admin.id,
      name: admin.name || admin.username || "Kasir",
      email: admin.email || "-",
      transactionsMonthCount: stats.count,
      omzetMonth: stats.totalOmzet,
      transactionsTodayCount: stats.todayCount,
      contributionPercentage,
    };
  });

  // Urutkan admin berdasarkan total transaksi terbanyak bulan ini
  adminPerformance.sort((a, b) => b.transactionsMonthCount - a.transactionsMonthCount || a.name.localeCompare(b.name));

  const currentMonthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

  // Hitung Laba Kotor Hari Ini (HANYA untuk Super Admin)
  let profitToday: number | null = null;
  let marginPercentage = 0;

  if (isSuperAdmin) {
    let totalHppToday = 0;
    for (const s of salesToday) {
      for (const item of s.items) {
        totalHppToday += Number(item.unitCost) * item.qty;
      }
    }
    profitToday = omzetToday - totalHppToday;
    if (omzetToday > 0) {
      marginPercentage = Math.round((profitToday / omzetToday) * 100);
    }
  }

  // 2. Data Tren Penjualan 7 Hari Terakhir untuk Grafik Recharts
  const last7Days: { date: string; day: string; omzet: number; transactions: number }[] = [];
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const daySales = await db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    const dayOmzet = daySales.reduce((acc, s) => acc + Number(s.total), 0);
    const dateLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`;

    last7Days.push({
      date: dateLabel,
      day: dayNames[d.getDay()],
      omzet: dayOmzet,
      transactions: daySales.length,
    });
  }

  // Helper penentu status transaksi di dashboard
  const getSaleDisplayStatus = (s: {
    status: string;
    items: Array<{ isReturned?: boolean | null; returnReason?: string | null }>;
  }) => {
    if (s.status === "cancelled") {
      return { label: "Batal", variant: "cancelled" };
    }
    if (!s.items || s.items.length === 0) {
      return { label: "Selesai", variant: "completed" };
    }
    const allReturned = s.items.every((it) => it.isReturned);
    if (allReturned) {
      return { label: "Refund", variant: "refund" };
    }
    const hasReturned = s.items.some((it) => it.isReturned);
    if (hasReturned) {
      return { label: "Sebagian Refund", variant: "partial_refund" };
    }
    const hasExchange = s.items.some((it) => {
      const r = (it.returnReason || "").toLowerCase();
      return r.includes("tukar") || r.includes("exchange") || r.startsWith("ditukar");
    });
    if (hasExchange) {
      return { label: "Tukar Unit", variant: "exchange" };
    }
    return { label: "Selesai", variant: "completed" };
  };

  // 3. 5 Transaksi Terbaru (Global)
  const recentSales = await db.sale.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      cashier: { select: { id: true, name: true, username: true } },
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
            },
          },
        },
      },
    },
  });

  // 3b. Perhitungan Best Seller (Produk Penyumbang Laba Terbesar)
  const bestSellerItems = await db.saleItem.findMany({
    where: {
      sale: {
        status: "completed",
      },
    },
    select: {
      qty: true,
      subtotal: true,
      unitCost: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          brandName: true,
        },
      },
    },
  });

  const bestSellerMap = new Map<string, {
    productId: string;
    name: string;
    brand: string;
    qty: number;
    profit: number;
  }>();

  for (const item of bestSellerItems) {
    if (!item.product) continue;
    const pid = item.productId;
    const itemQty = item.qty;
    const itemRevenue = Number(item.subtotal);
    const itemCost = Number(item.unitCost) * itemQty;
    const itemProfit = itemRevenue - itemCost;

    const existing = bestSellerMap.get(pid) || {
      productId: pid,
      name: item.product.name,
      brand: item.product.brandName || "-",
      qty: 0,
      profit: 0,
    };
    existing.qty += itemQty;
    existing.profit += itemProfit;
    bestSellerMap.set(pid, existing);
  }

  const bestSellers = Array.from(bestSellerMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // 4. Data Khusus Admin Kasir (jika user yang login adalah kasir)
  const cashierSalesToday = salesToday.filter((s) => s.cashierId === user.id);
  const cashierTodayCount = cashierSalesToday.length;
  const cashierTodayCashCount = cashierSalesToday.filter((s) => s.paymentMethod === "cash").length;
  const cashierTodayNonCashCount = cashierSalesToday.filter((s) => s.paymentMethod !== "cash").length;

  const cashierSalesThisMonth = salesThisMonth.filter((s) => s.cashierId === user.id);
  const cashierMonthCount = cashierSalesThisMonth.length;
  const cashierMonthCashCount = cashierSalesThisMonth.filter((s) => s.paymentMethod === "cash").length;
  const cashierMonthNonCashCount = cashierSalesThisMonth.filter((s) => s.paymentMethod !== "cash").length;

  const cashierSalesAll = isSuperAdmin
    ? recentSales
    : await db.sale.findMany({
        where: { cashierId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          cashier: { select: { id: true, name: true, username: true } },
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
                },
              },
            },
          },
        },
      });

  const cashierTotalIncome = cashierSalesThisMonth
    .reduce((acc: number, s: any) => acc + Number(s.commission || 0), 0);
  const cashierTotalTransactions = cashierSalesThisMonth.length;

  const cashierRecentSales = cashierSalesAll.map((s: any) => {
    const statusInfo = getSaleDisplayStatus(s);
    return {
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerName: s.customer?.name || "Pelanggan Umum",
      cashierName: s.cashier?.name || s.cashier?.username || "Kasir",
      total: Number(s.total),
      commission: Number(s.commission || 0),
      commissionProofUrl: (s as any).commissionProofUrl || null,
      status: s.status,
      statusLabel: statusInfo.label,
      statusVariant: statusInfo.variant,
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      itemCount: s.items ? s.items.reduce((acc: number, it: any) => acc + it.qty, 0) : 0,
      items: (s.items || []).map((it: any) => ({
        id: it.id,
        productName: it.product?.name || "Produk",
        capacity: it.product?.capacity || null,
        color: it.product?.color || null,
        imei: it.imei || it.product?.imei || null,
        qty: it.qty,
        price: Number(it.price || 0),
        isReturned: Boolean(it.isReturned),
      })),
    };
  });

  // 5. Data Khusus Staff Gudang (Metrik Berbasis Unit Siklus Hidup)
  const [
    productsInToday,
    movementsInToday,
    productsInMonth,
    movementsInMonth,
    salesOutToday,
    movementsOutToday,
    salesOutMonth,
    movementsOutMonth,
    unitsReadyCount,
    soldProductsCount,
    totalSoldItems,
    recentUnitsRaw,
  ] = await Promise.all([
    // Unit Masuk Hari Ini
    db.product.count({
      where: {
        isActive: true,
        createdAt: { gte: startOfToday },
      },
    }),
    db.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        type: "in",
        createdAt: { gte: startOfToday },
      },
    }),

    // Unit Masuk Bulan Ini
    db.product.count({
      where: {
        isActive: true,
        createdAt: { gte: startOfMonth },
      },
    }),
    db.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        type: "in",
        createdAt: { gte: startOfMonth },
      },
    }),

    // Unit Keluar Hari Ini
    db.saleItem.aggregate({
      _sum: { qty: true },
      where: {
        sale: {
          status: "completed",
          createdAt: { gte: startOfToday },
        },
      },
    }),
    db.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        type: "out",
        createdAt: { gte: startOfToday },
      },
    }),

    // Unit Keluar Bulan Ini
    db.saleItem.aggregate({
      _sum: { qty: true },
      where: {
        sale: {
          status: "completed",
          createdAt: { gte: startOfMonth },
        },
      },
    }),
    db.stockMovement.aggregate({
      _sum: { quantity: true },
      where: {
        type: "out",
        createdAt: { gte: startOfMonth },
      },
    }),

    // Unit Ready (Available atau Retur dengan stok > 0)
    db.product.count({
      where: {
        isActive: true,
        status: { in: ["available", "retur"] },
        stock: { gt: 0 },
      },
    }),

    // Unit Terjual
    db.product.count({
      where: {
        status: "sold",
      },
    }),
    db.saleItem.aggregate({
      _sum: { qty: true },
      where: {
        sale: {
          status: "completed",
        },
      },
    }),

    // Daftar Unit Terbaru di Gudang
    db.product.findMany({
      where: { isActive: true },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const unitsInToday = Math.max(productsInToday, movementsInToday._sum.quantity || 0);
  const unitsInMonth = Math.max(productsInMonth, movementsInMonth._sum.quantity || 0);
  const unitsOutToday = Math.max(salesOutToday._sum.qty || 0, movementsOutToday._sum.quantity || 0);
  const unitsOutMonth = Math.max(salesOutMonth._sum.qty || 0, movementsOutMonth._sum.quantity || 0);
  const unitsReady = unitsReadyCount;
  const unitsSold = Math.max(soldProductsCount, totalSoldItems._sum.qty || 0);

  const warehouseData = {
    unitsInToday,
    unitsInMonth,
    unitsOutToday,
    unitsOutMonth,
    unitsReady,
    unitsSold,
    recentUnits: recentUnitsRaw.map((p) => ({
      id: p.id,
      sku: p.sku,
      imei: p.imei,
      name: p.name,
      productType: p.productType,
      capacity: p.capacity,
      color: p.color,
      status: p.status || (p.stock > 0 ? "available" : "sold"),
      categoryName: p.categoryName || (p.productType === "phone" ? "Handphone" : "Aksesoris"),
      brandName: p.brandName || "-",
      createdAt: p.createdAt.toISOString(),
      entryDate: p.entryDate ? p.entryDate.toISOString() : p.createdAt.toISOString(),
    })),
  };

  return {
    isSuperAdmin,
    currentMonthName,
    omzetToday,
    revenueChangePercentage,
    transactionsTodayCount,
    omzetThisMonth,
    omzetLastMonth,
    monthRevenueChangePercentage,
    transactionsThisMonthCount,
    transactionsLastMonthCount,
    initialMonth: now.getMonth() + 1,
    initialYear: now.getFullYear(),
    availableYears,
    adminPerformance,
    lowStockCount,
    totalActiveProducts,
    profitToday,
    marginPercentage,
    salesChart: last7Days,
    cashierData: {
      todayCount: cashierTodayCount,
      todayCashCount: cashierTodayCashCount,
      todayNonCashCount: cashierTodayNonCashCount,
      monthCount: cashierMonthCount,
      monthCashCount: cashierMonthCashCount,
      monthNonCashCount: cashierMonthNonCashCount,
      totalIncome: cashierTotalIncome,
      totalTransactions: cashierTotalTransactions,
      recentSales: cashierRecentSales,
    },
    warehouseData,
    bestSellers,
    recentSales: recentSales.map((s) => {
      const statusInfo = getSaleDisplayStatus(s);
      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.customerName || "Pelanggan Umum",
        cashierName: s.cashier?.name || s.cashier?.username || "Kasir",
        total: Number(s.total),
        commission: Number((s as any).commission || 0),
        commissionProofUrl: (s as any).commissionProofUrl || null,
        status: s.status,
        statusLabel: statusInfo.label,
        statusVariant: statusInfo.variant,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt.toISOString(),
        itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
        items: (s.items || []).map((it: any) => ({
          id: it.id,
          productName: it.product?.name || "Produk",
          capacity: it.product?.capacity || null,
          color: it.product?.color || null,
          imei: it.imei || it.product?.imei || null,
          qty: it.qty,
          price: Number(it.price || 0),
          isReturned: Boolean(it.isReturned),
        })),
      };
    }),
  };
}

export async function getCashierPerformanceByPeriod(month: number, year: number) {
  const user = await requireAuth();

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const salesInPeriod = await db.sale.findMany({
    where: {
      cashierId: user.id,
      status: "completed",
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      id: true,
      total: true,
      paymentMethod: true,
    },
  });

  const periodName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(startOfMonth);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  return {
    count: salesInPeriod.length,
    periodName,
    isCurrentMonth,
    cashCount: salesInPeriod.filter((s) => s.paymentMethod === "cash").length,
    nonCashCount: salesInPeriod.filter((s) => s.paymentMethod !== "cash").length,
  };
}

export async function getAdminPerformanceByPeriod(month: number, year: number) {
  await requireAuth();

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const [salesInPeriod, adminUsers] = await Promise.all([
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        id: true,
        total: true,
        cashierId: true,
        createdAt: true,
      },
    }),
    db.user.findMany({
      where: {
        role: { in: ["admin", "admin_kasir"] }, // Owner dikecualikan
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPeriodTransactions = salesInPeriod.length;
  const totalPeriodOmzet = salesInPeriod.reduce((acc, s) => acc + Number(s.total), 0);

  const salesByCashier = new Map<string, { count: number; totalOmzet: number; todayCount: number }>();
  for (const s of salesInPeriod) {
    const cid = s.cashierId;
    const current = salesByCashier.get(cid) || { count: 0, totalOmzet: 0, todayCount: 0 };
    current.count += 1;
    current.totalOmzet += Number(s.total);
    if (isCurrentMonth && s.createdAt >= startOfToday) {
      current.todayCount += 1;
    }
    salesByCashier.set(cid, current);
  }

  const adminPerformance: AdminPerformanceItem[] = adminUsers.map((admin) => {
    const stats = salesByCashier.get(admin.id) || { count: 0, totalOmzet: 0, todayCount: 0 };
    const contributionPercentage =
      totalPeriodTransactions > 0
        ? Math.round((stats.count / totalPeriodTransactions) * 100)
        : 0;

    return {
      id: admin.id,
      name: admin.name || admin.username || "Kasir",
      email: admin.email || "-",
      transactionsMonthCount: stats.count,
      omzetMonth: stats.totalOmzet,
      transactionsTodayCount: stats.todayCount,
      contributionPercentage,
    };
  });

  adminPerformance.sort((a, b) => b.transactionsMonthCount - a.transactionsMonthCount || a.name.localeCompare(b.name));

  const periodName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(startOfMonth);

  return {
    periodName,
    isCurrentMonth,
    totalPeriodTransactions,
    totalPeriodOmzet,
    adminPerformance,
  };
}

export async function getCashierMetricsByDateRange(startDate?: string, endDate?: string) {
  const user = await requireAuth();

  const where: any = {
    cashierId: user.id,
    status: "completed",
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(`${startDate}T00:00:00.000`);
    }
    if (endDate) {
      where.createdAt.lte = new Date(`${endDate}T23:59:59.999`);
    }
  }

  const sales = await db.sale.findMany({
    where,
    select: {
      id: true,
      total: true,
      commission: true,
    },
  });

  const totalIncome = sales.reduce((acc, s) => acc + Number(s.commission || 0), 0);
  const totalTransactions = sales.length;

  return {
    totalIncome,
    totalTransactions,
  };
}

export interface FinanceDashboardData {
  periodName: string;
  salesHighlight: {
    omzetMonth: number;
    salesCountMonth: number;
    omzetToday: number;
    salesCountToday: number;
    itemsSoldMonth: number;
    dailyTrend: {
      date: string;
      label: string;
      revenue: number;
      count: number;
    }[];
    paymentMethods: {
      method: string;
      label: string;
      count: number;
      total: number;
      percentage: number;
    }[];
  };
  financialHighlight: {
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    operationalExpenses: number;
    dailyExpensesTotal: number;
    monthlyExpensesTotal: number;
    netProfit: number;
    netMargin: number;
  };
  expenseHighlight: {
    todayTotal: number;
    monthTotal: number;
    recentExpenses: {
      id: string;
      date: string;
      description: string;
      amount: number;
      creatorName: string;
    }[];
  };
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  await requireAuth();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    salesMonth,
    salesToday,
    salesTrendRaw,
    dailyExpensesMonth,
    dailyExpensesToday,
    monthlyExpensesMonth,
    recentExpensesRaw,
  ] = await Promise.all([
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        items: {
          where: { isReturned: false },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
      select: { total: true },
    }),
    db.sale.findMany({
      where: {
        status: "completed",
        createdAt: { gte: fourteenDaysAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
    }),
    db.dailyExpense.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    }),
    db.dailyExpense.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
      },
      select: { amount: true },
    }),
    db.monthlyExpense.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      select: { amount: true },
    }),
    db.dailyExpense.findMany({
      take: 6,
      orderBy: { date: "desc" },
      include: {
        creator: { select: { name: true, username: true } },
      },
    }),
  ]);

  const omzetMonth = salesMonth.reduce((acc, s) => acc + Number(s.total), 0);
  const salesCountMonth = salesMonth.length;
  const omzetToday = salesToday.reduce((acc, s) => acc + Number(s.total), 0);
  const salesCountToday = salesToday.length;
  const itemsSoldMonth = salesMonth.reduce(
    (acc, s) => acc + s.items.reduce((sum, it) => sum + it.qty, 0),
    0
  );

  const pmMap: Record<string, { count: number; total: number }> = {};
  for (const s of salesMonth) {
    const pm = s.paymentMethod || "cash";
    if (!pmMap[pm]) pmMap[pm] = { count: 0, total: 0 };
    pmMap[pm].count += 1;
    pmMap[pm].total += Number(s.total);
  }
  const pmLabels: Record<string, string> = {
    cash: "Tunai (Cash)",
    transfer: "Transfer Bank",
    qris: "QRIS",
    edc: "Kartu EDC",
  };
  const paymentMethods = Object.entries(pmMap).map(([method, data]) => ({
    method,
    label: pmLabels[method] || method,
    count: data.count,
    total: data.total,
    percentage: omzetMonth > 0 ? Math.round((data.total / omzetMonth) * 100) : 0,
  }));

  const trendMap: Record<string, { revenue: number; count: number; dateStr: string }> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    trendMap[key] = { revenue: 0, count: 0, dateStr: label };
  }
  for (const s of salesTrendRaw) {
    const d = new Date(s.createdAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    if (trendMap[key]) {
      trendMap[key].revenue += Number(s.total);
      trendMap[key].count += 1;
    }
  }
  const dailyTrend = Object.entries(trendMap).map(([date, val]) => ({
    date,
    label: val.dateStr,
    revenue: val.revenue,
    count: val.count,
  }));

  let totalCogs = 0;
  for (const s of salesMonth) {
    for (const it of s.items) {
      totalCogs += Number(it.unitCost) * it.qty;
    }
  }
  const grossProfit = omzetMonth - totalCogs;
  const grossMargin = omzetMonth > 0 ? Math.round((grossProfit / omzetMonth) * 100) : 0;

  const dailyExpensesTotal = dailyExpensesMonth.reduce((acc, e) => acc + Number(e.amount), 0);
  const monthlyExpensesTotal = monthlyExpensesMonth.reduce((acc, e) => acc + Number(e.amount), 0);
  const operationalExpenses = dailyExpensesTotal + monthlyExpensesTotal;

  const netProfit = grossProfit - operationalExpenses;
  const netMargin = omzetMonth > 0 ? Math.round((netProfit / omzetMonth) * 100) : 0;

  const expenseTodayTotal = dailyExpensesToday.reduce((acc, e) => acc + Number(e.amount), 0);
  const recentExpenses = recentExpensesRaw.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    description: e.description,
    amount: Number(e.amount),
    creatorName: e.creator?.name || (e.creator as any)?.username || "User",
  }));

  const periodName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(now);

  return {
    periodName,
    salesHighlight: {
      omzetMonth,
      salesCountMonth,
      omzetToday,
      salesCountToday,
      itemsSoldMonth,
      dailyTrend,
      paymentMethods,
    },
    financialHighlight: {
      netRevenue: omzetMonth,
      cogs: totalCogs,
      grossProfit,
      grossMargin,
      operationalExpenses,
      dailyExpensesTotal,
      monthlyExpensesTotal,
      netProfit,
      netMargin,
    },
    expenseHighlight: {
      todayTotal: expenseTodayTotal,
      monthTotal: dailyExpensesTotal,
      recentExpenses,
    },
  };
}

