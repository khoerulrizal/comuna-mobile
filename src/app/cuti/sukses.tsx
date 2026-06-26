// Pengajuan Cuti Terkirim — hero sukses + ringkasan + sisa saldo. Ikut desain.
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";

export default function CutiSuksesScreen() {
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{
    id: string; policyName: string; range: string; days: string; reason: string;
    annualTotal: string; remainingAfter: string;
  }>();
  const showRemaining = p.remainingAfter !== "" && p.annualTotal !== "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <View style={{ width: 50 }} />
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Pengajuan Terkirim</Txt>
        <Pressable onPress={() => router.replace("/cuti")} hitSlop={8}><Txt size={13} weight="bold" color={colors.brand[600]}>Selesai</Txt></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        {/* Hero sukses */}
        <LinearGradient colors={[colors.brand[600], colors.brand[500], colors.coral[500]]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center" }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={26} color={colors.brand[600]} strokeWidth={3} />
            </View>
          </View>
          <Txt size={20} weight="extrabold" color="#fff" style={{ textAlign: "center" }}>Permintaan berhasil dikirim</Txt>
          <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ textAlign: "center", marginTop: 4 }}>Penyetuju akan meninjau dalam 1×24 jam kerja</Txt>
          <View style={{ marginTop: 14, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Txt size={11} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>ID: {p.id?.slice(0, 10).toUpperCase()}</Txt>
          </View>
        </LinearGradient>

        {/* Ringkasan */}
        <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Ringkasan Pengajuan</Txt>
        <Card pad={0} radius={18}>
          <SummaryRow label="Jenis Cuti" value={p.policyName ?? "-"} icon="calendar" color={colors.brand[600]} bg={colors.brand[100]} />
          <Div />
          <SummaryRow label="Periode" value={p.range ?? "-"} icon="clock" color={colors.mint[700]} bg={colors.mint[100]} />
          <Div />
          <SummaryRow label="Durasi" value={`${p.days} hari`} icon="check" color={colors.coral[700]} bg={colors.coral[100]} />
          {p.reason ? (<><Div /><SummaryRow label="Alasan" value={p.reason} icon="heart" color={colors.amber[700]} bg={colors.amber[100]} /></>) : null}
        </Card>

        {/* Sisa saldo setelah disetujui */}
        {showRemaining ? (
          <View style={{ marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: colors.brand[100], flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={18} color={colors.brand[700]} strokeWidth={2.2} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={12} weight="bold" color={colors.brand[700]}>Sisa saldo cuti setelah disetujui</Txt>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginTop: 2 }}>
                <Txt size={17} weight="extrabold" color={colors.brand[700]} style={{ fontFamily: fonts.extrabold }}>{p.remainingAfter}</Txt>
                <Txt size={12} color={colors.brand[700]} style={{ opacity: 0.7 }}>dari {p.annualTotal} hari</Txt>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.replace("/cuti")} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], alignItems: "center" }}>
          <Txt size={14} weight="bold" color={colors.neutral[700]}>Kembali</Txt>
        </Pressable>
        <Pressable onPress={() => router.replace(`/cuti/${p.id}`)} style={{ flex: 1 }}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, borderRadius: 16, alignItems: "center" }}>
            <Txt size={14} weight="extrabold" color="#fff">Lacak Status</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 60 }} />; }
function SummaryRow({ label, value, icon, color, bg }: { label: string; value: string; icon: string; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ width: 84, marginLeft: 12 }}>{label}</Txt>
      <Txt size={13} weight="semibold" color={colors.neutral[800]} style={{ flex: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}
