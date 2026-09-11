import { requireRole } from "@/lib/auth";
import { getStoreSettings } from "@/lib/actions/setting.actions";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole(["super_admin"]);
  const settings = await getStoreSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Pengaturan Toko & Konfigurasi
        </h2>
        <p className="text-sm text-muted-foreground">
          Kelola informasi nama toko, alamat, logo, catatan footer struk kasir, dan ambang batas stok minimum default.
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
