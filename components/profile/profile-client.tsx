"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Shield,
  KeyRound,
  Calendar,
  Clock,
  Receipt,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { ProfileData, updateProfile, changePassword } from "@/lib/actions/profile.actions";

interface ProfileClientProps {
  initialData: ProfileData;
}

export function ProfileClient({ initialData }: ProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(initialData);

  // Form State: Profil
  const [name, setName] = useState(initialData.name);
  const [username, setUsername] = useState(initialData.username || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Form State: Ganti Kata Sandi
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 1. Handle Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username tidak boleh kosong.");
      return;
    }
    if (username.trim().length < 3) {
      toast.error("Username minimal 3 karakter.");
      return;
    }
    if (!name.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateProfile({ name, username });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Profil berhasil diperbarui.");
        if (res.user) {
          setProfile((prev) => ({
            ...prev,
            name: res.user.name || prev.name,
            username: (res.user as any).username || prev.username,
          }));
        }
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Masukkan kata sandi Anda saat ini.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Kata sandi berhasil diperbarui.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat mengubah kata sandi.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "owner" || role === "super_admin") {
      return (
        <Badge
          variant="outline"
          className="border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-bold"
        >
          Owner
        </Badge>
      );
    }
    if (role === "staff_gudang") {
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold"
        >
          Staff Admin
        </Badge>
      );
    }
    if (role === "staff_keuangan") {
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold"
        >
          Staff Keuangan
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-medium"
      >
        Staff Marketing
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Profil */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#055b5a] text-white font-bold text-xl shadow-md">
              {(profile.name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {profile.name}
                </h2>
                {getRoleBadge(profile.role)}
                <Badge
                  variant="secondary"
                  className={
                    profile.isActive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]"
                      : "bg-rose-100 text-rose-800 text-[11px]"
                  }
                >
                  {profile.isActive ? "Akun Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground">@{profile.username || "pengguna"}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground sm:text-right">
            <p>
              Bergabung sejak:{" "}
              <span className="font-semibold text-foreground">
                {new Date(profile.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid Konten */}
      <div className={profile.salesStats ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "max-w-3xl space-y-6"}>
        {/* Kolom Kiri / Utama: Formulir Profil & Ganti Password */}
        <div className={profile.salesStats ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          {/* Card 1: Informasi Profil */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-emerald-600" />
                <span>Informasi Akun</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Perbarui nama tampilan akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Username (ID Login)</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="Masukkan username login"
                    required
                    className="h-10 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Username digunakan untuk masuk (login) ke dalam sistem. Gunakan huruf kecil, angka, titik, underscore, atau minus.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nama Lengkap</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Hak Akses Sistem</label>
                  <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">
                        {profile.role === "owner" || profile.role === "super_admin"
                          ? "Owner"
                          : profile.role === "staff_gudang"
                          ? "Staff Gudang"
                          : "Admin Kasir"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {profile.role === "owner" || profile.role === "super_admin"
                          ? "Memiliki kendali penuh atas toko, laporan, produk, manajemen user, dan pengaturan."
                          : profile.role === "staff_gudang"
                          ? "Dikhususkan untuk operasional gudang, pengelolaan data produk, dan cetak barcode."
                          : "Dikhususkan untuk operasional kasir POS penjualan dan data pelanggan."}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-5 gap-1.5"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Profil</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 2: Keamanan & Ganti Kata Sandi */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <span>Ubah Kata Sandi</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Pastikan akun Anda menggunakan kata sandi yang aman dan tidak mudah ditebak
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi lama"
                      required
                      className="h-10 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      className="h-10 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      required
                      className="h-10 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-5 gap-1.5"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengubah...</span>
                      </>
                    ) : (
                      <span>Perbarui Kata Sandi</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Ringkasan Aktivitas Kasir (jika kasir) */}
        {profile.salesStats && (
          <div className="space-y-6">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <span>Kinerja Penjualan Anda</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Rekapitulasi transaksi yang telah Anda proses
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Hari ini */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Transaksi Hari Ini</span>
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-foreground">
                      {profile.salesStats.todayCount}
                    </span>
                    <span className="text-xs text-muted-foreground">transaksi</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(profile.salesStats.todayTotal)}
                  </p>
                </div>

                {/* Bulan ini */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Transaksi Bulan Ini</span>
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-foreground">
                      {profile.salesStats.monthCount}
                    </span>
                    <span className="text-xs text-muted-foreground">transaksi</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatRupiah(profile.salesStats.monthTotal)}
                  </p>
                </div>

                {/* Total Seluruh Waktu */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Total Keseluruhan</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono text-foreground">
                      {profile.salesStats.allTimeCount}
                    </span>
                    <span className="text-xs text-muted-foreground">transaksi selesai</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
