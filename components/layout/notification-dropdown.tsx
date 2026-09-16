"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  ShoppingCart,
  Coins,
  CheckCheck,
  Trash2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/actions/notification.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  userRole?: string;
}

export function NotificationDropdown({ userRole }: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const prevUnreadRef = useRef<number>(0);

  const fetchNotifications = useCallback(async (showToastOnNew = false) => {
    try {
      const res = await getNotifications(30);
      if (res) {
        // Tampilkan toast jika ada notifikasi baru masuk
        if (showToastOnNew && res.unreadCount > prevUnreadRef.current && res.notifications.length > 0) {
          const newest = res.notifications[0];
          if (!newest.isRead) {
            toast.info(newest.title, {
              description: newest.message,
              action: newest.link
                ? {
                    label: "Lihat",
                    onClick: () => router.push(newest.link!),
                  }
                : undefined,
            });
          }
        }

        prevUnreadRef.current = res.unreadCount;
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Abaikan error background polling
    }
  }, [router]);

  // Initial fetch & polling setiap 15 detik
  useEffect(() => {
    fetchNotifications(false);

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    const onFocus = () => fetchNotifications(false);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notif.id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationAsRead(notif.id);
    }

    setIsOpen(false);

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    setIsActionLoading(true);
    try {
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      await markAllNotificationsAsRead();
      toast.success("Semua notifikasi ditandai telah dibaca.");
    } catch {
      toast.error("Gagal memperbarui status notifikasi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      await deleteNotification(id);
    } catch {
      toast.error("Gagal menghapus notifikasi.");
    }
  };

  const handleClearAll = async () => {
    setIsActionLoading(true);
    try {
      setNotifications([]);
      setUnreadCount(0);
      await clearAllNotifications();
      toast.success("Riwayat notifikasi berhasil dikosongkan.");
    } catch {
      toast.error("Gagal mengosongkan notifikasi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Format waktu relatif (misal: "2 mnt lalu")
  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSeconds < 60) return "Baru saja";
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Kemarin";
      if (diffDays < 7) return `${diffDays} hari lalu`;

      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  // Ikon dan warna latar berdasarkan jenis notifikasi
  const getNotifMeta = (type: string) => {
    switch (type) {
      case "stock_approval":
        return {
          icon: Package,
          bgClass: "bg-amber-500/10 text-amber-600 border-amber-200/40",
          badge: "Persetujuan",
        };
      case "transaction_out":
        return {
          icon: ShoppingCart,
          bgClass: "bg-blue-500/10 text-blue-600 border-blue-200/40",
          badge: "Transaksi",
        };
      case "expense_out":
        return {
          icon: Wallet,
          bgClass: "bg-rose-500/10 text-rose-600 border-rose-200/40",
          badge: "Pengeluaran",
        };
      case "commission":
        return {
          icon: Coins,
          bgClass: "bg-emerald-500/10 text-emerald-600 border-emerald-200/40",
          badge: "Komisi",
        };
      case "stock_status":
        return {
          icon: Package,
          bgClass: "bg-indigo-500/10 text-indigo-600 border-indigo-200/40",
          badge: "Gudang",
        };
      default:
        return {
          icon: Bell,
          bgClass: "bg-gray-500/10 text-gray-600 border-gray-200/40",
          badge: "Info",
        };
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.isRead;
    return true;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground transition-all"
          aria-label="Buka Notifikasi"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 rounded-2xl shadow-2xl border-border bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Notifikasi</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                {unreadCount} baru
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isActionLoading}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-indigo-600"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Baca Semua
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-border px-4 py-1.5 gap-2 bg-background/50 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-medium transition-colors",
              filter === "all"
                ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/50 dark:text-indigo-300"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-medium transition-colors",
              filter === "unread"
                ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/50 dark:text-indigo-300"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>

        {/* List of Notifications */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <Bell className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {filter === "unread"
                  ? "Tidak ada notifikasi yang belum dibaca"
                  : "Belum ada notifikasi"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                Notifikasi terkait transaksi, barang masuk, dan komisi akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const meta = getNotifMeta(item.type);
              const Icon = meta.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/50",
                    !item.isRead ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                      meta.bgClass
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {meta.badge}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">•</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <h5
                      className={cn(
                        "text-xs leading-tight truncate",
                        !item.isRead
                          ? "font-bold text-foreground"
                          : "font-semibold text-foreground/90"
                      )}
                    >
                      {item.title}
                    </h5>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    {item.link && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 mt-1.5 group-hover:underline">
                        <span>Buka Halaman</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 right-3 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-background" />
                  )}

                  {/* Delete button (on hover / mobile) */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                    title="Hapus notifikasi ini"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs">
            <span className="text-[11px] text-muted-foreground">
              Total {notifications.length} notifikasi
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isActionLoading}
              className="text-[11px] font-medium text-rose-600 hover:underline disabled:opacity-50"
            >
              Kosongkan Semua
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
