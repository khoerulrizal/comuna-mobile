// Detail Shift — hero + linimasa + lokasi + info. Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { ShiftMap } from "@/components/ShiftMap";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { getShiftDay, heroMeta, type ShiftDayDetail, type ShiftTimelineItem } from "@/lib/shift";

export default function ShiftDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [data, setData] = useState<ShiftDayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    try { setError(null); setData(await getShiftDay(date)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail shift"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [date]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const tzAbbr = data?.tzAbbr ?? null;
  const m = data ? heroMeta(data.state) : null;
  const isWork = data ? data.state === "today" || data.state === "upcoming" : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Detail Shift</Txt>
          {data ? <Txt size={11} weight="semibold" color={colors.neutral[400]}>{data.dateFull}</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data || !m ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Shift tidak ditemukan"}</Txt></Card></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Hero */}
          <LinearGradient colors={m.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.12)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" }}>
                <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>{m.badge}</Txt>
              </View>
              <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.85)">{data.dateFull}</Txt>
            </View>
            <Txt size={28} weight="extrabold" color="#fff" style={{ marginTop: 14, fontFamily: fonts.extrabold }}>{data.name}</Txt>
            {isWork && data.startTime ? (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, marginTop: 14 }}>
                <HeroTime label="MULAI" value={data.startTime} />
                <View style={{ marginBottom: 2 }}><Icon name="arrowRight" size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.2} /></View>
                <HeroTime label="SELESAI" value={data.endTime ?? "—"} tzAbbr={tzAbbr} />
                <View style={{ flex: 1 }} />
                <View style={{ alignItems: "flex-end" }}>
                  <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.75)">DURASI</Txt>
                  <Txt size={16} weight="extrabold" color="#fff" style={{ marginTop: 2 }}>{data.durationLabel ?? "—"}</Txt>
                </View>
              </View>
            ) : null}
          </LinearGradient>

          {/* Linimasa */}
          {isWork && data.timeline.length > 0 ? (
            <>
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>Linimasa Shift</Txt>
              <Card pad={16} radius={18}>
                {data.timeline.map((t, i) => (
                  <TimelineRow key={i} t={t} tzAbbr={tzAbbr} last={i === data.timeline.length - 1} />
                ))}
              </Card>
            </>
          ) : null}

          {/* Lokasi */}
          {isWork ? (
            <>
              <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>
                Lokasi {data.locations.length > 1 ? `(${data.locations.length} kantor)` : ""}
              </Txt>
              {data.anywhere ? (
                <Card pad={14} radius={16}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                      <Icon name="globe" size={20} color={colors.brand[600]} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Bebas lokasi (WFA)</Txt>
                      <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>Clock-in dari mana saja tanpa batas radius.</Txt>
                    </View>
                  </View>
                </Card>
              ) : data.locations.length > 0 ? (
                <Card pad={14} radius={16}>
                  <ShiftMap points={data.locations.map((l) => ({ name: l.name, latitude: l.latitude, longitude: l.longitude, radius: l.radius }))} height={150} />
                  <View style={{ marginTop: 12, gap: 12 }}>
                    {data.locations.map((l, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.neutral[100], paddingTop: i === 0 ? 0 : 12 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: l.kind === "home" ? colors.mint[100] : colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                          <Icon name={l.kind === "home" ? "home" : "building"} size={16} color={l.kind === "home" ? colors.mint[700] : colors.brand[600]} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{l.name}</Txt>
                          {l.address ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{l.address}</Txt> : null}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <Icon name="target" size={11} color={colors.mint[700]} strokeWidth={2.2} />
                            <Txt size={11} weight="semibold" color={colors.mint[700]}>Radius clock-in: {l.radius} m</Txt>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              ) : (
                <Card pad={14} radius={16}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.neutral[50], alignItems: "center", justifyContent: "center" }}>
                      <Icon name="mapPin" size={20} color={colors.neutral[400]} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} weight="extrabold" color={colors.neutral[900]}>{data.location}</Txt>
                      <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>
                        {data.locationType === "WFH" ? "Titik rumah belum diatur — radius tidak divalidasi." : "Koordinat kantor belum diatur."}
                      </Txt>
                    </View>
                  </View>
                </Card>
              )}
            </>
          ) : null}

          {/* Info shift */}
          <Txt size={15} weight="extrabold" color={colors.neutral[800]} style={{ marginTop: 16, marginBottom: 10 }}>Info Shift</Txt>
          <Card pad={0} radius={16}>
            <InfoRow label="Tipe Shift" value={data.info.type} />
            <InfoRow label="Manager" value={data.info.manager} />
            <InfoRow label="Tim" value={data.info.team} />
            <InfoRow label="Zona Waktu" value={`${data.timezone}${tzAbbr ? ` (${tzAbbr})` : ""}`} last={!data.info.code} />
            {data.info.code ? <InfoRow label="Kode" value={data.info.code} last /> : null}
          </Card>

          {/* Catatan libur */}
          {data.state === "holiday" && data.holidayName ? (
            <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.amber[100], flexDirection: "row", gap: 8 }}>
              <View style={{ marginTop: 1 }}><Icon name="info" size={15} color={colors.amber[700]} strokeWidth={2.2} /></View>
              <Txt size={12.5} color={colors.amber[700]} style={{ flex: 1, lineHeight: 19 }}><Txt size={12.5} weight="bold" color={colors.amber[700]}>Catatan: </Txt>{data.holidayName} — kantor tutup, tidak ada shift.</Txt>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function HeroTime({ label, value, tzAbbr }: { label: string; value: string; tzAbbr?: string | null }) {
  return (
    <View>
      <Txt size={10.5} weight="bold" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 0.3 }}>{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Txt size={22} weight="extrabold" color="#fff" style={{ marginTop: 1 }}>{value}</Txt>
        {tzAbbr ? <Txt size={10} weight="bold" color="rgba(255,255,255,0.7)">{tzAbbr}</Txt> : null}
      </View>
    </View>
  );
}

