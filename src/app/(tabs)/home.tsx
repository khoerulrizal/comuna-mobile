// Home (karyawan) — ported from the design's screens-home.jsx (Corelia HRIS Mobile).
import React, { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Avatar, Card, Icon, type IconName, Pill, SectionHeader, Txt } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/theme/tokens";
import { me, review } from "@/data/mock";
import { AuthError } from "@/lib/api";
import {
  clockLocationSummary,
  dateLabel,
  formatDuration,
  getHome,
  liveClock,
  timeHMS,
  type Home,
} from "@/lib/home";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [home, setHome] = useState<Home | null>(null);
  const [offModal, setOffModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Jam berjalan: tick tiap detik untuk clock live di card.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const h = await getHome();
          if (active) setHome(h);
        } catch (e) {
          if (e instanceof AuthError) router.replace("/login");
          // selain itu: biarkan tampilan fallback (mock) — Home tetap berguna.
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const loaded = home != null;
  const profile = home?.profile;
  const shift = home?.shift ?? null;
  const greeting = profile?.greeting ?? "Halo";
  const photoUrl = profile?.photoUrl ?? null;
  const fullName = profile?.fullName ?? me.name;

  // Sudah dimuat tapi tak ada penugasan shift → belum ada jadwal (kantor disembunyikan).
  const noSchedule = loaded && !shift;

  // Baris shift: "Nama · WFO · 09:00–18:00 WIB" (jam = hari current + zona).
  const shiftLabel = shift
    ? `${shift.name}${shift.locationType !== "MULTIPLE" ? ` · ${shift.locationType}` : ""}${
        shift.isWorkingDay && shift.startTime && shift.endTime
          ? ` · ${shift.startTime}–${shift.endTime}${shift.tzAbbr ? ` ${shift.tzAbbr}` : ""}`
          : shift.holidayName
            ? ` · Libur: ${shift.holidayName}`
            : " · Libur hari ini"
      }`
    : noSchedule
      ? "Belum ada jadwal kerja"
      : `Shift · ${me.shift}`;

  // Lokasi clock: tampil hanya jika ada shift (atau fallback mock saat belum dimuat).
  const showLocation = !noSchedule;
  const loc = shift ? clockLocationSummary(shift) : { text: me.location, extra: 0 };

  // ── Card clock-in/out (data hari ini, zona shift) ──────────────────────────
  const today = home?.today ?? null;
  const tzOff = today?.tzOffsetMinutes ?? 0;
  const tzAbbr = today?.tzAbbr ?? "";
  const liveTime = today ? liveClock(nowMs, tzOff) : "--:--:--";
  const todayLabel = today ? dateLabel(nowMs, tzOff) : "Hari ini";
  const clockInHMS = today ? timeHMS(today.clockIn, tzOff) : null;
  const clockOutHMS = today ? timeHMS(today.clockOut, tzOff) : null;
  const attStatus = today?.attendanceStatus ?? "BEFORE_CLOCKIN";

  // Jam kerja: "Belum clock out" selagi sudah clock-in tapi belum clock-out.
  const jamKerja =
    today?.workedMinutes != null
      ? (formatDuration(today.workedMinutes) ?? "–")
      : attStatus === "CLOCKED_IN"
        ? "Belum clock out"
        : "–";
  const targetLabel = formatDuration(today?.targetMinutes ?? null) ?? "–";
  const selesaiLabel = clockOutHMS ?? "–";

  // Tombol: primary (belum clock-in) / merah (sudah clock-in, belum out) / disabled (selesai).
  const clockDone = attStatus === "DONE";
  const clockedIn = attStatus === "CLOCKED_IN";

  function onClockPress() {
    if (clockDone) return;
    router.push("/clock");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25] }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero header — brand gradient */}
        <LinearGradient
          colors={[colors.brand[600], colors.brand[500], colors.brand[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 72,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable onPress={() => router.push("/profil")} hitSlop={6}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                ) : (
                  <Avatar name={fullName} size={42} />
                )}
              </Pressable>
              <View>
                <Txt size={12.5} color="rgba(255,255,255,0.85)" weight="medium">
                  {greeting},
                </Txt>
                <Txt size={17} weight="extrabold" color="#fff">
                  {fullName}
                </Txt>
              </View>
            </View>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="bell" size={20} color="#fff" strokeWidth={2} />
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 9,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.coral[500],
                  borderWidth: 2,
                  borderColor: colors.brand[500],
                }}
              />
            </View>
          </View>

          {/* Shift info */}
          <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="clock" size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Txt size={12.5} color="rgba(255,255,255,0.9)">
              {shiftLabel}
            </Txt>
          </View>
          {showLocation ? (
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="mapPin" size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Txt size={12.5} color="rgba(255,255,255,0.9)">
              {loc.text}
            </Txt>
            {loc.extra > 0 ? (
              <Pressable
                onPress={() => setOffModal(true)}
                hitSlop={8}
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              >
                <Txt size={11} weight="bold" color="#fff">
                  +{loc.extra}
                </Txt>
              </Pressable>
            ) : null}
          </View>
          ) : null}
        </LinearGradient>

        {/* Clock-in card — floating */}
        <View style={{ paddingHorizontal: 16, marginTop: -50 }}>
          <Card pad={18} radius={22} elevated>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Txt size={12} weight="semibold" color={colors.neutral[500]} style={{ letterSpacing: 0.2 }}>
                  {todayLabel}
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                  <Txt size={26} weight="extrabold" color={colors.neutral[900]} style={{ fontVariant: ["tabular-nums"] }}>
                    {liveTime}
                  </Txt>
                  {tzAbbr ? (
                    <Txt size={13} weight="semibold" color={colors.neutral[500]}>
                      {tzAbbr}
                    </Txt>
                  ) : null}
                </View>
                <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {attStatus === "DONE" ? (
                    <>
                      <Pill tone="neutral">
                        <Icon name="check" size={11} color={colors.neutral[600]} strokeWidth={2.5} />
                        <Txt weight="semibold" size={11.5} color={colors.neutral[700]}>
                          Kehadiran selesai
                        </Txt>
                      </Pill>
                      {clockInHMS ? (
                        <Txt size={11.5} color={colors.neutral[500]}>
                          · {clockInHMS}
                        </Txt>
                      ) : null}
                    </>
                  ) : attStatus === "CLOCKED_IN" ? (
                    <>
                      <Pill tone="mint">
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint[500] }} />
                        <Txt weight="semibold" size={11.5} color={colors.mint[700]}>
                          Sudah clock in
                        </Txt>
                      </Pill>
                      {clockInHMS ? (
                        <Txt size={11.5} color={colors.neutral[500]}>
                          · {clockInHMS}
                        </Txt>
                      ) : null}
                    </>
                  ) : (
                    <Pill tone="amber">
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber[500] }} />
                      <Txt weight="semibold" size={11.5} color={colors.amber[700]}>
                        Belum clock in
                      </Txt>
                    </Pill>
                  )}
                </View>
              </View>
              <Pressable onPress={onClockPress} disabled={clockDone}>
                <LinearGradient
                  colors={
                    clockDone
                      ? [colors.neutral[200], colors.neutral[300]]
                      : clockedIn
                        ? [colors.rose[500], colors.rose[700]]
                        : [colors.brand[500], colors.brand[700]]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 70, height: 70, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon
                    name={clockDone ? "check" : "fingerprint"}
                    size={clockDone ? 30 : 32}
                    color="#fff"
                    strokeWidth={2}
                  />
                  <Txt size={9.5} weight="bold" color="#fff" style={{ marginTop: 2 }}>
                    {clockDone ? "Selesai" : clockedIn ? "Clock Out" : "Clock In"}
                  </Txt>
                </LinearGradient>
              </Pressable>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderColor: colors.neutral[100],
                borderStyle: "dashed",
              }}
            >
              <MiniStat label="Jam Kerja" value={jamKerja} color={colors.brand[600]} />
              <MiniStat label="Target" value={targetLabel} color={colors.neutral[600]} />
              <MiniStat label="Selesai" value={selesaiLabel} color={colors.neutral[600]} />
            </View>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <SectionHeader title="Akses Cepat" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <QuickAction icon="plane" label="Cuti" tone={colors.brand[500]} bg={colors.brand[100]} badge="8 hari" />
            <QuickAction icon="clock" label="Lembur" tone={colors.amber[700]} bg={colors.amber[100]} />
            <QuickAction icon="receipt" label="Reimburse" tone={colors.mint[700]} bg={colors.mint[100]} badge="2 pending" />
            <QuickAction icon="wallet" label="Slip Gaji" tone={colors.coral[700]} bg={colors.coral[100]} />
            <QuickAction icon="calendar" label="Kalender" tone={colors.neutral[700]} bg={colors.neutral[100]} />
            <QuickAction icon="money" label="Pinjaman" tone={colors.neutral[700]} bg={colors.neutral[100]} />
          </View>
        </View>

        {/* Performa */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionHeader title="Performa" action="Lihat semua" />
          {review.active && (
            <LinearGradient
              colors={[colors.brand[600], colors.coral[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="star" size={22} color="#fff" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.85)">
                  PERIODE REVIEW AKTIF
                </Txt>
                <Txt size={14} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>
                  {review.period}
                </Txt>
                <Txt size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
                  Sisa {review.daysLeft} hari · progress {review.progress}%
                </Txt>
              </View>
              <Icon name="chevronRight" size={20} color="#fff" strokeWidth={2} />
            </LinearGradient>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <PerfTile icon="target" label="KPI Saya" primary="74" suffix="/100" hint="Q2 · 4 indikator" accent={colors.brand[500]} bg={colors.brand[100]} />
            <PerfTile icon="trendingUp" label="OKR" primary="62%" hint="2 objective aktif" accent={colors.coral[500]} bg={colors.coral[100]} />
            <PerfTile icon="heart" label="Feedback" primary="2" suffix=" baru" hint="dari Budi, Maya" accent={colors.mint[500]} bg={colors.mint[100]} flag="BARU" />
            <PerfTile icon="star" label="Review" primary="5" suffix=" hari" hint="sisa mengisi" accent={colors.amber[500]} bg={colors.amber[100]} flag="URGENT" />
          </View>
        </View>

        {/* Month stats */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <SectionHeader title="Bulan ini · April 2026" action="Lihat semua" />
          <Card pad={0} radius={22}>
            <View style={{ flexDirection: "row" }}>
              <StatCell n={18} label="Hadir" color={colors.mint[500]} />
              <StatCell n={2} label="Terlambat" color={colors.amber[500]} border />
              <StatCell n={1} label="Cuti" color={colors.brand[500]} border />
              <StatCell n={0} label="Absen" color={colors.rose[500]} border />
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Txt size={12} weight="semibold" color={colors.neutral[600]}>
                  Jam kerja
                </Txt>
                <Txt size={12} weight="semibold" color={colors.neutral[600]}>
                  <Txt size={12} weight="bold" color={colors.neutral[800]}>
                    162j
                  </Txt>{" "}
                  / 176j
                </Txt>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
                <LinearGradient
                  colors={[colors.brand[500], colors.brand[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: "100%", width: "92%", borderRadius: 4 }}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* Pengumuman — horizontal carousel */}
        <View style={{ marginTop: 22 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Pengumuman" action="Lihat semua" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
          >
            <AnnouncementCard
              title="Town Hall Q2 2026"
              body="All hands meeting Jumat 25 April, 14:00 WIB di ruang Garuda lt. 23. Kehadiran wajib."
              tag="Acara"
              date="25 Apr"
            />
            <MiniAnnouncement title="THR Lebaran cair 5 Mei" body="THR akan ditransfer ke rekening payroll Anda." tag="Payroll" color={colors.mint[500]} bg={colors.mint[100]} icon="wallet" />
            <MiniAnnouncement title="Libur Hari Raya Waisak" body="Kantor tutup Senin, 11 Mei 2026." tag="Libur" color={colors.coral[500]} bg={colors.coral[100]} icon="calendar" />
          </ScrollView>
        </View>

        {/* Saldo Cuti */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <SectionHeader title="Saldo Cuti" action="Ajukan cuti →" />
          <Card pad={16} radius={20}>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <LeaveDial label="Tahunan" used={4} total={12} color={colors.brand[500]} />
              <LeaveDial label="Sakit" used={1} total={12} color={colors.coral[500]} />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Modal daftar kantor (lokasi clock WFO/MULTIPLE > 3 kantor) */}
      <Modal transparent visible={offModal} animationType="fade" onRequestClose={() => setOffModal(false)} statusBarTranslucent>
        <Pressable
          onPress={() => setOffModal(false)}
          style={{ flex: 1, backgroundColor: "rgba(16,13,26,0.55)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                backgroundColor: "#fff",
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: insets.bottom + 20,
                maxHeight: "70%",
              },
              shadows.elevated,
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Txt size={16} weight="extrabold" color={colors.neutral[900]}>
                Lokasi Clock-in
              </Txt>
              <Pressable onPress={() => setOffModal(false)} hitSlop={8}>
                <Icon name="close" size={20} color={colors.neutral[400]} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(shift?.offices ?? []).map((o, i) => (
                <View
                  key={o.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderColor: colors.neutral[100],
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="building" size={18} color={colors.brand[600]} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold" color={colors.neutral[800]}>
                      {o.name}
                    </Txt>
                    {o.city ? (
                      <Txt size={12} color={colors.neutral[400]} style={{ marginTop: 1 }}>
                        {o.city}
                      </Txt>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={11} weight="semibold" color={colors.neutral[500]}>
        {label}
      </Txt>
      <Txt size={15} weight="extrabold" color={color} style={{ marginTop: 2 }}>
        {value}
      </Txt>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  tone,
  bg,
  badge,
}: {
  icon: IconName;
  label: string;
  tone: string;
  bg: string;
  badge?: string;
}) {
  return (
    <Card pad={12} radius={18} style={{ width: "31.5%" }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon name={icon} size={20} color={tone} strokeWidth={2} />
      </View>
      <Txt size={13} weight="bold" color={colors.neutral[800]}>
        {label}
      </Txt>
      {badge ? (
        <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>
          {badge}
        </Txt>
      ) : null}
    </Card>
  );
}

function PerfTile({
  icon,
  label,
  primary,
  suffix,
  hint,
  accent,
  bg,
  flag,
}: {
  icon: IconName;
  label: string;
  primary: string;
  suffix?: string;
  hint: string;
  accent: string;
  bg: string;
  flag?: "BARU" | "URGENT";
}) {
  return (
    <Card pad={14} radius={18} style={{ width: "48%" }}>
      {flag ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: flag === "URGENT" ? colors.coral[500] : colors.brand[500],
          }}
        >
          <Txt size={9.5} weight="extrabold" color="#fff">
            {flag}
          </Txt>
        </View>
      ) : null}
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={accent} strokeWidth={2} />
      </View>
      <Txt size={11.5} weight="bold" color={colors.neutral[500]} style={{ marginTop: 10 }}>
        {label}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 2 }}>
        <Txt size={22} weight="extrabold" color={colors.neutral[900]}>
          {primary}
        </Txt>
        {suffix ? (
          <Txt size={12} weight="bold" color={colors.neutral[500]}>
            {suffix}
          </Txt>
        ) : null}
      </View>
      <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 2 }}>
        {hint}
      </Txt>
    </Card>
  );
}

function StatCell({ n, label, color, border }: { n: number; label: string; color: string; border?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: "center",
        borderLeftWidth: border ? 1 : 0,
        borderColor: colors.neutral[100],
      }}
    >
      <Txt size={22} weight="extrabold" color={color}>
        {n}
      </Txt>
      <Txt size={10.5} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </View>
  );
}

function AnnouncementCard({ title, body, tag, date }: { title: string; body: string; tag: string; date: string }) {
  return (
    <LinearGradient
      colors={[colors.brand[950], colors.brand[800]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, padding: 16, width: 260 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
          <Txt size={10.5} weight="bold" color="#fff">
            {tag}
          </Txt>
        </View>
        <Txt size={10.5} weight="semibold" color="rgba(255,255,255,0.8)">
          {date}
        </Txt>
      </View>
      <Txt size={16} weight="extrabold" color="#fff" style={{ marginTop: 10 }}>
        {title}
      </Txt>
      <Txt size={12.5} color="rgba(255,255,255,0.8)" style={{ marginTop: 4, lineHeight: 18 }}>
        {body}
      </Txt>
    </LinearGradient>
  );
}

function MiniAnnouncement({
  title,
  body,
  tag,
  color,
  bg,
  icon,
}: {
  title: string;
  body: string;
  tag: string;
  color: string;
  bg: string;
  icon: IconName;
}) {
  return (
    <Card pad={14} radius={20} style={{ width: 240, flexDirection: "row", gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={9.5} weight="extrabold" color={color}>
          {tag.toUpperCase()}
        </Txt>
        <Txt size={13} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2 }}>
          {title}
        </Txt>
        <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 3, lineHeight: 16 }}>
          {body}
        </Txt>
      </View>
    </Card>
  );
}

function LeaveDial({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct = used / total;
  const left = total - used;
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={r} fill="none" stroke={colors.neutral[100]} strokeWidth={7} />
        <Circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <SvgText x={36} y={41} textAnchor="middle" fontSize={16} fontWeight="800" fill={colors.neutral[800]} fontFamily={fonts.extrabold}>
          {left}
        </SvgText>
      </Svg>
      <View>
        <Txt size={12} weight="bold" color={colors.neutral[700]}>
          {label}
        </Txt>
        <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>
          {left} hari tersisa
        </Txt>
      </View>
    </View>
  );
}
