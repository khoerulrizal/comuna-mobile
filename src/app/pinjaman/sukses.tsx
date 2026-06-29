// Pengajuan Pinjaman Terkirim — hero sukses + ringkasan. Ikut desain.
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { rupiah } from "@/lib/loan";

export default function PinjamanSuksesScreen() {
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ id: string; amount: string; tenor: string; monthly: string }>();
  const amount = Number(p.amount) || 0;
  const tenor = Number(p.tenor) || 0;
  const monthly = Number(p.monthly) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <View style={{ width: 50 }} />
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Ajukan Pinjaman</Txt>
        <Pressable onPress={() => router.replace("/pinjaman")} hitSlop={8}><Txt size={13} weight="bold" color={colors.brand[600]}>Selesai</Txt></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        <LinearGradient colors={[colors.brand[600], colors.brand[400]]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 24, paddingVertical: 26, paddingHorizontal: 20, alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Icon name="check" size={34} color="#fff" strokeWidth={3} />
          </View>
          <Txt size={20} weight="extrabold" color="#fff" style={{ textAlign: "center" }}>Pengajuan Terkirim!</Txt>
          <Txt size={12.5} color="rgba(255,255,255,0.92)" style={{ textAlign: "center", marginTop: 4 }}>Pengajuan pinjamanmu diteruskan ke HR untuk ditinjau</Txt>
          <View style={{ marginTop: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Txt size={11} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>ID: {p.id?.slice(0, 10).toUpperCase()}</Txt>
          </View>
        </LinearGradient>

        <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Ringkasan Pengajuan</Txt>
        <Card pad={0} radius={18}>
          <SRow label="Jumlah" value={rupiah(amount)} icon="wallet" color={colors.brand[600]} bg={colors.brand[100]} />
          <Div />
          <SRow label="Tenor" value={`${tenor} bulan · 0% bunga`} icon="calendar" color={colors.coral[700]} bg={colors.coral[100]} />
          <Div />
          <SRow label="Estimasi cicilan" value={`${rupiah(monthly)}/bln`} icon="money" color={colors.mint[700]} bg={colors.mint[100]} />
        </Card>

        <View style={{ marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: colors.amber[100], flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={18} color={colors.amber[700]} strokeWidth={2.2} /></View>
          <View style={{ flex: 1 }}>
            <Txt size={12} weight="bold" color={colors.amber[700]}>Menunggu persetujuan</Txt>
            <Txt size={11} color={colors.amber[700]} style={{ marginTop: 2, opacity: 0.85 }}>Cicilan & jadwal dibuat setelah pinjaman dicairkan. Pantau status di daftar pinjaman.</Txt>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.replace("/pinjaman")} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], alignItems: "center" }}>
          <Txt size={14} weight="bold" color={colors.neutral[700]}>Daftar Pinjaman</Txt>
        </Pressable>
        <Pressable onPress={() => router.replace(`/pinjaman/${p.id}`)} style={{ flex: 1 }}>
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 14, borderRadius: 16, alignItems: "center" }}>
            <Txt size={14} weight="extrabold" color="#fff">Lacak Status</Txt>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 60 }} />; }
function SRow({ label, value, icon, color, bg }: { label: string; value: string; icon: string; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ width: 96, marginLeft: 12 }}>{label}</Txt>
      <Txt size={13} weight="semibold" color={colors.neutral[800]} style={{ flex: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}
