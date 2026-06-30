// Feedback — tab Masuk/Terkirim + daftar. Ikut desain Corelia FeedbackScreen.
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getFeedbacks, markFeedbackRead, feedbackTypeMeta, feedbackTimeLabel,
  type FeedbackItem,
} from "@/lib/feedback";

type Box = "inbox" | "sent";

export default function FeedbackListScreen() {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState<Box>("inbox");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (b: Box) => {
    try {
      setError(null);
      const res = await getFeedbacks(b);
      setItems(res.items);
      setUnread(res.unread);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat feedback");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(box); })(); return () => { a = false; }; }, [load, box]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(box); }, [load, box]);

  function switchBox(b: Box) {
    if (b === box) return;
    setBox(b);
    setLoading(true);
    load(b);
  }

  async function onTapItem(it: FeedbackItem) {
    if (box === "inbox" && !it.readAt) {
      try { await markFeedbackRead(it.id); } catch { /* abaikan */ }
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
  }

  const TABS: { key: Box; label: string }[] = [
    { key: "inbox", label: "Masuk" }, { key: "sent", label: "Terkirim" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Feedback</Txt>
        <Pressable onPress={() => router.push("/feedback/kirim")} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={20} color="#fff" strokeWidth={2.6} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 4, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        {TABS.map((t) => {
          const on = box === t.key;
          return (
            <Pressable key={t.key} onPress={() => switchBox(t.key)} style={{ paddingVertical: 12, paddingHorizontal: 6, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: on ? colors.brand[500] : "transparent", flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Txt size={13.5} weight="bold" color={on ? colors.brand[600] : colors.neutral[500]}>{t.label}</Txt>
              {t.key === "inbox" && unread > 0 ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill, backgroundColor: colors.brand[100] }}>
                  <Txt size={10} weight="extrabold" color={colors.brand[700]}>{unread}</Txt>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="heart" size={28} color={colors.brand[600]} strokeWidth={1.8} />
              </View>
              <Txt size={14} weight="bold" color={colors.neutral[700]}>{box === "inbox" ? "Belum ada feedback masuk" : "Belum ada feedback terkirim"}</Txt>
              <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>{box === "inbox" ? "Apresiasi & saran dari rekan akan muncul di sini." : "Kirim apresiasi atau saran untuk rekan kerja Anda."}</Txt>
            </View>
          ) : (
            <View style={{ gap: 10 }}>{items.map((it) => <FeedbackCard key={it.id} it={it} box={box} onPress={() => onTapItem(it)} />)}</View>
          )}
        </ScrollView>
      )}

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.push("/feedback/kirim")}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.6} />
            <Txt size={14} weight="extrabold" color="#fff">Kirim Feedback</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function FeedbackCard({ it, box, onPress }: { it: FeedbackItem; box: Box; onPress: () => void }) {
  const meta = feedbackTypeMeta(it.type);
  const unread = box === "inbox" && !it.readAt;
  const cp = it.counterpart;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card pad={14} radius={18} style={{ borderLeftWidth: 3, borderLeftColor: unread ? colors.brand[500] : "transparent" }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {cp.photoUrl ? (
            <Image source={{ uri: cp.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <Avatar name={cp.name} size={40} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{box === "sent" ? `Untuk ${cp.name}` : cp.name}</Txt>
              {unread ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand[500] }} /> : null}
            </View>
            <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>
              {cp.position ? `${cp.position} · ` : ""}{feedbackTimeLabel(it.createdAt)}
            </Txt>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              <Pill tone={meta.tone}>
                <Icon name={meta.icon} size={11} color={meta.color} strokeWidth={2.4} />
                <Txt size={11} weight="bold" color={meta.color}>{meta.label}</Txt>
              </Pill>
              {it.category ? <Pill tone="neutral">{it.category}</Pill> : null}
            </View>
            <Txt size={12.5} color={colors.neutral[700]} style={{ marginTop: 8, lineHeight: 18 }}>{it.message}</Txt>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
