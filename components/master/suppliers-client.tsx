"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Truck, Phone, MapPin } from "lucide-react";
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
import { SupplierSchema, SupplierFormValues } from "@/lib/validations/supplier.schema";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
} from "@/lib/actions/supplier.actions";

interface SupplierItem {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: SupplierItem[] }) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    form.reset({ name: "", phone: "", address: "", isActive: true });
    setIsOpenDialog(true);
  };

  const handleOpenEdit = (sup: SupplierItem) => {
    setEditingSupplier(sup);
    form.reset({
      name: sup.name,
      phone: sup.phone,
      address: sup.address || "",
      isActive: sup.isActive,
    });
    setIsOpenDialog(true);
  };

  const onSubmit = async (values: SupplierFormValues) => {
    setIsLoading(true);
    try {
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Data supplier berhasil diperbarui!");
          setSuppliers((prev) =>
            prev.map((s) =>
              s.id === editingSupplier.id
                ? { ...s, name: values.name, phone: values.phone, address: values.address || null, isActive: values.isActive }
                : s
            )
          );
          setIsOpenDialog(false);
        }
      } else {
        const res = await createSupplier(values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Supplier baru berhasil ditambahkan!");
          window.location.reload();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (sup: SupplierItem) => {
    const res = await toggleSupplierStatus(sup.id, sup.isActive);
    if (res.success) {
      toast.success(`Status ${sup.name} berhasil diubah.`);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === sup.id ? { ...s, isActive: !s.isActive } : s))
      );
    } else {
      toast.error(res.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (sup: SupplierItem) => {
    if (!confirm(`Hapus supplier "${sup.name}"?`)) return;

    const res = await deleteSupplier(sup.id);
    if (res.success) {
      toast.success("Supplier berhasil dihapus.");
      setSuppliers((prev) => prev.filter((s) => s.id !== sup.id));
    } else {
      toast.error(res.error || "Gagal menghapus supplier.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Data Supplier
          </h2>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Supplier</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama atau telepon supplier..."
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
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Belum ada data supplier.
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((sup, idx) => (
                <TableRow key={sup.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Truck className="h-4 w-4" />
                      </div>
                      <span>{sup.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{sup.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {sup.address || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleStatus(sup)}
                      className="cursor-pointer transition hover:opacity-80"
                      title="Klik untuk ubah status"
                    >
                      {sup.isActive ? (
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
                        onClick={() => handleOpenEdit(sup)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(sup)}
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
        {filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada supplier yang cocok.
            </CardContent>
          </Card>
        ) : (
          filteredSuppliers.map((sup) => (
            <Card key={sup.id} className="border-border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      {sup.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{sup.phone}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={sup.isActive ? "success" : "destructive"}>
                  {sup.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              {sup.address && (
                <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{sup.address}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs rounded-lg"
                  onClick={() => handleOpenEdit(sup)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleDelete(sup)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Data Supplier" : "Tambah Supplier Baru"}
            </DialogTitle>
            <DialogDescription>
              Informasi kontak distributor untuk pemesanan stok barang.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Supplier / Perusahaan *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: PT Surya Selular..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon / WhatsApp *</FormLabel>
                    <FormControl>
                      <Input placeholder="08123456789..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Alamat kantor / gudang supplier..."
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
                  {isLoading ? "Menyimpan..." : editingSupplier ? "Simpan Perubahan" : "Tambah Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
