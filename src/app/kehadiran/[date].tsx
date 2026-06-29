// Detail Kehadiran (satu hari) — clock in/out + lokasi + swafoto + wajah + jam kerja.
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { PunchMap } from "@/components/PunchMap";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { DocPreviewModal, type PreviewDoc } from "@/components/DocPreviewModal";
import {
  durationLabel, fullDateLabel, getAttendanceDay, statusLabel, statusVisual, timeFromIso,
  type AttendanceDay, type AttStatus, type ClockPunch,
} from "@/lib/attendance-calendar";
import { statusMeta } from "@/lib/attendance-issues";

function heroColors(s: AttStatus): [string, string] {
  switch (s) {
    case "late": return [colors.amber[500], colors.amber[700]];
    case "absent": return [colors.rose[500], colors.coral[700]];
    case "leave": return [colors.brand[700], colors.brand[500]];
    case "present": return [colors.mint[500], colors.mint[700]];
    default: return [colors.neutral[500], colors.neutral[700]];
  }
}

export default function KehadiranDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [data, setData] = useState<AttendanceDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    try { setError(null); setData(await getAttendanceDay(date)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [date]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const tzOff = data?.tzOffsetMinutes ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Kehadiran</Txt>
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
              <Txt size={12.5} weight="bold" color="rgba(255,255,255,0.9)">{fullDateLabel(data.date)}</Txt>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.3 }}>{statusLabel(data.status).toUpperCase()}</Txt>
              </View>
            </View>
            {data.shift ? (
              <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ marginTop: 14 }}>{data.shift.name}{data.shift.startTime ? ` · ${data.shift.startTime}–${data.shift.endTime}${data.tzAbbr ? ` ${data.tzAbbr}` : ""}` : ""}</Txt>
            ) : null}
            <View style={{ flexDirection: "row", marginTop: 8, gap: 20 }}>
              <View>
                <Txt size={10.5} color="rgba(255,255,255,0.75)">Jam kerja</Txt>
                <Txt size={18} weight="extrabold" color="#fff" style={{ marginTop: 1, fontFamily: fonts.extrabold }}>{data.workingHours != null ? durationLabel(Math.round(data.workingHours * 60)) : "—"}</Txt>
              </View>
              {data.lateMinutes != null && data.lateMinutes > 0 ? (
                <View>
                  <Txt size={10.5} color="rgba(255,255,255,0.75)">Keterlambatan</Txt>
                  <Txt size={18} weight="extrabold" color="#fff" style={{ marginTop: 1, fontFamily: fonts.extrabold }}>{durationLabel(data.lateMinutes)}</Txt>
                </View>
              ) : null}
            </View>
          </LinearGradient>

          {/* Leave / holiday note */}
          {data.leave ? (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: colors.brand[100], flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="plane" size={16} color={colors.brand[600]} /></View>
              <View style={{ flex: 1 }}>
                <Txt size={12.5} weight="bold" color={colors.brand[700]}>{data.leave.policyName ?? "Cuti"}</Txt>
                {data.leave.reason ? <Txt size={11} color={colors.brand[700]} style={{ marginTop: 1, opacity: 0.85 }}>{data.leave.reason}</Txt> : null}
              </View>
            </View>
          ) : data.holidayName ? (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: colors.amber[100], flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={16} color={colors.amber[700]} /></View>
              <Txt size={12.5} weight="bold" color={colors.amber[700]} style={{ flex: 1 }}>Libur: {data.holidayName}</Txt>
            </View>
          ) : null}

          {/* Punch cards */}
          <PunchCard title="Clock In" punch={data.clockIn} tzOff={tzOff} tzAbbr={data.tzAbbr} onPhoto={setPreview} accent={colors.mint[700]} accentBg={colors.mint[100]} late={data.lateMinutes} />
          <PunchCard title="Clock Out" punch={data.clockOut} tzOff={tzOff} tzAbbr={data.tzAbbr} onPhoto={setPreview} accent={colors.coral[700]} accentBg={colors.coral[100]} />

          {/* Pengajuan koreksi */}
          <CorrectionSection data={data} tzOff={tzOff} />
        </ScrollView>
      )}

      <DocPreviewModal doc={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

function PunchCard({ title, punch, tzOff, tzAbbr, onPhoto, accent, accentBg, late }: {
  title: string; punch: ClockPunch | null; tzOff: number; tzAbbr: string | null; onPhoto: (d: PreviewDoc) => void;
  accent: string; accentBg: string; late?: number | null;
}) {
  return (
    <>
      <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>{title}</Txt>
      <Card pad={14} radius={16}>
        {!punch ? (
          <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center", paddingVertical: 8 }}>Belum tercatat</Txt>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {punch.photo ? (
                <Pressable onPress={() => onPhoto({ url: punch.photo!, name: title, mimeType: "image/jpeg" })}>
                  <Image source={{ uri: punch.photo }} style={{ width: 64, height: 80, borderRadius: 12, backgroundColor: colors.neutral[100] }} />
                </Pressable>
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: accentBg, alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={20} color={accent} /></View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Txt size={22} weight="extrabold" color={colors.neutral[900]} style={{ fontFamily: fonts.extrabold }}>{timeFromIso(punch.time, tzOff)}{tzAbbr ? <Txt size={12} weight="bold" color={colors.neutral[400]}> {tzAbbr}</Txt> : null}</Txt>
                  {title === "Clock In" && late != null && late > 0 ? (
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.amber[100] }}><Txt size={9.5} weight="extrabold" color={colors.amber[700]}>TERLAMBAT</Txt></View>
                  ) : null}
                </View>
                {punch.locationLabel || punch.lat != null ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Icon name="mapPin" size={13} color={colors.brand[600]} strokeWidth={2.2} />
                    <Txt size={11.5} weight="semibold" color={colors.neutral[700]} style={{ flexShrink: 1 }} numberOfLines={1}>
                      {punch.locationLabel ?? `${punch.lat!.toFixed(5)}, ${punch.lng!.toFixed(5)}`}
                      {punch.distanceMeters != null ? ` · ±${punch.distanceMeters >= 1000 ? `${(punch.distanceMeters / 1000).toFixed(1)} km` : `${punch.distanceMeters} m`} dari lokasi` : ""}
                    </Txt>
                  </View>
                ) : null}
                {punch.facePassed != null ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Icon name={punch.facePassed ? "check" : "close"} size={12} color={punch.facePassed ? colors.mint[700] : colors.rose[700]} strokeWidth={2.6} />
                    <Txt size={11} weight="semibold" color={punch.facePassed ? colors.mint[700] : colors.rose[700]}>{punch.facePassed ? "Wajah cocok" : "Wajah tidak cocok"}{punch.faceScore != null ? ` · ${Math.round(punch.faceScore * 100)}%` : ""}</Txt>
                  </View>
                ) : null}
                {punch.note ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 4, fontStyle: "italic" }}>“{punch.note}”</Txt> : null}
              </View>
            </View>

            {/* Peta lokasi absensi: titik user + titik kantor/rumah + radius */}
            {punch.lat != null && punch.lng != null ? (
              <View style={{ marginTop: 12 }}>
                <PunchMap userLat={punch.lat} userLng={punch.lng} refLat={punch.refLat} refLng={punch.refLng} refName={punch.refName} refRadius={punch.refRadius} />
                {punch.refLat != null ? (
                  <View style={{ flexDirection: "row", gap: 14, marginTop: 8, paddingHorizontal: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand[500] }} /><Txt size={10.5} weight="semibold" color={colors.neutral[600]}>Titik absensi</Txt></View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.mint[500] }} /><Txt size={10.5} weight="semibold" color={colors.neutral[600]}>{punch.refName ?? "Lokasi"}</Txt></View>
                  </View>
                ) : null}
                <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${punch.lat},${punch.lng}`)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.brand[50] }}>
                  <Icon name="mapPin" size={14} color={colors.brand[600]} strokeWidth={2.2} />
                  <Txt size={12} weight="bold" color={colors.brand[600]}>Buka di Google Maps</Txt>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </Card>
    </>
  );
}

function defaultIssueType(status: AttStatus): string {
  if (status === "late") return "late";
  if (status === "absent") return "absent";
  return "missing_clock";
}
const FORM_STATUSES = new Set(["PRESENT", "LATE", "ABSENT", "HOLIDAY"]);

// Bagian Pengajuan Koreksi: timeline bila sudah diajukan, atau tombol Ajukan.
function CorrectionSection({ data, tzOff }: { data: AttendanceDay; tzOff: number }) {
  const c = data.correction;

  if (c) {
    const sm = statusMeta(c.status);
    return (
      <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 }}>
          <Icon name="info" size={14} color={colors.brand[600]} strokeWidth={2.2} />
          <Txt size={12.5} weight="extrabold" color={colors.neutral[700]}>Pengajuan Koreksi</Txt>
        </View>
        <Card pad={14} radius={16}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brand[100] }}>
              <Txt size={10.5} weight="extrabold" color={colors.brand[700]}>{c.issueLabel}</Txt>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: sm.bg }}>
              <Icon name={sm.icon} size={11} color={sm.color} strokeWidth={2.4} />
              <Txt size={10.5} weight="extrabold" color={sm.color}>{c.status}</Txt>
            </View>
            {c.status === "PENDING" && c.totalSteps > 1 ? (
              <Txt size={10.5} color={colors.neutral[400]}>langkah {c.currentStep}/{c.totalSteps}</Txt>
            ) : null}
            <Txt size={10.5} color={colors.neutral[400]} style={{ marginLeft: "auto" }}>{c.submittedLabel}</Txt>
          </View>
          {c.reason ? <Txt size={12.5} color={colors.neutral[700]} style={{ marginTop: 8, lineHeight: 18 }}>{c.reason}</Txt> : null}
          {(c.requestedClockIn || c.requestedClockOut || c.requestedStatus) ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
              {c.requestedClockIn ? <Usul label="Usul Masuk" value={c.requestedClockIn} /> : null}
              {c.requestedClockOut ? <Usul label="Usul Pulang" value={c.requestedClockOut} /> : null}
              {c.requestedStatus ? <Usul label="Usul Status" value={c.requestedStatus} /> : null}
            </View>
          ) : null}

          <Txt size={10.5} weight="bold" color={colors.neutral[400]} style={{ marginTop: 12, marginBottom: 10, letterSpacing: 0.3 }}>RIWAYAT PERSETUJUAN</Txt>
          <ApprovalTimeline items={c.timeline} />
        </Card>
      </>
    );
  }

  if (!data.canSubmitCorrection) return null;

  const status = data.attendanceStatus && FORM_STATUSES.has(data.attendanceStatus) ? data.attendanceStatus : "PRESENT";
  const clockIn = data.clockIn ? timeFromIso(data.clockIn.time, tzOff) : "";
  const clockOut = data.clockOut ? timeFromIso(data.clockOut.time, tzOff) : "";
  return (
    <Pressable
      onPress={() => router.push({
        pathname: "/kehadiran/koreksi",
        params: {
          attendanceId: data.attendanceId ?? "",
          date: data.date,
          status,
          issueType: defaultIssueType(data.status),
          ...(clockIn && clockIn !== "—" ? { clockIn } : {}),
          ...(clockOut && clockOut !== "—" ? { clockOut } : {}),
        },
      })}
      style={({ pressed }) => ({ marginTop: 18, opacity: pressed ? 0.85 : 1 })}
    >
      <Card pad={16} radius={16} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.brand[100] }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
          <Icon name="edit" size={18} color={colors.brand[600]} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>Ajukan Koreksi</Txt>
          <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>Ada yang salah dengan kehadiran ini? Ajukan perbaikan.</Txt>
        </View>
        <Icon name="chevronRight" size={16} color={colors.neutral[300]} />
      </Card>
    </Pressable>
  );
}

function Usul({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Txt size={9.5} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>{label.toUpperCase()}</Txt>
      <Txt size={13} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{value}</Txt>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
