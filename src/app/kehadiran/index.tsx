// Kehadiran — kalender bulanan + ringkasan + shift + detail hari ini. Ikut desain Corelia.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  durationLabel, dowOf, getAttendanceCalendar, minutesToHHmm, monthLabel, shiftMonth,
  statusVisual, timeFromIso, type AttendanceCalendar, type CalendarDay,
} from "@/lib/attendance-calendar";

const WD = ["M", "S", "S", "R", "K", "J", "S"];
const TAPPABLE = new Set(["present", "late", "leave", "absent"]);

export default function KehadiranScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<AttendanceCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mo: string) => {
    try {
      setError(null);
      setData(await getAttendanceCalendar(mo));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat kehadiran");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(month); })(); return () => { a = false; }; }, [load, month]));

  function changeMonth(delta: number) {
    const mo = shiftMonth(month, delta);
    setMonth(mo);
    setLoading(true);
  }

  const leadingEmpty = data?.days.length ? dowOf(data.days[0].date) : 0;
  const today = useMemo(() => data?.days.find((d) => d.isToday) ?? null, [data]);
  const tzOff = data?.tzOffsetMinutes ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Kehadiran</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading && !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(month); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : data ? (
            <>
              {/* Month switcher */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 12 }}>
                <Pressable onPress={() => changeMonth(-1)} hitSlop={12}><Icon name="chevronLeft" size={20} color={colors.neutral[500]} strokeWidth={2.2} /></Pressable>
                <Txt size={17} weight="extrabold" color={colors.neutral[900]}>{monthLabel(month)}</Txt>
                <Pressable onPress={() => changeMonth(1)} hitSlop={12}><Icon name="chevronRight" size={20} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
              </View>

              {/* Calendar */}
              <Card pad={14} radius={22}>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  {WD.map((d, i) => (
                    <View key={i} style={{ width: `${100 / 7}%`, alignItems: "center" }}>
                      <Txt size={11} weight="bold" color={i === 0 || i === 6 ? colors.rose[500] : colors.neutral[500]}>{d}</Txt>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: leadingEmpty }).map((_, i) => (
                    <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
                  ))}
                  {data.days.map((d) => <DayCell key={d.date} d={d} />)}
                </View>

                {/* Legend */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100], borderStyle: "dashed" }}>
                  <Legend color={colors.mint[500]} label="Hadir" />
                  <Legend color={colors.amber[500]} label="Terlambat" />
                  <Legend color={colors.brand[500]} label="Cuti" />
                  <Legend color={colors.rose[500]} label="Absen" />
                  <Legend color={colors.neutral[300]} label="Libur" hollow />
                </View>
              </Card>

              {/* Quick actions */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <CalAction icon="info" label="Masalah Kehadiran" sub={data.issueCount > 0 ? `${data.issueCount} belum selesai` : "Lihat riwayat"} tone={colors.coral[700]} bg={colors.coral[100]} badge={data.issueCount > 0 ? String(data.issueCount) : undefined} onPress={() => router.push("/kehadiran/masalah")} />
                <CalAction icon="briefcase" label="Shift Saya" sub={data.shift ? `${data.shift.name} · ${data.shift.startTime}–${data.shift.endTime}` : "Lihat jadwal"} tone={colors.brand[600]} bg={colors.brand[100]} onPress={() => router.push("/shift")} />
              </View>

              {/* Ringkasan */}
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Ringkasan</Txt>
              <Card pad={16} radius={20}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <SumStat label="Jam kerja" value={durationLabel(data.summary.workMinutes)} color={colors.brand[600]} icon="clock" />
                  <SumStat label="Overtime" value={durationLabel(data.summary.overtimeMinutes)} color={colors.amber[700]} icon="trendingUp" />
                  <SumStat label="Rata2 masuk" value={data.summary.avgInMinutes != null ? `${minutesToHHmm(data.summary.avgInMinutes)}${data.tzAbbr ? ` ${data.tzAbbr}` : ""}` : "—"} color={colors.neutral[700]} icon="clock" />
                  <SumStat label="Rata2 pulang" value={data.summary.avgOutMinutes != null ? `${minutesToHHmm(data.summary.avgOutMinutes)}${data.tzAbbr ? ` ${data.tzAbbr}` : ""}` : "—"} color={colors.neutral[700]} icon="clock" />
                </View>
              </Card>

              {/* Detail hari ini */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8 }}>
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]}>Detail Hari Ini</Txt>
                {today ? <Pressable onPress={() => router.push(`/kehadiran/${today.date}`)} hitSlop={8}><Txt size={11.5} weight="bold" color={colors.brand[600]}>Detail →</Txt></Pressable> : null}
              </View>
              <Card pad={0} radius={20}>
                {today && (today.clockIn || today.clockOut) ? (
                  <>
                    <TimelineRow time={today.clockIn ? `${timeFromIso(today.clockIn, tzOff)}${data.tzAbbr ? ` ${data.tzAbbr}` : ""}` : "—"} label="Clock in" detail={today.status === "late" ? "Terlambat" : "Tepat waktu"} icon="check" color={today.status === "late" ? colors.amber[500] : colors.mint[500]} />
                    <TimelineRow time={today.clockOut ? `${timeFromIso(today.clockOut, tzOff)}${data.tzAbbr ? ` ${data.tzAbbr}` : ""}` : "—"} label="Clock out" detail={today.clockOut ? "Tercatat" : "Belum tercatat"} icon={today.clockOut ? "check" : "clock"} color={today.clockOut ? colors.mint[500] : colors.neutral[300]} last />
                  </>
                ) : (
                  <View style={{ padding: 18, alignItems: "center" }}>
                    <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>Belum ada kehadiran tercatat hari ini.</Txt>
                  </View>
                )}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function DayCell({ d }: { d: CalendarDay }) {
  const vis = statusVisual(d.status);
  const num = Number(d.date.slice(8, 10));
  const tappable = TAPPABLE.has(d.status);
  const inner = (
    <View style={{ flex: 1, borderRadius: 11, backgroundColor: vis.bg, alignItems: "center", justifyContent: "center", borderWidth: d.isToday ? 2 : 0, borderColor: colors.brand[500] }}>
      <Txt size={13} weight={d.isToday ? "extrabold" : "semibold"} color={vis.fg}>{num}</Txt>
      {vis.dot ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: vis.dot, marginTop: 3 }} /> : null}
    </View>
  );
  if (!tappable) return <View style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>{inner}</View>;
  return (
    <Pressable onPress={() => router.push(`/kehadiran/${d.date}`)} style={({ pressed }) => ({ width: `${100 / 7}%`, aspectRatio: 1, padding: 2, opacity: pressed ? 0.6 : 1 })}>{inner}</Pressable>
  );
}

