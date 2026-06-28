// Slip Gaji — pilih periode + hero take-home + pendapatan/potongan + komposisi. Ikut desain Corelia.
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  buildBreakdown, dateTimeLabel, getPayslip, getPayslips, paymentMethodLabel,
  payslipHtml, periodLabel, periodShort, rupiah, transferStatusPill,
  type PayslipBreakdown, type PayslipDetail, type PayslipRow,
} from "@/lib/payslip";

export default function SlipGajiScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<PayslipRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [cache] = useState<Map<string, PayslipDetail>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "pdf" | "image">(null);
  const receiptRef = useRef<View>(null);

  const loadDetail = useCallback(async (id: string) => {
    const hit = cache.get(id);
    if (hit) { setDetail(hit); return; }
    setDetailLoading(true);
    try {
      const d = await getPayslip(id);
      cache.set(id, d);
      setDetail(d);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat slip");
    } finally {
      setDetailLoading(false);
    }
  }, [cache]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { payslips } = await getPayslips();
      setRows(payslips);
      const prev = selectedRef.current;
      const pick = prev && payslips.some((p) => p.id === prev) ? prev : payslips[0]?.id ?? null;
      setSelected(pick);
      if (pick) await loadDetail(pick);
      else setDetail(null);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat slip gaji");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDetail]);

  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const onSelect = useCallback((id: string) => {
    setSelected(id);
    loadDetail(id);
  }, [loadDetail]);

  const breakdown = useMemo(() => (detail ? buildBreakdown(detail) : null), [detail]);

  // Bagikan sebagai gambar (struk) — tangkap kartu off-screen lalu buka share sheet.
  async function onShareImage() {
    if (!detail || busy) return;
    setBusy("image");
    try {
      const uri = await captureRef(receiptRef, { format: "png", quality: 1, result: "tmpfile" });
      if (!(await Sharing.isAvailableAsync())) { Alert.alert("Tidak tersedia", "Berbagi tidak didukung di perangkat ini."); return; }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: `Slip Gaji ${periodLabel(detail.period)}`, UTI: "public.png" });
    } catch (e) {
      Alert.alert("Gagal membagikan", e instanceof Error ? e.message : "Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  // Unduh PDF — dirender dari data (expo-print), bukan dari berkas unggahan.
  async function onDownloadPdf() {
    if (!detail || !breakdown || busy) return;
    setBusy("pdf");
    try {
      const { uri } = await Print.printToFileAsync({ html: payslipHtml(detail, breakdown) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Slip Gaji ${periodLabel(detail.period)}`, UTI: "com.adobe.pdf" });
      } else {
        await Linking.openURL(uri);
      }
    } catch (e) {
      Alert.alert("Gagal membuat PDF", e instanceof Error ? e.message : "Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Slip Gaji</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error && rows.length === 0 ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card></View>
      ) : rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.coral[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="wallet" size={30} color={colors.coral[700]} strokeWidth={1.8} />
          </View>
          <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada slip gaji</Txt>
          <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Slip gaji akan muncul setelah payroll periode kamu difinalisasi.</Txt>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cache.clear(); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          >
            {/* Pemilih periode */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {rows.map((r) => {
                const on = r.id === selected;
                return (
                  <Pressable key={r.id} onPress={() => onSelect(r.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: on ? 0 : 1, borderColor: colors.neutral[100] }}>
                    <Txt size={12} weight={on ? "bold" : "semibold"} color={on ? "#fff" : colors.neutral[600]}>{periodShort(r.period)}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>

            {detail && breakdown ? (
              <View style={{ opacity: detailLoading ? 0.5 : 1 }}>
                {/* Hero take-home */}
                <LinearGradient colors={[colors.brand[900], colors.brand[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Txt size={12} weight="semibold" color="rgba(255,255,255,0.85)">Take-home pay · {periodLabel(detail.period)}</Txt>
                    <TransferBadge status={detail.transferStatus} />
                  </View>
                  <Txt size={34} weight="extrabold" color="#fff" style={{ marginTop: 8, letterSpacing: -0.5, fontFamily: fonts.extrabold }}>{rupiah(detail.netSalary)}</Txt>
                  <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 14 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <MiniNum label="Gross" value={rupiah(detail.grossSalary)} />
                    <MiniNum label="Potongan" value={rupiah(breakdown.totalDeductions)} />
                  </View>
                </LinearGradient>

                {/* Pendapatan */}
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Pendapatan</Txt>
                <Card pad={0} radius={18}>
                  {breakdown.earnings.map((row, i) => (
                    <PayRow key={row.key} label={row.label} sub={row.sub} value={rupiah(row.amount)} last={i === breakdown.earnings.length - 1} />
                  ))}
                </Card>

                {/* Potongan */}
                {breakdown.deductions.length > 0 ? (
                  <>
                    <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Potongan</Txt>
                    <Card pad={0} radius={18}>
                      {breakdown.deductions.map((row, i) => (
                        <PayRow key={row.key} label={row.label} sub={row.sub} value={`-${rupiah(row.amount)}`} negative last={i === breakdown.deductions.length - 1} />
                      ))}
                    </Card>
                  </>
                ) : null}

                {/* Komposisi */}
                {breakdown.composition.length > 0 ? (
                  <>
                    <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Komposisi</Txt>
                    <Card pad={16} radius={18}>
                      <View style={{ height: 10, borderRadius: 5, overflow: "hidden", flexDirection: "row", backgroundColor: colors.neutral[100] }}>
                        {breakdown.composition.map((seg) => (
                          <View key={seg.label} style={{ flex: seg.amount, backgroundColor: seg.color }} />
                        ))}
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                        {breakdown.composition.map((seg) => (
                          <View key={seg.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: seg.color }} />
                            <Txt size={11.5} weight="semibold" color={colors.neutral[600]}>{seg.label} · <Txt size={11.5} weight="bold" color={colors.neutral[800]}>{seg.pct}%</Txt></Txt>
                          </View>
                        ))}
                      </View>
                    </Card>
                  </>
                ) : null}

                {/* Info pembayaran */}
                {paymentMethodLabel(detail.paymentMethod) || detail.transferDate ? (
                  <Card pad={14} radius={16} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}><Icon name="wallet" size={16} color={colors.mint[700]} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt size={12.5} color={colors.neutral[500]}>Pembayaran</Txt>
                      <Txt size={13} weight="semibold" color={colors.neutral[800]} style={{ marginTop: 1 }}>
                        {transferStatusPill(detail.transferStatus).label}
                        {paymentMethodLabel(detail.paymentMethod) ? ` · ${paymentMethodLabel(detail.paymentMethod)}` : ""}
                      </Txt>
                      {detail.transferDate ? (
                        <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{dateTimeLabel(detail.transferDate)}</Txt>
                      ) : null}
                    </View>
                  </Card>
                ) : null}
              </View>
            ) : detailLoading ? (
              <View style={{ paddingVertical: 60, alignItems: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
            ) : null}
          </ScrollView>

          {/* Aksi */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100], flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onShareImage} disabled={!detail || busy != null} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: detail ? 1 : 0.5 }}>
              {busy === "image" ? <ActivityIndicator size="small" color={colors.neutral[700]} /> : <Icon name="share" size={16} color={colors.neutral[700]} strokeWidth={2} />}
              <Txt size={14} weight="bold" color={colors.neutral[700]}>Bagikan</Txt>
            </Pressable>
            <Pressable onPress={onDownloadPdf} disabled={!detail || busy != null} style={{ flex: 2 }}>
              <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {busy === "pdf" ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="download" size={16} color="#fff" strokeWidth={2.2} />}
                <Txt size={14} weight="extrabold" color="#fff">Unduh PDF</Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {/* Kartu struk off-screen — sumber gambar untuk "Bagikan". */}
      {detail && breakdown ? (
        <View ref={receiptRef} collapsable={false} style={{ position: "absolute", left: -9999, top: 0, width: 360 }}>
          <ReceiptCard detail={detail} breakdown={breakdown} />
        </View>
      ) : null}
    </View>
  );
}

function ReceiptCard({ detail, breakdown }: { detail: PayslipDetail; breakdown: PayslipBreakdown }) {
  const pill = transferStatusPill(detail.transferStatus);
  return (
    <View style={{ backgroundColor: "#fff", padding: 20 }}>
      <LinearGradient colors={[colors.brand[900], colors.brand[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 18 }}>
        <Txt size={13} weight="extrabold" color="#fff">{detail.companyName ?? "Comuna"}</Txt>
        <Txt size={10} weight="bold" color="rgba(255,255,255,0.7)" style={{ letterSpacing: 1, marginTop: 1 }}>SLIP GAJI · {periodLabel(detail.period).toUpperCase()}</Txt>
        <Txt size={12} color="rgba(255,255,255,0.85)" style={{ marginTop: 12 }}>Take-home pay</Txt>
        <Txt size={28} weight="extrabold" color="#fff" style={{ marginTop: 1, fontFamily: fonts.extrabold }}>{rupiah(detail.netSalary)}</Txt>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          <Txt size={11} weight="bold" color="rgba(255,255,255,0.85)">{detail.employeeName ?? "-"}</Txt>
          <Txt size={11} weight="bold" color="rgba(255,255,255,0.85)">{pill.label}</Txt>
        </View>
      </LinearGradient>
      <Txt size={11} weight="extrabold" color={colors.neutral[500]} style={{ marginTop: 16, marginBottom: 4, letterSpacing: 0.4 }}>PENDAPATAN</Txt>
      {breakdown.earnings.map((e) => <ReceiptLine key={e.key} label={e.label} value={rupiah(e.amount)} />)}
      <ReceiptLine label="Gross" value={rupiah(detail.grossSalary)} bold />
      <Txt size={11} weight="extrabold" color={colors.neutral[500]} style={{ marginTop: 12, marginBottom: 4, letterSpacing: 0.4 }}>POTONGAN</Txt>
      {breakdown.deductions.map((d) => <ReceiptLine key={d.key} label={d.label} value={`-${rupiah(d.amount)}`} negative />)}
      <ReceiptLine label="Total potongan" value={`-${rupiah(breakdown.totalDeductions)}`} bold negative />
      <View style={{ height: 1, backgroundColor: colors.neutral[100], marginVertical: 12 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Txt size={13} weight="extrabold" color={colors.neutral[900]}>Take-home pay</Txt>
        <Txt size={18} weight="extrabold" color={colors.brand[700]} style={{ fontFamily: fonts.extrabold }}>{rupiah(detail.netSalary)}</Txt>
      </View>
      <Txt size={9.5} color={colors.neutral[400]} style={{ marginTop: 14, textAlign: "center" }}>Dibuat otomatis oleh Comuna HRIS · sah tanpa tanda tangan basah</Txt>
    </View>
  );
}

function ReceiptLine({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Txt size={12.5} weight={bold ? "bold" : "medium"} color={bold ? colors.neutral[900] : colors.neutral[600]}>{label}</Txt>
      <Txt size={12.5} weight={bold ? "extrabold" : "semibold"} color={negative ? colors.rose[700] : colors.neutral[900]}>{value}</Txt>
    </View>
  );
}

function TransferBadge({ status }: { status: PayslipDetail["transferStatus"] }) {
  const paid = status === "TRANSFERRED";
  const failed = status === "FAILED";
  const bg = paid ? "rgba(47,180,122,0.25)" : failed ? "rgba(242,66,106,0.25)" : "rgba(245,165,36,0.25)";
  const fg = paid ? "#CFEEDF" : failed ? "#FFD2DC" : "#FFE8C2";
  const label = paid ? "✓ Dibayar" : failed ? "Gagal transfer" : "Menunggu transfer";
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      <Txt size={10.5} weight="bold" color={fg}>{label}</Txt>
    </View>
  );
}

function MiniNum({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Txt size={10.5} weight="semibold" color="rgba(255,255,255,0.75)">{label}</Txt>
      <Txt size={15} weight="bold" color="#fff" style={{ marginTop: 2 }}>{value}</Txt>
    </View>
  );
}

function PayRow({ label, sub, value, negative, last }: { label: string; sub: string | null; value: string; negative?: boolean; last?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Txt size={13.5} weight="bold" color={colors.neutral[800]}>{label}</Txt>
        {sub ? <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      <Txt size={14} weight="extrabold" color={negative ? colors.rose[700] : colors.neutral[900]}>{value}</Txt>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
