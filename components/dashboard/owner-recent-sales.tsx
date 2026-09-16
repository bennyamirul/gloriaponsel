"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  ArrowRight,
  Clock,
  Pencil,
  Camera,
  ImageIcon,
} from "lucide-react";
import {
  CommissionDetailDialog,
  CommissionSaleInfo,
} from "@/components/sales/commission-detail-dialog";
import {
  CommissionEditDialog,
  CommissionEditSaleInfo,
} from "@/components/sales/commission-edit-dialog";

export interface OwnerRecentSaleProductItem {
  id: string;
  productName: string;
  capacity?: string | null;
  color?: string | null;
  imei?: string | null;
  qty: number;
  price: number;
  isReturned?: boolean;
}

export interface OwnerRecentSaleItem {
  id: string;
  invoiceNo: string;
  customerName: string;
  cashierName?: string;
  total: number;
  commission?: number;
  commissionProofUrl?: string | null;
  status: string;
  statusLabel?: string;
  statusVariant?: string;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
  items?: OwnerRecentSaleProductItem[];
}
import { Table } from "@/components/ui/table";

interface OwnerRecentSalesProps {
  initialSales: OwnerRecentSaleItem[];
  isOwner?: boolean;
}

export function OwnerRecentSales({
  initialSales,
  isOwner = true,
}: OwnerRecentSalesProps) {
  const router = useRouter();
  const [sales, setSales] = useState<OwnerRecentSaleItem[]>(initialSales);

  // Modals state
  const [detailSale, setDetailSale] = useState<CommissionSaleInfo | null>(null);
  const [editSale, setEditSale] = useState<CommissionEditSaleInfo | null>(null);

  const handleCommissionSuccess = (updated: {
    id: string;
    commission: number;
    commissionProofUrl: string | null;
  }) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === updated.id
          ? {
              ...s,
              commission: updated.commission,
              commissionProofUrl: updated.commissionProofUrl,
            }
          : s
      )
    );
    router.refresh();
  };

  return (
    <>
      <Card className="shadow-xs border border-border/70 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span>Transaksi Terakhir</span>
            </h3>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <Link href="/sales/history">
                <span>Lihat Semua</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium">
                Belum ada transaksi penjualan tercatat.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/sales">Mulai Transaksi Baru</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              {/* Desktop Table View with Dual Scrollbars */}
              <div className="hidden md:block">
                <Table className="w-full text-left text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b text-xs font-semibold text-muted-foreground">
                        <th className="pb-3 w-32">No. Faktur</th>
                        <th className="pb-3 w-36">Tanggal</th>
                        <th className="pb-3 w-40">Pelanggan</th>
                        <th className="pb-3">Produk</th>
                        <th className="pb-3 text-right w-28">Total</th>
                        <th className="pb-3 text-right w-36">Komisi & Bukti</th>
                        <th className="pb-3 text-center w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 font-mono text-xs font-semibold text-foreground align-top">
                            {sale.invoiceNo}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                            <span className="font-medium text-foreground block">
                              {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {new Date(sale.createdAt).toLocaleTimeString(
                                "id-ID",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-foreground align-top">
                            <div className="font-semibold text-xs">{sale.customerName}</div>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-[10px] text-muted-foreground font-medium mt-0.5">
                              {sale.cashierName || "Kasir"}
                            </span>
                          </td>

                          {/* Kolom Produk (Rincian Produk Lengkap) */}
                          <td className="py-3 text-xs align-top">
                            <div className="space-y-1.5 max-w-[280px]">
                              {sale.items && sale.items.length > 0 ? (
                                sale.items.map((it, idx) => (
                                  <div
                                    key={it.id || idx}
                                    className="rounded-lg bg-muted/40 p-1.5 border border-border/50 text-xs"
                                  >
                                    <div className="font-semibold text-foreground leading-tight text-xs">
                                      {it.productName}
                                    </div>
                                    {(it.capacity || it.color) && (
                                      <div className="text-[11px] text-muted-foreground">
                                        {[it.capacity, it.color].filter(Boolean).join(" • ")}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                                      <span className="font-semibold text-foreground">{it.qty}x</span>
                                      {it.imei && <span>IMEI: {it.imei}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">
                                  {sale.itemCount || 0} unit
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 text-right font-semibold text-foreground whitespace-nowrap align-top">
                            {formatRupiah(sale.total)}
                          </td>

                          {/* Kolom Komisi & Bukti Gabungan */}
                          <td className="py-3 text-right whitespace-nowrap align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailSale(sale)}
                                className="text-right hover:opacity-80 transition cursor-pointer"
                                title="Klik untuk melihat detail & bukti komisi"
                              >
                                <span
                                  className={`font-mono font-bold text-xs block ${
                                    sale.commission && sale.commission > 0
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {sale.commission && sale.commission > 0
                                    ? formatRupiah(sale.commission)
                                    : "Rp 0"}
                                </span>
                                {sale.commissionProofUrl ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <Camera className="h-2.5 w-2.5" />
                                    <span>Bukti Ada</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Tanpa Bukti</span>
                                )}
                              </button>

                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditSale(sale)}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                                  title="Edit Komisi"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>

                          {/* Kolom Status (Mengikuti Siklus Transaksi di Owner) */}
                          <td className="py-3 text-center whitespace-nowrap align-top">
                            <Badge
                              variant="secondary"
                              className={
                                sale.statusVariant === "refund"
                                  ? "bg-rose-100 text-rose-800 text-[11px] font-semibold"
                                  : sale.statusVariant === "partial_refund"
                                  ? "bg-amber-100 text-amber-800 text-[11px] font-semibold"
                                  : sale.statusVariant === "exchange"
                                  ? "bg-sky-100 text-sky-800 text-[11px] font-semibold"
                                  : sale.statusVariant === "cancelled"
                                  ? "bg-slate-200 text-slate-800 text-[11px] font-semibold"
                                  : "bg-emerald-100 text-emerald-800 text-[11px] font-semibold"
                              }
                            >
                              {sale.statusLabel ||
                                (sale.status === "completed"
                                  ? "Selesai"
                                  : "Batal")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {sale.invoiceNo}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          sale.statusVariant === "refund"
                            ? "bg-rose-100 text-rose-800 text-[10px] font-semibold"
                            : sale.statusVariant === "partial_refund"
                            ? "bg-amber-100 text-amber-800 text-[10px] font-semibold"
                            : sale.statusVariant === "exchange"
                            ? "bg-sky-100 text-sky-800 text-[10px] font-semibold"
                            : sale.statusVariant === "cancelled"
                            ? "bg-slate-200 text-slate-800 text-[10px] font-semibold"
                            : "bg-emerald-100 text-emerald-800 text-[10px] font-semibold"
                        }
                      >
                        {sale.statusLabel ||
                          (sale.status === "completed" ? "Selesai" : "Batal")}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sale.customerName}</span>
                      <span className="font-medium text-foreground">
                        {sale.cashierName || "Kasir"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                      <span className="text-muted-foreground">
                        Total ({sale.itemCount} unit):
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {formatRupiah(sale.total)}
                      </span>
                    </div>

                    {/* Komisi di Mobile Card */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="text-muted-foreground">Komisi:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailSale(sale)}
                          className="font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          {sale.commission && sale.commission > 0
                            ? formatRupiah(sale.commission)
                            : "Rp 0"}
                        </button>
                        {isOwner && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditSale(sale)}
                            className="h-6 w-6 p-0 rounded-md text-muted-foreground hover:text-emerald-600"
                            title="Edit Komisi"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Komisi & Bukti Foto */}
      <CommissionDetailDialog
        open={Boolean(detailSale)}
        onOpenChange={(open) => !open && setDetailSale(null)}
        sale={detailSale}
        isOwner={isOwner}
        onEditCommission={(s) => {
          setDetailSale(null);
          setEditSale(s);
        }}
      />

      {/* Modal Edit Komisi & Unggah Bukti */}
      <CommissionEditDialog
        open={Boolean(editSale)}
        onOpenChange={(open) => !open && setEditSale(null)}
        sale={editSale}
        onSuccess={handleCommissionSuccess}
      />
    </>
  );
}
