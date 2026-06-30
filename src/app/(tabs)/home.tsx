// Home (karyawan) — ported from the design's screens-home.jsx (Corelia HRIS Mobile).
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Card, Icon, type IconName, Pill, SectionHeader, Txt } from "@/components/ui";
import { colors, radii, shadows } from "@/theme/tokens";
import { me } from "@/data/mock";
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
import { getAttendanceStats, type AttendanceStats } from "@/lib/attendance-calendar";
import { announcementShortDate, categoryTint, getAnnouncements, type AnnouncementListItem } from "@/lib/announcements";
import { getPerformaSummary, type PerformaSummary } from "@/lib/performa";
import { getCapabilities } from "@/lib/capabilities";
import { getManagerContext, type ManagerContext } from "@/lib/manager";
import { CachedImage } from "@/components/CachedImage";

type QuickHref =
  | "/cuti" | "/lembur" | "/kehadiran" | "/shift" | "/reimburse"
  | "/slip-gaji" | "/bonus" | "/kalender" | "/pinjaman";

/** Menit → "162j" / "162j 30m" untuk label jam kerja kartu Home. */
function jamLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [home, setHome] = useState<Home | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [perf, setPerf] = useState<PerformaSummary | null>(null);
  const [caps, setCaps] = useState<Set<string> | null>(null);
  const [mgr, setMgr] = useState<ManagerContext | null>(null);
  const [offModal, setOffModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  // Jam berjalan: tick tiap detik untuk clock live di card.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const [h, s, ann, pf, cap, mc] = await Promise.all([
        getHome(),
        getAttendanceStats().catch(() => null),
        getAnnouncements(8).catch(() => null),
        getPerformaSummary().catch(() => null),
        getCapabilities().catch(() => null),
        getManagerContext().catch(() => null),
      ]);
      setHome(h);
      if (s) setStats(s);
      if (ann) setAnnouncements(ann.announcements);
      if (pf) setPerf(pf);
      if (cap) setCaps(new Set(cap.modules));
      setMgr(mc);
    } catch (e) {
      if (e instanceof AuthError) router.replace("/login");
      // selain itu: biarkan tampilan fallback — Home tetap berguna.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => { if (active) await load(); })();
      return () => { active = false; };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loaded = home != null;
  // Modul yang aktif di paket perusahaan. Optimistic: selagi belum dimuat (null),
  // anggap tersedia agar tak ada kedipan; setelah dimuat, sembunyikan yang tak ada.
  const has = (key: string) => (caps == null ? true : caps.has(key));
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
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

        {/* Clock-in card — floating (hanya bila modul Kehadiran ada di paket) */}
        {has("attendance") ? (
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
                          · {clockInHMS}{tzAbbr ? ` ${tzAbbr}` : ""}
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
                          · {clockInHMS}{tzAbbr ? ` ${tzAbbr}` : ""}
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
              <MiniStat label="Selesai" value={clockOutHMS ? `${selesaiLabel}${tzAbbr ? ` ${tzAbbr}` : ""}` : selesaiLabel} color={colors.neutral[600]} />
            </View>
            {/* Overlay loading saat pertama masuk (data clock belum dimuat). */}
            {!loaded && !refreshing ? (
              <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <ActivityIndicator color={colors.brand[500]} />
                <Txt size={11.5} weight="semibold" color={colors.neutral[500]}>Memuat kehadiran…</Txt>
              </View>
            ) : null}
          </Card>
        </View>
        ) : null}

        {/* Manajer — hanya untuk Role Sistem MANAGER / admin */}
        {mgr?.isManager ? (
          <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
            <Pressable onPress={() => router.push("/manager")} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
              <LinearGradient colors={[colors.neutral[800], colors.brand[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="users" size={24} color="#fff" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.8)" style={{ letterSpacing: 0.4 }}>MODE MANAJER</Txt>
                  <Txt size={16} weight="extrabold" color="#fff" style={{ marginTop: 1 }}>Tim Saya</Txt>
                  <Txt size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }}>
                    {mgr.teamCount > 0 ? `${mgr.teamCount} bawahan langsung · KPI, OKR, kehadiran` : "Kelola & pantau performa tim"}
                  </Txt>
                </View>
                <Icon name="chevronRight" size={20} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {/* Quick actions — hanya modul yang ada di paket perusahaan */}
        {(() => {
          const ALL_ACTIONS: { icon: IconName; label: string; tone: string; bg: string; href: QuickHref; module: string }[] = [
            { icon: "plane", label: "Cuti", tone: colors.brand[500], bg: colors.brand[100], href: "/cuti", module: "leave" },
            { icon: "clock", label: "Lembur", tone: colors.amber[700], bg: colors.amber[100], href: "/lembur", module: "overtime" },
            { icon: "fingerprint", label: "Kehadiran", tone: colors.mint[700], bg: colors.mint[100], href: "/kehadiran", module: "attendance" },
            { icon: "briefcase", label: "Shift Saya", tone: colors.brand[500], bg: colors.brand[100], href: "/shift", module: "shifts" },
            { icon: "receipt", label: "Reimburse", tone: colors.mint[700], bg: colors.mint[100], href: "/reimburse", module: "reimbursement" },
            { icon: "wallet", label: "Slip Gaji", tone: colors.coral[700], bg: colors.coral[100], href: "/slip-gaji", module: "payroll" },
            { icon: "star", label: "Bonus", tone: colors.amber[700], bg: colors.amber[100], href: "/bonus", module: "bonus" },
            { icon: "calendar", label: "Kalender", tone: colors.brand[600], bg: colors.brand[100], href: "/kalender", module: "calendar" },
            { icon: "money", label: "Pinjaman", tone: colors.mint[700], bg: colors.mint[100], href: "/pinjaman", module: "loans" },
          ];
          const actions = ALL_ACTIONS.filter((a) => has(a.module));
          if (actions.length === 0) return null;
          return (
            <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
              <SectionHeader title="Akses Cepat" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {actions.map((a) => (
                  <QuickAction key={a.href} icon={a.icon} label={a.label} tone={a.tone} bg={a.bg} onPress={() => router.push(a.href)} />
                ))}
              </View>
            </View>
          );
        })()}

        {/* Performa — hanya muncul bila paket perusahaan punya modul Performa */}
        {perf && (perf.available.kpi || perf.available.okr || perf.available.feedback || perf.available.reviews) ? (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <SectionHeader title="Performa" />

            {/* Banner Review — selalu tampil bila modul Review ada di paket */}
            {perf.available.reviews ? (
              perf.review ? (
                <Pressable onPress={() => router.push("/review")} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <LinearGradient
                    colors={[colors.brand[600], colors.coral[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="star" size={22} color="#fff" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.85)">PERIODE REVIEW AKTIF</Txt>
                      <Txt size={14} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>{perf.review.cycleName}</Txt>
                      <Txt size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
                        {perf.review.daysLeft != null ? `Sisa ${perf.review.daysLeft} hari · ` : ""}progress {perf.review.progressPct}%
                      </Txt>
                    </View>
                    <Icon name="chevronRight" size={20} color="#fff" strokeWidth={2} />
                  </LinearGradient>
                </Pressable>
              ) : (
                // Tidak ada siklus aktif → abu-abu, tidak bisa diklik.
                <View style={{ borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.neutral[100] }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.neutral[200], alignItems: "center", justifyContent: "center" }}>
                    <Icon name="star" size={22} color={colors.neutral[400]} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={10.5} weight="extrabold" color={colors.neutral[400]}>PERIODE REVIEW</Txt>
                    <Txt size={14} weight="extrabold" color={colors.neutral[500]} style={{ marginTop: 2 }}>Tidak ada siklus aktif</Txt>
                    <Txt size={11.5} color={colors.neutral[400]} style={{ marginTop: 2 }}>Belum ada review yang perlu diisi saat ini.</Txt>
                  </View>
                </View>
              )
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {perf.available.kpi ? (
                <PerfTile
                  icon="target" label="KPI Saya"
                  primary={perf.kpi ? String(perf.kpi.avgScore) : "—"} suffix={perf.kpi ? "/100" : undefined}
                  hint={perf.kpi ? (perf.kpi.kpiCount === 1 ? `${perf.kpi.indicatorCount} indikator` : `${perf.kpi.kpiCount} KPI · ${perf.kpi.indicatorCount} indikator`) : "Belum ada KPI"}
                  accent={colors.brand[500]} bg={colors.brand[100]} onPress={() => router.push("/kpi")}
                />
              ) : null}
              {perf.available.okr ? (
                <PerfTile
                  icon="trendingUp" label="OKR"
                  primary={perf.okr ? `${perf.okr.avgProgress}%` : "—"}
                  hint={perf.okr ? `${perf.okr.count} objective aktif` : "Belum ada OKR"}
                  accent={colors.coral[500]} bg={colors.coral[100]} onPress={() => router.push("/okr")}
                />
              ) : null}
              {perf.available.feedback ? (
                <PerfTile
                  icon="heart" label="Feedback"
                  primary={String(perf.feedback.unread)} suffix=" baru"
                  hint={perf.feedback.fromNames.length > 0 ? `dari ${perf.feedback.fromNames.join(", ")}` : "Tidak ada baru"}
                  accent={colors.mint[500]} bg={colors.mint[100]} flag={perf.feedback.unread > 0 ? "BARU" : undefined}
                  onPress={() => router.push("/feedback")}
                />
              ) : null}
              {perf.available.reviews ? (
                <PerfTile
                  icon="star" label="Review"
                  primary={perf.review ? String(perf.review.daysLeft ?? "—") : "—"} suffix={perf.review ? " hari" : undefined}
                  hint={perf.review ? "sisa mengisi" : "Tak ada tugas"}
                  accent={colors.amber[500]} bg={colors.amber[100]}
                  flag={perf.review && perf.review.daysLeft != null && perf.review.daysLeft <= 7 ? "URGENT" : undefined}
                  onPress={() => router.push("/review")}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Month stats — hanya bila modul Kehadiran ada di paket */}
        {has("attendance") ? (
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <SectionHeader title={`Bulan ini${stats ? ` · ${stats.monthLabel}` : ""}`} action="Lihat semua" onAction={() => router.push("/kehadiran")} />
          <Card pad={0} radius={22}>
            <View style={{ flexDirection: "row" }}>
              <StatCell n={stats?.present ?? 0} label="Hadir" color={colors.mint[500]} />
              <StatCell n={stats?.late ?? 0} label="Terlambat" color={colors.amber[500]} border />
              <StatCell n={stats?.leave ?? 0} label="Cuti" color={colors.brand[500]} border />
              <StatCell n={stats?.absent ?? 0} label="Absen" color={colors.rose[500]} border />
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Txt size={12} weight="semibold" color={colors.neutral[600]}>
                  Jam kerja
                </Txt>
                <Txt size={12} weight="semibold" color={colors.neutral[600]}>
                  <Txt size={12} weight="bold" color={colors.neutral[800]}>
                    {jamLabel(stats?.workMinutes ?? 0)}
                  </Txt>{" "}
                  / {jamLabel(stats?.targetMinutes ?? 0)}
                </Txt>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
                <LinearGradient
                  colors={[colors.brand[500], colors.brand[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: "100%", width: `${Math.round((stats?.progress ?? 0) * 100)}%`, borderRadius: 4 }}
                />
              </View>
            </View>
          </Card>
        </View>
        ) : null}

        {/* Pengumuman — hanya bila modul Pengumuman ada di paket */}
        {has("announcements") && announcements.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="Pengumuman" action="Lihat semua" onAction={() => router.push("/pengumuman")} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
            >
              {announcements.map((a) => (
                <HomeAnnouncementCard key={a.id} a={a} onPress={() => router.push(`/pengumuman/${a.id}`)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
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
  onPress,
}: {
  icon: IconName;
  label: string;
  tone: string;
  bg: string;
  badge?: string;
  onPress?: () => void;
}) {
  const inner = (
    <Card pad={12} radius={18} style={{ width: "100%" }}>
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
  if (!onPress) return <View style={{ width: "31.5%" }}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: "31.5%", opacity: pressed ? 0.7 : 1 })}>
      {inner}
    </Pressable>
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
  onPress,
}: {
  icon: IconName;
  label: string;
  primary: string;
  suffix?: string;
  hint: string;
  accent: string;
  bg: string;
  flag?: "BARU" | "URGENT";
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: "48%", opacity: pressed ? 0.8 : 1 })}>
    <Card pad={14} radius={18} style={{ width: "100%" }}>
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
    </Pressable>
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

function HomeAnnouncementCard({ a, onPress }: { a: AnnouncementListItem; onPress: () => void }) {
  const tint = categoryTint(a.category);
  const pinned = a.isPinned;
  // Pinned → kartu warna primary, teks putih.
  const cardBg = pinned ? colors.brand[500] : colors.neutral[0];
  const titleColor = pinned ? "#fff" : colors.neutral[900];
  const bodyColor = pinned ? "rgba(255,255,255,0.85)" : colors.neutral[500];
  const dateColor = pinned ? "rgba(255,255,255,0.8)" : colors.neutral[400];
  const tagBg = pinned ? "rgba(255,255,255,0.2)" : tint.bg;
  const tagFg = pinned ? "#fff" : tint.fg;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[{ width: 262, borderRadius: 18, overflow: "hidden", backgroundColor: cardBg }, pinned ? shadows.elevated : shadows.card]}>
        {a.bannerUrl ? (
          <CachedImage uri={a.bannerUrl} style={{ width: "100%", height: 110, backgroundColor: colors.neutral[100] }} />
        ) : null}
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: tagBg }}>
                <Txt size={9.5} weight="extrabold" color={tagFg} style={{ letterSpacing: 0.3 }}>{tint.label.toUpperCase()}</Txt>
              </View>
              {pinned ? <Icon name="star" size={12} color="#fff" strokeWidth={2.4} fill="#fff" /> : null}
            </View>
            <Txt size={10.5} weight="semibold" color={dateColor}>{announcementShortDate(a.publishedAt)}</Txt>
          </View>
          <Txt size={14} weight="extrabold" color={titleColor} style={{ marginTop: 8, lineHeight: 18 }} numberOfLines={2}>{a.title}</Txt>
          {a.excerpt ? <Txt size={11.5} color={bodyColor} style={{ marginTop: 4, lineHeight: 16 }} numberOfLines={2}>{a.excerpt}</Txt> : null}
        </View>
      </View>
    </Pressable>
  );
}

