// Reimbursement Saya — hero limit/pemakaian + filter + daftar klaim. Ikut desain Corelia.
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
  getReimburseContext, getReimburseRequests, categoryVisual, currentMonthLabel,
  reimburseDateLabel, reimburseStatusPill, rupiah,
  type ReimburseContext, type ReimburseRequestRow, type ReimburseStatus,
} from "@/lib/reimburse";

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function ReimburseListScreen() {
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<ReimburseContext | null>(null);
  const [rows, setRows] = useState<ReimburseRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [c, list] = await Promise.all([getReimburseContext(), getReimburseRequests()]);
      setCtx(c);
      setRows(list.requests);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data reimbursement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const counts = useMemo(() => ({
    ALL: rows.length,
    PENDING: rows.filter((r) => r.status === "PENDING").length,
    APPROVED: rows.filter((r) => r.status === "APPROVED" || r.status === "PAID").length,
    REJECTED: rows.filter((r) => r.status === "REJECTED").length,
  }), [rows]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    if (filter === "APPROVED") return rows.filter((r) => r.status === "APPROVED" || r.status === "PAID");
    return rows.filter((r) => r.status === (filter as ReimburseStatus));
  }, [rows, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" }, { key: "PENDING", label: "Menunggu" },
    { key: "APPROVED", label: "Disetujui" }, { key: "REJECTED", label: "Ditolak" },
  ];

  const limit = ctx?.monthlyLimit ?? null;
  const used = ctx?.usedThisMonth ?? 0;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}>
          <Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} />
        </Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Reimbursement</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : (
            <>
              {/* Hero limit & pemakaian */}
              <LinearGradient colors={[colors.mint[500], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                    <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>{currentMonthLabel()}</Txt>
                  </View>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.9)">{ctx?.summary.count ?? 0} klaim bulan ini</Txt>
                </View>
                <Txt size={11} weight="semibold" color="rgba(255,255,255,0.9)" style={{ marginTop: 14, letterSpacing: 0.3 }}>{limit ? "TERPAKAI DARI LIMIT" : "TERPAKAI BULAN INI"}</Txt>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                  <Txt size={27} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{rupiah(used)}</Txt>
                  {limit ? <Txt size={12} weight="bold" color="rgba(255,255,255,0.85)">/ {rupiah(limit)}</Txt> : null}
                </View>
                {limit ? (
                  <View style={{ marginTop: 12 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
                    </View>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.95)">✓ {rupiah(ctx?.summary.paidThisMonth ?? 0)} cair</Txt>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.95)">⏳ {rupiah(ctx?.summary.pendingThisMonth ?? 0)} proses</Txt>
                </View>
              </LinearGradient>

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

              {filtered.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="receipt" size={30} color={colors.mint[700]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada klaim</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Ajukan reimbursement untuk pengeluaran kantor.</Txt>
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
        <Pressable onPress={() => router.push("/reimburse/ajukan")}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.6} />
            <Txt size={14} weight="extrabold" color="#fff">Ajukan Klaim Baru</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function RequestCard({ r }: { r: ReimburseRequestRow }) {
  const vis = categoryVisual(r.category);
  const pill = reimburseStatusPill(r.status);
  const steps = Math.max(r.totalSteps, 1);
  return (
    <Pressable onPress={() => router.push(`/reimburse/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: vis.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={vis.icon as never} size={20} color={vis.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Txt size={10.5} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>{r.category}</Txt>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: pill.bg }}>
                <Txt size={9.5} weight="extrabold" color={pill.fg} style={{ letterSpacing: 0.3 }}>{pill.label.toUpperCase()}</Txt>
              </View>
            </View>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2 }}>{rupiah(r.amount)}</Txt>
            <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }} numberOfLines={1}>
              {reimburseDateLabel(r.date)}{r.description ? ` · ${r.description}` : ""}
            </Txt>
            {r.status === "PENDING" && r.pendingApprover ? (
              <Txt size={11.5} color={colors.amber[700]} weight="semibold" style={{ marginTop: 2 }}>Menunggu approval {r.pendingApprover}</Txt>
            ) : null}
          </View>
        </View>

        {/* Step bar */}
        {r.totalSteps > 0 && r.status !== "REJECTED" && r.status !== "CANCELLED" ? (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 10 }}>
            {Array.from({ length: steps }).map((_, i) => {
              const n = i + 1;
              const bg = ["APPROVED", "PAID", "COMPENSATED"].includes(r.status) ? colors.mint[500]
                : n < r.currentStep ? colors.mint[500] : colors.neutral[100];
              return <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: bg }} />;
            })}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Txt size={12} weight="bold" color={colors.brand[700]}>Detail</Txt>
            <Icon name="chevronRight" size={14} color={colors.brand[700]} strokeWidth={2.4} />
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
