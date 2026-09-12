"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock,
  Calendar,
  Receipt,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
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
  createUser,
  toggleUserStatus,
  updateUserRole,
  resetUserPassword,
  getUserDetailWithSales,
  UserDetailWithSales,
} from "@/lib/actions/user.actions";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  isActive: boolean;
  totalSalesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UsersClientProps {
  initialUsers: UserItem[];
  currentUserId?: string;
}

export function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<UserItem | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserItem | null>(null);
  const [toggleUser, setToggleUser] = useState<UserItem | null>(null);

  // User Detail & Sales Stats Modal State
  const [detailUser, setDetailUser] = useState<UserItem | null>(null);
  const [detailData, setDetailData] = useState<UserDetailWithSales | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleOpenUserDetail = async (user: UserItem) => {
    setDetailUser(user);
    setDetailData(null);
    setIsLoadingDetail(true);
    try {
      const res = await getUserDetailWithSales(user.id);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        toast.error(res.error || "Gagal memuat detail pengguna.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memuat detail pengguna.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");

  const [selectedRoleTarget, setSelectedRoleTarget] = useState<"admin" | "super_admin">("admin");
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // 1. Create New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      toast.error("Mohon lengkapi semua isian formulir.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Akun ${newName} berhasil dibuat!`);
        setIsAddOpen(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        // Optimistic refresh
        setUsers([
          {
            id: `temp-${Date.now()}`,
            name: newName,
            email: newEmail,
            role: newRole,
            isActive: true,
            totalSalesCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...users,
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun user.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Toggle Status (Active / Inactive) with Lockout Prevention
  const handleToggleStatus = async () => {
    if (!toggleUser) return;
    setIsLoading(true);
    try {
      const res = await toggleUserStatus(toggleUser.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `Akun ${toggleUser.name} sekarang ${res.newStatus ? "Aktif" : "Dinonaktifkan"}`
        );
        setUsers(
          users.map((u) => (u.id === toggleUser.id ? { ...u, isActive: res.newStatus! } : u))
        );
        setToggleUser(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status akun.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Update User Role
  const handleUpdateRole = async () => {
    if (!roleUser) return;
    setIsLoading(true);
    try {
      const res = await updateUserRole(roleUser.id, selectedRoleTarget);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Role ${roleUser.name} berhasil diubah menjadi ${selectedRoleTarget}`);
        setUsers(
          users.map((u) => (u.id === roleUser.id ? { ...u, role: selectedRoleTarget } : u))
        );
        setRoleUser(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah role user.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Reset User Password
  const handleResetPassword = async () => {
    if (!passwordUser || !resetPasswordInput) return;
    if (resetPasswordInput.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetUserPassword(passwordUser.id, resetPasswordInput);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Password untuk ${passwordUser.name} berhasil diperbarui!`);
        setPasswordUser(null);
        setResetPasswordInput("");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">Manajemen User</h3>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Tambah Admin Baru
        </Button>
      </div>

      {/* Filter & Users List Card */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total {filteredUsers.length} akun pengguna
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Tidak ada akun pengguna yang cocok.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="pb-3">Pengguna</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3 text-center">Role</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-center">Transaksi</th>
                      <th className="pb-3">Terdaftar</th>
                      <th className="pb-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetail(u)}
                              className="text-left font-semibold text-foreground hover:text-indigo-600 hover:underline transition-colors focus:outline-none flex items-center gap-1.5 group/name"
                              title="Klik untuk melihat detail & rekap transaksi"
                            >
                              <span>{u.name}</span>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover/name:text-indigo-600 transition-colors opacity-70 group-hover/name:opacity-100" />
                            </button>
                            {u.id === currentUserId && (
                              <span className="text-[10px] text-indigo-600 font-normal">
                                (Anda)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-muted-foreground">{u.email}</td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              u.role === "super_admin"
                                ? "border-indigo-300 bg-indigo-50 text-indigo-800 text-[10px] font-bold"
                                : "border-slate-300 bg-slate-100 text-slate-700 text-[10px] font-medium"
                            }
                          >
                            {u.role === "super_admin" ? "Super Admin" : "Admin Kasir"}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            className={
                              u.isActive
                                ? "bg-emerald-100 text-emerald-800 text-[10px]"
                                : "bg-rose-100 text-rose-800 text-[10px]"
                            }
                          >
                            {u.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="py-3 text-center font-medium text-foreground">
                          {u.totalSalesCount}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUserDetail(u)}
                              className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Lihat Detail & Rekap Transaksi"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Detail
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRoleUser(u);
                                setSelectedRoleTarget(u.role);
                              }}
                              className="h-7 px-2 text-[11px]"
                              title="Ubah Role"
                            >
                              <Shield className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              Role
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPasswordUser(u);
                                setResetPasswordInput("");
                              }}
                              className="h-7 px-2 text-[11px]"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Password
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setToggleUser(u)}
                              className={`h-7 px-2 text-[11px] ${
                                u.isActive
                                  ? "text-rose-600 hover:text-rose-700"
                                  : "text-emerald-600 hover:text-emerald-700"
                              }`}
                              title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                            >
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 mr-1" />
                                  Nonaktifkan
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                                  Aktifkan
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden mt-4">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl border border-border bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenUserDetail(u)}
                            className="text-left text-xs font-bold text-foreground hover:text-indigo-600 hover:underline transition-colors focus:outline-none flex items-center gap-1.5"
                          >
                            <span>{u.name}</span>
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            {u.id === currentUserId && (
                              <span className="ml-1 text-[10px] text-indigo-600 font-normal">
                                (Anda)
                              </span>
                            )}
                          </button>
                          <p className="text-[11px] font-mono text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          u.isActive
                            ? "bg-emerald-100 text-emerald-800 text-[10px]"
                            : "bg-rose-100 text-rose-800 text-[10px]"
                        }
                      >
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <span className="text-muted-foreground">Peran Akses:</span>
                      <Badge
                        variant="outline"
                        className={
                          u.role === "super_admin"
                            ? "bg-indigo-50 text-indigo-800 text-[10px]"
                            : "bg-slate-100 text-slate-700 text-[10px]"
                        }
                      >
                        {u.role === "super_admin" ? "Super Admin" : "Admin Kasir"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/60">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUserDetail(u)}
                        className="h-7 px-2 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Detail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRoleUser(u);
                          setSelectedRoleTarget(u.role);
                        }}
                        className="h-7 px-2 text-[10px]"
                      >
                        Ubah Role
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPasswordUser(u);
                          setResetPasswordInput("");
                        }}
                        className="h-7 px-2 text-[10px]"
                      >
                        Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setToggleUser(u)}
                        className={`h-7 px-2 text-[10px] ${
                          u.isActive
                            ? "text-rose-600 border-rose-200"
                            : "text-emerald-600 border-emerald-200"
                        }`}
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 1. Modal Tambah User */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              Tambah Akun Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat akun admin kasir atau super admin baru untuk operasional toko.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Nama Lengkap</label>
              <Input
                placeholder="mis. Budi Wicaksono"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Alamat Email</label>
              <Input
                type="email"
                placeholder="mis. budi@tokohp.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-1 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Password Awal</label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Role Hak Akses</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="admin">Admin (Kasir / Operasional Stok)</option>
                <option value="super_admin">Super Admin (Owner / Akses Laba & User)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isLoading ? "Menyimpan..." : "Simpan Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Ubah Role */}
      <Dialog open={!!roleUser} onOpenChange={(open) => !open && setRoleUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Ubah Role Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah wewenang akun <strong>{roleUser?.name}</strong> ({roleUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Pilih Role Baru</label>
              <select
                value={selectedRoleTarget}
                onChange={(e) => setSelectedRoleTarget(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="admin">Admin (Kasir / Operasional Stok)</option>
                <option value="super_admin">Super Admin (Owner / Akses Laba & User)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleUser(null)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateRole}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {isLoading ? "Memproses..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Reset Password */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Reset Password Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan password baru untuk akun <strong>{passwordUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Password Baru</label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordUser(null)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              disabled={isLoading || !resetPasswordInput}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isLoading ? "Menyimpan..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Dialog Konfirmasi Status Toggle */}
      <Dialog open={!!toggleUser} onOpenChange={(open) => !open && setToggleUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              {toggleUser?.isActive ? "Nonaktifkan Akun?" : "Aktifkan Akun?"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {toggleUser?.isActive
                ? `Akun ${toggleUser?.name} (${toggleUser?.email}) tidak akan dapat masuk ke dalam dashboard toko.`
                : `Akun ${toggleUser?.name} (${toggleUser?.email}) akan diaktifkan kembali dan dapat masuk ke dashboard.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToggleUser(null)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleToggleStatus}
              disabled={isLoading}
              className={
                toggleUser?.isActive
                  ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              }
            >
              {isLoading
                ? "Memproses..."
                : toggleUser?.isActive
                ? "Ya, Nonaktifkan"
                : "Ya, Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL DETAIL PENGGUNA & REKAP TRANSAKSI */}
      <Dialog
        open={!!detailUser}
        onOpenChange={(open) => {
          if (!open) {
            setDetailUser(null);
            setDetailData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-base shadow-sm">
                  {detailUser?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>{detailUser?.name}</span>
                    {detailUser?.id === currentUserId && (
                      <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                        Anda
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-mono text-muted-foreground">
                    {detailUser?.email}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant="outline"
                  className={
                    detailUser?.role === "super_admin"
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800 text-[11px] font-bold"
                      : "border-slate-300 bg-slate-100 text-slate-700 text-[11px] font-medium"
                  }
                >
                  {detailUser?.role === "super_admin" ? "Super Admin (Owner)" : "Admin Kasir"}
                </Badge>
                <Badge
                  variant="secondary"
                  className={
                    detailUser?.isActive
                      ? "bg-emerald-100 text-emerald-800 text-[10px]"
                      : "bg-rose-100 text-rose-800 text-[10px]"
                  }
                >
                  {detailUser?.isActive ? "Akun Aktif" : "Akun Nonaktif"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              <p className="text-xs">Memuat rekapitulasi data & transaksi...</p>
            </div>
          ) : detailData ? (
            <div className="space-y-6 pt-2">
              {/* Ringkasan Statistik 3 Card */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Ringkasan Kinerja Penjualan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Hari Ini */}
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium">Transaksi Hari Ini</span>
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono text-foreground">
                        {detailData.stats.todayCount}
                      </span>
                      <span className="text-xs text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(detailData.stats.todayTotal)}
                    </p>
                  </div>

                  {/* Card 2: Bulan Ini */}
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium">Transaksi Bulan Ini</span>
                      <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono text-foreground">
                        {detailData.stats.monthCount}
                      </span>
                      <span className="text-xs text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatRupiah(detailData.stats.monthTotal)}
                    </p>
                  </div>

                  {/* Card 3: Total Seluruh Waktu */}
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium">Total Keseluruhan</span>
                      <Receipt className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono text-foreground">
                        {detailData.stats.allTimeCount}
                      </span>
                      <span className="text-xs text-muted-foreground">transaksi</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-foreground">
                      {formatRupiah(detailData.stats.allTimeTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabel Transaksi Terakhir */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Transaksi Terakhir ({detailData.recentSales.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">5 transaksi terakhir</span>
                </div>

                {detailData.recentSales.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    Belum ada transaksi penjualan yang diproses oleh pengguna ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">No. Faktur</th>
                          <th className="py-2.5 px-3 font-semibold">Waktu</th>
                          <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Item</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Metode</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailData.recentSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {sale.invoiceNo}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              <span className="text-[10px]">
                                {new Date(sale.createdAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-foreground">{sale.customerName}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                              {sale.itemCount} unit
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(sale.total)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {sale.paymentMethod}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant="secondary"
                                className={
                                  sale.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 text-[10px]"
                                    : "bg-rose-100 text-rose-800 text-[10px]"
                                }
                              >
                                {sale.status === "completed" ? "Selesai" : "Batal"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Info Tambahan & Tombol Aksi */}
              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span>Terdaftar: </span>
                  <span className="font-medium text-foreground">
                    {new Date(detailData.user.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = detailUser;
                      setDetailUser(null);
                      if (target) {
                        setRoleUser(target);
                        setSelectedRoleTarget(target.role);
                      }
                    }}
                    className="h-8 text-xs"
                  >
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    Ubah Role
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = detailUser;
                      setDetailUser(null);
                      if (target) {
                        setPasswordUser(target);
                        setResetPasswordInput("");
                      }
                    }}
                    className="h-8 text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailUser(null);
                setDetailData(null);
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
