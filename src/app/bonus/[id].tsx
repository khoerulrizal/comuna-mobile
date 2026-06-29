// Detail Bonus — hero + rincian (PPh21/Nett/metode) + riwayat status. Mirror web.
import { useCallback, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  bonusMethodLabel, bonusStatusPill, bonusTypeMeta, dateTimeLabel, getBonus, periodLabel, rupiah,
  type BonusDetail, type BonusStatus,
} from "@/lib/bonus";

function heroColors(s: BonusStatus): [string, string] {
  switch (s) {
    case "PAID": return [colors.mint[500], colors.mint[700]];
    case "CANCELLED": return [colors.neutral[500], colors.neutral[700]];
    default: return [colors.brand[700], colors.brand[500]];
  }
}

export default function BonusDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<BonusDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getBonus(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const meta = data ? bonusTypeMeta(data.type) : null;
  const pill = data ? bonusStatusPill(data.status) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Bonus</Txt>
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
              <Txt size={12.5} weight="bold" color="rgba(255,255,255,0.9)">{meta?.label} · {periodLabel(data.period)}</Txt>
              <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.95)">{pill?.label}</Txt>
            </View>
            <Txt size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 14 }}>{data.name}</Txt>
            <Txt size={30} weight="extrabold" color="#fff" style={{ marginTop: 2, fontFamily: fonts.extrabold }}>{rupiah(data.amount)}</Txt>
          </LinearGradient>

          {/* Rincian pembayaran — gaya struk */}
          <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Rincian Pembayaran</Txt>
          <Receipt
            title={data.name}
            subtitle={`${meta?.label ?? data.type} · ${periodLabel(data.period)}`}
            amount={data.amount}
            pph21={data.pph21}
            nett={data.nett}
            method={bonusMethodLabel(data.paymentMethod)}
            status={pill?.label ?? data.status}
            code={data.id}
          />

          {/* Informasi bonus */}
          <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Informasi Bonus</Txt>
          <Card pad={0} radius={16}>
            <Row label="Karyawan" value={`${data.employeeName ?? "-"}${data.employeeNumber ? ` (${data.employeeNumber})` : ""}`} icon="user" color={colors.brand[600]} bg={colors.brand[100]} />
            {data.department ? (<><Div /><Row label="Departemen" value={data.department} icon="briefcase" color={colors.neutral[600]} bg={colors.neutral[100]} /></>) : null}
            {data.branch ? (<><Div /><Row label="Cabang" value={data.branch} icon="building" color={colors.neutral[600]} bg={colors.neutral[100]} /></>) : null}
            <Div />
            <Row label="Jenis" value={meta?.label ?? data.type} icon={meta?.icon ?? "star"} color={meta?.color ?? colors.brand[600]} bg={meta?.bg ?? colors.brand[100]} />
            {data.categoryName ? (<><Div /><Row label="Kategori" value={data.categoryName} icon="filter" color={colors.amber[700]} bg={colors.amber[100]} /></>) : null}
            <Div />
            <Row label="Diajukan" value={dateTimeLabel(data.createdAt)} icon="clock" color={colors.neutral[600]} bg={colors.neutral[100]} />
            {data.notes ? (<><Div /><Row label="Catatan" value={data.notes} icon="edit" color={colors.neutral[600]} bg={colors.neutral[100]} /></>) : null}
          </Card>

          {/* Riwayat status */}
          {data.statusLogs.length > 0 ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Riwayat Status</Txt>
              <Card pad={16} radius={18}>
                {data.statusLogs.map((l, i) => {
                  const p = bonusStatusPill(l.status);
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
                          <Txt size={11} color={colors.neutral[500]}>{dateTimeLabel(l.changedAt)}</Txt>
                        </View>
                        {bonusMethodLabel(l.paymentMethod) ? <Txt size={11.5} color={colors.neutral[600]} style={{ marginTop: 3 }}>Metode: {bonusMethodLabel(l.paymentMethod)}</Txt> : null}
                        {l.note ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{l.note}</Txt> : null}
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
function Row({ label, value, icon, color, bg, valueColor }: { label: string; value: string; icon: string; color: string; bg: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ width: 80, marginLeft: 12 }}>{label}</Txt>
      <Txt size={13} weight="semibold" color={valueColor ?? colors.neutral[800]} style={{ flex: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}

const SCR_W = Dimensions.get("window").width;

// Kartu rincian gaya struk: tepi bergerigi (perforasi) + angka monospace + total.
function Receipt({ title, subtitle, amount, pph21, nett, method, status, code }: {
  title: string; subtitle: string; amount: number; pph21: number; nett: number;
  method: string | null; status: string; code: string;
}) {
  return (
    <View style={{ shadowColor: "#281E5A", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
      <Zigzag position="top" />
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ alignItems: "center", marginBottom: 2 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <Icon name="receipt" size={18} color={colors.mint[700]} />
          </View>
          <Txt size={13.5} weight="extrabold" color={colors.neutral[900]} numberOfLines={1}>{title}</Txt>
          <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{subtitle}</Txt>
        </View>
        <DashedLine />
        <ReceiptRow label="Jumlah bruto" value={rupiah(amount)} />
        <ReceiptRow label="PPh 21" value={pph21 > 0 ? `−${rupiah(pph21)}` : "Rp 0"} valueColor={pph21 > 0 ? colors.rose[700] : colors.neutral[900]} />
        <DashedLine />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
          <Txt size={13} weight="extrabold" color={colors.neutral[900]}>Nett diterima</Txt>
          <Txt size={18} weight="extrabold" color={colors.mint[700]} style={{ fontFamily: fonts.mono }}>{rupiah(nett)}</Txt>
        </View>
        <DashedLine />
        <ReceiptRow label="Metode" value={method ?? "-"} />
        <ReceiptRow label="Status" value={status} />
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <Txt size={10.5} color={colors.neutral[400]} style={{ fontFamily: fonts.mono, letterSpacing: 1.5 }}>{code.slice(0, 12).toUpperCase()}</Txt>
          <Txt size={9.5} color={colors.neutral[400]} style={{ marginTop: 4 }}>Dokumen sah tanpa tanda tangan basah</Txt>
        </View>
      </View>
      <Zigzag position="bottom" />
    </View>
  );
}

function ReceiptRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 }}>
      <Txt size={12.5} color={colors.neutral[600]}>{label}</Txt>
      <Txt size={13} weight="bold" color={valueColor ?? colors.neutral[900]} style={{ fontFamily: fonts.mono }}>{value}</Txt>
    </View>
  );
}

function DashedLine() {
  const n = Math.ceil((SCR_W - 32) / 7);
  return (
    <View style={{ flexDirection: "row", overflow: "hidden", height: 1, marginVertical: 8 }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ width: 4, height: 1, marginRight: 3, backgroundColor: colors.neutral[200] }} />
      ))}
    </View>
  );
}

function Zigzag({ position }: { position: "top" | "bottom" }) {
  const n = Math.ceil((SCR_W - 32) / 12) + 1;
  return (
    <View style={{ flexDirection: "row", overflow: "hidden", height: 6 }}>
      {Array.from({ length: n }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            ...(position === "bottom"
              ? { borderTopWidth: 6, borderTopColor: "#fff" }
              : { borderBottomWidth: 6, borderBottomColor: "#fff" }),
          }}
        />
      ))}
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
