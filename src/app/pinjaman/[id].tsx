// Detail Pinjaman — hero + cicilan berikutnya + rincian + jadwal cicilan + riwayat status.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  disbursementMethodLabel, getLoan, loanDateLabel, loanDateTimeLabel, loanPurposeLabel,
  loanStatusPill, periodLabel, rupiah, type LoanDetail, type LoanInstallmentEntry, type LoanStatus,
} from "@/lib/loan";

// Info pembayaran satu angsuran: kapan dibayar, metode, & oleh siapa (manual).
function paidInfo(it: LoanInstallmentEntry): string | null {
  if (!it.isPaid) return null;
  const method =
    it.paidVia === "PAYROLL" ? "Potong gaji"
    : it.paidVia === "MANUAL" ? `Manual${it.paidByName ? ` · ${it.paidByName}` : ""}`
    : null;
  const when = it.paidAt ? `Dibayar ${loanDateLabel(it.paidAt)}` : null;
  return [when, method].filter(Boolean).join(" · ") || null;
}

function heroColors(s: LoanStatus): [string, string] {
  switch (s) {
    case "REJECTED": return [colors.rose[500], colors.coral[700]];
    case "COMPENSATED": return [colors.mint[500], colors.mint[700]];
    case "CANCELLED": return [colors.neutral[500], colors.neutral[700]];
    default: return [colors.brand[700], colors.brand[500]];
  }
}

export default function PinjamanDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getLoan(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const pill = data ? loanStatusPill(data.status) : null;
  const progress = data && data.installments > 0 ? data.paidCount / data.installments : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Pinjaman</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ditemukan"}</Txt></Card></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Hero */}
          <LinearGradient colors={heroColors(data.status)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4, fontFamily: fonts.mono }}>{data.id.slice(0, 10).toUpperCase()}</Txt>
              </View>
              <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.95)">{pill?.label}</Txt>
            </View>
            <Txt size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 14 }}>{loanPurposeLabel(data.purpose)}</Txt>
            <Txt size={30} weight="extrabold" color="#fff" style={{ marginTop: 2, fontFamily: fonts.extrabold }}>{rupiah(data.amount)}</Txt>
            {data.installments > 0 && (data.status === "PAID" || data.status === "COMPENSATED") ? (
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.95)">{data.paidCount} dari {data.installments} cicilan · {Math.round(progress * 100)}%</Txt>
                  <Txt size={11} weight="bold" color="rgba(255,255,255,0.95)">Sisa {data.installments - data.paidCount} angsuran</Txt>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
                </View>
              </View>
            ) : null}
          </LinearGradient>

          {/* Cicilan berikutnya */}
          {data.status === "PAID" && data.nextDuePeriod ? (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.amber[500], flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}><Icon name="bell" size={16} color={colors.amber[700]} strokeWidth={2.2} /></View>
              <View style={{ flex: 1 }}>
                <Txt size={10.5} weight="extrabold" color={colors.amber[700]} style={{ letterSpacing: 0.3 }}>CICILAN BERIKUTNYA</Txt>
                <Txt size={13} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{rupiah(data.nextDueAmount ?? data.monthly)} · {periodLabel(data.nextDuePeriod)}</Txt>
                <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>Auto-debit dari gaji</Txt>
              </View>
            </View>
          ) : null}

          {/* Rincian */}
          <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Rincian Pinjaman</Txt>
          <Card pad={0} radius={16}>
            <Row label="Total dipinjam" value={rupiah(data.amount)} icon="wallet" color={colors.brand[600]} bg={colors.brand[100]} />
            <Div />
            <Row label="Sudah dibayar" value={rupiah(data.totalPaid)} icon="check" color={colors.mint[700]} bg={colors.mint[100]} />
            <Div />
            <Row label="Sisa pembayaran" value={rupiah(data.remaining)} icon="clock" color={colors.amber[700]} bg={colors.amber[100]} />
            <Div />
            <Row label="Tenor" value={`${data.installments} bulan`} icon="calendar" color={colors.coral[700]} bg={colors.coral[100]} />
            {data.startPeriod ? (<><Div /><Row label="Periode" value={`${periodLabel(data.startPeriod)} – ${periodLabel(data.endPeriod)}`} icon="moreV" color={colors.neutral[600]} bg={colors.neutral[100]} /></>) : null}
            {disbursementMethodLabel(data.disbursementMethod) ? (<><Div /><Row label="Metode cair" value={disbursementMethodLabel(data.disbursementMethod)!} icon="money" color={colors.brand[600]} bg={colors.brand[100]} /></>) : null}
            {data.reason ? (<><Div /><Row label="Catatan" value={data.reason} icon="edit" color={colors.neutral[600]} bg={colors.neutral[100]} /></>) : null}
          </Card>

          {/* Jadwal cicilan */}
          {data.installmentsList.length > 0 ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Jadwal Cicilan</Txt>
              <Card pad={14} radius={16}>
                {data.installmentsList.map((it, i) => {
                  const last = i === data.installmentsList.length - 1;
                  return (
                    <View key={it.period} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: it.isPaid ? colors.mint[100] : colors.neutral[100], alignItems: "center", justifyContent: "center" }}>
                        {it.isPaid ? <Icon name="check" size={14} color={colors.mint[700]} strokeWidth={2.6} /> : <Txt size={11} weight="extrabold" color={colors.neutral[500]}>{i + 1}</Txt>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt size={12.5} weight="bold" color={it.isPaid ? colors.neutral[900] : colors.neutral[600]}>Cicilan #{i + 1} · {periodLabel(it.period)}</Txt>
                        {it.isPaid ? (
                          <Txt size={11} color={colors.mint[700]}>{paidInfo(it)}</Txt>
                        ) : (
                          <Txt size={11} color={colors.neutral[500]}>Belum dibayar</Txt>
                        )}
                      </View>
                      <Txt size={12.5} weight="extrabold" color={it.isPaid ? colors.neutral[900] : colors.neutral[500]}>{rupiah(it.amount)}</Txt>
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}

          {/* Riwayat status */}
          {data.statusLogs.length > 0 ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Riwayat Status</Txt>
              <Card pad={16} radius={18}>
                {data.statusLogs.map((l, i) => {
                  const p = loanStatusPill(l.status);
                  const last = i === data.statusLogs.length - 1;
                  return (
                    <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ alignItems: "center" }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.fg, marginTop: 4 }} />
                        {!last ? <View style={{ width: 2, flex: 1, backgroundColor: colors.neutral[100], marginVertical: 2 }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: p.bg }}>
                            <Txt size={9.5} weight="extrabold" color={p.fg} style={{ letterSpacing: 0.3 }}>{p.label.toUpperCase()}</Txt>
                          </View>
                          <Txt size={11} color={colors.neutral[500]}>{loanDateTimeLabel(l.changedAt)}</Txt>
                        </View>
                        {l.note ? <Txt size={11.5} color={colors.neutral[600]} style={{ marginTop: 3 }}>{l.note}</Txt> : null}
                        {l.changedByName ? <Txt size={11} color={colors.neutral[400]} style={{ marginTop: 1 }}>oleh {l.changedByName}</Txt> : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 60 }} />; }
function Row({ label, value, icon, color, bg }: { label: string; value: string; icon: string; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ width: 84, marginLeft: 12 }}>{label}</Txt>
      <Txt size={13} weight="semibold" color={colors.neutral[800]} style={{ flex: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
