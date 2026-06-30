// Aktivitas — timeline harian + chip tanggal + tambah. Ikut desain Corelia.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { getCapabilities } from "@/lib/capabilities";
import {
  activitiesTotalMinutes, activitySummary, activityTimeLabel, activityTitle, activityTypeMeta,
  durationLabel, getActivities, hhmmToMin, type ActivityItem, type ActivityList, type ClockEntry,
} from "@/lib/activity";

const MM = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function sectionLabel(date: string, todayDate: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dateFull = `${d} ${MM[m - 1]} ${y}`;
  return date === todayDate ? `Hari ini · ${dateFull}` : dateFull;
}

export default function AktivitasScreen() {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState<string | undefined>(undefined);
  const [data, setData] = useState<ActivityList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ketersediaan modul Activities di paket (null = belum diketahui).
  const [hasModule, setHasModule] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getCapabilities()
      .then((c) => { if (active) setHasModule(c.modules.includes("activities")); })
      .catch(() => { /* biarkan null → tampilkan konten normal */ });
    return () => { active = false; };
  }, []);

  const load = useCallback(async (d?: string) => {
    try { setError(null); setData(await getActivities(d)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat aktivitas"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(date); })(); return () => { a = false; }; }, [load, date]));

  // Total = rentang clock-in→clock-out bila ada; jika tidak, Σ durasi aktivitas.
  const total = useMemo(() => {
    if (!data) return 0;
    const s = hhmmToMin(data.attendance?.clockIn?.time ?? null);
    const e = hhmmToMin(data.attendance?.clockOut?.time ?? null);
    if (s != null && e != null) { let d = e - s; if (d < 0) d += 1440; return d; }
    return activitiesTotalMinutes(data.activities);
  }, [data]);

  // Timeline gabungan: clock-in + aktivitas + clock-out, urut waktu.
  const nodes = useMemo(() => {
    if (!data) return [];
    type Node = { key: string; sort: number } & (
      | { t: "in" | "out"; clock: ClockEntry }
      | { t: "act"; act: ActivityItem }
    );
    const arr: Node[] = [];
    if (data.attendance?.clockIn) arr.push({ key: "clock-in", sort: hhmmToMin(data.attendance.clockIn.time) ?? 0, t: "in", clock: data.attendance.clockIn });
    for (const a of data.activities) {
      const startT = a.metadata.startTime ?? a.metadata.departureTime ?? a.metadata.dueTime ?? null;
      arr.push({ key: a.id, sort: hhmmToMin(startT) ?? 24 * 60 + 1, t: "act", act: a });
    }
    if (data.attendance?.clockOut) arr.push({ key: "clock-out", sort: hhmmToMin(data.attendance.clockOut.time) ?? 24 * 60 + 2, t: "out", clock: data.attendance.clockOut });
    return arr.sort((x, y) => x.sort - y.sort);
  }, [data]);

  // Modul Activities tidak termasuk paket → tab tetap ada, tampilkan info upgrade.
  if (hasModule === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
          <Txt size={22} weight="extrabold" color={colors.neutral[900]}>Aktivitas</Txt>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="lock" size={32} color={colors.brand[600]} strokeWidth={1.8} />
          </View>
          <Txt size={16} weight="extrabold" color={colors.neutral[800]} style={{ textAlign: "center" }}>Modul Aktivitas belum aktif</Txt>
          <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center", lineHeight: 19 }}>
            Fitur ini belum termasuk dalam paket perusahaan Anda. Hubungi admin untuk meningkatkan ke paket yang lebih tinggi.
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Txt size={22} weight="extrabold" color={colors.neutral[900]}>Aktivitas</Txt>
        <Pressable onPress={() => router.push("/aktivitas/tambah")} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
          <Icon name="plus" size={20} color="#fff" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Chip tanggal */}
      {data ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }} style={{ flexGrow: 0, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
          {data.dateChips.map((c) => {
            const active = c.date === data.date;
            return (
              <Pressable key={c.date} onPress={() => { setDate(c.date); setLoading(true); }} style={{ minWidth: 60, alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: active ? colors.brand[500] : "#fff", borderWidth: active ? 0 : 1, borderColor: colors.neutral[100] }}>
                <Txt size={10} weight="semibold" color={active ? "rgba(255,255,255,0.8)" : colors.neutral[400]}>{c.dow}{c.isToday ? " •" : ""}</Txt>
                <Txt size={15} weight="extrabold" color={active ? "#fff" : colors.neutral[800]} style={{ marginTop: 2 }}>{c.dayNum}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading && !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : data ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Txt size={13} weight="extrabold" color={colors.neutral[700]}>{sectionLabel(data.date, data.todayDate)}</Txt>
                {total > 0 ? (
                  <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brand[100] }}>
                    <Txt size={11} weight="extrabold" color={colors.brand[700]}>{durationLabel(total)}</Txt>
                  </View>
                ) : null}
              </View>

              {nodes.length === 0 ? (
                <Card pad={24} radius={18}>
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                      <Icon name="chart" size={22} color={colors.brand[500]} strokeWidth={2} />
                    </View>
                    <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Belum ada aktivitas</Txt>
                    <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center" }}>Catat aktivitas kerjamu hari ini dengan tombol +.</Txt>
                    <Pressable onPress={() => router.push("/aktivitas/tambah")} style={{ marginTop: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.brand[500] }}>
                      <Txt size={13} weight="bold" color="#fff">Tambah Aktivitas</Txt>
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <View>
                  {nodes.map((n, i) =>
                    n.t === "act"
                      ? <ActivityEntry key={n.key} a={n.act} tzAbbr={data.tzAbbr} last={i === nodes.length - 1} />
                      : <AttendanceEntry key={n.key} clock={n.clock} type={n.t} tzAbbr={data.attendance?.tzAbbr ?? data.tzAbbr} date={data.date} last={i === nodes.length - 1} />,
                  )}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function AttendanceEntry({ clock, type, tzAbbr, date, last }: { clock: ClockEntry; type: "in" | "out"; tzAbbr: string | null; date: string; last: boolean }) {
  const isIn = type === "in";
  const color = isIn ? colors.mint[700] : colors.coral[700];
  const title = isIn ? "Clock In" : "Clock Out";
  const status = isIn ? (clock.late ? `Terlambat${clock.lateMinutes ? ` ${clock.lateMinutes}m` : ""}` : "Tepat waktu") : "Selesai kerja";
  const detail = [clock.locationLabel, status].filter(Boolean).join(" · ");
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
      <View style={{ width: 58, paddingTop: 10 }}>
        <Txt size={11} weight="bold" color={colors.neutral[500]}>{clock.time}</Txt>
        {tzAbbr ? <Txt size={9} weight="semibold" color={colors.neutral[400]}>{tzAbbr}</Txt> : null}
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Icon name={isIn ? "check" : "logout"} size={14} color="#fff" strokeWidth={2.6} />
        </View>
        {!last ? <View style={{ width: 1.5, flex: 1, minHeight: 16, backgroundColor: colors.neutral[100], marginTop: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressable onPress={() => router.push(`/kehadiran/${date}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <Card pad={12} radius={14}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: `${color}18` }}>
                <Txt size={9.5} weight="extrabold" color={color} style={{ letterSpacing: 0.3 }}>ABSENSI</Txt>
              </View>
              <Icon name="chevronRight" size={14} color={colors.neutral[300]} />
            </View>
            <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{title}</Txt>
            {detail ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 3 }}>{detail}</Txt> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              {clock.photoUrl ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.neutral[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Icon name="camera" size={11} color={colors.neutral[500]} strokeWidth={2} />
                  <Txt size={10.5} weight="semibold" color={colors.neutral[600]}>Swafoto</Txt>
                </View>
              ) : null}
              <Txt size={10.5} weight="bold" color={colors.brand[600]}>Detail kehadiran →</Txt>
            </View>
          </Card>
        </Pressable>
      </View>
    </View>
  );
}

function ActivityEntry({ a, tzAbbr, last }: { a: ActivityItem; tzAbbr: string | null; last: boolean }) {
  const meta = activityTypeMeta(a.category);
  const time = activityTimeLabel(a.metadata);
  const summary = activitySummary(a.category, a.metadata);
  const muted = a.category === "BREAK";
  const chips: { icon: IconName; label: string }[] = [];
  if (a.checkInLat != null && a.checkInLng != null) chips.push({ icon: "mapPin", label: "Lokasi" });
  if (a.metadata.attachments && a.metadata.attachments.length > 0) chips.push({ icon: "doc", label: `${a.metadata.attachments.length} lampiran` });
  if (a.photoUrl) chips.push({ icon: "camera", label: "Foto" });
  if (a.signatureUrl) chips.push({ icon: "edit", label: "TTD" });

  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
      <View style={{ width: 58, paddingTop: 10 }}>
        <Txt size={11} weight="bold" color={colors.neutral[500]}>{time ?? "—"}</Txt>
        {time && tzAbbr ? <Txt size={9} weight="semibold" color={colors.neutral[400]}>{tzAbbr}</Txt> : null}
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${meta.color}22`, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Icon name={meta.icon} size={14} color={meta.color} strokeWidth={2.4} />
        </View>
        {!last ? <View style={{ width: 1.5, flex: 1, minHeight: 16, backgroundColor: colors.neutral[100], marginTop: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressable onPress={() => router.push(`/aktivitas/${a.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : muted ? 0.75 : 1 })}>
          <Card pad={12} radius={14}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: `${meta.color}18` }}>
                <Txt size={9.5} weight="extrabold" color={meta.color} style={{ letterSpacing: 0.3 }}>{meta.label.toUpperCase()}</Txt>
              </View>
              <Icon name="chevronRight" size={14} color={colors.neutral[300]} />
            </View>
            <Txt size={13.5} weight="extrabold" color={colors.neutral[900]} numberOfLines={2}>{activityTitle(a)}</Txt>
            {a.metadata.description ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 3, lineHeight: 16 }} numberOfLines={3}>{a.metadata.description}</Txt> : null}
            {summary ? <Txt size={11} color={colors.neutral[600]} style={{ marginTop: 4 }}>{summary}</Txt> : null}
            {a.notes ? <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 4, fontStyle: "italic" }}>“{a.notes}”</Txt> : null}
            {chips.length > 0 ? (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                {chips.map((c, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.neutral[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Icon name={c.icon} size={11} color={colors.neutral[500]} strokeWidth={2} />
                    <Txt size={10.5} weight="semibold" color={colors.neutral[600]}>{c.label}</Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </Pressable>
      </View>
    </View>
  );
}
