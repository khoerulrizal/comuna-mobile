// Tim Saya (manager) — bawahan langsung + kehadiran hari ini + KPI/OKR. Desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getManagerContext, getTeam, attStatusMeta, kpiBandColor,
  type TeamMember, type TeamSummary,
} from "@/lib/manager";

type Filter = "all" | "in" | "late" | "leave";
type Sort = "name" | "kpi" | "hours";

export default function TeamListScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [subtitle, setSubtitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ctx, team] = await Promise.all([getManagerContext(), getTeam()]);
      setSummary(team.summary);
      setMembers(team.members);
      setSubtitle(ctx.departmentName ?? "");
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data tim");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = useMemo(() => {
    const list = members.filter((m) => (filter === "all" ? true : m.status === filter));
    return [...list].sort((a, b) => {
      if (sort === "kpi") return b.kpi - a.kpi;
      if (sort === "hours") return (b.hoursToday || "").localeCompare(a.hoursToday || "");
      return a.name.localeCompare(b.name);
    });
  }, [members, filter, sort]);

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "Semua", n: summary?.count ?? 0 },
    { key: "in", label: "Hadir", n: summary?.present ?? 0 },
    { key: "late", label: "Terlambat", n: summary?.late ?? 0 },
    { key: "leave", label: "Cuti", n: summary?.leave ?? 0 },
  ];
  const nextSort = () => setSort(sort === "name" ? "kpi" : sort === "kpi" ? "hours" : "name");
  const sortLabel = sort === "name" ? "Nama" : sort === "kpi" ? "KPI" : "Jam Kerja";

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Akses Manager</Txt>
          {subtitle ? <Txt size={11} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 1 }}>{subtitle}</Txt> : null}
        </View>
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
              {/* Menu manager */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <MenuTile icon="check" label="Approval" tint={colors.brand[500]} bg={colors.brand[100]} onPress={() => router.push("/manager/approval")} />
                <MenuTile icon="trendingUp" label="Performa" tint={colors.coral[500]} bg={colors.coral[100]} onPress={() => router.push("/manager/performa")} />
                <MenuTile icon="calendar" label="Jadwal Tim" tint={colors.mint[700]} bg={colors.mint[100]} onPress={() => router.push("/manager/jadwal")} />
                <MenuTile icon="doc" label="Laporan" tint={colors.amber[700]} bg={colors.amber[100]} onPress={() => router.push("/manager/laporan")} />
              </View>

              {/* Summary strip */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <SummaryStat label="Anggota" value={summary?.count ?? 0} fg={colors.neutral[900]} />
                <SummaryStat label="Hadir" value={summary?.present ?? 0} fg={colors.mint[700]} accent={colors.mint[100]} />
                <SummaryStat label="Telat" value={summary?.late ?? 0} fg={colors.amber[700]} accent={colors.amber[100]} />
                <SummaryStat label="Cuti" value={summary?.leave ?? 0} fg={colors.brand[700]} accent={colors.brand[100]} />
              </View>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
                {FILTERS.map((f) => {
                  const on = filter === f.key;
                  return (
                    <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[100] }}>
                      <Txt size={12} weight="bold" color={on ? "#fff" : colors.neutral[700]}>{f.label}</Txt>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill, backgroundColor: on ? "rgba(255,255,255,0.25)" : colors.neutral[100] }}>
                        <Txt size={10} weight="extrabold" color={on ? "#fff" : colors.neutral[600]}>{f.n}</Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Sort row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Txt size={12} weight="bold" color={colors.neutral[700]}>{filtered.length} anggota</Txt>
                <Pressable onPress={nextSort} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Txt size={11.5} weight="bold" color={colors.brand[600]}>Urutkan: {sortLabel}</Txt>
                  <Icon name="chevronDown" size={12} color={colors.brand[600]} strokeWidth={2.2} />
                </Pressable>
              </View>

              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="users" size={28} color={colors.brand[600]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Tidak ada anggota</Txt>
                </View>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((m) => <MemberCard key={m.id} m={m} />)}</View>
              )}

              {/* Footer → Performa Tim */}
              {summary && summary.count > 0 ? (
                <Pressable onPress={() => router.push("/manager/performa")} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 14 })}>
                  <View style={{ padding: 12, backgroundColor: colors.brand[100], borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="target" size={16} color={colors.brand[600]} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={12} weight="bold" color={colors.brand[700]}>Rata-rata KPI tim · {summary.avgKpi}/100</Txt>
                      <Txt size={10.5} color={colors.brand[700]} style={{ marginTop: 1, opacity: 0.8 }}>Lihat detail di Performa Tim →</Txt>
                    </View>
                    <Icon name="chevronRight" size={16} color={colors.brand[600]} strokeWidth={2} />
                  </View>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function MenuTile({ icon, label, tint, bg, onPress }: { icon: IconName; label: string; tint: string; bg: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: "48%", opacity: pressed ? 0.8 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={20} color={tint} strokeWidth={2} />
          </View>
          <Txt size={13.5} weight="bold" color={colors.neutral[800]} style={{ flex: 1 }}>{label}</Txt>
        </View>
      </Card>
    </Pressable>
  );
}

function SummaryStat({ label, value, fg, accent }: { label: string; value: number; fg: string; accent?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: accent ?? "#fff", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", borderWidth: accent ? 0 : 1, borderColor: colors.neutral[100] }}>
      <Txt size={20} weight="extrabold" color={fg}>{value}</Txt>
      <Txt size={9.5} weight="bold" color={fg} style={{ marginTop: 4, opacity: accent ? 0.85 : 0.6, letterSpacing: 0.2 }}>{label.toUpperCase()}</Txt>
    </View>
  );
}

function MemberCard({ m }: { m: TeamMember }) {
  const st = attStatusMeta(m.status);
  const perfColor = kpiBandColor(m.kpi);
  return (
    <Card pad={12} radius={16}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View>
          {m.photoUrl ? <Image source={{ uri: m.photoUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} /> : <Avatar name={m.name} size={42} />}
          <View style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: st.dot, borderWidth: 2, borderColor: "#fff" }} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{m.name}</Txt>
          {m.position ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{m.position}</Txt> : null}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: st.tone === "mint" ? colors.mint[100] : st.tone === "amber" ? colors.amber[100] : st.tone === "brand" ? colors.brand[100] : colors.neutral[100] }}>
          <Txt size={9.5} weight="extrabold" color={st.dot} style={{ letterSpacing: 0.2 }}>{st.label.toUpperCase()}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100], borderStyle: "dashed" }}>
        <Metric icon="clock" color={colors.neutral[500]} text={m.hoursToday} />
        <Metric icon="target" color={perfColor} text={`KPI ${m.kpi}`} />
        <Metric icon="trendingUp" color={colors.coral[500]} text={`OKR ${m.okr}%`} />
      </View>
    </Card>
  );
}

function Metric({ icon, color, text }: { icon: "clock" | "target" | "trendingUp"; color: string; text: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon name={icon} size={11} color={color} strokeWidth={2} />
      <Txt size={11} weight="bold" color={colors.neutral[700]}>{text}</Txt>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
