"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { sendPushToUsers, sendPushToRole } from "@/lib/push-notification";

export type NotificationType =
  | "stock_approval"
  | "transaction_out"
  | "commission"
  | "stock_status"
  | "general";

export interface CreateNotificationParams {
  userId?: string | null;
  targetRole?: "owner" | "admin_kasir" | "staff_gudang";
  title: string;
  message: string;
  type: NotificationType | string;
  link?: string | null;
  excludeUserId?: string | null;
}

/**
 * Membuat notifikasi baru.
 * Jika `targetRole` disertakan, notifikasi dibuat untuk seluruh user aktif yang memiliki role tersebut.
 * Jika `userId` disertakan, dibuat langsung untuk user terkait.
 * Jika `excludeUserId` disertakan, user ID tersebut tidak akan menerima notifikasi.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { userId, targetRole, title, message, type, link, excludeUserId } = params;

    const userIdsToNotify = new Set<string>();

    if (userId) {
      userIdsToNotify.add(userId);
    }

    if (targetRole) {
      let roleFilter: Role[] = [];
      if (targetRole === "owner") {
        roleFilter = [Role.owner, Role.super_admin];
      } else if (targetRole === "admin_kasir") {
        roleFilter = [Role.admin_kasir, Role.admin];
      } else if (targetRole === "staff_gudang") {
        roleFilter = [Role.staff_gudang];
      }

      const users = await db.user.findMany({
        where: {
          role: { in: roleFilter },
          isActive: true,
        },
        select: { id: true },
      });

      users.forEach((u) => userIdsToNotify.add(u.id));
    }

    if (excludeUserId) {
      userIdsToNotify.delete(excludeUserId);
    }

    if (userIdsToNotify.size === 0 && !userId) {
      // Jika tidak ada user spesifik, simpan notifikasi umum dengan targetRole
      await db.notification.create({
        data: {
          title,
          message,
          type,
          link: link || null,
          targetRole: targetRole ? (targetRole as Role) : null,
        },
      });

      if (targetRole) {
        sendPushToRole(targetRole, {
          title,
          body: message,
          url: link || "/dashboard",
          tag: `notif-${type}-${Date.now()}`,
        }).catch(() => {});
      }

      return { success: true };
    }

    const records = Array.from(userIdsToNotify).map((targetUid) => ({
      userId: targetUid,
      targetRole: targetRole ? (targetRole as Role) : null,
      title,
      message,
      type,
      link: link || null,
    }));

    await db.notification.createMany({
      data: records,
    });

    // Kirim Web Push Notification langsung ke HP yang terdaftar
    const finalUserIds = Array.from(userIdsToNotify);
    if (finalUserIds.length > 0) {
      sendPushToUsers(finalUserIds, {
        title,
        body: message,
        url: link || "/dashboard",
        tag: `notif-${type}-${Date.now()}`,
      }).catch((pushErr) => {
        console.warn("sendPushToUsers background warning:", pushErr);
      });
    }

    return { success: true };
  } catch (error) {
    console.error("createNotification error:", error);
    return { error: "Gagal membuat notifikasi." };
  }
}

/**
 * Mengambil daftar notifikasi untuk user yang sedang login beserta unreadCount
 */
export async function getNotifications(limit = 20) {
  try {
    const user = await requireAuth();

    // Tentukan role filter yang relevan untuk user ini
    let matchingRole: Role[] = [];
    if (user.role === "owner" || user.role === "super_admin") {
      matchingRole = [Role.owner, Role.super_admin];
    } else if (user.role === "admin_kasir" || user.role === "admin") {
      matchingRole = [Role.admin_kasir, Role.admin];
    } else if (user.role === "staff_gudang") {
      matchingRole = [Role.staff_gudang];
    }

    const where = {
      OR: [
        { userId: user.id },
        {
          userId: null,
          targetRole: { in: matchingRole },
        },
      ],
    };

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  } catch (error) {
    console.error("getNotifications error:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Menandai satu notifikasi sebagai sudah dibaca
 */
export async function markNotificationAsRead(id: string) {
  try {
    const user = await requireAuth();

    await db.notification.updateMany({
      where: {
        id,
        OR: [{ userId: user.id }, { userId: null }],
      },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    return { error: "Gagal memperbarui notifikasi." };
  }
}

/**
 * Menandai seluruh notifikasi user sebagai sudah dibaca
 */
export async function markAllNotificationsAsRead() {
  try {
    const user = await requireAuth();

    let matchingRole: Role[] = [];
    if (user.role === "owner" || user.role === "super_admin") {
      matchingRole = [Role.owner, Role.super_admin];
    } else if (user.role === "admin_kasir" || user.role === "admin") {
      matchingRole = [Role.admin_kasir, Role.admin];
    } else if (user.role === "staff_gudang") {
      matchingRole = [Role.staff_gudang];
    }

    await db.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { userId: user.id },
          {
            userId: null,
            targetRole: { in: matchingRole },
          },
        ],
      },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    return { error: "Gagal memperbarui semua notifikasi." };
  }
}

/**
 * Menghapus satu notifikasi
 */
export async function deleteNotification(id: string) {
  try {
    const user = await requireAuth();

    await db.notification.deleteMany({
      where: {
        id,
        OR: [{ userId: user.id }, { userId: null }],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("deleteNotification error:", error);
    return { error: "Gagal menghapus notifikasi." };
  }
}

/**
 * Menghapus seluruh riwayat notifikasi user
 */
export async function clearAllNotifications() {
  try {
    const user = await requireAuth();

    let matchingRole: Role[] = [];
    if (user.role === "owner" || user.role === "super_admin") {
      matchingRole = [Role.owner, Role.super_admin];
    } else if (user.role === "admin_kasir" || user.role === "admin") {
      matchingRole = [Role.admin_kasir, Role.admin];
    } else if (user.role === "staff_gudang") {
      matchingRole = [Role.staff_gudang];
    }

    await db.notification.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          {
            userId: null,
            targetRole: { in: matchingRole },
          },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    return { error: "Gagal mengosongkan notifikasi." };
  }
}
