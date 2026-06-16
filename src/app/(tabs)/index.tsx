// Home (karyawan) — ported from the design's screens-home.jsx (Corelia HRIS Mobile).
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Avatar, Card, Icon, type IconName, Pill, SectionHeader, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { me, review } from "@/data/mock";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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
              <Avatar name={me.name} size={42} />
              <View>
                <Txt size={12.5} color="rgba(255,255,255,0.85)" weight="medium">
                  Selamat pagi,
                </Txt>
                <Txt size={17} weight="extrabold" color="#fff">
                  {me.firstName} 👋
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
              Shift · {me.shift}
            </Txt>
          </View>
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="mapPin" size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Txt size={12.5} color="rgba(255,255,255,0.9)">
              {me.location}
            </Txt>
          </View>
        </LinearGradient>

        {/* Clock-in card — floating */}
        <View style={{ paddingHorizontal: 16, marginTop: -50 }}>
          <Card pad={18} radius={22} elevated>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View>
                <Txt size={12} weight="semibold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>
                  HARI INI
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                  <Txt size={22} weight="extrabold" color={colors.neutral[900]}>
                    09:02
                  </Txt>
                  <Txt size={13} weight="semibold" color={colors.neutral[500]}>
                    WIB
                  </Txt>
                </View>
                <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Pill tone="mint">
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint[500] }} />
                    <Txt weight="semibold" size={11.5} color={colors.mint[700]}>
                      Sudah clock in
                    </Txt>
                  </Pill>
                  <Txt size={11.5} color={colors.neutral[500]}>
                    · 09:02
                  </Txt>
                </View>
              </View>
              <LinearGradient
                colors={[colors.brand[500], colors.brand[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 70, height: 70, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="fingerprint" size={32} color="#fff" strokeWidth={2} />
              </LinearGradient>
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
              <MiniStat label="Jam Kerja" value="6j 32m" color={colors.brand[600]} />
              <MiniStat label="Target" value="9j" color={colors.neutral[600]} />
              <MiniStat label="Selesai" value="18:00" color={colors.neutral[600]} />
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
