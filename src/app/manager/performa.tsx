// Performa Tim (manager) — agregat KPI/OKR, distribusi, peringkat, review. Desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getTeamPerformance, kpiBandColor, MONTHS_ID,
  type TeamPerformance, type RankingMember,
} from "@/lib/manager";

export default function TeamPerformanceScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<TeamPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (y: number, m: number) => {
    try {
      setError(null);
      setData(await getTeamPerformance({ year: y, month: m }));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat performa tim");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(year, month); })(); return () => { a = false; }; }, [load, year, month]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(year, month); }, [load, year, month]);

  function pickMonth(m: number) {
    if (year === currentYear && m > currentMonth) return; // bulan depan tak bisa dipilih
    if (m === month) return;
    setMonth(m); setLoading(true); load(year, m);
  }
  function changeYear(delta: number) {
    const ny = Math.min(currentYear, year + delta);
    if (ny === year) return;
    const nm = ny === currentYear && month > currentMonth ? currentMonth : month;
    setYear(ny); setMonth(nm); setLoading(true); load(ny, nm);
  }

  const total = data?.summary?.count ?? 0;
  const dist = data?.distribution ?? { excellent: 0, good: 0, risk: 0 };
  const distTotal = Math.max(1, dist.excellent + dist.good + dist.risk);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ flex: 1, textAlign: "center" }}>Performa Tim</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ada data"}</Txt>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Filter periode — tahun di atas, lalu bulan (mirip Laporan Tim) */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Txt size={10.5} weight="extrabold" color={colors.neutral[500]} style={{ letterSpacing: 0.4 }}>TAHUN</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable onPress={() => changeYear(-1)} hitSlop={8} style={stepBtn}><Icon name="chevronLeft" size={14} color={colors.neutral[700]} strokeWidth={2.4} /></Pressable>
              <Txt size={13} weight="extrabold" color={colors.neutral[800]} style={{ minWidth: 44, textAlign: "center" }}>{year}</Txt>
              <Pressable onPress={() => changeYear(1)} hitSlop={8} disabled={year >= currentYear} style={[stepBtn, year >= currentYear ? { opacity: 0.4 } : null]}><Icon name="chevronRight" size={14} color={colors.neutral[700]} strokeWidth={2.4} /></Pressable>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
            {MONTHS_ID.map((mn, i) => {
              const mo = i + 1;
              const on = mo === month;
              const future = year === currentYear && mo > currentMonth;
              return (
                <Pressable key={mn} onPress={() => pickMonth(mo)} disabled={future} style={{ minWidth: 46, alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[100], opacity: future ? 0.4 : 1 }}>
                  <Txt size={12.5} weight="bold" color={on ? "#fff" : colors.neutral[600]}>{mn}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Hero avg KPI */}
          <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 14, borderRadius: 22, padding: 18 }}>
            <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.5 }}>RATA-RATA KPI TIM</Txt>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <Txt size={40} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{data.summary?.avgKpi ?? 0}</Txt>
              <Txt size={16} weight="bold" color="rgba(255,255,255,0.7)">/100</Txt>
            </View>
            <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, data.summary?.avgKpi ?? 0)}%`, height: "100%", backgroundColor: "#fff", borderRadius: 4 }} />
            </View>
          </LinearGradient>

          {/* Secondary stats */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Card pad={14} radius={18}>
                <Icon name="trendingUp" size={18} color={colors.coral[500]} strokeWidth={2} />
                <Txt size={11} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 8 }}>Rata-rata OKR</Txt>
                <Txt size={20} weight="extrabold" color={colors.neutral[900]}>{data.summary?.avgOkr ?? 0}%</Txt>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card pad={14} radius={18}>
                <Icon name="star" size={18} color={colors.amber[500]} strokeWidth={2} />
                <Txt size={11} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 8 }}>Review {MONTHS_ID[month - 1]}</Txt>
                <Txt size={20} weight="extrabold" color={colors.neutral[900]}>{data.review.done}/{data.review.total}</Txt>
                <Txt size={10.5} weight="bold" color={colors.amber[700]} style={{ marginTop: 2 }}>{Math.max(0, data.review.total - data.review.done)} belum diisi</Txt>
              </Card>
            </View>
          </View>

          {/* Top performer → buka Peringkat Anggota */}
          {data.top ? (
            <Pressable onPress={() => router.push("/manager/peringkat")} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <View style={{ marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: colors.amber[100], flexDirection: "row", alignItems: "center", gap: 12 }}>
                {data.top.photoUrl ? <Image source={{ uri: data.top.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <Avatar name={data.top.name} size={44} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="star" size={13} color={colors.amber[700]} strokeWidth={2.4} fill={colors.amber[500]} />
                    <Txt size={10.5} weight="extrabold" color={colors.amber[700]} style={{ letterSpacing: 0.4 }}>TOP PERFORMER</Txt>
                  </View>
                  <Txt size={14} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{data.top.name}</Txt>
                  <Txt size={11} color={colors.neutral[600]} style={{ marginTop: 1 }}>KPI {data.top.kpi} · OKR {data.top.okr}%</Txt>
                </View>
                <Icon name="chevronRight" size={18} color={colors.amber[700]} strokeWidth={2.2} />
              </View>
            </Pressable>
          ) : null}

          {/* Distribution */}
          <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 18, marginBottom: 10 }}>Distribusi KPI</Txt>
          <Card pad={14} radius={16}>
            <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.neutral[100] }}>
              <View style={{ width: `${(dist.excellent / distTotal) * 100}%`, backgroundColor: colors.mint[500] }} />
              <View style={{ width: `${(dist.good / distTotal) * 100}%`, backgroundColor: colors.brand[500] }} />
              <View style={{ width: `${(dist.risk / distTotal) * 100}%`, backgroundColor: colors.coral[500] }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <DistLegend label="Excellent" sub="≥ 85" n={dist.excellent} color={colors.mint[500]} />
              <DistLegend label="Good" sub="70–84" n={dist.good} color={colors.brand[500]} />
              <DistLegend label="Risk" sub="< 70" n={dist.risk} color={colors.coral[500]} />
            </View>
          </Card>

          {/* Ranking */}
          <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 18, marginBottom: 10 }}>Peringkat Anggota</Txt>
          <Card pad={0} radius={16}>
            {data.ranking.map((t, i) => <RankRow key={t.id} t={t} rank={i + 1} last={i === data.ranking.length - 1} />)}
          </Card>

          {/* Team OKR */}
          {data.teamOkr.length > 0 ? (
            <>
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 18, marginBottom: 10 }}>Tujuan Tim · OKR</Txt>
              <View style={{ gap: 10 }}>
                {data.teamOkr.map((o, i) => (
                  <Card key={i} pad={14} radius={16}>
                    <Txt size={9.5} weight="extrabold" color={colors.brand[700]} style={{ letterSpacing: 0.3 }}>OBJECTIVE {i + 1}</Txt>
                    <Txt size={13} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2, lineHeight: 18 }}>{o.title}</Txt>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
                        <View style={{ width: `${Math.min(100, o.progress)}%`, height: "100%", backgroundColor: colors.brand[500], borderRadius: 4 }} />
                      </View>
                      <Txt size={12} weight="extrabold" color={colors.brand[700]}>{o.progress}%</Txt>
                    </View>
                    <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 6 }}>{o.krCount} key result · {o.ownerName}</Txt>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <Txt size={11} color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 16 }}>
            Menampilkan {total} bawahan langsung.
          </Txt>
        </ScrollView>
      )}
    </View>
  );
}

function DistLegend({ label, sub, n, color }: { label: string; sub: string; n: number; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>{n}</Txt>
      </View>
      <Txt size={10.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 2 }}>{label}</Txt>
      <Txt size={9.5} color={colors.neutral[400]}>{sub}</Txt>
    </View>
  );
}

function RankRow({ t, rank, last }: { t: RankingMember; rank: number; last: boolean }) {
  const color = kpiBandColor(t.kpi);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[50] }}>
      <Txt size={11} weight="extrabold" color={colors.neutral[400]} style={{ width: 22, textAlign: "center" }}>#{rank}</Txt>
      {t.photoUrl ? <Image source={{ uri: t.photoUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} /> : <Avatar name={t.name} size={32} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={12.5} weight="bold" color={colors.neutral[900]}>{t.name}</Txt>
        {t.position ? <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{t.position}</Txt> : null}
      </View>
      <View style={{ width: 62, alignItems: "flex-end" }}>
        <Txt size={14} weight="extrabold" color={color}>{t.kpi}</Txt>
        <Txt size={9.5} weight="semibold" color={colors.neutral[400]} style={{ marginTop: 1 }}>OKR {t.okr}%</Txt>
      </View>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
const stepBtn = {
  width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: colors.neutral[200],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
