// Jadwal Tim (manager) — grid shift mingguan bawahan langsung. Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import { getTeamSchedule, SHIFT_CODE_META, type ShiftCode, type TeamSchedule } from "@/lib/manager";

const NAME_COL = 70;

export default function TeamScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<TeamSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (o: number) => {
    try {
      setError(null);
      setData(await getTeamSchedule(o));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat jadwal tim");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(offset); })(); return () => { a = false; }; }, [load, offset]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(offset); }, [load, offset]);

  function go(delta: number) {
    const next = offset + delta;
    setOffset(next); setLoading(true); load(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Jadwal Tim</Txt>
          {data?.weekLabel ? <Txt size={11} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 1 }}>{data.weekLabel}</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ada data"}</Txt>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Week nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
            <Pressable onPress={() => go(-1)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="chevronLeft" size={14} color={colors.neutral[600]} strokeWidth={2.2} />
              <Txt size={12} weight="bold" color={colors.neutral[600]}>Sebelumnya</Txt>
            </Pressable>
            <Pressable onPress={() => go(-offset)} disabled={data.isCurrentWeek}>
              <Txt size={12.5} weight="extrabold" color={data.isCurrentWeek ? colors.brand[600] : colors.neutral[400]}>{data.isCurrentWeek ? "Minggu Ini" : "Ke Minggu Ini"}</Txt>
            </Pressable>
            <Pressable onPress={() => go(1)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Txt size={12} weight="bold" color={colors.neutral[600]}>Berikutnya</Txt>
              <Icon name="chevronRight" size={14} color={colors.neutral[600]} strokeWidth={2.2} />
            </Pressable>
          </View>

          {data.members.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="calendar" size={28} color={colors.brand[600]} strokeWidth={1.8} />
              </View>
              <Txt size={14} weight="bold" color={colors.neutral[700]}>Tidak ada anggota</Txt>
            </View>
          ) : (
            <>
              {/* Grid */}
              <Card pad={12} radius={18} style={{ marginTop: 10 }}>
                {/* Header row */}
                <View style={{ flexDirection: "row", gap: 4, marginBottom: 6 }}>
                  <View style={{ width: NAME_COL }} />
                  {data.days.map((d) => (
                    <View key={d.ymd} style={{ flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 8, backgroundColor: d.isToday ? colors.brand[500] : "transparent" }}>
                      <Txt size={9} weight="bold" color={d.isToday ? "rgba(255,255,255,0.9)" : colors.neutral[600]} style={{ letterSpacing: 0.3 }}>{d.dow.toUpperCase()}</Txt>
                      <Txt size={12} weight="extrabold" color={d.isToday ? "#fff" : colors.neutral[900]} style={{ marginTop: 1 }}>{d.dayNum}</Txt>
                    </View>
                  ))}
                </View>
                {/* Member rows */}
                {data.members.map((m, ri) => (
                  <View key={m.id} style={{ flexDirection: "row", gap: 4, marginTop: ri === 0 ? 0 : 6, alignItems: "center" }}>
                    <View style={{ width: NAME_COL, flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 }}>
                      {m.photoUrl ? <Image source={{ uri: m.photoUrl }} style={{ width: 22, height: 22, borderRadius: 11 }} /> : <Avatar name={m.name} size={22} />}
                      <Txt size={10.5} weight="bold" color={colors.neutral[800]} numberOfLines={1} style={{ flex: 1 }}>{m.name.split(" ")[0]}</Txt>
                    </View>
                    {m.codes.map((code, ci) => {
                      const c = SHIFT_CODE_META[code];
                      const isToday = data.days[ci].isToday;
                      return (
                        <View key={ci} style={{ flex: 1, aspectRatio: 1, borderRadius: 7, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", borderWidth: isToday ? 1.5 : 0, borderColor: colors.brand[500] }}>
                          <Txt size={11} weight="extrabold" color={c.fg}>{c.short}</Txt>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </Card>

              {/* Legend */}
              <Card pad={12} radius={14} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(Object.keys(SHIFT_CODE_META) as ShiftCode[]).map((k) => {
                    const v = SHIFT_CODE_META[k];
                    return (
                      <View key={k} style={{ width: "33%", flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 }}>
                        <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: v.bg, alignItems: "center", justifyContent: "center" }}>
                          <Txt size={9.5} weight="extrabold" color={v.fg}>{v.short}</Txt>
                        </View>
                        <Txt size={11} weight="semibold" color={colors.neutral[700]}>{v.label}</Txt>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Today's roster */}
              {data.today ? (
                <View style={{ marginTop: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <Txt size={15} weight="extrabold" color={colors.neutral[800]}>Hari Ini · {data.today.label}</Txt>
                    <Txt size={11.5} weight="bold" color={colors.neutral[500]}>{data.today.roster.length} anggota</Txt>
                  </View>
                  <View style={{ gap: 8 }}>
                    {data.today.roster.map((r) => {
                      const c = SHIFT_CODE_META[r.code];
                      return (
                        <Card key={r.id} pad={10} radius={14}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            {r.photoUrl ? <Image source={{ uri: r.photoUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} /> : <Avatar name={r.name} size={32} />}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Txt size={12.5} weight="bold" color={colors.neutral[900]}>{r.name}</Txt>
                              <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{r.timeLabel}</Txt>
                            </View>
                            <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: c.bg }}>
                              <Txt size={9.5} weight="extrabold" color={c.fg} style={{ letterSpacing: 0.2 }}>{c.label.toUpperCase()}</Txt>
                            </View>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
