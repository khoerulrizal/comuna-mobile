// Ajukan Pinjaman — input nominal (kunci batas) + tujuan + tenor + estimasi + persyaratan.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getLoanContext, LOAN_PURPOSES, rupiah, submitLoan, type LoanContext,
} from "@/lib/loan";

const TENOR_BASE = [3, 6, 12, 18, 24, 36];

function groupThousands(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export default function PinjamanAjukanScreen() {
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<LoanContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [amountRaw, setAmountRaw] = useState("");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [tenor, setTenor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { setCtx(await getLoanContext()); }
    catch (e) { if (e instanceof AuthError) router.replace("/login"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const maxAmount = ctx?.maxAmount ?? 0;
  const maxInstallments = ctx?.maxInstallments ?? 12;
  const amount = Number(amountRaw.replace(/\D/g, "")) || 0;

  // Opsi tenor dibatasi kebijakan (≤ maxInstallments); pastikan batas maksimum ikut tampil.
  const tenorOptions = useMemo(() => {
    const opts = TENOR_BASE.filter((t) => t <= maxInstallments);
    if (maxInstallments > 0 && !opts.includes(maxInstallments)) opts.push(maxInstallments);
    return opts.sort((a, b) => a - b);
  }, [maxInstallments]);

  const effTenor = tenor ?? (tenorOptions.includes(12) ? 12 : tenorOptions[0] ?? 1);
  const overAmount = maxAmount > 0 && amount > maxAmount;
  const monthly = effTenor > 0 ? Math.floor(amount / effTenor) : 0;
  // Angsuran terakhir menyerap sisa pembulatan → total ((n-1)×monthly + lastMonthly) = pokok.
  const lastMonthly = effTenor > 0 ? amount - monthly * (effTenor - 1) : 0;
  const valid = amount > 0 && !overAmount && effTenor >= 1 && effTenor <= maxInstallments;

  const quickAmounts = useMemo(() => {
    const base = [1_000_000, 3_000_000, 5_000_000];
    const list = maxAmount > 0 ? [...base.filter((b) => b <= maxAmount), maxAmount] : base;
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [maxAmount]);

  async function onSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const r = await submitLoan({ amount, purpose, reason: reason.trim() || null, installments: effTenor });
      router.replace({ pathname: "/pinjaman/sukses", params: { id: r.id, amount: String(amount), tenor: String(effTenor), monthly: String(monthly) } });
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal mengajukan pinjaman");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="close" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Ajukan Pinjaman</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
            {/* Plafon reminder */}
            <LinearGradient colors={[colors.brand[100], colors.mint[100]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="wallet" size={18} color={colors.brand[600]} strokeWidth={2.2} /></View>
              <View style={{ flex: 1 }}>
                <Txt size={10.5} weight="extrabold" color={colors.brand[700]} style={{ letterSpacing: 0.3 }}>{maxAmount > 0 ? "PLAFON TERSEDIA" : "BATAS PINJAMAN"}</Txt>
                <Txt size={17} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{maxAmount > 0 ? rupiah(ctx?.available ?? maxAmount) : "Belum diatur"}</Txt>
                <Txt size={10.5} color={colors.neutral[600]} style={{ marginTop: 1 }}>0% bunga · maks {maxInstallments} bulan</Txt>
              </View>
            </LinearGradient>

            {/* Jumlah */}
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Jumlah Pinjaman</Txt>
            <Card pad={16} radius={16}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.neutral[25], borderWidth: 1.5, borderColor: overAmount ? colors.rose[300] : colors.brand[300] }}>
                <Txt size={16} weight="bold" color={colors.neutral[500]}>Rp</Txt>
                <TextInput
                  value={groupThousands(amountRaw)}
                  onChangeText={(t) => setAmountRaw(t.replace(/\D/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[300]}
                  keyboardType="number-pad"
                  style={{ flex: 1, fontSize: 22, fontFamily: fonts.extrabold, color: colors.neutral[900], paddingVertical: 4 }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {quickAmounts.map((v) => {
                  const on = amount === v;
                  return (
                    <Pressable key={v} onPress={() => setAmountRaw(String(v))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: on ? colors.brand[100] : "#fff", borderWidth: 1, borderColor: on ? colors.brand[300] : colors.neutral[100] }}>
                      <Txt size={11} weight="bold" color={on ? colors.brand[700] : colors.neutral[600]}>{v >= 1_000_000 ? `${v / 1_000_000} jt` : rupiah(v)}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              <Txt size={11} color={overAmount ? colors.rose[700] : colors.neutral[500]} style={{ marginTop: 8 }}>
                {maxAmount > 0 ? `Maksimum ${rupiah(maxAmount)}${overAmount ? " — melebihi batas" : ""}` : "Batas nominal belum diatur"}
              </Txt>
            </Card>

            {/* Tujuan */}
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Tujuan Pinjaman</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LOAN_PURPOSES.map((p) => {
                const on = purpose === p.value;
                return (
                  <Pressable key={p.value} onPress={() => setPurpose(on ? null : p.value)} style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 14, backgroundColor: on ? colors.brand[100] : "#fff", borderWidth: 1.5, borderColor: on ? colors.brand[500] : colors.neutral[100] }}>
                    <Icon name={p.icon} size={15} color={on ? colors.brand[600] : colors.neutral[500]} strokeWidth={2.2} />
                    <Txt size={12} weight="bold" color={on ? colors.brand[700] : colors.neutral[700]}>{p.label}</Txt>
                  </Pressable>
                );
              })}
            </View>

            {/* Tenor */}
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Tenor Cicilan</Txt>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {tenorOptions.map((t) => {
                const on = effTenor === t;
                return (
                  <Pressable key={t} onPress={() => setTenor(t)} style={{ minWidth: 64, flexGrow: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: 1.5, borderColor: on ? colors.brand[500] : colors.neutral[100] }}>
                    <Txt size={14} weight="extrabold" color={on ? "#fff" : colors.neutral[800]}>{t}</Txt>
                    <Txt size={10} weight="semibold" color={on ? "rgba(255,255,255,0.85)" : colors.neutral[500]}>bulan</Txt>
                  </Pressable>
                );
              })}
            </View>

            {/* Catatan */}
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Catatan / Alasan</Txt>
            <Card pad={12} radius={14}>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Jelaskan kebutuhan pinjaman (opsional)…"
                placeholderTextColor={colors.neutral[400]}
                multiline
                style={{ minHeight: 64, fontSize: 12.5, color: colors.neutral[900], textAlignVertical: "top" }}
              />
            </Card>

            {/* Estimasi cicilan */}
            <View style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.mint[300] }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Txt size={11} weight="extrabold" color={colors.mint[700]} style={{ letterSpacing: 0.4 }}>ESTIMASI CICILAN</Txt>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.mint[100] }}><Txt size={9.5} weight="extrabold" color={colors.mint[700]}>0% BUNGA</Txt></View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                <Txt size={24} weight="extrabold" color={colors.neutral[900]} style={{ fontFamily: fonts.extrabold }}>{rupiah(monthly)}</Txt>
                <Txt size={12} weight="semibold" color={colors.neutral[500]}>/bulan</Txt>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Txt size={11} color={colors.neutral[600]}>{rupiah(amount)} ÷ {effTenor} bulan</Txt>
                <Txt size={11} weight="bold" color={colors.neutral[600]}>Auto-debit dari gaji</Txt>
              </View>
              {lastMonthly !== monthly ? (
                <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 4 }}>
                  Angsuran terakhir {rupiah(lastMonthly)} (menyerap pembulatan)
                </Txt>
              ) : null}
            </View>

            {/* Persyaratan */}
            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Persyaratan</Txt>
            <Card pad={14} radius={16}>
              <Req ok={amount > 0 && !overAmount} label={maxAmount > 0 ? `Nominal dalam batas (maks ${rupiah(maxAmount)})` : "Nominal pinjaman terisi"} />
              <Req ok={effTenor >= 1 && effTenor <= maxInstallments} label={`Tenor maksimum ${maxInstallments} bulan`} />
              <Req ok={false} pending label="Persetujuan HR & Finance" sub="Dimulai setelah pengajuan dikirim" last />
            </Card>
          </ScrollView>

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
            <Pressable onPress={onSubmit} disabled={!valid || submitting}>
              <LinearGradient colors={valid ? [colors.brand[600], colors.brand[500]] : [colors.neutral[200], colors.neutral[300]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={18} color="#fff" strokeWidth={2.6} />}
                <Txt size={14} weight="extrabold" color="#fff">Kirim Pengajuan</Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Req({ ok, pending, label, sub, last }: { ok: boolean; pending?: boolean; label: string; sub?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ok ? colors.mint[100] : pending ? colors.amber[100] : colors.rose[100], alignItems: "center", justifyContent: "center" }}>
        <Icon name={ok ? "check" : pending ? "clock" : "close"} size={12} color={ok ? colors.mint[700] : pending ? colors.amber[700] : colors.rose[700]} strokeWidth={2.6} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={12.5} weight={ok ? "semibold" : "medium"} color={ok ? colors.neutral[800] : colors.neutral[600]}>{label}</Txt>
        {sub ? <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
