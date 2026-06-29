// Bonus & Insentif (employee, read-only) — tab tahun + hero + stats + akan datang + riwayat.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  bonusTypeMeta, bonusYear, bonusYears, dayLabel, getBonuses, periodLabel, rupiah, summarizeYear,
  type BonusRow,
} from "@/lib/bonus";

export default function BonusScreen() {
  const insets = useSafeAreaInsets();
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { bonuses } = await getBonuses();
      setBonuses(bonuses);
      setYear((prev) => prev ?? (bonuses.length ? bonusYear(bonuses[0]) : new Date().getFullYear()));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat bonus");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const years = useMemo(() => bonusYears(bonuses), [bonuses]);
  const activeYear = year ?? years[0] ?? new Date().getFullYear();
  const sum = useMemo(() => summarizeYear(bonuses, activeYear), [bonuses, activeYear]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Bonus & Insentif</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Year segmented tabs */}
          <View style={{ flexDirection: "row", gap: 6, padding: 4, backgroundColor: colors.neutral[100], borderRadius: 12 }}>
            {years.map((y) => {
              const on = y === activeYear;
              return (
                <Pressable key={y} onPress={() => setYear(y)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center", backgroundColor: on ? "#fff" : "transparent" }}>
                  <Txt size={12.5} weight={on ? "extrabold" : "semibold"} color={on ? colors.neutral[900] : colors.neutral[600]}>{y}</Txt>
                </Pressable>
              );
            })}
          </View>

          {/* Hero */}
          <LinearGradient colors={[colors.brand[700], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 16, marginTop: 14, overflow: "hidden" }}>
            <Txt size={11} weight="bold" color="rgba(255,255,255,0.85)">Total diterima · {activeYear}</Txt>
            <Txt size={28} weight="extrabold" color="#fff" style={{ marginTop: 2, letterSpacing: -0.5, fontFamily: fonts.extrabold }}>{rupiah(sum.received)}</Txt>
            <Txt size={12} color="rgba(255,255,255,0.85)">Potensi tahun ini {rupiah(sum.potential)}</Txt>
            <View style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
              <View style={{ width: `${sum.progressPct}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.9)">{sum.progressPct}% diterima</Txt>
              <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.9)">{sum.paidCount} pembayaran</Txt>
            </View>
          </LinearGradient>

          {/* Quick stats per jenis */}
          {sum.stats.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {sum.stats.map((s) => {
                const m = bonusTypeMeta(s.type);
                return (
                  <Card key={s.type} pad={12} radius={14} style={{ flex: 1 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}>
                      <Icon name={m.icon} size={15} color={m.color} strokeWidth={2.2} />
                    </View>
                    <Txt size={10.5} color={colors.neutral[500]} weight="semibold" style={{ marginTop: 8 }} numberOfLines={1}>{m.short}</Txt>
                    <Txt size={12.5} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }} numberOfLines={1}>{rupiah(s.total)}</Txt>
                  </Card>
                );
              })}
            </View>
          ) : null}

          {/* Akan datang */}
          {sum.upcoming.length > 0 ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Akan datang</Txt>
              <Card pad={0} radius={16}>
                {sum.upcoming.map((b, i) => {
                  const m = bonusTypeMeta(b.type);
                  const last = i === sum.upcoming.length - 1;
                  return (
                    <Pressable key={b.id} onPress={() => router.push(`/bonus/${b.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100], opacity: pressed ? 0.7 : 1 })}>
                      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={16} color={colors.amber[700]} strokeWidth={2.2} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt size={13} weight="extrabold" color={colors.neutral[900]} numberOfLines={1}>{b.name || m.label}</Txt>
                        <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{m.label} · {periodLabel(b.period)}</Txt>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Txt size={9.5} weight="bold" color={colors.neutral[400]} style={{ letterSpacing: 0.3 }}>ESTIMASI</Txt>
                        <Txt size={13.5} weight="extrabold" color={colors.brand[600]}>~{rupiah(b.amount)}</Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </Card>
            </>
          ) : null}

          {/* Riwayat pembayaran */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8 }}>
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]}>Riwayat Pembayaran</Txt>
            <Txt size={11.5} weight="bold" color={colors.brand[600]}>{sum.history.length} total</Txt>
          </View>
          {sum.history.length === 0 ? (
            <Card pad={20}><Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Belum ada bonus cair di {activeYear}.</Txt></Card>
          ) : (
            <Card pad={0} radius={16}>
              {sum.history.map((b, i) => {
                const m = bonusTypeMeta(b.type);
                const last = i === sum.history.length - 1;
                return (
                  <Pressable key={b.id} onPress={() => router.push(`/bonus/${b.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100], opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}><Icon name={m.icon} size={16} color={m.color} strokeWidth={2.2} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt size={13} weight="extrabold" color={colors.neutral[900]} numberOfLines={1}>{b.name || m.label}</Txt>
                      <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 2 }} numberOfLines={1}>{m.label} · {b.paidAt ? dayLabel(b.paidAt) : periodLabel(b.period)}</Txt>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt size={14} weight="extrabold" color={colors.mint[700]}>+{rupiah(b.amount)}</Txt>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.mint[100] }}>
                        <Icon name="check" size={9} color={colors.mint[700]} strokeWidth={3} />
                        <Txt size={9.5} weight="extrabold" color={colors.mint[700]} style={{ letterSpacing: 0.3 }}>CAIR</Txt>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          )}

          {/* Info */}
          <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.brand[100], flexDirection: "row", gap: 8 }}>
            <View style={{ marginTop: 2 }}><Icon name="info" size={14} color={colors.brand[700]} strokeWidth={2.2} /></View>
            <Txt size={11.5} color={colors.brand[700]} style={{ flex: 1, lineHeight: 17 }}>Bonus disetujui & dicairkan oleh HR/Finance. Hubungi HR untuk detail komponen atau jadwal pembayaran.</Txt>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
