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
  const isSuperAdmin = user.role === "super_admin";

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
        role: "admin", // Hanya admin kasir, owner (super_admin) tidak memiliki card
        isActive: true,
      },
      select: {
        id: true,
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
      name: admin.name,
      email: admin.email,
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

  // 3. 5 Transaksi Terbaru (Global)
  const recentSales = await db.sale.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  });

  // 4. Data Khusus Admin Kasir (jika user yang login adalah kasir)
  const cashierSalesToday = salesToday.filter((s) => s.cashierId === user.id);
  const cashierTodayCount = cashierSalesToday.length;
  const cashierTodayCashCount = cashierSalesToday.filter((s) => s.paymentMethod === "cash").length;
  const cashierTodayNonCashCount = cashierSalesToday.filter((s) => s.paymentMethod !== "cash").length;

  const cashierSalesThisMonth = salesThisMonth.filter((s) => s.cashierId === user.id);
  const cashierMonthCount = cashierSalesThisMonth.length;
  const cashierMonthCashCount = cashierSalesThisMonth.filter((s) => s.paymentMethod === "cash").length;
  const cashierMonthNonCashCount = cashierSalesThisMonth.filter((s) => s.paymentMethod !== "cash").length;

  const cashierRecentSalesRaw = isSuperAdmin
    ? recentSales.slice(0, 5)
    : await db.sale.findMany({
        where: { cashierId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
          items: true,
        },
      });

  const cashierRecentSales = cashierRecentSalesRaw.map((s) => ({
    id: s.id,
    invoiceNo: s.invoiceNo,
    customerName: s.customer?.name || "Pelanggan Umum",
    total: Number(s.total),
    status: s.status,
    paymentMethod: s.paymentMethod,
    createdAt: s.createdAt.toISOString(),
    itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
  }));

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
      recentSales: cashierRecentSales,
    },
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerName: s.customer?.name || "Pelanggan Umum",
      total: Number(s.total),
      status: s.status,
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt.toISOString(),
      itemCount: s.items.reduce((acc, it) => acc + it.qty, 0),
    })),
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
        role: "admin", // Owner (super_admin) dikecualikan
        isActive: true,
      },
      select: {
        id: true,
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
      name: admin.name,
      email: admin.email,
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
