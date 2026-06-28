// Klaim Reimbursement Terkirim — hero sukses + ringkasan. Ikut desain.
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { rupiah } from "@/lib/reimburse";

export default function ReimburseSuksesScreen() {
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ id: string; category: string; amount: string; date: string; desc: string }>();
  const amount = Number(p.amount) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <View style={{ width: 50 }} />
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Klaim Terkirim</Txt>
        <Pressable onPress={() => router.replace("/reimburse")} hitSlop={8}><Txt size={13} weight="bold" color={colors.brand[600]}>Selesai</Txt></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        <LinearGradient colors={[colors.mint[500], colors.brand[500], colors.coral[500]]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center" }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={26} color={colors.mint[700]} strokeWidth={3} />
            </View>
          </View>
          <Txt size={20} weight="extrabold" color="#fff" style={{ textAlign: "center" }}>Klaim berhasil dikirim</Txt>
          <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ textAlign: "center", marginTop: 4 }}>Penyetuju & keuangan akan meninjau pengajuan Anda</Txt>
          <View style={{ marginTop: 14, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Txt size={11} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>ID: {p.id?.slice(0, 10).toUpperCase()}</Txt>
          </View>
        </LinearGradient>

        <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Ringkasan Klaim</Txt>
        <Card pad={0} radius={18}>
          <SummaryRow label="Kategori" value={p.category ?? "-"} icon="receipt" color={colors.brand[600]} bg={colors.brand[100]} />
          <Div />
          <SummaryRow label="Jumlah" value={rupiah(amount)} icon="money" color={colors.mint[700]} bg={colors.mint[100]} />
          <Div />
          <SummaryRow label="Tanggal" value={p.date ?? "-"} icon="calendar" color={colors.coral[700]} bg={colors.coral[100]} />
          {p.desc ? (<><Div /><SummaryRow label="Deskripsi" value={p.desc} icon="edit" color={colors.amber[700]} bg={colors.amber[100]} /></>) : null}
        </Card>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.replace("/reimburse")} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], alignItems: "center" }}>
          <Txt size={14} weight="bold" color={colors.neutral[700]}>Kembali</Txt>
        </Pressable>
        <Pressable onPress={() => router.replace(`/reimburse/${p.id}`)} style={{ flex: 1 }}>
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