function TimelineRow({ t, tzAbbr, last }: { t: ShiftTimelineItem; tzAbbr: string | null; last: boolean }) {
  const meta: Record<ShiftTimelineItem["kind"], { icon: IconName; color: string }> = {
    in: { icon: "check", color: colors.brand[600] },
    break: { icon: "coffee", color: colors.amber[700] },
    event: { icon: "calendar", color: colors.mint[700] },
    out: { icon: "check", color: colors.coral[700] },
  };
  const mk = meta[t.kind];
  const filled = t.done;
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingBottom: last ? 0 : 14 }}>
      <View style={{ width: 52, paddingTop: 4 }}>
        <Txt size={12} weight="extrabold" color={colors.neutral[700]}>{t.time}</Txt>
        {tzAbbr ? <Txt size={9} weight="semibold" color={colors.neutral[400]}>{tzAbbr}</Txt> : null}
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: filled ? mk.color : `${mk.color}22`, borderWidth: filled ? 0 : 1.5, borderColor: `${mk.color}66`, alignItems: "center", justifyContent: "center" }}>
          <Icon name={mk.icon} size={12} color={filled ? "#fff" : mk.color} strokeWidth={2.4} />
        </View>
        {!last ? <View style={{ width: 1.5, flex: 1, minHeight: 20, backgroundColor: colors.neutral[100], marginTop: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingTop: 4 }}>
        <Txt size={13} weight="bold" color={colors.neutral[900]}>{t.label}</Txt>
      </View>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
      <Txt size={12.5} weight="semibold" color={colors.neutral[500]}>{label}</Txt>
      <Txt size={13} weight="bold" color={colors.neutral[900]} style={{ flexShrink: 1, textAlign: "right", marginLeft: 12 }} numberOfLines={1}>{value}</Txt>
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
