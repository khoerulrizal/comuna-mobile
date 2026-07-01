// Notifikasi (bell) — daftar notifikasi in-app + tandai terbaca. Sumber sama dgn
// bell web (model Notification). Push popup diterima via lib/push (Expo Notifications).
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getNotifications, markAllNotificationsRead, markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";

/** Waktu relatif ringkas (id-ID). */
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Ikon per jenis notifikasi (fallback lonceng). */
function iconFor(type: string): IconName {
  const t = type.toLowerCase();
  if (t.includes("leave") || t.includes("cuti")) return "plane";
  if (t.includes("overtime") || t.includes("lembur")) return "clock";
  if (t.includes("reimb") || t.includes("loan") || t.includes("bonus") || t.includes("payslip")) return "money";
  if (t.includes("approval") || t.includes("approve")) return "check";
  return "bell";
}

export default function NotifikasiScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getNotifications();
      setItems(res.items);
      setUnread(res.unreadCount);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  async function onTap(n: AppNotification) {
    if (!n.readAt) {
      setItems((prev) => prev?.map((it) => (it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it)) ?? prev);
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(n.id).catch(() => {});
    }
  }

  async function onReadAll() {
    setItems((prev) => prev?.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })) ?? prev);
    setUnread(0);
    markAllNotificationsRead().catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn} accessibilityRole="button" accessibilityLabel="Kembali">
          <Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Notifikasi</Txt>
          {unread > 0 ? <Txt size={11} weight="semibold" color={colors.brand[600]}>{unread} belum dibaca</Txt> : null}
        </View>
        {unread > 0 ? (
          <Pressable onPress={onReadAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Tandai semua terbaca">
            <Txt size={12} weight="bold" color={colors.brand[600]}>Tandai semua</Txt>
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {loading && !items ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : !items || items.length === 0 ? (
            <Card pad={24} radius={18}>
              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                  <Icon name="bell" size={22} color={colors.brand[500]} strokeWidth={2} />
                </View>
                <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Belum ada notifikasi</Txt>
                <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center" }}>Pemberitahuan pengajuan & pengumuman akan tampil di sini.</Txt>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {items.map((n) => {
                const unreadItem = !n.readAt;
                return (
                  <Pressable key={n.id} onPress={() => onTap(n)} accessibilityRole="button" accessibilityLabel={n.title}>
                    <Card pad={14} radius={16} style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: unreadItem ? colors.brand[100] : colors.neutral[100], alignItems: "center", justifyContent: "center" }}>
                        <Icon name={iconFor(n.type)} size={18} color={unreadItem ? colors.brand[600] : colors.neutral[500]} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Txt size={13.5} weight={unreadItem ? "extrabold" : "bold"} color={colors.neutral[900]} numberOfLines={1} style={{ flex: 1 }}>{n.title}</Txt>
                          {unreadItem ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[500] }} /> : null}
                        </View>
                        {n.body ? <Txt size={12} color={colors.neutral[600]} numberOfLines={2} style={{ marginTop: 2 }}>{n.body}</Txt> : null}
                        <Txt size={10.5} color={colors.neutral[400]} style={{ marginTop: 4 }}>{relTime(n.createdAt)}</Txt>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const headerBar = {
  flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
  paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff",
  borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
};
const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
