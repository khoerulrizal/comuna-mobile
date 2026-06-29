// Detail Masalah Kehadiran — ringkasan + linimasa approval berjenjang. Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { categoryMeta, getIssue, type IssueDetail } from "@/lib/attendance-issues";

function heroColors(status: string): [string, string] {
  switch (status) {
    case "APPROVED": return [colors.mint[500], colors.mint[700]];
    case "REJECTED": return [colors.coral[500], colors.coral[700]];
    default: return [colors.amber[500], colors.amber[700]];
  }
}

export default function MasalahDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getIssue(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const tzAbbr = data?.tzAbbr ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Masalah</Txt>
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
          <LinearGradient colors={heroColors(data.status)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.3 }}>{data.statusLabel.toUpperCase()}</Txt>
              </View>
              <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.9)">{data.dateFull}</Txt>
            </View>
            <Txt size={22} weight="extrabold" color="#fff" style={{ marginTop: 14, fontFamily: fonts.extrabold }}>{data.issueLabel}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Txt size={12} color="rgba(255,255,255,0.9)">{categoryMeta(data.category).label}</Txt>
              {data.status === "PENDING" && data.totalSteps > 1 ? (
                <>
                  <Txt size={12} color="rgba(255,255,255,0.6)">·</Txt>
                  <Txt size={12} weight="bold" color="#fff">Langkah {data.currentStep}/{data.totalSteps}</Txt>
                </>
              ) : null}
            </View>
          </LinearGradient>

          {/* Waktu */}
          <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>Rincian Waktu</Txt>
          <Card pad={14} radius={16}>
            <View style={{ flexDirection: "row" }}>
              <TimeCell label="Clock-in" value={withTz(data.clockIn, tzAbbr)} />
              <TimeCell label="Clock-out" value={withTz(data.clockOut, tzAbbr)} />
              <TimeCell label="Diajukan" value={withTz(data.expected, tzAbbr)} target />
            </View>
            {data.requestedStatus ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100], flexDirection: "row", justifyContent: "space-between" }}>
                <Txt size={12.5} weight="semibold" color={colors.neutral[500]}>Status diminta</Txt>
                <Txt size={13} weight="bold" color={colors.neutral[900]}>{data.requestedStatus}</Txt>
              </View>
            ) : null}
          </Card>

          {/* Alasan */}
          {data.reason ? (
            <>
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>Alasan</Txt>
              <Card pad={14} radius={16}><Txt size={13} color={colors.neutral[700]} style={{ lineHeight: 20 }}>{data.reason}</Txt></Card>
            </>
          ) : null}

          {/* Linimasa approval */}
          {data.timeline.length > 0 ? (
            <>
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>Linimasa Approval</Txt>
              <Card pad={16} radius={18}><ApprovalTimeline items={data.timeline} /></Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function withTz(v: string | null, tzAbbr: string | null): string | null {
  if (!v) return v;
  return tzAbbr ? `${v} ${tzAbbr}` : v;
}

function TimeCell({ label, value, target }: { label: string; value: string | null; target?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={9.5} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>{label.toUpperCase()}</Txt>
      <Txt size={15} weight="extrabold" color={target ? colors.brand[600] : colors.neutral[900]} style={{ marginTop: 2 }}>{value ?? "—"}</Txt>
    </View>
  );
}

const headerBar = {
  flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
  paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff",
  borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
};
const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
