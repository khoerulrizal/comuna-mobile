// Lembur Saya — ringkasan bulan + daftar pengajuan lembur. Ikut desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getOvertimeContext, getOvertimeRequests, hoursLabel, otDateLabel, overtimeStatusPill, rupiah,
  type OvertimeRequestRow, type OvertimeStatus, type OvertimeSummary,
} from "@/lib/overtime";

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function LemburListScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [rows, setRows] = useState<OvertimeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ctx, list] = await Promise.all([getOvertimeContext(), getOvertimeRequests()]);
      setSummary(ctx.summary);
      setRows(list.requests);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data lembur");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const counts = useMemo(() => ({
    ALL: rows.length,
    PENDING: rows.filter((r) => r.status === "PENDING").length,
    APPROVED: rows.filter((r) => r.status === "APPROVED" || r.status === "PAID" || r.status === "COMPENSATED").length,
    REJECTED: rows.filter((r) => r.status === "REJECTED").length,
  }), [rows]);
  const filtered = filter === "ALL" ? rows : filter === "APPROVED"
    ? rows.filter((r) => ["APPROVED", "PAID", "COMPENSATED"].includes(r.status))
    : rows.filter((r) => r.status === (filter as OvertimeStatus));
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" }, { key: "PENDING", label: "Menunggu" },
    { key: "APPROVED", label: "Disetujui" }, { key: "REJECTED", label: "Ditolak" },
  ];
  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Lembur Saya</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : (
            <>
              {summary ? (
                <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.4 }}>LEMBUR {monthLabel}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                    <Txt size={32} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{hoursLabel(summary.totalHours)}</Txt>
                    <Txt size={14} color="rgba(255,255,255,0.85)" weight="semibold">disetujui bln ini</Txt>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)" }}>
                      <Txt size={10} weight="bold" color="rgba(255,255,255,0.85)">KOMPENSASI</Txt>
                      <Txt size={14} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>{rupiah(summary.approvedPay)}</Txt>
                    </View>
                    <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)" }}>
                      <Txt size={10} weight="bold" color="rgba(255,255,255,0.85)">KOMPENSASI JAM</Txt>
                      <Txt size={14} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>{summary.approvedLeaveHours} jam</Txt>
                    </View>
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
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="clock" size={30} color={colors.amber[700]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada pengajuan lembur</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Ajukan lembur untuk pekerjaan di luar jam kerja.</Txt>
                </View>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((r) => <RequestCard key={r.id} r={r} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.push("/lembur/ajukan")}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.6} />
            <Txt size={14} weight="extrabold" color="#fff">Ajukan Lembur Baru</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function compLabel(r: OvertimeRequestRow): string | null {
  if (r.overtimePay != null) return rupiah(r.overtimePay);
  if (r.leaveHours != null) return `${r.leaveHours} jam cuti`;
  if (r.compensationType === "LEAVE") return "Kompensasi cuti";
  return null;
}

function RequestCard({ r }: { r: OvertimeRequestRow }) {
  const pill = overtimeStatusPill(r.status);
  const steps = Math.max(r.totalSteps, 1);
  const comp = compLabel(r);
  return (
    <Pressable onPress={() => router.push(`/lembur/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="clock" size={20} color={colors.amber[700]} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{otDateLabel(r.date, true)}</Txt>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: pill.bg }}>
                <Txt size={9.5} weight="extrabold" color={pill.fg} style={{ letterSpacing: 0.3 }}>{pill.label.toUpperCase()}</Txt>
              </View>
            </View>
            <Txt size={12} weight="semibold" color={colors.neutral[700]} style={{ marginTop: 2 }}>{r.startTime} – {r.endTime} · {hoursLabel(r.totalHours)}</Txt>
            {comp ? (
              <Txt size={11.5} color={colors.mint[700]} style={{ marginTop: 1 }} weight="bold">{comp}</Txt>
            ) : null}
            {r.status === "PENDING" && r.pendingApprover ? (
              <Txt size={11.5} color={colors.amber[700]} style={{ marginTop: 1 }} weight="semibold">Menunggu approval {r.pendingApprover}</Txt>
            ) : !comp ? (
              <Txt size={11.5} color={colors.neutral[400]} style={{ marginTop: 1 }}>Menunggu perhitungan</Txt>
            ) : null}
          </View>
        </View>
        {r.totalSteps > 0 ? (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 10 }}>
            {Array.from({ length: steps }).map((_, i) => {
              const n = i + 1;
              const bg = r.status === "REJECTED" ? (n === 1 ? colors.coral[500] : colors.neutral[100])
                : ["APPROVED", "PAID", "COMPENSATED"].includes(r.status) ? colors.mint[500]
                : n < r.currentStep ? colors.mint[500] : colors.neutral[100];
              return <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: bg }} />;
            })}
          </View>
        ) : null}
        {r.reason ? <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 8 }} numberOfLines={1}>{r.reason}</Txt> : null}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
          <Pressable
            onPress={() => router.push(`/lembur/${r.id}`)}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill,
              borderWidth: 1, borderColor: colors.neutral[100], backgroundColor: pressed ? colors.neutral[100] : "#fff",
            })}
          >
            <Txt size={12} weight="bold" color={colors.brand[700]}>Detail</Txt>
            <Icon name="chevronRight" size={14} color={colors.brand[700]} strokeWidth={2.4} />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
