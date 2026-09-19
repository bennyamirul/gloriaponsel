"use client";

import { useEffect } from "react";
import { playNotificationRingtone, unlockAudioContext } from "@/lib/utils/audio-chime";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // 1. Daftarkan Service Worker jika didukung
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Service worker aktif
        })
        .catch((err) => {
          console.warn("PWA ServiceWorker registration notice:", err);
        });

      // 2. Dengarkan pesan push yang masuk dari service worker saat tab aktif
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
          playNotificationRingtone(0.5);
        }
      };

      navigator.serviceWorker.addEventListener("message", handleSwMessage);

      // 3. Buka blokir audio pada sentuhan/klik pertama di HP
      const handleUserInteraction = () => {
        unlockAudioContext();
        window.removeEventListener("click", handleUserInteraction);
        window.removeEventListener("touchstart", handleUserInteraction);
      };

      window.addEventListener("click", handleUserInteraction);
      window.addEventListener("touchstart", handleUserInteraction);

      return () => {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
        window.removeEventListener("click", handleUserInteraction);
        window.removeEventListener("touchstart", handleUserInteraction);
      };
    }
  }, []);

  return null;
}
