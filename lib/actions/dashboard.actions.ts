"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function getDashboardSummary() {
  const user = await requireAuth();
  const isSuperAdmin = user.role === "super_admin";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const endOfYesterday = new Date(startOfToday.getTime() - 1);

  // 1. Ambil transaksi hari ini & kemarin
  const [salesToday, salesYesterday, lowStockCount, totalActiveProducts] = await Promise.all([
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
  ]);

  const omzetToday = salesToday.reduce((acc, s) => acc + Number(s.total), 0);
  const omzetYesterday = salesYesterday.reduce((acc, s) => acc + Number(s.total), 0);
  const transactionsTodayCount = salesToday.length;

  // Hitung persentase omzet vs kemarin
  let revenueChangePercentage = 0;
  if (omzetYesterday > 0) {
    revenueChangePercentage = Math.round(((omzetToday - omzetYesterday) / omzetYesterday) * 100);
  } else if (omzetToday > 0) {
    revenueChangePercentage = 100;
  }

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

  // 3. 5 Transaksi Terbaru
  const recentSales = await db.sale.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  });

  // 4. 5 Produk Terlaris
  const topProductsRaw = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { status: "completed" },
    },
    _sum: { qty: true },
    orderBy: {
      _sum: { qty: "desc" },
    },
    take: 5,
  });

  const topProductIds = topProductsRaw.map((p) => p.productId);
  const productsInfo = await db.product.findMany({
    where: { id: { in: topProductIds } },
    include: { brand: { select: { name: true } } },
  });

  const topProducts = topProductsRaw.map((item) => {
    const prod = productsInfo.find((p) => p.id === item.productId);
    return {
      id: item.productId,
      name: prod?.name || "Produk",
      brand: prod?.brand.name || "-",
      soldCount: item._sum.qty || 0,
    };
  });

  return {
    isSuperAdmin,
    omzetToday,
    revenueChangePercentage,
    transactionsTodayCount,
    lowStockCount,
    totalActiveProducts,
    profitToday,
    marginPercentage,
    salesChart: last7Days,
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
    topProducts,
  };
}
