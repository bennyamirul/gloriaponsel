"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Printer,
  ArrowRight,
  ArrowDownToLine,
  CalendarPlus,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  ShoppingBag,
  Smartphone,
  Plus,
} from "lucide-react";

export interface WarehouseRecentUnit {
  id: string;
  sku: string;
  imei?: string | null;
  name: string;
  productType?: string;
  capacity?: string | null;
  color?: string | null;
  status: string;
  categoryName: string;
  brandName: string;
  createdAt: string;
  entryDate?: string;
}

export interface WarehouseDashboardData {
  unitsInToday: number;
  unitsInMonth: number;
  unitsOutToday: number;
  unitsOutMonth: number;
  unitsReady: number;
  unitsSold: number;
  recentUnits: WarehouseRecentUnit[];
}

export interface WarehouseDashboardProps {
  user: {
    id: string;
    name: string;
    username?: string | null;
    role: string;
  };
  todayDateStr: string;
  data: WarehouseDashboardData;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function renderStatusBadge(status: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "available" || normalized === "ready") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-[11px]"
      >
        Ready
      </Badge>
    );
  }
  if (normalized === "sold" || normalized === "terjual") {
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-100 text-slate-700 font-medium text-[11px]"
      >
        Terjual
      </Badge>
    );
  }
  if (normalized === "retur") {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-700 font-medium text-[11px]"
      >
        Retur
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px]">
      {status}
    </Badge>
  );
}

export function WarehouseDashboard({
  user,
  todayDateStr,
  data,
}: WarehouseDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header Halaman Gudang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Dashboard Gudang & Logistik
            </h1>
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-800 text-[11px] font-bold"
            >
              Staff Gudang
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {todayDateStr} • Selamat bertugas,{" "}
            <span className="font-semibold text-foreground">
              {user.name || user.username || "Staff Gudang"}
            </span>
          </p>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          {/*<Button asChild size="sm" variant="outline" className="text-xs gap-1.5 h-9">
            <Link href="/products">
              <Package className="h-4 w-4 text-indigo-600" />
              <span>Data Unit Produk</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              <span>Tambah Unit</span>
            </Link>
          </Button>*/}
          {/*<Button
            asChild
            size="sm"
            className="text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
          >
            <Link href="/products/barcode">
              <Printer className="h-4 w-4" />
              <span>Cetak Barcode Label</span>
            </Link>
          </Button>*/}
        </div>
      </div>

      {/* 6 Kartu KPI Siklus Unit Gudang */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Unit Masuk Hari Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Masuk Hari Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <ArrowDownToLine className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {data.unitsInToday}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Penerimaan fisik hari ini
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Unit Masuk Bulan Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Masuk Bulan Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <CalendarPlus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {data.unitsInMonth}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total masuk bulan berjalan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Unit Keluar Hari Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Keluar Hari Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {data.unitsOutToday}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Keluar / terjual hari ini
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Unit Keluar Bulan Ini */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Keluar Bulan Ini
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {data.unitsOutMonth}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total keluar bulan berjalan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Unit Ready */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Ready
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-emerald-600">
                {data.unitsReady}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Fisik unit siap dipasarkan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Unit Terjual */}
        <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Unit Terjual
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {data.unitsSold}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Akumulasi unit telah laku
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Daftar Unit Terbaru di Gudang (Pengganti Tabel Peringatan Stok) */}
      <Card className="border border-border/70 bg-card shadow-xs rounded-xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-indigo-600" />
                <span>Daftar Unit Terbaru di Gudang</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unit fisik yang baru didaftarkan atau diperbarui di gudang
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
            >
              <Link href="/products">
                <span>Kelola Semua Unit</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {data.recentUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Smartphone className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-foreground">
                Belum ada data unit di gudang
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Daftarkan unit pertama untuk mulai pelacakan IMEI dan cetak barcode.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link href="/products/new">Tambah Unit Baru</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="pb-3 pr-4">Nama & Varian Unit</th>
                    <th className="pb-3 px-4">Nomor IMEI / SKU</th>
                    <th className="pb-3 px-4">Kategori & Brand</th>
                    <th className="pb-3 px-4 text-center">Tanggal Masuk</th>
                    <th className="pb-3 px-4 text-center">Status Unit</th>
                    <th className="pb-3 pl-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentUnits.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-foreground">
                          {item.name}
                        </div>
                        {(item.capacity || item.color) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {[item.capacity, item.color].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.imei ? (
                          <div>
                            <span className="font-mono font-medium text-foreground">
                              {item.imei}
                            </span>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono text-foreground">{item.sku}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div>{item.categoryName}</div>
                        <div className="text-[11px] text-muted-foreground/80">
                          {item.brandName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground whitespace-nowrap">
                        {formatDate(item.entryDate || item.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                        >
                          <Link
                            href={`/products/barcode?search=${encodeURIComponent(
                              item.imei || item.sku
                            )}`}
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Cetak Barcode
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