function Legend({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: hollow ? "transparent" : color, borderWidth: hollow ? 1.5 : 0, borderColor: color }} />
      <Txt size={11.5} weight="semibold" color={colors.neutral[600]}>{label}</Txt>
    </View>
  );
}

function CalAction({ icon, label, sub, tone, bg, badge, onPress }: { icon: IconName; label: string; sub: string; tone: string; bg: string; badge?: string; onPress?: () => void }) {
  const body = (
    <>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={tone} strokeWidth={2} />
        {badge ? (
          <View style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: colors.coral[500], alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" }}>
            <Txt size={9} weight="extrabold" color="#fff">{badge}</Txt>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={12} weight="bold" color={colors.neutral[900]} numberOfLines={1}>{label}</Txt>
        <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }} numberOfLines={1}>{sub}</Txt>
      </View>
      {onPress ? <Icon name="chevronRight" size={15} color={colors.neutral[300]} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
        <Card pad={12} radius={16} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{body}</Card>
      </Pressable>
    );
  }
  return (
    <Card pad={12} radius={16} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>{body}</Card>
  );
}

function SumStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: IconName }) {
  return (
    <View style={{ width: "47%", flexGrow: 1, backgroundColor: colors.neutral[25], borderRadius: 14, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={13} color={color} strokeWidth={2} />
        <Txt size={11} weight="semibold" color={colors.neutral[500]}>{label}</Txt>
      </View>
      <Txt size={17} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 3 }}>{value}</Txt>
    </View>
  );
}

function TimelineRow({ time, label, detail, icon, color, last }: { time: string; label: string; detail: string; icon: IconName; color: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
      <Txt size={11.5} weight="bold" color={colors.neutral[500]} style={{ width: 64 }}>{time}</Txt>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={14} color={color} strokeWidth={2.3} /></View>
        {!last ? <View style={{ width: 1.5, height: 24, backgroundColor: colors.neutral[100], marginTop: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
        <Txt size={13.5} weight="bold" color={colors.neutral[900]}>{label}</Txt>
        <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{detail}</Txt>
      </View>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
