"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrandSchema, BrandFormValues } from "@/lib/validations/brand.schema";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
} from "@/lib/actions/brand.actions";

interface BrandItem {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: { products: number };
}

export function BrandsClient({ initialBrands }: { initialBrands: BrandItem[] }) {
  const [brands, setBrands] = useState<BrandItem[]>(initialBrands);
  const [search, setSearch] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(BrandSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      isActive: true,
    },
  });

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingBrand(null);
    form.reset({ name: "", logoUrl: "", isActive: true });
    setIsOpenDialog(true);
  };

  const handleOpenEdit = (brand: BrandItem) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      logoUrl: brand.logoUrl || "",
      isActive: brand.isActive,
    });
    setIsOpenDialog(true);
  };

  const onSubmit = async (values: BrandFormValues) => {
    setIsLoading(true);
    try {
      if (editingBrand) {
        const res = await updateBrand(editingBrand.id, values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Brand berhasil diperbarui!");
          setBrands((prev) =>
            prev.map((b) =>
              b.id === editingBrand.id
                ? { ...b, name: values.name, logoUrl: values.logoUrl || null, isActive: values.isActive }
                : b
            )
          );
          setIsOpenDialog(false);
        }
      } else {
        const res = await createBrand(values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Brand baru berhasil ditambahkan!");
          window.location.reload();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (brand: BrandItem) => {
    const res = await toggleBrandStatus(brand.id, brand.isActive);
    if (res.success) {
      toast.success(`Status brand ${brand.name} berhasil diubah.`);
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, isActive: !b.isActive } : b))
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (brand: BrandItem) => {
    if (!confirm(`Hapus atau nonaktifkan brand "${brand.name}"?`)) return;

    const res = await deleteBrand(brand.id);
    if (res.success) {
      toast.success(res.message || "Brand berhasil dihapus.");
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
    } else {
      toast.error(res.error || "Gagal menghapus brand.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Brand Handphone
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola merk handphone seperti Apple, Samsung, Xiaomi, Oppo, Vivo, dll.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Brand</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Brand</TableHead>
              <TableHead className="text-center">Total Produk</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Belum ada brand ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand, idx) => (
                <TableRow key={brand.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-border">
                        {brand.logoUrl ? (
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="h-5 w-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Tag className="h-4 w-4 text-indigo-600" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground">{brand.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-semibold">
                      {brand._count.products} Produk
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleStatus(brand)}
                      className="cursor-pointer transition hover:opacity-80"
                      title="Klik untuk ubah status"
                    >
                      {brand.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Nonaktif</Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                        onClick={() => handleOpenEdit(brand)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(brand)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredBrands.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada brand yang cocok.
            </CardContent>
          </Card>
        ) : (
          filteredBrands.map((brand) => (
            <Card key={brand.id} className="border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-border shrink-0">
                    <Tag className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      {brand.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {brand._count.products} Produk
                    </span>
                  </div>
                </div>
                <Badge variant={brand.isActive ? "success" : "destructive"}>
                  {brand.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs rounded-lg"
                  onClick={() => handleOpenEdit(brand)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleDelete(brand)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Brand Dialog */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Tambah Brand Baru"}
            </DialogTitle>
            <DialogDescription>
              Masukkan nama produsen handphone atau aksesoris.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Apple, Samsung, Xiaomi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Logo (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/logo.svg"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpenDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 font-semibold"
                >
                  {isLoading ? "Menyimpan..." : editingBrand ? "Simpan Perubahan" : "Tambah Brand"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
