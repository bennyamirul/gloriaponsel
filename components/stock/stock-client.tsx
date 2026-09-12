"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  Search,
  Truck,
  AlertTriangle,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createStockAdjustment,
  getProductStockCard,
} from "@/lib/actions/stock.actions";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  variant: string | null;
  stock: number;
  minStock: number;
  purchasePrice: number | null;
  brandName: string;
  categoryName: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface StockMovementItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productVariant: string | null;
  type: "in" | "out" | "adjustment";
  quantity: number;
  referenceType: string;
  referenceId: string | null;
  note: string | null;
  creatorName: string;
  createdAt: string;
}

interface StockClientProps {
  products: ProductOption[];
  suppliers: SupplierOption[];
  initialMovements: StockMovementItem[];
  lowStockProducts: any[];
}

export function StockClient({
  products,
  suppliers,
  initialMovements,
  lowStockProducts,
}: StockClientProps) {
  const [activeTab, setActiveTab] = useState<"history" | "card" | "low_stock">("history");
  const [movements, setMovements] = useState<StockMovementItem[]>(initialMovements);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Dialog state for Adjustment (Opname)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Adjustment Form State
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || "");
  const [adjType, setAdjType] = useState<"increase" | "decrease" | "set">("increase");
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjNote, setAdjNote] = useState("");

  // Stock Card State
  const [selectedCardProductId, setSelectedCardProductId] = useState<string>(products[0]?.id || "");
  const [stockCardData, setStockCardData] = useState<any | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  // Load stock card for a specific product
  const handleLoadStockCard = async (prodId: string) => {
    setSelectedCardProductId(prodId);
    setIsLoadingCard(true);
    try {
      const res = await getProductStockCard(prodId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setStockCardData(res);
      }
    } catch {
      toast.error("Gagal memuat kartu stok.");
    } finally {
      setIsLoadingCard(false);
    }
  };

  // Submit Stock Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjNote.trim() || adjNote.trim().length < 5) {
      toast.error("Alasan penyesuaian stok wajib diisi (minimal 5 karakter).");
      return;
    }
    if (adjQty < 0) {
      toast.error("Jumlah tidak boleh negatif.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createStockAdjustment({
        productId: adjProductId,
        type: adjType,
        quantity: adjQty,
        note: adjNote,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Penyesuaian stok berhasil disimpan!");
        setIsAdjustmentOpen(false);
        window.location.reload();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      m.productSku.toLowerCase().includes(search.toLowerCase()) ||
      (m.note && m.note.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === "all" || m.type === selectedType;

    return matchesSearch && matchesType;
  });

  const getMovementBadge = (type: string, qty: number) => {
    if (type === "in") {
      return (
        <Badge variant="success" className="gap-1 font-semibold">
          <ArrowDownLeft className="h-3 w-3" />
          <span>Masuk (+{qty})</span>
        </Badge>
      );
    }
    if (type === "out") {
      return (
        <Badge variant="danger" className="gap-1 font-semibold">
          <ArrowUpRight className="h-3 w-3" />
          <span>Keluar ({qty})</span>
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="gap-1 font-semibold">
        <SlidersHorizontal className="h-3 w-3" />
        <span>Opname ({qty > 0 ? `+${qty}` : qty})</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Mutasi Stok
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAdjustmentOpen(true)}
            variant="outline"
            className="rounded-xl font-semibold gap-1.5 text-xs h-9"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Koreksi / Opname</span>
          </Button>

          <Link href="/products">
            <Button
              className="bg-primary text-primary-foreground font-semibold rounded-xl gap-1.5 text-xs h-9 shadow-md shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Input Produk & Stok Masuk</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-muted/70 rounded-2xl border border-border w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "history"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Riwayat Mutasi Stok</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("card");
            if (!stockCardData && products[0]) {
              handleLoadStockCard(products[0].id);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "card"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Kartu Stok (Saldo Berjalan)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("low_stock")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "low_stock"
              ? "bg-white text-amber-700 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>Stok Menipis ({lowStockProducts.length})</span>
        </button>
      </div>

      {/* TAB 1: RIWAYAT MUTASI STOK */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari nama produk, SKU, atau alasan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm h-9"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Semua Jenis Mutasi</option>
                  <option value="in">Stok Masuk (In)</option>
                  <option value="out">Stok Keluar (Out)</option>
                  <option value="adjustment">Penyesuaian (Opname)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Jenis Mutasi</TableHead>
                  <TableHead>Keterangan / Alasan</TableHead>
                  <TableHead>Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Belum ada pergerakan stok tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-foreground text-sm leading-tight">
                          {m.productName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          <code>{m.productSku}</code>
                          {m.productVariant && <span>• {m.productVariant}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getMovementBadge(m.type, m.quantity)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground max-w-xs">
                        {m.note || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.creatorName}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredMovements.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada pergerakan stok.
                </CardContent>
              </Card>
            ) : (
              filteredMovements.map((m) => (
                <Card key={m.id} className="border-border shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">
                        {m.productName}
                      </h4>
                      <code className="text-[10px] text-muted-foreground">
                        {m.productSku}
                      </code>
                    </div>
                    {getMovementBadge(m.type, m.quantity)}
                  </div>

                  <p className="text-xs text-slate-700 bg-muted/40 p-2 rounded-lg">
                    {m.note || "Tidak ada catatan"}
                  </p>

                  <div className="pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
                    <span>Oleh: {m.creatorName}</span>
                    <span>
                      {new Date(m.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KARTU STOK SALDO BERJALAN */}
      {activeTab === "card" && (
        <div className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
              <label className="text-xs font-semibold text-foreground whitespace-nowrap">
                Pilih Produk:
              </label>
              <select
                value={selectedCardProductId}
                onChange={(e) => handleLoadStockCard(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stok Sekarang: {p.stock}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {isLoadingCard ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Memuat data kartu stok...
            </div>
          ) : stockCardData ? (
            <div className="space-y-4">
              {/* Product Stock Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-4 bg-card border border-border shadow-xs rounded-xl">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Produk</span>
                  <p className="font-bold text-foreground text-sm mt-1">
                    {stockCardData.product.name}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {stockCardData.product.brandName} • {stockCardData.product.sku}
                  </span>
                </Card>

                <Card className="p-4 bg-card border border-border shadow-xs rounded-xl">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stok Fisik Saat Ini</span>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stockCardData.product.currentStock} <span className="text-sm font-normal text-muted-foreground">Unit</span>
                  </p>
                </Card>

                <Card className="p-4 bg-card border border-border shadow-xs rounded-xl">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ambang Batas Minimum</span>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stockCardData.product.minStock} <span className="text-sm font-normal text-muted-foreground">Unit</span>
                  </p>
                </Card>
              </div>

              {/* Running Balance Table */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Keterangan Transaksi</TableHead>
                      <TableHead>Petugas</TableHead>
                      <TableHead className="text-center text-emerald-700">Masuk (+)</TableHead>
                      <TableHead className="text-center text-rose-700">Keluar (-)</TableHead>
                      <TableHead className="text-right font-bold text-foreground">Saldo Akhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCardData.history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          Belum ada histori pergerakan stok untuk produk ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockCardData.history.map((row: any) => (
                        <TableRow key={row.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(row.date).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell className="text-xs text-foreground max-w-sm">
                            {row.note}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.creatorName}
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-700">
                            {row.inQty > 0 ? `+${row.inQty}` : "—"}
                          </TableCell>
                          <TableCell className="text-center font-bold text-rose-700">
                            {row.outQty > 0 ? `-${row.outQty}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-indigo-700">
                            {row.balance} Unit
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: LOW STOCK PRODUCTS ALERT */}
      {activeTab === "low_stock" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm">Peringatan Kebutuhan Restock</p>
              <p className="text-amber-800">
                Produk di bawah ini memiliki jumlah stok fisik yang sudah mencapai atau di bawah batas minimum (low stock). Segera hubungi supplier untuk pengadaan barang.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Brand & Kategori</TableHead>
                  <TableHead className="text-center">Stok Saat Ini</TableHead>
                  <TableHead className="text-center">Batas Min</TableHead>
                  <TableHead className="text-right">Aksi Cepat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-xs font-medium">Semua stok produk dalam kondisi aman</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-bold text-foreground text-sm">{p.name}</p>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {p.sku} {p.variant ? `• ${p.variant}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.brandName} • {p.categoryName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.stock <= 0 ? "danger" : "warning"}>
                          {p.stock <= 0 ? "Habis (0)" : `${p.stock} Unit`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                        {p.minStock} Unit
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/products">
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground text-xs h-8 rounded-lg font-semibold"
                          >
                            Tambah Stok
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}



      {/* DIALOG: PENYESUAIAN STOK (OPNAME) */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Penyesuaian Stok Opname
            </DialogTitle>
            <DialogDescription>
              Koreksi selisih jumlah barang fisik dengan alasan yang dapat dipertanggungjawabkan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Produk *</label>
              <select
                value={adjProductId}
                onChange={(e) => setAdjProductId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stok saat ini: {p.stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Jenis Penyesuaian *</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs"
                >
                  <option value="increase">Tambah Stok (+)</option>
                  <option value="decrease">Kurangi Stok (-)</option>
                  <option value="set">Atur Stok Baru (=)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Jumlah Unit *</label>
                <Input
                  type="number"
                  min={1}
                  value={adjQty}
                  onChange={(e) => setAdjQty(Number(e.target.value) || 1)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Alasan Penyesuaian (Wajib diisi) *
              </label>
              <textarea
                placeholder="Contoh: Barang rusak saat display, salah hitung penerimaan, dll..."
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustmentOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                {isLoading ? "Menyimpan..." : "Simpan Penyesuaian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
