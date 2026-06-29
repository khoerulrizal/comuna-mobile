// Kalender Perusahaan — grid bulanan (dot per acara) + filter minggu + daftar acara.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  CATEGORIES, catMeta, dayOf, getCalendar, monthLabel, monthShortOf, monthWeeks, shiftMonth, timeLabel,
  type CalEvent,
} from "@/lib/calendar";

const WD = ["M", "S", "S", "R", "K", "J", "S"];

function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function KalenderScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(todayMonth);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tzAbbr, setTzAbbr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<string>("all");

  const load = useCallback(async (mo: string) => {
    try {
      setError(null);
      const res = await getCalendar(mo);
      setEvents(res.events);
      setTzAbbr(res.tzAbbr);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat kalender");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(month); })(); return () => { a = false; }; }, [load, month]));

  function changeMonth(delta: number) {
    setMonth(shiftMonth(month, delta));
    setWeek("all");
    setLoading(true);
  }

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const activeWeek = weeks.find((w) => w.key === week) ?? null;

  const dayCats = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const e of events) {
      const d = dayOf(e.startDate);
      const arr = map.get(d) ?? [];
      if (!arr.includes(e.category)) arr.push(e.category);
      map.set(d, arr);
    }
    return map;
  }, [events]);

  const filtered = useMemo(() => {
    if (!activeWeek) return events;
    return events.filter((e) => {
      const d = dayOf(e.startDate);
      return d >= activeWeek.startDay && d <= activeWeek.endDay;
    });
  }, [events, activeWeek]);

  const isCurrentMonth = month === todayMonth();
  const todayDay = new Date().getDate();

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Kalender Perusahaan</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading && !events.length ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(month); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : (
            <>
              {/* Month switcher */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 12 }}>
                <Pressable onPress={() => changeMonth(-1)} hitSlop={12}><Icon name="chevronLeft" size={20} color={colors.neutral[400]} strokeWidth={2.2} /></Pressable>
                <View style={{ alignItems: "center" }}>
                  <Txt size={17} weight="extrabold" color={colors.neutral[900]}>{monthLabel(month)}</Txt>
                  <Txt size={10.5} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 1 }}>{events.length} acara · {filtered.length} ditampilkan</Txt>
                </View>
                <Pressable onPress={() => changeMonth(1)} hitSlop={12}><Icon name="chevronRight" size={20} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
              </View>

              {/* Grid */}
              <Card pad={14} radius={22}>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  {WD.map((d, i) => (
                    <View key={i} style={{ width: `${100 / 7}%`, alignItems: "center" }}>
                      <Txt size={11} weight="bold" color={i === 0 || i === 6 ? colors.rose[500] : colors.neutral[500]}>{d}</Txt>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dow = (firstDow + i) % 7;
                    const cats = dayCats.get(day) ?? [];
                    const isToday = isCurrentMonth && day === todayDay;
                    const inWeek = activeWeek ? day >= activeWeek.startDay && day <= activeWeek.endDay : true;
                    const dimmed = !!activeWeek && !inWeek;
                    return (
                      <View key={day} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2, opacity: dimmed ? 0.35 : 1 }}>
                        <View style={{ flex: 1, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: isToday ? colors.brand[500] : activeWeek && inWeek ? colors.brand[100] : "transparent", borderWidth: isToday ? 2 : 0, borderColor: colors.brand[500] }}>
                          <Txt size={13} weight={isToday ? "extrabold" : "semibold"} color={isToday ? "#fff" : dow === 0 || dow === 6 ? colors.rose[500] : colors.neutral[900]}>{day}</Txt>
                          {cats.length > 0 ? (
                            <View style={{ flexDirection: "row", gap: 2, marginTop: 3 }}>
                              {cats.slice(0, 3).map((c, j) => <View key={j} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isToday ? "#fff" : catMeta(c).dot }} />)}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Week filter */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 2, paddingHorizontal: 2 }}>
                <Txt size={12.5} weight="bold" color={colors.neutral[700]}>Filter per minggu</Txt>
                {week !== "all" ? <Pressable onPress={() => setWeek("all")} hitSlop={8}><Txt size={11.5} weight="bold" color={colors.brand[600]}>Reset ✕</Txt></Pressable> : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                <WeekChip label="Semua" sub="" active={week === "all"} onPress={() => setWeek("all")} />
                {weeks.map((w) => <WeekChip key={w.key} label={w.label} sub={w.sub} active={week === w.key} onPress={() => setWeek(w.key)} />)}
              </ScrollView>

              {/* Event list */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 }}>
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]}>{activeWeek ? activeWeek.label : "Semua Acara"}</Txt>
                <Txt size={11.5} weight="bold" color={colors.brand[600]}>{filtered.length} acara</Txt>
              </View>
              {filtered.length === 0 ? (
                <Card pad={24}><View style={{ alignItems: "center", gap: 8 }}><Icon name="calendar" size={28} color={colors.neutral[300]} strokeWidth={1.8} /><Txt size={13} weight="semibold" color={colors.neutral[500]}>Tidak ada acara</Txt></View></Card>
              ) : (
                <View style={{ gap: 10 }}>{filtered.map((e) => <EventCard key={e.id} e={e} tzAbbr={tzAbbr} />)}</View>
              )}

              {/* Legend */}
              <Card pad={12} radius={16} style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {CATEGORIES.map((c) => (
                    <View key={c.key} style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.dot }} />
                      <Txt size={11.5} weight="semibold" color={colors.neutral[700]}>{c.label}</Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function WeekChip({ label, sub, active, onPress }: { label: string; sub: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: active ? colors.brand[500] : colors.neutral[100], backgroundColor: active ? colors.brand[500] : "#fff", alignItems: "flex-start" }}>
      <Txt size={12.5} weight="bold" color={active ? "#fff" : colors.neutral[700]}>{label}</Txt>
      {sub ? <Txt size={9.5} weight="semibold" color={active ? "rgba(255,255,255,0.85)" : colors.neutral[500]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
    </Pressable>
  );
}

function EventCard({ e, tzAbbr }: { e: CalEvent; tzAbbr: string | null }) {
  const cat = catMeta(e.category);
  const tappable = e.kind === "event";
  const inner = (
    <Card pad={12} radius={16} style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
      <View style={{ width: 44, borderRadius: 12, backgroundColor: cat.bg, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
        <Txt size={9.5} weight="extrabold" color={cat.fg} style={{ letterSpacing: 0.5 }}>{monthShortOf(e.startDate).toUpperCase()}</Txt>
        <Txt size={19} weight="extrabold" color={cat.fg}>{dayOf(e.startDate)}</Txt>
      </View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: cat.bg }}>
            <Txt size={9} weight="extrabold" color={cat.fg} style={{ letterSpacing: 0.2 }}>{cat.label.toUpperCase()}</Txt>
          </View>
          {e.isAllDay ? <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.neutral[100] }}><Txt size={9} weight="bold" color={colors.neutral[500]}>Sehari penuh</Txt></View> : null}
        </View>
        <Txt size={13.5} weight="bold" color={colors.neutral[900]} numberOfLines={2}>{e.title}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="clock" size={11} color={colors.neutral[500]} strokeWidth={2.2} />
          <Txt size={11} weight="semibold" color={colors.neutral[600]}>{timeLabel(e)}{!e.isAllDay && tzAbbr ? ` ${tzAbbr}` : ""}</Txt>
          {e.location ? (<><Txt size={11} color={colors.neutral[300]}>·</Txt><Icon name="mapPin" size={11} color={colors.neutral[500]} strokeWidth={2.2} /><Txt size={11} weight="semibold" color={colors.neutral[600]} numberOfLines={1} style={{ flexShrink: 1 }}>{e.location}</Txt></>) : null}
        </View>
        {e.scopeLabel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="users" size={10.5} color={colors.neutral[400]} strokeWidth={2.2} />
            <Txt size={10.5} weight="semibold" color={colors.neutral[500]} numberOfLines={1}>{e.scopeLabel}</Txt>
          </View>
        ) : null}
      </View>
      {tappable ? <View style={{ justifyContent: "center" }}><Icon name="chevronRight" size={14} color={colors.neutral[300]} strokeWidth={2} /></View> : null}
    </Card>
  );
  if (!tappable) return inner;
  return <Pressable onPress={() => router.push(`/kalender/${e.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>{inner}</Pressable>;
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
