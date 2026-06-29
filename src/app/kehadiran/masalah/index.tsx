// Masalah Kehadiran — daftar pengajuan koreksi + status berjenjang. Ikut desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { categoryMeta, getIssues, statusMeta, type IssueItem, type IssueList, type IssueStatus } from "@/lib/attendance-issues";

type Filter = "ALL" | IssueStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
];

export default function MasalahKehadiranScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<IssueList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try { setError(null); setData(await getIssues()); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat masalah kehadiran"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const shown = useMemo(
    () => (data ? (filter === "ALL" ? data.issues : data.issues.filter((i) => i.status === filter)) : []),
    [data, filter],
  );
  const c = data?.counts;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Masalah Kehadiran</Txt>
          {c ? <Txt size={11} weight="semibold" color={colors.neutral[400]}>{c.total} catatan · {c.pending} menunggu</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading && !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : data ? (
            <>
              {/* Ringkasan status */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <StatusTile n={c!.pending} label="Pending" color={colors.amber[700]} bg={colors.amber[100]} icon="clock" />
                <StatusTile n={c!.approved} label="Disetujui" color={colors.mint[700]} bg={colors.mint[100]} icon="check" />
                <StatusTile n={c!.rejected} label="Ditolak" color={colors.coral[700]} bg={colors.coral[100]} icon="close" />
              </View>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  const badge = f.key === "PENDING" ? c!.pending : 0;
                  return (
                    <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? colors.neutral[900] : "#fff", borderWidth: active ? 0 : 1, borderColor: colors.neutral[100] }}>
                      <Txt size={11.5} weight="bold" color={active ? "#fff" : colors.neutral[600]}>{f.label}</Txt>
                      {badge > 0 ? (
                        <View style={{ backgroundColor: active ? "rgba(255,255,255,0.22)" : colors.amber[100], paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}>
                          <Txt size={10} weight="extrabold" color={active ? "#fff" : colors.amber[700]}>{badge}</Txt>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Daftar */}
              {shown.length === 0 ? (
                <Card pad={24} radius={18}>
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}>
                      <Icon name="check" size={22} color={colors.mint[700]} strokeWidth={2.4} />
                    </View>
                    <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Tidak ada masalah</Txt>
                    <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center" }}>{filter === "ALL" ? "Kehadiranmu rapi — belum ada koreksi diajukan." : "Tidak ada catatan pada filter ini."}</Txt>
                  </View>
                </Card>
              ) : (
                shown.map((it) => <IssueCard key={it.id} it={it} onPress={() => router.push(`/kehadiran/masalah/${it.id}`)} />)
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function StatusTile({ n, label, color, bg, icon }: { n: number; label: string; color: string; bg: string; icon: IconName }) {
  return (
    <Card pad={12} radius={14} style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={14} color={color} strokeWidth={2.4} />
        </View>
        <Txt size={22} weight="extrabold" color={colors.neutral[900]}>{n}</Txt>
      </View>
      <Txt size={10.5} weight="bold" color={colors.neutral[500]} style={{ marginTop: 6, letterSpacing: 0.2 }}>{label.toUpperCase()}</Txt>
    </Card>
  );
}

function IssueCard({ it, onPress }: { it: IssueItem; onPress: () => void }) {
  const s = statusMeta(it.status);
  const cat = categoryMeta(it.category);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: 10 })}>
      <Card pad={0} radius={18} style={{ overflow: "hidden" }}>
        {/* Strip status */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: s.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={s.icon} size={13} color={s.color} strokeWidth={2.4} />
            <Txt size={11} weight="extrabold" color={s.color} style={{ letterSpacing: 0.3 }}>{s.label.toUpperCase()}</Txt>
          </View>
          {it.status === "PENDING" && it.totalSteps > 1 ? (
            <Txt size={10.5} weight="bold" color={s.color} style={{ opacity: 0.85 }}>Langkah {it.currentStep}/{it.totalSteps}</Txt>
          ) : null}
        </View>

        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: `${cat.color}18`, alignItems: "center", justifyContent: "center" }}>
              <Icon name={cat.icon} size={16} color={cat.color} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={10.5} weight="extrabold" color={cat.color} style={{ letterSpacing: 0.3 }}>{cat.label.toUpperCase()}</Txt>
              <Txt size={14} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }} numberOfLines={1}>{it.issueLabel}</Txt>
              <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 3 }}>{it.dateLabel} · {it.submittedLabel}</Txt>
            </View>
            <Icon name="chevronRight" size={15} color={colors.neutral[300]} />
          </View>

          {it.reason ? <Txt size={12.5} color={colors.neutral[600]} style={{ marginTop: 10, lineHeight: 18 }} numberOfLines={2}>{it.reason}</Txt> : null}

          {/* Clock in/out/seharusnya */}
          <View style={{ flexDirection: "row", marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: colors.neutral[50] }}>
            <TimeCell label="Clock-in" value={it.clockIn} />
            <TimeCell label="Clock-out" value={it.clockOut} />
            <TimeCell label="Seharusnya" value={it.expected} target />
          </View>

          {it.status === "APPROVED" && it.decidedBy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 }}>
              <Icon name="check" size={12} color={colors.mint[700]} strokeWidth={2.4} />
              <Txt size={11} color={colors.mint[700]}><Txt size={11} weight="bold" color={colors.mint[700]}>Disetujui oleh: </Txt>{it.decidedBy}</Txt>
            </View>
          ) : null}
          {it.status === "REJECTED" && it.rejectReason ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: colors.coral[100] }}>
              <Icon name="info" size={13} color={colors.coral[700]} strokeWidth={2.2} />
              <Txt size={11} color={colors.coral[700]} style={{ flex: 1, lineHeight: 16 }}>{it.rejectReason}</Txt>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function TimeCell({ label, value, target }: { label: string; value: string | null; target?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={9.5} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>{label.toUpperCase()}</Txt>
      <Txt size={14} weight="extrabold" color={target ? colors.brand[600] : colors.neutral[900]} style={{ marginTop: 2 }}>{value ?? "—"}</Txt>
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
