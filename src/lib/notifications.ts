// Klien API notifikasi (bell) + registrasi token push. Reuse Notification model web.
import { api } from "./api";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

/** Daftar notifikasi + jumlah belum dibaca. */
export function getNotifications(limit = 30): Promise<NotificationList> {
  return api<NotificationList>(`/api/v1/notifications?limit=${limit}`, { auth: true });
}

/** Ambil hanya jumlah belum dibaca (untuk badge lonceng) — ringan. */
export async function getUnreadCount(): Promise<number> {
  const res = await getNotifications(1);
  return res.unreadCount;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api(`/api/v1/notifications/${id}/read`, { method: "POST", auth: true });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api("/api/v1/notifications/read-all", { method: "POST", auth: true });
}

export async function registerPushToken(
  token: string,
  platform: string,
  deviceName: string,
): Promise<void> {
  await api("/api/v1/notifications/register-token", {
    method: "POST",
    auth: true,
    body: { token, platform, deviceName },
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api("/api/v1/notifications/unregister-token", {
    method: "POST",
    auth: true,
    body: { token },
  });
}
