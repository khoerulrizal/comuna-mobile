// Laporan Tim (manager) — metrik per periode + sparkline + bagikan screenshot. Desain Corelia.
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getTeamReport, MONTHS_ID,
  type Period, type ReportMetric, type TeamReport,
} from "@/lib/manager";

export default function TeamReportScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [period, setPeriod] = useState<Period>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [week, setWeek] = useState(1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [data, setData] = useState<TeamReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef<View>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getTeamReport({ period, year, month, week, quarter }));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat laporan");
    } finally { setLoading(false); setRefreshing(false); }
  }, [period, year, month, week, quarter]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  function changePeriod(p: Period) { if (p !== period) { setPeriod(p); setLoading(true); } }
  function reloadSoon() { setLoading(true); }

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const ViewShot = await import("react-native-view-shot");
      const Sharing = await import("expo-sharing");
      const uri = await ViewShot.captureRef(shotRef, { format: "png", quality: 0.95 });
      if (!(await Sharing.isAvailableAsync())) { Alert.alert("Tidak tersedia", "Berbagi tidak didukung di perangkat ini."); return; }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Bagikan Laporan Tim" });
    } catch (e) {
      Alert.alert("Gagal membagikan", e instanceof Error ? e.message : "Coba lagi");
    } finally { setSharing(false); }
  }

  const m = data?.metrics;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ flex: 1, textAlign: "center" }}>Laporan Tim</Txt>
        <Pressable onPress={share} disabled={sharing || !m} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center", opacity: sharing || !m ? 0.5 : 1 }}>
          {sharing ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="share" size={17} color="#fff" strokeWidth={2.2} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
      >
        {/* Tahun — paling atas */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Txt size={10.5} weight="extrabold" color={colors.neutral[500]} style={{ letterSpacing: 0.4 }}>TAHUN</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => { setYear((y) => y - 1); reloadSoon(); }} hitSlop={8} style={stepBtn}><Icon name="chevronLeft" size={14} color={colors.neutral[700]} strokeWidth={2.4} /></Pressable>
            <Txt size={13} weight="extrabold" color={colors.neutral[800]} style={{ minWidth: 44, textAlign: "center" }}>{year}</Txt>
            <Pressable onPress={() => { setYear((y) => Math.min(now.getFullYear(), y + 1)); reloadSoon(); }} hitSlop={8} disabled={year >= now.getFullYear()} style={[stepBtn, year >= now.getFullYear() ? { opacity: 0.4 } : null]}><Icon name="chevronRight" size={14} color={colors.neutral[700]} strokeWidth={2.4} /></Pressable>
          </View>
        </View>

        {/* Period type */}
        <View style={{ flexDirection: "row", gap: 6, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.neutral[100] }}>
          {([["week", "Minggu"], ["month", "Bulan"], ["quarter", "Kuartal"]] as [Period, string][]).map(([k, l]) => {
            const on = period === k;
            return (
              <Pressable key={k} onPress={() => changePeriod(k)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: on ? colors.brand[500] : "transparent", alignItems: "center" }}>
                <Txt size={11.5} weight="bold" color={on ? "#fff" : colors.neutral[600]}>{l}</Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Contextual selectors */}
        {period === "quarter" ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {[1, 2, 3, 4].map((q) => (
              <SelPill key={q} label={`Q${q}`} on={quarter === q} onPress={() => { setQuarter(q); reloadSoon(); }} grow />
            ))}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
              {MONTHS_ID.map((mn, i) => (
                <SelPill key={mn} label={mn} on={month === i + 1} onPress={() => { setMonth(i + 1); reloadSoon(); }} />
              ))}
            </ScrollView>
            {period === "week" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((w) => (
                  <SelPill key={w} label={`M${w}`} on={week === w} onPress={() => { setWeek(w); reloadSoon(); }} grow />
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* Captured area */}
        <View ref={shotRef} collapsable={false} style={{ backgroundColor: colors.neutral[25], paddingTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 2 }}>
            <View>
              <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>LAPORAN TIM</Txt>
              <Txt size={16} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{data?.periodLabel || "—"}</Txt>
            </View>
            {data ? <Txt size={11.5} weight="semibold" color={colors.neutral[500]}>{data.teamSize} anggota</Txt> : null}
          </View>

          {loading ? (
            <View style={{ paddingVertical: 50, alignItems: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
          ) : error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : !m ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="chart" size={28} color={colors.brand[600]} strokeWidth={1.8} />
              </View>
              <Txt size={14} weight="bold" color={colors.neutral[700]}>Belum ada data tim</Txt>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <ReportCard icon="fingerprint" iconColor={colors.brand[600]} iconBg={colors.brand[100]} line={colors.brand[500]} title="Kehadiran" metric={m.attendance} />
              <ReportCard icon="clock" iconColor={colors.amber[700]} iconBg={colors.amber[100]} line={colors.amber[500]} title="Lembur Tim" metric={m.overtime} />
              <ReportCard icon="plane" iconColor={colors.coral[700]} iconBg={colors.coral[100]} line={colors.coral[500]} title="Penggunaan Cuti" metric={m.leave} />
              <ReportCard icon="receipt" iconColor={colors.mint[700]} iconBg={colors.mint[100]} line={colors.mint[500]} title="Reimburse Disetujui" metric={m.reimburse} />
            </View>
          )}
        </View>

        {m ? (
          <Txt size={11} color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 16, lineHeight: 16 }}>
            Ketuk ikon bagikan di pojok kanan atas untuk membagikan laporan sebagai gambar ke WhatsApp, email, atau aplikasi lain.
          </Txt>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SelPill({ label, on, onPress, grow }: { label: string; on: boolean; onPress: () => void; grow?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flex: grow ? 1 : undefined, minWidth: 46, alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[100] }}>
      <Txt size={12.5} weight="bold" color={on ? "#fff" : colors.neutral[600]}>{label}</Txt>
    </Pressable>
  );
}

function ReportCard({ icon, iconColor, iconBg, line, title, metric }: { icon: IconName; iconColor: string; iconBg: string; line: string; title: string; metric: ReportMetric }) {
  const deltaColor = metric.deltaTone === "down" ? colors.rose[700] : metric.deltaTone === "up" ? colors.mint[700] : colors.neutral[500];
  return (
    <Card pad={14} radius={18}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color={iconColor} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.2 }}>{title}</Txt>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 }}>
            <Txt size={18} weight="extrabold" color={colors.neutral[900]}>{metric.value}</Txt>
            <Txt size={10.5} weight="bold" color={deltaColor}>{metric.delta}</Txt>
          </View>
          <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 2 }} numberOfLines={1}>{metric.sub}</Txt>
        </View>
        <Sparkline data={metric.trend} color={line} />
      </View>
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 76, h = 30;
  if (!data || data.length < 2) return <View style={{ width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h * 0.85 - 2}`).join(" ");
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
const stepBtn = {
  width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: colors.neutral[200],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
