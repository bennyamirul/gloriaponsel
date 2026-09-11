"use client";

import { useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  UserCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createSale } from "@/lib/actions/sale.actions";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  variant: string | null;
  brandName: string;
  categoryName: string;
  sellingPrice: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface CartItem {
  product: ProductOption;
  qty: number;
}

interface SalesPosClientProps {
  products: ProductOption[];
  customers: CustomerOption[];
  onSaleCreated?: (invoiceNo: string) => void;
}

export function SalesPosClient({ products, customers, onSaleCreated }: SalesPosClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "edc" | "qris">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.variant && p.variant.toLowerCase().includes(search.toLowerCase()));

    const matchesCat =
      selectedCategory === "all" || p.categoryName === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(products.map((p) => p.categoryName)));

  // Add to cart with stock check
  const handleAddToCart = (product: ProductOption) => {
    if (product.stock <= 0) {
      toast.error(`Stok "${product.name}" habis!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          toast.warning(`Jumlah melebihi stok fisik (${product.stock} unit).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (newQty > item.product.stock) {
            toast.warning(`Stok maksimum tercapai (${item.product.stock} unit).`);
            return { ...item, qty: item.product.stock };
          }
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Kosongkan seluruh keranjang?")) {
      setCart([]);
      setDiscount(0);
    }
  };

  // Calculations
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.sellingPrice * item.qty,
    0
  );
  const total = Math.max(0, subtotal - discount);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja masih kosong.");
      return;
    }

    if (discount > subtotal) {
      toast.error("Diskon tidak boleh melebihi subtotal.");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customerId: selectedCustomerId || null,
        paymentMethod,
        discount,
        items: cart.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          unitPrice: item.product.sellingPrice,
        })),
      };

      const res = await createSale(payload);
      if (res.error) {
        toast.error(res.error);
      } else if (res.success && res.invoiceNo) {
        toast.success(`Transaksi berhasil disimpan! Faktur: ${res.invoiceNo}`);
        setCart([]);
        setDiscount(0);
        setSelectedCustomerId("");
        setIsMobileCartOpen(false);

        if (onSaleCreated) {
          onSaleCreated(res.invoiceNo);
        } else {
          window.location.reload();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memproses transaksi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentOptions = [
    { value: "cash", label: "Tunai", icon: Banknote },
    { value: "transfer", label: "Transfer", icon: CreditCard },
    { value: "edc", label: "Debit / EDC", icon: CreditCard },
    { value: "qris", label: "QRIS", icon: QrCode },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20 lg:pb-0">
      {/* LEFT COLUMN: Product Catalog (7 Cols on desktop) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Category Tabs */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari handphone, aksesoris, atau scan SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-sm h-10"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground text-sm">
              Tidak ada produk yang cocok dengan pencarian.
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const inCartItem = cart.find((i) => i.product.id === prod.id);
              const isOutOfStock = prod.stock <= 0;

              return (
                <Card
                  key={prod.id}
                  className={`border-border shadow-sm transition hover:shadow-md flex flex-col justify-between p-3.5 ${
                    isOutOfStock ? "opacity-60 bg-muted/30" : "bg-card"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Thumbnail & Tags */}
                    <div className="flex items-start gap-2.5">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-border overflow-hidden">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Smartphone className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-indigo-600 block truncate">
                          {prod.brandName}
                        </span>
                        <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                          {prod.name}
                        </h4>
                        {prod.variant && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {prod.variant}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Stock info */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatRupiah(prod.sellingPrice)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          prod.stock <= 0
                            ? "bg-rose-100 text-rose-700"
                            : prod.stock <= prod.minStock
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        Stok: {prod.stock}
                      </span>
                    </div>
                  </div>

                  {/* Add / Qty Control Button */}
                  <div className="mt-3 pt-2">
                    {inCartItem ? (
                      <div className="flex items-center justify-between bg-indigo-50 rounded-xl p-1 text-indigo-700">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(prod.id, inCartItem.qty - 1)}
                          className="h-7 w-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-indigo-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold px-2">
                          {inCartItem.qty} di keranjang
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(prod.id, inCartItem.qty + 1)}
                          className="h-7 w-7 rounded-lg bg-indigo-600 text-white shadow-sm flex items-center justify-center hover:bg-indigo-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(prod)}
                        className="w-full h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs"
                      >
                        {isOutOfStock ? "Stok Habis" : "+ Keranjang"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout (5 Cols on desktop - Hidden on mobile, opens via Drawer) */}
      <div className="hidden lg:block lg:col-span-5 sticky top-20">
        <Card className="border-border shadow-lg rounded-3xl overflow-hidden bg-card">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Keranjang Kasir</h3>
                <span className="text-xs text-slate-400">
                  {totalItemsCount} item barang
                </span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <CardContent className="p-5 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* Customer Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Pilih Pelanggan (Opsional)</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pelanggan Umum (Tanpa Data)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <ShoppingCart className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">
                    Belum ada barang di keranjang belanja.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pilih produk dari daftar di sisi kiri untuk menambahkan.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h5 className="font-bold text-foreground truncate">
                        {item.product.name}
                      </h5>
                      <span className="text-[10px] text-muted-foreground block">
                        {formatRupiah(item.product.sellingPrice)} / unit
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, item.qty - 1)}
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-bold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, item.qty + 1)}
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-extrabold text-foreground w-20 text-right">
                        {formatRupiah(item.product.sellingPrice * item.qty)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-muted-foreground hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Payment */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border">
                {/* Diskon */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-muted-foreground">Diskon (Rp)</span>
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={discount === 0 ? "" : discount}
                    placeholder="0"
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-32 h-8 text-right text-xs rounded-lg"
                  />
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>

                {/* Total Final */}
                <div className="flex items-center justify-between text-base font-extrabold text-foreground pt-2 border-t border-border">
                  <span>Total Tagihan</span>
                  <span className="text-indigo-600 text-lg">
                    {formatRupiah(total)}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-foreground">
                    Metode Pembayaran *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = paymentMethod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCheckout}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/25 mt-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses Transaksi...
                    </>
                  ) : (
                    `Simpan Transaksi • ${formatRupiah(total)}`
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MOBILE FLOATING CART BAR (<1024px) */}
      <div className="fixed bottom-16 inset-x-0 z-30 p-3 bg-card/95 backdrop-blur-md border-t border-border lg:hidden flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShoppingCart className="h-5 w-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-500 text-[11px] font-bold text-white flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Total ({totalItemsCount} item)
            </span>
            <span className="text-sm font-extrabold text-foreground">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        <Button
          type="button"
          disabled={cart.length === 0}
          onClick={() => setIsMobileCartOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-10 px-4 gap-1.5"
        >
          <span>Buka Keranjang</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* MOBILE CART SHEET DRAWER */}
      <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl p-6 overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border text-left flex flex-row items-center justify-between">
            <SheetTitle className="text-base font-bold">
              Keranjang Transaksi ({totalItemsCount} item)
            </SheetTitle>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-500 font-medium"
              >
                Reset
              </button>
            )}
          </SheetHeader>

          <div className="space-y-4 pt-4">
            {/* Customer Select Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Pilih Pelanggan
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
              >
                <option value="">Pelanggan Umum</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="font-bold text-foreground truncate">
                      {item.product.name}
                    </h5>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRupiah(item.product.sellingPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, item.qty - 1)}
                        className="h-6 w-6 rounded flex items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, item.qty + 1)}
                        className="h-6 w-6 rounded flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="font-bold text-foreground w-16 text-right">
                      {formatRupiah(item.product.sellingPrice * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2 pt-2 border-t border-border text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Diskon (Rp)</span>
                <Input
                  type="number"
                  min={0}
                  value={discount === 0 ? "" : discount}
                  placeholder="0"
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-28 h-8 text-right text-xs"
                />
              </div>

              <div className="flex justify-between font-extrabold text-sm text-foreground pt-2 border-t border-border">
                <span>Total Tagihan</span>
                <span className="text-indigo-600 font-extrabold">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`p-2 rounded-xl border text-xs font-semibold text-center ${
                      paymentMethod === opt.value
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="button"
              disabled={isProcessing || cart.length === 0}
              onClick={handleCheckout}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-sm mt-2"
            >
              {isProcessing ? "Memproses..." : `Selesaikan Transaksi (${formatRupiah(total)})`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
