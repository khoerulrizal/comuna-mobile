// Peringkat Anggota (manager) — podium top-3 + daftar berperingkat + delta. Desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getTeamPerformance, getManagerContext, MONTHS_ID, kpiBand, BAND_META,
  type RankingMember, type TeamPerformance,
} from "@/lib/manager";

type Band = "all" | "excellent" | "good" | "risk";
type SortKey = "kpi" | "okr" | "name";

export default function TeamRankingScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<TeamPerformance | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<Band>("all");
  const [sort, setSort] = useState<SortKey>("kpi");

  const load = useCallback(async (m: number) => {
    try {
      setError(null);
      const [perf, ctx] = await Promise.all([
        getTeamPerformance({ year: currentYear, month: m }),
        getManagerContext().catch(() => null),
      ]);
      setData(perf);
      setSubtitle([ctx?.departmentName, `${MONTHS_ID[m - 1]} ${currentYear}`].filter(Boolean).join(" · "));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat peringkat");
    } finally { setLoading(false); setRefreshing(false); }
  }, [currentYear]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(month); })(); return () => { a = false; }; }, [load, month]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(month); }, [load, month]);

  function pickMonth(m: number) { if (m > currentMonth || m === month) return; setMonth(m); setLoading(true); load(m); }

  const ranking = data?.ranking ?? []; // sudah urut KPI desc dari server
  const rankOf = useMemo(() => {
    const map = new Map<string, number>();
    ranking.forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [ranking]);

  const counts = useMemo(() => ({
    all: ranking.length,
    excellent: ranking.filter((m) => kpiBand(m.kpi) === "excellent").length,
    good: ranking.filter((m) => kpiBand(m.kpi) === "good").length,
    risk: ranking.filter((m) => kpiBand(m.kpi) === "risk").length,
  }), [ranking]);

  const list = useMemo(() => {
    const f = band === "all" ? ranking : ranking.filter((m) => kpiBand(m.kpi) === band);
    return [...f].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "okr") return b.okr - a.okr;
      return b.kpi - a.kpi;
    });
  }, [ranking, band, sort]);

  const top3 = ranking.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Peringkat Anggota</Txt>
          {subtitle ? <Txt size={11} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 1 }}>{subtitle}</Txt> : null}
        </View>
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
          {/* Period */}
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 6 }}>
            <Txt size={10.5} weight="extrabold" color={colors.neutral[500]} style={{ letterSpacing: 0.4 }}>PERIODE · {currentYear}</Txt>
            <Txt size={11} weight="bold" color={colors.brand[600]}>{MONTHS_ID[month - 1]} {currentYear}</Txt>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100] }} contentContainerStyle={{ gap: 6, padding: 4 }}>
            {MONTHS_ID.map((mn, i) => {
              const mo = i + 1; const on = mo === month; const future = mo > currentMonth;
              return (
                <Pressable key={mn} onPress={() => pickMonth(mo)} disabled={future} style={{ minWidth: 52, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? colors.brand[500] : "transparent", alignItems: "center" }}>
                  <Txt size={11.5} weight="bold" color={on ? "#fff" : future ? colors.neutral[300] : colors.neutral[700]}>{mn}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Podium */}
          {top3.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon name="star" size={16} color={colors.amber[500]} strokeWidth={2.2} fill={colors.amber[500]} />
                <Txt size={15} weight="extrabold" color={colors.neutral[800]}>Top 3 Bulan Ini</Txt>
              </View>
              <LinearGradient colors={[colors.amber[100], colors.brand[100]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 14, paddingTop: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <PodiumCol member={top3[1]} rank={2} height={70} medal={colors.neutral[400]} />
                  <PodiumCol member={top3[0]} rank={1} height={92} medal={colors.amber[500]} hero />
                  <PodiumCol member={top3[2]} rank={3} height={54} medal="#cd7f32" />
                </View>
              </LinearGradient>
            </View>
          ) : null}

          {/* Sort */}
          <Txt size={10.5} weight="extrabold" color={colors.neutral[500]} style={{ letterSpacing: 0.4, marginTop: 16, marginBottom: 6, paddingHorizontal: 2 }}>URUTKAN</Txt>
          <View style={{ flexDirection: "row", gap: 6, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.neutral[100] }}>
            {([["kpi", "KPI"], ["okr", "OKR"], ["name", "Nama"]] as [SortKey, string][]).map(([k, l]) => {
              const on = sort === k;
              return (
                <Pressable key={k} onPress={() => setSort(k)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: on ? colors.brand[500] : "transparent", alignItems: "center" }}>
                  <Txt size={11.5} weight="bold" color={on ? "#fff" : colors.neutral[600]}>{l}</Txt>
                </Pressable>
              );
            })}
          </View>

          {/* Band filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 12 }}>
            {([["all", "Semua", colors.neutral[700], colors.neutral[100]], ["excellent", "Excellent", colors.mint[700], colors.mint[100]], ["good", "Good", colors.brand[700], colors.brand[100]], ["risk", "Risk", colors.coral[700], colors.coral[100]]] as [Band, string, string, string][]).map(([k, l, c, bg]) => {
              const on = band === k;
              return (
                <Pressable key={k} onPress={() => setBand(k)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: on ? c : "#fff", borderWidth: 1, borderColor: on ? c : colors.neutral[100] }}>
                  <Txt size={11.5} weight="bold" color={on ? "#fff" : c}>{l}</Txt>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: on ? "rgba(255,255,255,0.22)" : bg }}>
                    <Txt size={10} weight="extrabold" color={on ? "#fff" : c}>{counts[k]}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ paddingHorizontal: 2, marginBottom: 8 }}>{list.length} dari {counts.all} anggota</Txt>

          {/* List */}
          <Card pad={0} radius={16}>
            {list.length === 0 ? (
              <Txt size={12} color={colors.neutral[500]} weight="semibold" style={{ textAlign: "center", paddingVertical: 32 }}>Tidak ada anggota di kategori ini.</Txt>
            ) : list.map((m, i) => (
              <RankRow key={m.id} m={m} rank={rankOf.get(m.id) ?? i + 1} last={i === list.length - 1} />
            ))}
          </Card>

          {/* Footer note */}
          <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.brand[100], flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Icon name="info" size={14} color={colors.brand[600]} strokeWidth={2} />
            </View>
            <Txt size={11} color={colors.brand[700]} weight="semibold" style={{ flex: 1, lineHeight: 16 }}>
              Peringkat dihitung dari skor KPI bulanan. Delta vs bulan lalu hanya muncul bila anggota sudah aktif di periode sebelumnya.
            </Txt>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PodiumCol({ member, rank, height, medal, hero }: { member: RankingMember | undefined; rank: number; height: number; medal: string; hero?: boolean }) {
  if (!member) return <View style={{ flex: hero ? 1.1 : 1 }} />;
  return (
    <View style={{ flex: hero ? 1.1 : 1, alignItems: "center", gap: 6 }}>
      <View>
        {member.photoUrl ? <Image source={{ uri: member.photoUrl }} style={{ width: hero ? 56 : 44, height: hero ? 56 : 44, borderRadius: hero ? 28 : 22 }} /> : <Avatar name={member.name} size={hero ? 56 : 44} />}
        <View style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: medal, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
          <Txt size={10} weight="extrabold" color="#fff">{rank}</Txt>
        </View>
      </View>
      <View style={{ alignItems: "center", minHeight: 30 }}>
        <Txt size={hero ? 12 : 11} weight="extrabold" color={colors.neutral[900]}>{member.name.split(" ")[0]}</Txt>
        {member.position ? <Txt size={9.5} color={colors.neutral[500]} numberOfLines={1} style={{ marginTop: 1 }}>{member.position}</Txt> : null}
      </View>
      {hero ? (
        <LinearGradient colors={[colors.brand[500], colors.brand[700]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: "100%", height, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: "center", justifyContent: "center", padding: 6 }}>
          <Txt size={22} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{member.kpi}</Txt>
          <Txt size={9} weight="bold" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.3 }}>KPI</Txt>
        </LinearGradient>
      ) : (
        <View style={{ width: "100%", height, backgroundColor: "#fff", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderWidth: 1, borderColor: colors.neutral[100], alignItems: "center", justifyContent: "center", padding: 6 }}>
          <Txt size={17} weight="extrabold" color={colors.neutral[900]}>{member.kpi}</Txt>
          <Txt size={9} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>KPI</Txt>
        </View>
      )}
    </View>
  );
}

function RankRow({ m, rank, last }: { m: RankingMember; rank: number; last: boolean }) {
  const bandKey = kpiBand(m.kpi);
  const meta = BAND_META[bandKey];
  const isMedal = rank <= 3;
  const medalBg = rank === 1 ? colors.amber[500] : rank === 2 ? colors.neutral[400] : "#cd7f32";
  const delta = m.delta;
  const deltaFlat = delta === 0;
  const deltaUp = (delta ?? 0) > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[50] }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isMedal ? medalBg : colors.neutral[50], alignItems: "center", justifyContent: "center" }}>
        <Txt size={11} weight="extrabold" color={isMedal ? "#fff" : colors.neutral[500]}>{rank}</Txt>
      </View>
      {m.photoUrl ? <Image source={{ uri: m.photoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} /> : <Avatar name={m.name} size={36} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Txt size={12.5} weight="extrabold" color={colors.neutral[900]} numberOfLines={1} style={{ flexShrink: 1 }}>{m.name}</Txt>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: meta.bg }}>
            <Txt size={9} weight="extrabold" color={meta.color} style={{ letterSpacing: 0.3 }}>{meta.label.toUpperCase()}</Txt>
          </View>
        </View>
        {m.position ? <Txt size={10.5} color={colors.neutral[500]} numberOfLines={1} style={{ marginTop: 1 }}>{m.position}</Txt> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
          <Txt size={10.5} weight="bold" color={colors.neutral[600]}>OKR <Txt size={10.5} weight="extrabold" color={colors.neutral[900]}>{m.okr}%</Txt></Txt>
          {delta != null ? (
            <Txt size={10.5} weight="bold" color={deltaFlat ? colors.neutral[500] : deltaUp ? colors.mint[700] : colors.coral[700]}>
              {deltaFlat ? "—" : deltaUp ? "↑" : "↓"} {deltaFlat ? "0" : Math.abs(delta)} vs bln lalu
            </Txt>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Txt size={18} weight="extrabold" color={meta.color} style={{ lineHeight: 20 }}>{m.kpi}</Txt>
        <Txt size={9.5} weight="bold" color={colors.neutral[400]} style={{ marginTop: 2, letterSpacing: 0.3 }}>KPI</Txt>
      </View>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
