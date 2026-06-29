// Detail Acara — hero + info (waktu/lokasi/peserta) + deskripsi + RSVP. Ikut desain.
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  catMeta, dayNameOf, dayOf, fullDateLabel, getCalendarEvent, monthShortOf, setRsvp, timeLabel,
  type CalEventDetail, type RsvpResponse,
} from "@/lib/calendar";

export default function KalenderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<CalEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<RsvpResponse | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getCalendarEvent(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  async function onRsvp(resp: RsvpResponse) {
    if (!id || !data || saving) return;
    const next = data.myRsvp === resp ? null : resp;
    setSaving(resp);
    try {
      await setRsvp(id, next);
      await load();
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal menyimpan konfirmasi");
    } finally {
      setSaving(null);
    }
  }

  const cat = data ? catMeta(data.category) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Acara</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data || !cat ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ditemukan"}</Txt></Card></View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          >
            {/* Hero */}
            <LinearGradient colors={[cat.bg, "#fff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.neutral[100] }}>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <View style={{ width: 64, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 2, shadowColor: "#281E5A", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                  <Txt size={9.5} weight="extrabold" color={cat.fg} style={{ letterSpacing: 0.6 }}>{monthShortOf(data.startDate).toUpperCase()}</Txt>
                  <Txt size={28} weight="extrabold" color={cat.fg} style={{ fontFamily: fonts.extrabold }}>{dayOf(data.startDate)}</Txt>
                  <Txt size={10} weight="bold" color={colors.neutral[600]}>{dayNameOf(data.startDate)}</Txt>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: cat.bg }}>
                    <Txt size={9.5} weight="extrabold" color={cat.fg} style={{ letterSpacing: 0.3 }}>{cat.label.toUpperCase()}</Txt>
                  </View>
                  <Txt size={19} weight="extrabold" color={colors.neutral[900]}>{data.title}</Txt>
                  {data.createdByName ? <Txt size={11.5} weight="semibold" color={colors.neutral[600]}>oleh {data.createdByName}</Txt> : null}
                </View>
              </View>
            </LinearGradient>

            {/* Info */}
            <Card pad={0} radius={16} style={{ marginTop: 14 }}>
              <InfoRow icon="clock" label="Waktu" value={`${timeLabel(data)}${!data.isAllDay && data.tzAbbr ? ` ${data.tzAbbr}` : ""}`} sub={fullDateLabel(data.startDate)} />
              {data.location ? (<><Div /><InfoRow icon="mapPin" label="Lokasi" value={data.location} /></>) : null}
              {data.scopeLabel ? (<><Div /><InfoRow icon="users" label="Peserta" value={data.scopeLabel} /></>) : null}
            </Card>

            {/* Deskripsi */}
            {data.description ? (
              <>
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Deskripsi</Txt>
                <Card pad={14} radius={16}><Txt size={12.5} color={colors.neutral[700]} style={{ lineHeight: 19 }}>{data.description}</Txt></Card>
              </>
            ) : null}

            {/* RSVP summary — hanya bila konfirmasi diaktifkan admin */}
            {data.rsvpEnabled ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8 }}>
                  <Txt size={12.5} weight="extrabold" color={colors.neutral[700]}>Konfirmasi</Txt>
                  <Txt size={11.5} weight="bold" color={colors.brand[600]}>{data.rsvp.total} respons</Txt>
                </View>
                <Card pad={14} radius={16}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <RsvpStat label="Hadir" value={data.rsvp.yes} fg={colors.mint[700]} bg={colors.mint[100]} />
                    <RsvpStat label="Mungkin" value={data.rsvp.maybe} fg={colors.amber[700]} bg={colors.amber[100]} />
                    <RsvpStat label="Tidak" value={data.rsvp.no} fg={colors.coral[700]} bg={colors.coral[100]} />
                  </View>
                </Card>
              </>
            ) : null}
          </ScrollView>

          {/* Footer RSVP — hanya bila konfirmasi diaktifkan */}
          {data.rsvpEnabled ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, flexDirection: "row", gap: 8 }}>
              <RsvpButton icon="close" label="Tidak" active={data.myRsvp === "NO"} loading={saving === "NO"} onPress={() => onRsvp("NO")} fg={colors.coral[700]} bg={colors.coral[100]} />
              <RsvpButton icon="info" label="Mungkin" active={data.myRsvp === "MAYBE"} loading={saving === "MAYBE"} onPress={() => onRsvp("MAYBE")} fg={colors.amber[700]} bg={colors.amber[100]} />
              <RsvpButton icon="check" label="Hadir" active={data.myRsvp === "YES"} loading={saving === "YES"} onPress={() => onRsvp("YES")} fg="#fff" bg={colors.mint[500]} primary />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 58 }} />; }

function InfoRow({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: colors.neutral[100], alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={15} color={colors.neutral[700]} /></View>
      <View style={{ flex: 1 }}>
        <Txt size={11} color={colors.neutral[500]} weight="semibold">{label}</Txt>
        <Txt size={13.5} weight="bold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{value}</Txt>
        {sub ? <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

function RsvpStat({ label, value, fg, bg }: { label: string; value: number; fg: string; bg: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 12, backgroundColor: bg, alignItems: "center", paddingVertical: 12 }}>
      <Txt size={20} weight="extrabold" color={fg}>{value}</Txt>
      <Txt size={10.5} weight="bold" color={fg} style={{ marginTop: 1 }}>{label}</Txt>
    </View>
  );
}

function RsvpButton({ icon, label, active, loading, onPress, fg, bg, primary }: {
  icon: IconName; label: string; active: boolean; loading: boolean; onPress: () => void; fg: string; bg: string; primary?: boolean;
}) {
  const on = active;
  return (
    <Pressable onPress={onPress} disabled={loading} style={{ flex: primary ? 1.3 : 1, paddingVertical: 13, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: on ? bg : "#fff", borderWidth: 1.5, borderColor: on ? bg : colors.neutral[100] }}>
      {loading ? <ActivityIndicator size="small" color={on ? fg : colors.neutral[500]} /> : <Icon name={icon} size={16} color={on ? fg : colors.neutral[500]} strokeWidth={2.4} />}
      <Txt size={13} weight="extrabold" color={on ? fg : colors.neutral[700]}>{label}</Txt>
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
