"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Lock,
  CheckCircle2,
  UserCheck,
  Building2,
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
import { RoleItem, createRole, updateRole, deleteRole } from "@/lib/actions/role.actions";

interface RolesClientProps {
  initialRoles: RoleItem[];
}

export function RolesClient({ initialRoles }: RolesClientProps) {
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState<RoleItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const AVAILABLE_PERMISSIONS = [
    "Dashboard Operasional",
    "Transaksi Penjualan (POS)",
    "Riwayat Penjualan",
    "Data Produk (Ready & Harga Jual)",
    "Input Barang Masuk & Grade",
    "Persetujuan Unit Masuk",
    "Cetak Barcode SKU",
    "Laporan Penjualan",
    "Pengeluaran Harian",
    "Laporan Laba & Keuangan",
    "Master Data & Katalog",
    "Manajemen User & Role",
    "Pengaturan Toko",
  ];

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalUsers = roles.reduce((acc, r) => acc + r.userCount, 0);

  const handleOpenAdd = () => {
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormPermissions(["Dashboard Operasional"]);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (r: RoleItem) => {
    setEditingRole(r);
    setFormName(r.name);
    setFormCode(r.code);
    setFormDescription(r.description || "");
    setFormPermissions(r.permissions || []);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Nama dan kode role wajib diisi.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await createRole({
        name: formName.trim(),
        code: formCode.trim(),
        description: formDescription.trim(),
        permissions: formPermissions,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setRoles([
          ...roles,
          {
            id: `role-${formCode.trim()}`,
            name: formName.trim(),
            code: formCode.trim(),
            description: formDescription.trim(),
            permissions: formPermissions,
            userCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        setIsAddOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat role.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!formName.trim()) {
      toast.error("Nama role tidak boleh kosong.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await updateRole(editingRole.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        permissions: formPermissions,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setRoles(
          roles.map((r) =>
            r.id === editingRole.id
              ? {
                  ...r,
                  name: formName.trim(),
                  description: formDescription.trim(),
                  permissions: formPermissions,
                }
              : r
          )
        );
        setEditingRole(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui role.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!isDeletingRole) return;

    try {
      setIsLoading(true);
      const res = await deleteRole(isDeletingRole.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setRoles(roles.filter((r) => r.id !== isDeletingRole.id));
        setIsDeletingRole(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus role.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (code: string) => {
    switch (code) {
      case "owner":
        return "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300";
      case "admin_kasir":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "staff_gudang":
        return "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
      case "staff_keuangan":
        return "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>Role & Hak Akses</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tabel master role pengguna, pembagian tanggung jawab, dan kontrol hak akses toko (Khusus Owner).
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="bg-primary text-primary-foreground font-semibold rounded-xl gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Role</span>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Role</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{roles.length}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Akun Terdaftar</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{totalUsers}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Role Operasional</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {(roles.find((r) => r.code === "admin_kasir")?.userCount || 0) +
                  (roles.find((r) => r.code === "staff_gudang")?.userCount || 0)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Role Manajerial & Keuangan</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {(roles.find((r) => r.code === "owner")?.userCount || 0) +
                  (roles.find((r) => r.code === "staff_keuangan")?.userCount || 0)}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Table Card */}
      <Card className="border border-border shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama role atau kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Menampilkan {filteredRoles.length} role
            </div>
          </div>

          {filteredRoles.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada data role yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Kode Unik</th>
                    <th className="pb-3">Deskripsi Tanggung Jawab</th>
                    <th className="pb-3">Izin Akses Modul</th>
                    <th className="pb-3 text-center">Jumlah User</th>
                    <th className="pb-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRoles.map((r) => {
                    const isSystemRole = [
                      "owner",
                      "admin_kasir",
                      "staff_gudang",
                      "staff_keuangan",
                    ].includes(r.code);

                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 font-bold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{r.name}</span>
                            {isSystemRole && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal"
                              >
                                Sistem
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-[11px] whitespace-nowrap">
                          <Badge variant="outline" className={`font-mono text-[10px] ${getRoleColor(r.code)}`}>
                            {r.code}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-muted-foreground max-w-xs leading-relaxed">
                          {r.description || "-"}
                        </td>
                        <td className="py-3.5 max-w-sm">
                          <div className="flex flex-wrap gap-1">
                            {r.permissions && r.permissions.length > 0 ? (
                              r.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/80 text-foreground font-medium"
                                >
                                  {perm}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-bold text-foreground">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {r.userCount} akun
                          </Badge>
                        </td>
                        <td className="py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(r)}
                              className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 rounded-lg"
                              title="Edit Role & Hak Akses"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            {!isSystemRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsDeletingRole(r)}
                                className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Hapus Role"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Tambah Role */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Tambah Role Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat role baru dengan kode unik dan tentukan cakupan izin modulnya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Role *</label>
              <Input
                placeholder="Contoh: Supervisor Toko"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kode Role (Unik) *</label>
              <Input
                placeholder="Contoh: supervisor_toko"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deskripsi Tanggung Jawab</label>
              <textarea
                placeholder="Jelaskan peran dan tugas utama role ini..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Izin Akses Modul</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 border border-border rounded-xl bg-muted/20">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = formPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFormPermissions(formPermissions.filter((p) => p !== perm));
                          } else {
                            setFormPermissions([...formPermissions, perm]);
                          }
                        }}
                        className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5"
                      />
                      <span className="text-[11px]">{perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
              >
                {isLoading ? "Menyimpan..." : "Simpan Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Role */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              <span>Edit Role: {editingRole?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui deskripsi dan izin modul role ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Role *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kode Role</label>
              <Input
                value={formCode}
                disabled
                className="text-xs h-9 rounded-xl font-mono bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deskripsi Tanggung Jawab</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Izin Akses Modul</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 border border-border rounded-xl bg-muted/20">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = formPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFormPermissions(formPermissions.filter((p) => p !== perm));
                          } else {
                            setFormPermissions([...formPermissions, perm]);
                          }
                        }}
                        className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5"
                      />
                      <span className="text-[11px]">{perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingRole(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
              >
                {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!isDeletingRole} onOpenChange={(open) => !open && setIsDeletingRole(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Hapus Role</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus role &ldquo;{isDeletingRole?.name}&rdquo;? Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeletingRole(null)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={handleDeleteRole}
              className="rounded-xl text-xs"
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
