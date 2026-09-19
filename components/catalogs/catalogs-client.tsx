"use client";

import { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Tag,
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  CheckCircle2,
  XCircle,
  ScanBarcode,
  Boxes,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CatalogItem,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  toggleCatalogStatus,
} from "@/lib/actions/catalog.actions";

interface CatalogsClientProps {
  initialCatalogs: CatalogItem[];
  currentUserRole?: string;
}

export function CatalogsClient({ initialCatalogs, currentUserRole }: CatalogsClientProps) {
  const isOwner = currentUserRole === "owner" || currentUserRole === "super_admin";
  const [catalogs, setCatalogs] = useState<CatalogItem[]>(initialCatalogs);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogItem | null>(null);
  const [deletingCatalog, setDeletingCatalog] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formHasImei, setFormHasImei] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const filteredCatalogs = catalogs.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchDesc = c.description ? c.description.toLowerCase().includes(q) : false;
      return matchName || matchCode || matchDesc;
    }
    return true;
  });

  const imeiCount = catalogs.filter((c) => c.hasImei).length;
  const nonImeiCount = catalogs.filter((c) => !c.hasImei).length;
  const activeCount = catalogs.filter((c) => c.isActive).length;

  const handleOpenAdd = () => {
    setFormName("");
    setFormCode("");
    setFormHasImei(true);
    setFormDisplayOrder(catalogs.length + 1);
    setFormDescription("");
    setFormIsActive(true);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (c: CatalogItem) => {
    setEditingCatalog(c);
    setFormName(c.name);
    setFormCode(c.code);
    setFormHasImei(c.hasImei);
    setFormDisplayOrder(c.displayOrder);
    setFormDescription(c.description || "");
    setFormIsActive(c.isActive);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCatalog) {
      // Otomatis buat slug code
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setFormCode(generated);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nama kategori katalog wajib diisi.");
      return;
    }
    if (!formCode.trim()) {
      toast.error("Kode unik wajib diisi.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await createCatalog({
        name: formName.trim(),
        code: formCode.trim().toLowerCase(),
        hasImei: formHasImei,
        displayOrder: Number(formDisplayOrder) || 0,
        description: formDescription.trim() || null,
        isActive: formIsActive,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setCatalogs((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            name: formName.trim(),
            code: formCode.trim().toLowerCase(),
            hasImei: formHasImei,
            displayOrder: Number(formDisplayOrder) || 0,
            description: formDescription.trim() || null,
            isActive: formIsActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ].sort((a, b) => a.displayOrder - b.displayOrder));
        setIsAddOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan katalog kategori.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatalog) return;
    if (!formName.trim()) {
      toast.error("Nama kategori katalog wajib diisi.");
      return;
    }
    if (!formCode.trim()) {
      toast.error("Kode unik wajib diisi.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await updateCatalog(editingCatalog.id, {
        name: formName.trim(),
        code: formCode.trim().toLowerCase(),
        hasImei: formHasImei,
        displayOrder: Number(formDisplayOrder) || 0,
        description: formDescription.trim() || null,
        isActive: formIsActive,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setCatalogs((prev) =>
          prev
            .map((c) =>
              c.id === editingCatalog.id
                ? {
                    ...c,
                    name: formName.trim(),
                    code: formCode.trim().toLowerCase(),
                    hasImei: formHasImei,
                    displayOrder: Number(formDisplayOrder) || 0,
                    description: formDescription.trim() || null,
                    isActive: formIsActive,
                  }
                : c
            )
            .sort((a, b) => a.displayOrder - b.displayOrder)
        );
        setEditingCatalog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui katalog kategori.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (item: CatalogItem) => {
    try {
      const res = await toggleCatalogStatus(item.id, item.isActive);
      if (res.success) {
        toast.success(`Status ${item.name} berhasil diubah.`);
        setCatalogs((prev) =>
          prev.map((c) =>
            c.id === item.id ? { ...c, isActive: res.newStatus! } : c
          )
        );
      } else {
        toast.error(res.error || "Gagal mengubah status.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah status.");
    }
  };

  const handleDelete = async () => {
    if (!deletingCatalog) return;
    try {
      setIsLoading(true);
      const res = await deleteCatalog(deletingCatalog.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setCatalogs((prev) => prev.filter((c) => c.id !== deletingCatalog.id));
        setDeletingCatalog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus kategori.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes("phone") || c.includes("hp")) {
      return <Smartphone className="h-4 w-4 text-primary" />;
    }
    if (c.includes("tablet") || c.includes("pad")) {
      return <Tablet className="h-4 w-4 text-indigo-500" />;
    }
    if (c.includes("watch")) {
      return <Watch className="h-4 w-4 text-emerald-500" />;
    }
    if (c.includes("accessory") || c.includes("aksesoris")) {
      return <Headphones className="h-4 w-4 text-amber-500" />;
    }
    return <Tag className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Master Katalog & Kategori Produk</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola kategori produk toko (Handphone, Tablet, SmartWatch, Aksesoris) dan pengaturan unit IMEI (Khusus Owner).
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="bg-primary text-primary-foreground font-semibold rounded-xl gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kategori</span>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Kategori</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{catalogs.length}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Wajib IMEI / Serial</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {imeiCount} Kategori
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ScanBarcode className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Non-IMEI / Kuantitas</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {nonImeiCount} Kategori
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Kategori Aktif</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeCount} Kategori
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Data Table */}
      <Card className="border border-border shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari kategori, kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Menampilkan {filteredCatalogs.length} kategori katalog
            </div>
          </div>

          {filteredCatalogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm">Belum ada kategori yang cocok</p>
              <p className="text-xs">Klik &ldquo;Tambah Kategori&rdquo; untuk mendaftarkan kategori baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="pb-3 text-center w-12">No</th>
                    <th className="pb-3">Kategori Produk</th>
                    <th className="pb-3">Kode Sistem</th>
                    <th className="pb-3">Tipe & Manajemen Unit</th>
                    <th className="pb-3">Keterangan</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCatalogs.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-muted/60 border border-border">
                            {getCategoryIcon(item.code)}
                          </div>
                          <div>
                            <span className="font-semibold text-sm">{item.name}</span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Urutan: #{item.displayOrder}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <code className="px-2 py-0.5 bg-muted rounded text-[11px] font-mono text-foreground font-semibold">
                          {item.code}
                        </code>
                      </td>
                      <td className="py-3.5">
                        {item.hasImei ? (
                          <Badge
                            variant="outline"
                            className="text-[11px] border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 gap-1"
                          >
                            <ScanBarcode className="h-3 w-3" />
                            <span>Wajib IMEI / Serial (Stok Satuan)</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[11px] border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30 gap-1"
                          >
                            <Boxes className="h-3 w-3" />
                            <span>Non-IMEI (Stok Kuantitas)</span>
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 text-muted-foreground max-w-xs truncate text-[11px]">
                        {item.description || "-"}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className="inline-flex items-center gap-1 transition"
                          title="Klik untuk mengubah status"
                        >
                          {item.isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] hover:bg-emerald-500/25">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Nonaktif
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                            title="Edit Kategori"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isOwner && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingCatalog(item)}
                              disabled={["phone", "tablet", "smartwatch", "accessory"].includes(item.code)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg disabled:opacity-30 disabled:hover:text-muted-foreground"
                              title={
                                ["phone", "tablet", "smartwatch", "accessory"].includes(item.code)
                                  ? "Kategori dasar sistem tidak dapat dihapus"
                                  : "Hapus Kategori"
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG TAMBAH KATEGORI */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-4 w-4 text-primary" />
              <span>Tambah Kategori Katalog</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan kategori produk baru yang dapat dipilih saat menginput unit barang.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nama Kategori *
              </label>
              <Input
                placeholder="Contoh: Tablet, SmartWatch, Laptop..."
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Kode Sistem (Unik) *
                </label>
                <Input
                  placeholder="contoh: tablet"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  className="text-xs h-9 font-mono rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Urutan Tampilan
                </label>
                <Input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Opsi IMEI / Serial */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ScanBarcode className="h-4 w-4 text-primary" />
                    <span>Wajib IMEI / Serial Number</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Aktifkan untuk gadget (HP, Tablet, dll.) agar mewajibkan scan IMEI dan stok satuan (1 unit per-baris).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formHasImei}
                  onChange={(e) => setFormHasImei(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Deskripsi / Keterangan
              </label>
              <Input
                placeholder="Penjelasan singkat mengenai kategori ini..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="add-active-cat"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="add-active-cat" className="text-xs text-foreground cursor-pointer font-medium">
                Aktifkan kategori ini segera
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {isLoading ? "Menyimpan..." : "Simpan Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT KATEGORI */}
      <Dialog open={!!editingCatalog} onOpenChange={() => setEditingCatalog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Kategori Katalog</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah data kategori {editingCatalog?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nama Kategori *
              </label>
              <Input
                placeholder="Nama kategori..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Kode Sistem (Unik) *
                </label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  className="text-xs h-9 font-mono rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Urutan Tampilan
                </label>
                <Input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Opsi IMEI / Serial */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ScanBarcode className="h-4 w-4 text-primary" />
                    <span>Wajib IMEI / Serial Number</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Aktifkan untuk gadget (HP, Tablet, dll.) agar mewajibkan scan IMEI dan stok satuan.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formHasImei}
                  onChange={(e) => setFormHasImei(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Deskripsi / Keterangan
              </label>
              <Input
                placeholder="Penjelasan singkat..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-active-cat"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="edit-active-cat" className="text-xs text-foreground cursor-pointer font-medium">
                Status Kategori Aktif
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCatalog(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS */}
      <Dialog open={!!deletingCatalog} onOpenChange={() => setDeletingCatalog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <Trash2 className="h-4 w-4" />
              <span>Hapus Kategori Katalog</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus kategori{" "}
              <strong>&ldquo;{deletingCatalog?.name}&rdquo;</strong>? Kategori yang sudah dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingCatalog(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={handleDelete}
              className="text-xs gap-1"
            >
              {isLoading ? "Menghapus..." : "Hapus Kategori"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}