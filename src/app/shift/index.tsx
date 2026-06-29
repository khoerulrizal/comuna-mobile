// Shift Saya — kartu shift hari ini + rekap bulanan + jadwal 7 hari. Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getShiftOverview, heroMeta, stateBadge, typeVisual,
  type Office, type ScheduleDay, type ShiftOverview,
} from "@/lib/shift";

const MAX_INLINE_OFFICES = 3;

export default function ShiftScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ShiftOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [officeModal, setOfficeModal] = useState<{ title: string; offices: Office[] } | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setData(await getShiftOverview()); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat shift"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const tzAbbr = data?.tzAbbr ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Shift Saya</Txt>
          {data ? <Txt size={11} weight="semibold" color={colors.neutral[400]}>{data.monthLabel}</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading && !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : data ? (
            <>
              {/* Hero shift hari ini */}
              <TodayHero
                s={data.today}
                tzAbbr={tzAbbr}
                onPress={() => router.push(`/shift/${data.today.date}`)}
                onOffices={() => setOfficeModal({ title: "Kantor tempat absen", offices: data.today.offices })}
              />

              {/* Rekap bulanan */}
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 18, marginBottom: 10 }}>Rekap {data.monthLabel.split(" ")[0]}</Txt>
              <Card pad={14} radius={16}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>JAM KERJA</Txt>
                    <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 2 }}>
                      <Txt size={20} weight="extrabold" color={colors.neutral[900]}>{data.stats.totalLabel}</Txt>
                      <Txt size={12} weight="semibold" color={colors.neutral[400]} style={{ marginLeft: 4 }}>/ {data.stats.targetLabel}</Txt>
                    </View>
                  </View>
                  {data.stats.overtimeMinutes > 0 ? (
                    <View style={{ backgroundColor: colors.mint[100], paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                      <Txt size={11} weight="bold" color={colors.mint[700]}>+{data.stats.overtimeLabel} lembur</Txt>
                    </View>
                  ) : null}
                </View>
                {/* Progress */}
                <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden", marginTop: 10 }}>
                  <LinearGradient colors={[colors.brand[500], colors.coral[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(data.stats.monthProgress * 100)}%`, height: "100%", borderRadius: 4 }} />
                </View>
                {/* Mini stats */}
                <View style={{ flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100], borderStyle: "dashed" }}>
                  <MiniStat n={data.stats.workedDays} label="Hadir" color={colors.brand[600]} />
                  <SepV />
                  <MiniStat n={data.stats.wfhDays} label="WFH" color={colors.mint[700]} />
                  <SepV />
                  <MiniStat n={data.stats.offDays} label="Off" color={colors.neutral[500]} />
                </View>
              </Card>

              {/* Jadwal 7 hari */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 10 }}>
                <Txt size={15} weight="extrabold" color={colors.neutral[800]}>Jadwal 7 hari ke depan</Txt>
                <Pressable onPress={() => router.push("/kehadiran")} hitSlop={8}><Txt size={11.5} weight="bold" color={colors.brand[600]}>Lihat kalender →</Txt></Pressable>
              </View>
              <Card pad={0} radius={18}>
                {data.upcoming.map((s, i) => (
                  <ShiftRow key={s.date} s={s} tzAbbr={tzAbbr} last={i === data.upcoming.length - 1} onPress={() => router.push(`/shift/${s.date}`)} />
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}

      <OfficeModal data={officeModal} onClose={() => setOfficeModal(null)} insetBottom={insets.bottom} />
    </View>
  );
}

/** Teks lokasi clock-in untuk hero: ≤3 kantor tampil semua, >3 → ringkas + ketuk. */
function clockText(s: ScheduleDay): string {
  if (s.locationType === "WFH" || s.locationType === "WFA" || s.offices.length === 0) return s.location;
  if (s.offices.length <= MAX_INLINE_OFFICES) return s.offices.map((o) => o.name).join(" · ");
  return `${s.offices.slice(0, MAX_INLINE_OFFICES).map((o) => o.name).join(" · ")} +${s.offices.length - MAX_INLINE_OFFICES}`;
}

function TodayHero({ s, tzAbbr, onPress, onOffices }: { s: ScheduleDay; tzAbbr: string | null; onPress: () => void; onOffices: () => void }) {
  const m = heroMeta(s.state);
  const isWork = s.state === "today" || s.state === "upcoming";
  const manyOffices = s.officeCount > MAX_INLINE_OFFICES;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <LinearGradient colors={m.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
            <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>{m.badge}</Txt>
          </View>
          <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.85)">{s.dateFull}</Txt>
        </View>

        <Txt size={26} weight="extrabold" color="#fff" style={{ marginTop: 14, fontFamily: fonts.extrabold }}>{s.name}</Txt>

        {isWork && s.startTime ? (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, marginTop: 12 }}>
            <HeroTime label="MULAI" value={s.startTime} />
            <View style={{ marginBottom: 2 }}><Icon name="arrowRight" size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.2} /></View>
            <HeroTime label="SELESAI" value={s.endTime ?? "—"} tzAbbr={tzAbbr} />
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: "flex-end" }}>
              <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 0.3 }}>DURASI</Txt>
              <Txt size={16} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>{s.durationLabel ?? "—"}</Txt>
            </View>
          </View>
        ) : null}

        {/* Lokasi clock-in — ketuk utk lihat semua kantor bila >3 */}
        <Pressable
          onPress={manyOffices ? (e) => { e.stopPropagation(); onOffices(); } : undefined}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12 }}
        >
          <Icon name="mapPin" size={13} color="#fff" strokeWidth={2.2} />
          <Txt size={12} weight="bold" color="#fff" numberOfLines={1} style={{ flex: 1 }}>{clockText(s)}</Txt>
          {manyOffices ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
              <Icon name="building" size={11} color="#fff" strokeWidth={2.2} />
              <Txt size={10.5} weight="extrabold" color="#fff">{s.officeCount}</Txt>
            </View>
          ) : null}
        </Pressable>

        {s.note ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Icon name="calendar" size={12} color="#fff" strokeWidth={2.2} />
            <Txt size={11.5} color="rgba(255,255,255,0.9)">{s.note}</Txt>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function OfficeModal({ data, onClose, insetBottom }: { data: { title: string; offices: Office[] } | null; onClose: () => void; insetBottom: number }) {
  return (
    <Modal transparent visible={!!data} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(16,13,26,0.55)", justifyContent: "flex-end" }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[{ backgroundColor: "#fff", borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: 20, paddingTop: 18, paddingBottom: insetBottom + 20, maxHeight: "70%" }, shadows.elevated]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <Txt size={16} weight="extrabold" color={colors.neutral[900]}>{data?.title ?? "Kantor"}</Txt>
            <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={20} color={colors.neutral[400]} strokeWidth={2} /></Pressable>
          </View>
          <Txt size={12} color={colors.neutral[500]} style={{ marginBottom: 10 }}>{data ? `${data.offices.length} kantor tempat kamu bisa clock-in` : ""}</Txt>
          <ScrollView showsVerticalScrollIndicator={false}>
            {(data?.offices ?? []).map((o, i) => (
              <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.neutral[100] }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                  <Icon name="building" size={18} color={colors.brand[600]} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold" color={colors.neutral[800]}>{o.name}</Txt>
                  {o.city ? <Txt size={12} color={colors.neutral[400]} style={{ marginTop: 1 }}>{o.city}</Txt> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HeroTime({ label, value, tzAbbr }: { label: string; value: string; tzAbbr?: string | null }) {
  return (
    <View>
      <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 0.3 }}>{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Txt size={20} weight="extrabold" color="#fff" style={{ marginTop: 1 }}>{value}</Txt>
        {tzAbbr ? <Txt size={10} weight="bold" color="rgba(255,255,255,0.7)">{tzAbbr}</Txt> : null}
      </View>
    </View>
  );
}

function MiniStat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Txt size={18} weight="extrabold" color={color}>{n}</Txt>
      <Txt size={10.5} weight="bold" color={colors.neutral[500]} style={{ marginTop: 1 }}>{label}</Txt>
    </View>
  );
}
function SepV() { return <View style={{ width: 1, backgroundColor: colors.neutral[100] }} />; }

function ShiftRow({ s, tzAbbr, last, onPress }: { s: ScheduleDay; tzAbbr: string | null; last: boolean; onPress: () => void }) {
  const t = typeVisual(s);
  const badge = stateBadge(s);
  const muted = s.state === "off";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", gap: 12, alignItems: "center", paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100],
      backgroundColor: s.isToday ? `${colors.brand[100]}66` : pressed ? colors.neutral[50] : "transparent",
    })}>
      {s.isToday ? <View style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, backgroundColor: colors.brand[500], borderRadius: 2 }} /> : null}
      {/* Tanggal */}
      <View style={{ width: 44, alignItems: "center", paddingVertical: 6, borderRadius: 10, backgroundColor: s.isToday ? colors.brand[500] : "transparent" }}>
        <Txt size={9.5} weight="bold" color={s.isToday ? "rgba(255,255,255,0.85)" : colors.neutral[400]} style={{ letterSpacing: 0.3 }}>{s.day.toUpperCase()}</Txt>
        <Txt size={18} weight="extrabold" color={s.isToday ? "#fff" : muted ? colors.neutral[400] : colors.neutral[700]} style={{ marginTop: 1 }}>{s.dateNum}</Txt>
      </View>
      {/* Ikon tipe */}
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: muted ? colors.neutral[50] : t.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={t.icon} size={16} color={muted ? colors.neutral[400] : t.color} strokeWidth={2} />
      </View>
      {/* Detail */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Txt size={13.5} weight="extrabold" color={muted ? colors.neutral[500] : colors.neutral[900]} numberOfLines={1}>{s.name}</Txt>
          {badge ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: badge.bg }}>
              <Txt size={9.5} weight="extrabold" color={badge.color} style={{ letterSpacing: 0.3 }}>{badge.label}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          {s.startTime ? (
            <>
              <Icon name="clock" size={10} color={colors.neutral[400]} strokeWidth={2.2} />
              <Txt size={11} color={colors.neutral[500]}>{s.startTime}–{s.endTime}{tzAbbr ? ` ${tzAbbr}` : ""}</Txt>
              <Txt size={11} color={colors.neutral[400]}>·</Txt>
              <Icon name="mapPin" size={10} color={colors.neutral[400]} strokeWidth={2.2} />
              <Txt size={11} color={colors.neutral[500]} numberOfLines={1} style={{ flexShrink: 1 }}>{s.location}</Txt>
            </>
          ) : (
            <Txt size={11} color={colors.neutral[500]} numberOfLines={1}>{s.location}</Txt>
          )}
        </View>
      </View>
      <Icon name="chevronRight" size={15} color={colors.neutral[300]} />
    </Pressable>
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
