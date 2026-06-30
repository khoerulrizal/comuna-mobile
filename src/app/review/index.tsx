// Review — daftar tugas penilaian (self & reviewer). Ikut desain Corelia ReviewScreen.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getReviewTasks, reviewStatusMeta, methodLabel, reviewDateLabel, daysLeft,
  type ReviewTask,
} from "@/lib/review";

export default function ReviewListScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getReviewTasks();
      setTasks(res.tasks);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat tugas review");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const active = tasks.filter((t) => t.fillable && t.status !== "COMPLETED");
  const others = tasks.filter((t) => !t.fillable || t.status === "COMPLETED");
  const pendingCount = active.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Review</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : tasks.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="edit" size={28} color={colors.brand[600]} strokeWidth={1.8} />
              </View>
              <Txt size={14} weight="bold" color={colors.neutral[700]}>Tidak ada tugas review</Txt>
              <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Saat ada siklus review aktif, tugas Anda akan muncul di sini.</Txt>
            </View>
          ) : (
            <>
              {pendingCount > 0 ? (
                <LinearGradient colors={[colors.brand[700], colors.brand[500], colors.coral[500]]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 20, marginBottom: 18 }}>
                  <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.2)" }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
                    <Txt size={10} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>PERIODE AKTIF</Txt>
                  </View>
                  <Txt size={19} weight="extrabold" color="#fff" style={{ marginTop: 12, lineHeight: 25 }}>
                    {pendingCount} review menunggu diselesaikan
                  </Txt>
                  <Txt size={12.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>Lengkapi sebelum tenggat masing-masing siklus.</Txt>
                </LinearGradient>
              ) : null}

              {active.length > 0 ? (
                <>
                  <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginBottom: 10 }}>Perlu diisi</Txt>
                  <View style={{ gap: 10 }}>{active.map((t) => <TaskCard key={t.participantId} t={t} />)}</View>
                </>
              ) : null}

              {others.length > 0 ? (
                <>
                  <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 20, marginBottom: 10 }}>Lainnya</Txt>
                  <View style={{ gap: 10 }}>{others.map((t) => <TaskCard key={t.participantId} t={t} />)}</View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TaskCard({ t }: { t: ReviewTask }) {
  const meta = reviewStatusMeta(t.status);
  const pct = t.totalQuestions > 0 ? Math.round((t.answered / t.totalQuestions) * 100) : 0;
  const dl = daysLeft(t.endDate);
  return (
    <Pressable onPress={() => router.push(`/review/${t.participantId}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card pad={16} radius={18}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Txt size={14.5} weight="extrabold" color={colors.neutral[900]}>{t.isSelf ? "Self Review" : t.revieweeName}</Txt>
              <Pill tone="brand">{methodLabel(t.method)}</Pill>
            </View>
            <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 2 }}>{t.cycleName}</Txt>
          </View>
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: t.status === "COMPLETED" ? colors.mint[500] : colors.brand[500], borderRadius: 3 }} />
          </View>
          <Txt size={11.5} weight="bold" color={colors.neutral[600]}>{t.answered}/{t.totalQuestions}</Txt>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <Txt size={11.5} color={colors.neutral[500]}>
            {t.endDate ? `Tenggat ${reviewDateLabel(t.endDate)}` : "Tanpa tenggat"}
            {dl !== null && dl >= 0 && t.fillable ? ` · sisa ${dl} hari` : ""}
          </Txt>
          {t.fillable ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Txt size={12} weight="bold" color={colors.brand[700]}>{t.status === "COMPLETED" ? "Lihat" : "Isi"}</Txt>
              <Icon name="chevronRight" size={14} color={colors.brand[700]} strokeWidth={2.4} />
            </View>
          ) : (
            <Txt size={11.5} weight="semibold" color={colors.neutral[400]}>{t.cycleStatus === "UPCOMING" ? "Akan datang" : "Ditutup"}</Txt>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
