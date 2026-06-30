// OKR Saya — daftar objective + progres (ring). Ikut desain Corelia OkrScreen.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getOkrList, objectiveProgressColor,
  type ObjectiveRow,
} from "@/lib/okr";

export default function OkrListScreen() {
  const insets = useSafeAreaInsets();
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([]);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [activeQuarter, setActiveQuarter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getOkrList();
      setObjectives(res.objectives);
      setQuarters(res.quarters);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data OKR");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = useMemo(
    () => (activeQuarter ? objectives.filter((o) => o.quarter === activeQuarter) : objectives),
    [objectives, activeQuarter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>OKR Saya</Txt>
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
          ) : (
            <>
              {quarters.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                  <QuarterPill label="Semua" on={activeQuarter === null} onPress={() => setActiveQuarter(null)} />
                  {quarters.map((q) => (
                    <QuarterPill key={q} label={q} on={activeQuarter === q} onPress={() => setActiveQuarter(q)} />
                  ))}
                </ScrollView>
              ) : null}

              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="target" size={30} color={colors.brand[600]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada OKR</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Objective yang Anda miliki akan tampil di sini.</Txt>
                </View>
              ) : (
                <View style={{ gap: 14 }}>{filtered.map((o) => <ObjectiveCard key={o.id} o={o} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function QuarterPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: on ? 0 : 1, borderColor: colors.neutral[100] }}>
      <Txt size={12.5} weight="bold" color={on ? "#fff" : colors.neutral[600]}>{label}</Txt>
    </Pressable>
  );
}

function ObjectiveCard({ o }: { o: ObjectiveRow }) {
  return (
    <Pressable onPress={() => router.push(`/okr/${o.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card pad={18} radius={20} elevated>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="target" size={22} color={colors.brand[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.4 }}>OBJECTIVE</Txt>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2, lineHeight: 20 }}>{o.title}</Txt>
            <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 4 }}>{o.quarter}</Txt>
          </View>
        </View>
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 12, backgroundColor: colors.neutral[25], borderRadius: 14 }}>
          <ProgressRing pct={o.progress} />
          <View style={{ flex: 1 }}>
            <Txt size={12} weight="bold" color={colors.neutral[600]}>Progress keseluruhan</Txt>
            <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{o.keyResults.length} key results</Txt>
          </View>
          <Icon name="chevronRight" size={18} color={colors.neutral[300]} strokeWidth={2.2} />
        </View>
      </Card>
    </Pressable>
  );
}

export function ProgressRing({ pct, size = 54 }: { pct: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = objectiveProgressColor(pct);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.neutral[100]} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Txt size={size * 0.24} weight="extrabold" color={color}>{Math.round(pct)}%</Txt>
      </View>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
