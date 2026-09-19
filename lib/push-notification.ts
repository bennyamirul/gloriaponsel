import webpush from "web-push";
import { db, ensureDbSchema } from "@/lib/db";
import { Role } from "@prisma/client";

export const DEFAULT_VAPID_PUBLIC =
  "BNMo1SNJZBVZvoJzibg2b3aCLWHP6tT--q6tnWOkfOfuKc33AgS7JTVOwkaj074okVgRJ5R2ts1Xu3A5Rre1-TQ";
export const DEFAULT_VAPID_PRIVATE =
  "Nj8sFN_FHSPe9RMdjny80RQKN5KwFxwdqnJ6TMhI9SM";
export const DEFAULT_VAPID_SUBJECT = "mailto:admin@gloriaponsel.com";

const vapidPublic =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
const vapidSubject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

try {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
} catch (err) {
  console.warn("webpush.setVapidDetails warning:", err);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

/**
 * Mengirim Push Notification ke daftar user ID tertentu.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sentCount: number; failedCount: number }> {
  if (!userIds || userIds.length === 0) return { sentCount: 0, failedCount: 0 };

  await ensureDbSchema();

  try {
    const subscriptions = await (db as any).pushSubscription.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    const jsonPayload = JSON.stringify({
      title: payload.title || "Gloria Ponsel",
      body: payload.body || "",
      url: payload.url || "/dashboard",
      icon: payload.icon || "/logoGP.png",
      badge: payload.badge || "/logoGP.png",
      tag: payload.tag || "gloria-notification",
    });

    let sentCount = 0;
    let failedCount = 0;

    const pushPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          jsonPayload
        );
        sentCount++;
      } catch (err: any) {
        failedCount++;
        // Jika endpoint sudah kadaluarsa / izin dicabut di HP (404 / 410)
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          try {
            await (db as any).pushSubscription.delete({
              where: { id: sub.id },
            });
          } catch {}
        }
      }
    });

    await Promise.allSettled(pushPromises);
    return { sentCount, failedCount };
  } catch (error) {
    console.error("sendPushToUsers error:", error);
    return { sentCount: 0, failedCount: 0 };
  }
}

/**
 * Mengirim Push Notification ke seluruh user aktif yang memiliki role tertentu.
 */
export async function sendPushToRole(
  targetRole: "owner" | "admin_kasir" | "staff_gudang" | Role,
  payload: PushPayload,
  excludeUserId?: string | null
): Promise<{ sentCount: number; failedCount: number }> {
  try {
    const r = String(targetRole);
    let roleFilter: Role[] = [];
    if (r === "owner" || r === "super_admin") {
      roleFilter = [Role.owner, Role.super_admin];
    } else if (r === "admin_kasir" || r === "admin") {
      roleFilter = [Role.admin_kasir, Role.admin];
    } else if (r === "staff_gudang") {
      roleFilter = [Role.staff_gudang];
    } else {
      roleFilter = [targetRole as Role];
    }

    const users = await db.user.findMany({
      where: {
        role: { in: roleFilter },
        isActive: true,
      },
      select: { id: true },
    });

    const userIds = users
      .map((u) => u.id)
      .filter((id) => !excludeUserId || id !== excludeUserId);

    return await sendPushToUsers(userIds, payload);
  } catch (err) {
    console.error("sendPushToRole error:", err);
    return { sentCount: 0, failedCount: 0 };
  }
}
