"use server";

import { requireAuth } from "@/lib/auth";
import { db, ensureDbSchema } from "@/lib/db";
import { sendPushToUsers, DEFAULT_VAPID_PUBLIC } from "@/lib/push-notification";

export async function getVapidPublicKey(): Promise<string> {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
}

export interface ClientSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Menyimpan data langganan Web Push HP ke database
 */
export async function savePushSubscription(
  subscription: ClientSubscriptionData,
  userAgent?: string
) {
  try {
    const user = await requireAuth();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return { error: "Format langganan notifikasi tidak valid." };
    }

    await ensureDbSchema();

    // Cek apakah endpoint perangkat ini sudah pernah terdaftar
    const existing = await (db as any).pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      await (db as any).pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: userAgent || null,
        },
      });
    } else {
      await (db as any).pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: userAgent || null,
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("savePushSubscription error:", error);
    return { error: error.message || "Gagal menyimpan langganan notifikasi." };
  }
}

/**
 * Menghapus langganan notifikasi perangkat tertentu
 */
export async function removePushSubscription(endpoint: string) {
  try {
    await requireAuth();
    if (!endpoint) return { success: true };

    await ensureDbSchema();
    await (db as any).pushSubscription.deleteMany({
      where: { endpoint },
    });

    return { success: true };
  } catch (error: any) {
    console.error("removePushSubscription error:", error);
    return { error: error.message || "Gagal menghapus langganan notifikasi." };
  }
}

/**
 * Memeriksa status langganan notifikasi untuk user yang sedang login
 */
export async function checkPushSubscriptionStatus() {
  try {
    const user = await requireAuth();
    await ensureDbSchema();

    const count = await (db as any).pushSubscription.count({
      where: { userId: user.id },
    });

    return {
      hasActiveDevice: count > 0,
      deviceCount: count,
    };
  } catch {
    return { hasActiveDevice: false, deviceCount: 0 };
  }
}

/**
 * Mengirim uji coba notifikasi berdering ke seluruh HP milik user yang sedang login
 */
export async function sendTestPushNotification() {
  try {
    const user = await requireAuth();
    await ensureDbSchema();

    const subscriptions = await (db as any).pushSubscription.findMany({
      where: { userId: user.id },
    });

    if (subscriptions.length === 0) {
      return {
        error:
          "Belum ada perangkat HP yang terhubung. Silakan klik 'Aktifkan Notifikasi HP' terlebih dahulu di perangkat ini.",
      };
    }

    const res = await sendPushToUsers([user.id], {
      title: "🔔 Tes Nada Dering Gloria Ponsel",
      body: `Halo ${user.name || user.username}! Notifikasi sistem HP dan nada dering berhasil terhubung.`,
      url: "/dashboard",
      tag: "test-notification-" + Date.now(),
    });

    return {
      success: true,
      message: `Notifikasi dikirim ke ${res.sentCount} perangkat Anda.`,
    };
  } catch (error: any) {
    console.error("sendTestPushNotification error:", error);
    return { error: error.message || "Gagal mengirim notifikasi tes." };
  }
}
