"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Search, Layers, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  CategorySchema,
  CategoryFormValues,
} from "@/lib/validations/category.schema";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "@/lib/actions/category.actions";

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: { products: number };
}

export function CategoriesClient({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCategory(null);
    form.reset({ name: "", description: "", isActive: true });
    setIsOpenDialog(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    form.reset({
      name: cat.name,
      description: cat.description || "",
      isActive: cat.isActive,
    });
    setIsOpenDialog(true);
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setIsLoading(true);
    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Kategori berhasil diperbarui!");
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? { ...c, name: values.name, description: values.description || null, isActive: values.isActive }
                : c
            )
          );
          setIsOpenDialog(false);
        }
      } else {
        const res = await createCategory(values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Kategori baru berhasil ditambahkan!");
          // Trigger reload or update locally
          window.location.reload();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (cat: CategoryItem) => {
    const res = await toggleCategoryStatus(cat.id, cat.isActive);
    if (res.success) {
      toast.success(`Status ${cat.name} berhasil diubah.`);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!confirm(`Hapus atau nonaktifkan kategori "${cat.name}"?`)) return;

    const res = await deleteCategory(cat.id);
    if (res.success) {
      toast.success(res.message || "Kategori berhasil dihapus.");
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } else {
      toast.error(res.error || "Gagal menghapus kategori.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Data Kategori
          </h2>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kategori</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-center">Total Produk</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Belum ada kategori ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((cat, idx) => (
                <TableRow key={cat.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Layers className="h-4 w-4" />
                      </div>
                      <span>{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-semibold">
                      {cat._count.products} Produk
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className="cursor-pointer transition hover:opacity-80"
                      title="Klik untuk ubah status"
                    >
                      {cat.isActive ? (
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
                        onClick={() => handleOpenEdit(cat)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(cat)}
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

      {/* Mobile Card List View (<768px) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada kategori yang cocok.
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((cat) => (
            <Card key={cat.id} className="border-border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cat.description || "Tidak ada deskripsi"}
                    </p>
                  </div>
                </div>
                <Badge variant={cat.isActive ? "success" : "destructive"}>
                  {cat.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/60">
                <span className="text-xs font-semibold text-slate-600">
                  {cat._count.products} Produk Terdaftar
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs rounded-lg"
                    onClick={() => handleOpenEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
            </DialogTitle>
            <DialogDescription>
              Pastikan nama kategori spesifik dan mudah dipahami.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Smartphone, Aksesoris..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Keterangan singkat..."
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
                  {isLoading ? "Menyimpan..." : editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
