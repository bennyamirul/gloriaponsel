"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, UserCheck, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CustomerSchema, CustomerFormValues } from "@/lib/validations/customer.schema";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/customer.actions";

interface CustomerItem {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
}

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerItem[] }) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    },
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    form.reset({ name: "", phone: "", address: "" });
    setIsOpenDialog(true);
  };

  const handleOpenEdit = (cust: CustomerItem) => {
    setEditingCustomer(cust);
    form.reset({
      name: cust.name,
      phone: cust.phone || "",
      address: cust.address || "",
    });
    setIsOpenDialog(true);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    setIsLoading(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Data pelanggan berhasil diperbarui!");
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === editingCustomer.id
                ? { ...c, name: values.name, phone: values.phone || null, address: values.address || null }
                : c
            )
          );
          setIsOpenDialog(false);
        }
      } else {
        const res = await createCustomer(values);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Pelanggan baru berhasil ditambahkan!");
          window.location.reload();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (cust: CustomerItem) => {
    if (!confirm(`Hapus data pelanggan "${cust.name}"?`)) return;

    const res = await deleteCustomer(cust.id);
    if (res.success) {
      toast.success("Pelanggan berhasil dihapus.");
      setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
    } else {
      toast.error(res.error || "Gagal menghapus pelanggan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Data Pelanggan
          </h2>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Pelanggan</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama atau telepon pelanggan..."
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
              <TableHead>Nama Pelanggan</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Belum ada data pelanggan.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((cust, idx) => (
                <TableRow key={cust.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <span>{cust.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700">
                    {cust.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{cust.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {cust.address || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                        onClick={() => handleOpenEdit(cust)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(cust)}
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
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Belum ada pelanggan yang cocok.
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((cust) => (
            <Card key={cust.id} className="border-border shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight">
                      {cust.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{cust.phone || "Tidak ada telepon"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {cust.address && (
                <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{cust.address}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs rounded-lg"
                  onClick={() => handleOpenEdit(cust)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => handleDelete(cust)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Customer Dialog */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
            </DialogTitle>
            <DialogDescription>
              Catatan nama dan kontak pembeli di kasir toko.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap Pelanggan *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Budi Santoso..." {...field} />
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
                    <FormLabel>Nomor HP / WhatsApp (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="08123456789..."
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
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
                        placeholder="Alamat domisili pelanggan..."
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
                  {isLoading ? "Menyimpan..." : editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
