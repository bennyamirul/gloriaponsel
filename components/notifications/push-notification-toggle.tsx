"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  Volume2,
  CheckCircle2,
  Smartphone,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playNotificationRingtone, unlockAudioContext } from "@/lib/utils/audio-chime";
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  checkPushSubscriptionStatus,
  sendTestPushNotification,
} from "@/lib/actions/push-subscription.actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsSupported(false);
      return;
    }

    setPermission(Notification.permission);

    // Cek apakah perangkat ini sudah subscribe
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  const handleSubscribe = async () => {
    unlockAudioContext();

    if (!isSupported) {
      toast.error(
        "Browser perangkat ini belum mendukung Web Push Notifications. Coba buka menggunakan Google Chrome atau Edge."
      );
      return;
    }

    setIsLoading(true);
    try {
      // 1. Minta izin notifikasi browser
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.warning(
          "Izin notifikasi tidak diberikan. Silakan aktifkan izin notifikasi di pengaturan browser HP Anda."
        );
        setIsLoading(false);
        return;
      }

      // 2. Ambil VAPID public key
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        toast.error("Kunci VAPID belum dikonfigurasi.");
        setIsLoading(false);
        return;
      }

      // 3. Pastikan Service Worker siap
      const registration = await navigator.serviceWorker.ready;

      // 4. Daftarkan push subscription
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 5. Simpan ke database
      const subJson = subscription.toJSON();
      const res = await savePushSubscription(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
          },
        },
        navigator.userAgent
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        setIsSubscribed(true);
        // Bunyikan nada dering lonceng konfirmasi
        playNotificationRingtone(0.6);
        toast.success(
          "Notifikasi HP & Nada Dering berhasil diaktifkan! Notifikasi akan muncul dan berdering saat ada transaksi atau produk baru."
        );
      }
    } catch (err: any) {
      console.error("handleSubscribe error:", err);
      toast.error(err.message || "Gagal mengaktifkan notifikasi HP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await removePushSubscription(endpoint);
      }

      setIsSubscribed(false);
      toast.info("Notifikasi HP untuk perangkat ini telah dinonaktifkan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menonaktifkan notifikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRingtoneAndPush = async () => {
    unlockAudioContext();
    setIsTesting(true);

    // 1. Putar nada dering lokal langsung di browser
    playNotificationRingtone(0.7);

    // 2. Kirim sinyal push melalui server ke HP
    try {
      const res = await sendTestPushNotification();
      if (res.error) {
        toast.warning(res.error);
      } else {
        toast.success(res.message || "Nada dering dan notifikasi tes berhasil dikirim ke HP!");
      }
    } catch {
      toast.error("Gagal mengirim notifikasi tes.");
    } finally {
      setIsTesting(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Notifikasi HP Web Push</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Browser ini tidak mendukung Web Push. Di iPhone (iOS), silakan buka di Safari lalu klik{" "}
            <strong>"Share" -&gt; "Add to Home Screen"</strong> terlebih dahulu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isSubscribed
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isSubscribed ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Notifikasi HP & Ringtone
              {isSubscribed && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Aktif
                </span>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {isSubscribed
                ? "HP ini akan berdering saat ada transaksi atau produk baru."
                : "Aktifkan agar HP berdering saat ada penjualan baru."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {!isSubscribed ? (
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellRing className="h-3.5 w-3.5" />
            )}
            <span>Aktifkan Notifikasi HP</span>
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestRingtoneAndPush}
              disabled={isTesting}
              className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
              title="Coba bunyikan nada dering lonceng notifikasi di HP"
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              <span>Tes Dering HP</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Matikan notifikasi di perangkat ini"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Matikan</span>
            </Button>
          </>
        )}
      </div>

      {permission === "denied" && (
        <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg">
          Izin notifikasi diblokir di browser. Klik ikon gembok di sebelah alamat web browser Anda dan ubah Notifikasi menjadi "Izinkan".
        </p>
      )}
    </div>
  );
}
