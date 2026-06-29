// Pinjaman Saya — hero plafon + filter + daftar pinjaman. Ikut desain Corelia.
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
  getLoanContext, getLoans, loanDateLabel, loanPurposeLabel, loanStatusPill,
  purposeVisual, rupiah, type LoanContext, type LoanRow, type LoanStatus,
} from "@/lib/loan";

type Filter = "ALL" | "PAID" | "PENDING" | "COMPENSATED" | "REJECTED";

function inFilter(s: LoanStatus, f: Filter): boolean {
  if (f === "ALL") return true;
  if (f === "PENDING") return s === "PENDING" || s === "APPROVED";
  return s === f;
}

function subline(r: LoanRow): string {
  switch (r.status) {
    case "PENDING": return "Menunggu persetujuan";
    case "APPROVED": return "Disetujui · menunggu pencairan";
    case "PAID": return `Cicilan ke ${r.paidCount}/${r.installments}${r.disbursedAt ? ` · cair ${loanDateLabel(r.disbursedAt)}` : ""}`;
    case "COMPENSATED": return "Lunas";
    case "REJECTED": return "Pengajuan ditolak";
    default: return "";
  }
}

export default function PinjamanListScreen() {
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<LoanContext | null>(null);
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [c, list] = await Promise.all([getLoanContext(), getLoans()]);
      setCtx(c);
      setRows(list.requests);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat data pinjaman");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const counts = useMemo(() => ({
    ALL: rows.length,
    PAID: rows.filter((r) => r.status === "PAID").length,
    PENDING: rows.filter((r) => r.status === "PENDING" || r.status === "APPROVED").length,
    COMPENSATED: rows.filter((r) => r.status === "COMPENSATED").length,
    REJECTED: rows.filter((r) => r.status === "REJECTED").length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter((r) => inFilter(r.status, filter)), [rows, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" }, { key: "PAID", label: "Aktif" },
    { key: "PENDING", label: "Menunggu" }, { key: "COMPENSATED", label: "Lunas" }, { key: "REJECTED", label: "Ditolak" },
  ];

  const max = ctx?.maxAmount ?? 0;
  const outstanding = ctx?.outstanding ?? 0;
  const available = ctx?.available ?? 0;
  const usedPct = max > 0 ? Math.min(100, Math.round((outstanding / max) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Pinjaman</Txt>
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
              {/* Hero plafon */}
              <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
                <Txt size={11} weight="extrabold" color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.4 }}>BATAS PINJAMAN</Txt>
                <Txt size={28} weight="extrabold" color="#fff" style={{ marginTop: 4, letterSpacing: -0.5, fontFamily: fonts.extrabold }}>{max > 0 ? rupiah(max) : "Belum diatur"}</Txt>
                {max > 0 ? (
                  <>
                    <View style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                      <View style={{ width: `${usedPct}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                      {(ctx?.activeCount ?? 0) > 0 ? (
                        <Txt size={11} weight="bold" color="rgba(255,255,255,0.9)">{rupiah(outstanding)} terpakai</Txt>
                      ) : <View />}
                      <Txt size={11} weight="bold" color="rgba(255,255,255,0.95)">{rupiah(available)} kuota tersisa</Txt>
                    </View>
                  </>
                ) : (
                  <Txt size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>Hubungi HR untuk pengaturan batas pinjaman.</Txt>
                )}
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
                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="money" size={30} color={colors.brand[600]} strokeWidth={1.8} />
                  </View>
                  <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada pinjaman</Txt>
                  <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Ajukan pinjaman karyawan dengan cicilan otomatis dari gaji.</Txt>
                </View>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((r) => <LoanCard key={r.id} r={r} />)}</View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB Ajukan */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.push("/pinjaman/ajukan")}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.6} />
            <Txt size={14} weight="extrabold" color="#fff">Ajukan Pinjaman Baru</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function LoanCard({ r }: { r: LoanRow }) {
  const vis = purposeVisual(r.purpose);
  const pill = loanStatusPill(r.status, r.arrears);
  const showProgress = r.status === "PAID" || r.status === "COMPENSATED";
  const progress = r.installments > 0 ? r.paidCount / r.installments : 0;
  return (
    <Pressable onPress={() => router.push(`/pinjaman/${r.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: vis.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={vis.icon} size={20} color={vis.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Txt size={15} weight="extrabold" color={colors.neutral[900]}>{rupiah(r.amount)}</Txt>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: pill.bg }}>
                <Txt size={9.5} weight="extrabold" color={pill.fg} style={{ letterSpacing: 0.3 }}>{pill.label.toUpperCase()}</Txt>
              </View>
            </View>
            <Txt size={12} weight="semibold" color={colors.neutral[700]} style={{ marginTop: 2 }}>{loanPurposeLabel(r.purpose)}</Txt>
            <Txt size={11} color={r.status === "REJECTED" ? colors.coral[700] : colors.neutral[500]} style={{ marginTop: 1 }} numberOfLines={1}>{subline(r)}</Txt>
          </View>
        </View>

        {showProgress ? (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Txt size={10.5} weight="bold" color={colors.neutral[500]}>{r.paidCount}/{r.installments} cicilan · {rupiah(r.monthly)}/bln</Txt>
              <Txt size={10.5} weight="extrabold" color={r.status === "COMPENSATED" ? colors.mint[700] : colors.brand[600]}>{Math.round(progress * 100)}%</Txt>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
              <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: r.status === "COMPENSATED" ? colors.mint[500] : colors.brand[500], borderRadius: 3 }} />
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <Txt size={10.5} weight="bold" color={colors.neutral[400]} style={{ fontFamily: fonts.mono }}>{r.id.slice(0, 8).toUpperCase()}</Txt>
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
