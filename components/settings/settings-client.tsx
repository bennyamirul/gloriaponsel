"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Store,
  Phone,
  MapPin,
  Image as ImageIcon,
  Receipt,
  Boxes,
  Save,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateStoreSettings } from "@/lib/actions/setting.actions";

interface StoreSettingData {
  id: string;
  storeName: string;
  phone: string;
  address: string;
  logoUrl: string;
  receiptFooter: string;
  defaultMinStock: number;
  updatedAt: string;
}

export function SettingsClient({ initialSettings }: { initialSettings: StoreSettingData }) {
  const [storeName, setStoreName] = useState(initialSettings.storeName);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [address, setAddress] = useState(initialSettings.address);
  const [receiptFooter, setReceiptFooter] = useState(initialSettings.receiptFooter);
  const [defaultMinStock, setDefaultMinStock] = useState(initialSettings.defaultMinStock);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(initialSettings.logoUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error("Nama toko wajib diisi.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("storeName", storeName);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("receiptFooter", receiptFooter);
      formData.append("defaultMinStock", defaultMinStock.toString());
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await updateStoreSettings(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Pengaturan profil toko berhasil diperbarui!");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header & Save Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Pengaturan Profil Toko & Struk</h3>
          <p className="text-xs text-muted-foreground">
            Kelola identitas resmi toko, format struk kasir termal, dan ambang batas stok minimum.
          </p>
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Profil Toko */}
          <Card className="shadow-sm border border-border">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Store className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-foreground">Identitas Resmi Toko</h4>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Nama Toko</label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="mis. Toko Handphone Sejahtera"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Nomor Telepon / WhatsApp
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="mis. 0812-3456-7890"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Logo Toko (Opsional)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="mt-1 text-xs file:text-xs file:font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Alamat Toko</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap lokasi toko fisik..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Format Struk Kasir */}
          <Card className="shadow-sm border border-border">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Receipt className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-foreground">Catatan Footer Struk Pembelian</h4>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  Pesan Footer Struk (Muncul di Bagian Bawah Struk Kasir)
                </label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={3}
                  placeholder="mis. Terima kasih atas kunjungan Anda! Barang yang sudah dibeli tidak dapat ditukar..."
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pesan ini akan dicetak otomatis di struk kasir fisik 58mm / 80mm setelah transaksi selesai.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Konfigurasi Stok Global */}
          <Card className="shadow-sm border border-border">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Boxes className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-foreground">Konfigurasi Stok Minimum Global</h4>
              </div>

              <div className="max-w-xs">
                <label className="text-xs font-semibold text-foreground">
                  Default Batas Minimum Stok (Min Stock)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ambang batas awal otomatis untuk memicu peringatan <em>Low Stock Alert</em> saat mendaftarkan produk baru.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Real-time Receipt Live Preview */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border border-border sticky top-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-foreground">Pratinjau Struk Kasir</h4>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  58mm
                </Badge>
              </div>

              {/* Thermal Paper Simulation Container */}
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 font-mono text-[11px] text-slate-800 shadow-inner">
                {/* Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                  {logoPreview && (
                    <div className="flex justify-center mb-1.5">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-8 max-w-[120px] object-contain"
                      />
                    </div>
                  )}
                  <p className="font-bold text-xs uppercase">{storeName || "NAMA TOKO"}</p>
                  <p className="text-[10px] text-slate-600">{address || "Alamat Toko"}</p>
                  <p className="text-[10px] text-slate-600">Telp: {phone || "-"}</p>
                </div>

                {/* Simulated Meta */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Faktur: INV-20260911-0001</span>
                    <span>Kasir: Staff</span>
                  </div>
                  <p>11/09/2026 14:30 WIB</p>
                </div>

                {/* Simulated Items */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">Samsung Galaxy A55</p>
                      <p className="text-[10px] text-slate-500">1 x Rp 5.999.000</p>
                    </div>
                    <span className="font-semibold">Rp 5.999.000</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">Adaptor 20W Fast Charge</p>
                      <p className="text-[10px] text-slate-500">1 x Rp 199.000</p>
                    </div>
                    <span className="font-semibold">Rp 199.000</span>
                  </div>
                </div>

                {/* Simulated Total */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5">
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL</span>
                    <span>Rp 6.198.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Tunai</span>
                    <span>Rp 6.200.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Kembali</span>
                    <span>Rp 2.000</span>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="pt-3 text-center space-y-1">
                  <p className="whitespace-pre-line text-[10px] text-slate-600 leading-tight">
                    {receiptFooter || "Terima kasih atas kunjungan Anda!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
