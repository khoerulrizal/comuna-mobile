// KPI Saya — daftar KPI yang ditugaskan + ringkasan skor. Ikut desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getKpiList, kpiPeriodLabel, kpiStatusPill, scoreColor,
  type KpiAssignmentRow, type KpiStatus, type KpiSummary,
} from "@/lib/kpi";

type Filter = "ALL" | "ACTIVE" | "COMPLETED" | "NOT_STARTED";

export default function KpiListScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [rows, setRows] = useState<KpiAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getKpiList();
      setSummary(res.summary);
      setRows(res.assignments);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data KPI");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const counts = useMemo(() => ({
    ALL: rows.length,
    ACTIVE: rows.filter((r) => r.status === "ACTIVE").length,
    COMPLETED: rows.filter((r) => r.status === "COMPLETED").length,
    NOT_STARTED: rows.filter((r) => r.status === "NOT_STARTED").length,
  }), [rows]);
  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.status === (filter as KpiStatus));
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" }, { key: "ACTIVE", label: "Berjalan" },
    { key: "COMPLETED", label: "Selesai" }, { key: "NOT_STARTED", label: "Belum mulai" },
  ];
  const avg = summary?.avgScore ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>KPI Saya</Txt>
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
              {summary && summary.count > 0 ? (
                <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 20 }}>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.8)" style={{ letterSpacing: 0.5 }}>RATA-RATA SKOR</Txt>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <Txt size={44} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{avg}</Txt>
                    <Txt size={15} color="rgba(255,255,255,0.7)">/ 100</Txt>
                  </View>
                  <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                    <View style={{ width: `${Math.min(100, avg)}%`, height: "100%", backgroundColor: "#fff", borderRadius: 4 }} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
                    <HeroStat n={summary.active} label="Berjalan" />
                    <HeroStat n={summary.completed} label="Selesai" />
                    <HeroStat n={summary.count} label="Total" />
                  </View>
                </LinearGradient>
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 14 }}>
                {FILTERS.map((f) => {
                  const on = filter === f.key;
                  return (
                    <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: on ? colors.neutral[900] : "#fff", borderWidth: on ? 0 : 1, borderColor: colors.neutral[100] }}>
                      <Txt size={12} weight="bold" color={on ? "#fff" : colors.neutral[700]}>{f.label}</Txt>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill, backgroundColor: on ? "rgba(255,255,255,0.2)" : colors.neutral[100] }}>
                        <Txt size={10} weight="extrabold" color={on ? "#fff" : colors.neutral[600]}>{counts[f.key]}</Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="target" size={30} color={colors.brand[600]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada KPI</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>KPI yang ditugaskan ke Anda akan muncul di sini.</Txt>
                </View>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((r) => <KpiCard key={r.id} r={r} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function HeroStat({ n, label }: { n: number; label: string }) {
  return (
    <View>
      <Txt size={18} weight="extrabold" color="#fff">{n}</Txt>
      <Txt size={10.5} weight="semibold" color="rgba(255,255,255,0.75)" style={{ marginTop: 1 }}>{label}</Txt>
    </View>
  );
}

function KpiCard({ r }: { r: KpiAssignmentRow }) {
  const pill = kpiStatusPill(r.status);
  const barColor = scoreColor(r.scorePct);
  return (
    <Pressable onPress={() => router.push(`/kpi/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card pad={16} radius={18}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt size={14.5} weight="extrabold" color={colors.neutral[900]}>{r.kpiName}</Txt>
            <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 2 }}>
              {kpiPeriodLabel(r.period, r.month, r.year)} · {r.indicatorCount} indikator
            </Txt>
          </View>
          <Pill tone={pill.tone}>{pill.label}</Pill>
        </View>
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, r.scorePct)}%`, height: "100%", backgroundColor: barColor, borderRadius: 4 }} />
          </View>
          <Txt size={14} weight="extrabold" color={barColor} style={{ minWidth: 42, textAlign: "right" }}>{r.scorePct}%</Txt>
        </View>
      </Card>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
