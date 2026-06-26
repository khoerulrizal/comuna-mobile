// Cuti Saya — saldo hero + filter + daftar pengajuan (step-bar). Ikut desain Corelia.
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
  getLeaveContext, getLeaveRequests, leaveCategoryVisual, leaveRangeLabel, leaveStatusPill,
  type LeaveAnnual, type LeaveRequestRow, type LeaveStatus,
} from "@/lib/leave";

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function CutiListScreen() {
  const insets = useSafeAreaInsets();
  const [annual, setAnnual] = useState<LeaveAnnual | null>(null);
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ctx, list] = await Promise.all([getLeaveContext(), getLeaveRequests()]);
      setAnnual(ctx.annual);
      setRows(list.requests);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data cuti");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const counts = useMemo(() => ({
    ALL: rows.length,
    PENDING: rows.filter((r) => r.status === "PENDING").length,
    APPROVED: rows.filter((r) => r.status === "APPROVED").length,
    REJECTED: rows.filter((r) => r.status === "REJECTED").length,
  }), [rows]);

  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.status === (filter as LeaveStatus));
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" }, { key: "PENDING", label: "Menunggu" },
    { key: "APPROVED", label: "Disetujui" }, { key: "REJECTED", label: "Ditolak" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}>
          <Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} />
        </Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Cuti Saya</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : (
            <>
              {/* Saldo hero */}
              {annual ? (
                <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.4 }}>SALDO {annual.name.toUpperCase()}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <Txt size={36} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{annual.remaining}</Txt>
                    <Txt size={14} weight="semibold" color="rgba(255,255,255,0.85)">/ {annual.total} hari tersisa</Txt>
                  </View>
                  <View style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                    <View style={{ width: `${annual.total > 0 ? Math.min(100, (annual.used / annual.total) * 100) : 0}%`, height: "100%", backgroundColor: "#fff" }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <Txt size={11} color="rgba(255,255,255,0.9)">{annual.used} terpakai</Txt>
                    {counts.PENDING > 0 ? <Txt size={11} color="rgba(255,255,255,0.9)">{counts.PENDING} menunggu approval</Txt> : null}
                  </View>
                </LinearGradient>
              ) : null}

              {/* Filter chips */}
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

              {/* Daftar */}
              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="plane" size={30} color={colors.brand[500]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada pengajuan</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Ajukan cuti untuk istirahat atau keperluan pribadi.</Txt>
                </View>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((r) => <RequestCard key={r.id} r={r} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB Ajukan */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.push("/cuti/ajukan")}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.6} />
            <Txt size={14} weight="extrabold" color="#fff">Ajukan Cuti Baru</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function RequestCard({ r }: { r: LeaveRequestRow }) {
  const vis = leaveCategoryVisual(r.category);
  const pill = leaveStatusPill(r.status);
  const dayLabel = r.isHalfDay ? "0,5 hari" : `${r.totalDays} hari`;
  const steps = Math.max(r.totalSteps, 1);
  return (
    <Pressable onPress={() => router.push(`/cuti/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: vis.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={vis.icon as never} size={18} color={vis.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{r.policyName}</Txt>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: pill.bg }}>
                <Txt size={9.5} weight="extrabold" color={pill.fg} style={{ letterSpacing: 0.3 }}>{pill.label.toUpperCase()}</Txt>
              </View>
            </View>
            <Txt size={12} weight="semibold" color={colors.neutral[700]} style={{ marginTop: 2 }}>{leaveRangeLabel(r.startDate, r.endDate)} · {dayLabel}</Txt>
            {r.status === "PENDING" && r.totalSteps > 0 ? (
              <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>Menunggu persetujuan · langkah {r.currentStep}/{r.totalSteps}</Txt>
            ) : !r.isPaid ? (
              <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>Cuti tanpa upah</Txt>
            ) : null}
          </View>
        </View>

        {/* Step bar */}
        {r.totalSteps > 0 ? (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 10 }}>
            {Array.from({ length: steps }).map((_, i) => {
              const n = i + 1;
              const bg = r.status === "REJECTED" ? (n === 1 ? colors.coral[500] : colors.neutral[100])
                : r.status === "APPROVED" ? colors.mint[500]
                : n < r.currentStep ? colors.mint[500] : colors.neutral[100];
              return <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: bg }} />;
            })}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Txt size={10.5} weight="bold" color={colors.neutral[500]} style={{ fontFamily: fonts.mono }}>{r.id.slice(0, 10).toUpperCase()}</Txt>
          <Txt size={10.5} weight="bold" color={colors.brand[600]}>Detail →</Txt>
        </View>
      </Card>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
