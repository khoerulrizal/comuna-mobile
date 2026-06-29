// Detail Aktivitas — layout per-jenis sesuai formulir + lampiran preview + peta Field.
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { ShiftMap } from "@/components/ShiftMap";
import { DocPreviewModal, isImageDoc, type PreviewDoc } from "@/components/DocPreviewModal";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  activityTimeLabel, activityTitle, activityTypeMeta, formatEstimasi, getActivity, withTz,
  type ActivityAttachment, type ActivityItem,
} from "@/lib/activity";

const PRIORITY_LABEL: Record<string, string> = { HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };
const BREAK_KIND_LABEL: Record<string, string> = { MEAL: "Makan", COFFEE: "Coffee Break", PRAYER: "Ibadah", OTHER: "Lainnya" };
const FORMAT_LABEL: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline / Tatap Muka", HYBRID: "Hybrid" };
const DOW = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MM = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function fullDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DOW[dt.getUTCDay()]}, ${d} ${MM[m - 1]} ${y}`;
}
function dueLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AktivitasDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ActivityItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getActivity(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat aktivitas"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const meta = data ? activityTypeMeta(data.category) : null;
  const md = data?.metadata ?? {};
  const tzAbbr = data?.tzAbbr ?? null;
  const attachments = (md.attachments ?? []) as ActivityAttachment[];

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Aktivitas</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data || !meta ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ditemukan"}</Txt></Card></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Hero */}
          <LinearGradient colors={[`${meta.color}`, `${meta.color}cc`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                <Icon name={meta.icon} size={13} color="#fff" strokeWidth={2.4} />
                <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4 }}>{meta.label.toUpperCase()}</Txt>
              </View>
              {activityTimeLabel(md) ? <Txt size={12} weight="bold" color="rgba(255,255,255,0.9)">{withTz(activityTimeLabel(md), tzAbbr)}</Txt> : null}
            </View>
            <Txt size={20} weight="extrabold" color="#fff" style={{ marginTop: 12, lineHeight: 26, fontFamily: fonts.extrabold }}>{activityTitle(data)}</Txt>
            <Txt size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>{fullDate(data.date)}</Txt>
          </LinearGradient>

          {/* Deskripsi */}
          {md.description ? (
            <Card pad={14} radius={16} style={{ marginTop: 14 }}>
              <Txt size={10.5} weight="extrabold" color={colors.neutral[500]} style={{ letterSpacing: 0.4, marginBottom: 6 }}>DESKRIPSI</Txt>
              <Txt size={13} color={colors.neutral[700]} style={{ lineHeight: 20 }}>{md.description}</Txt>
            </Card>
          ) : null}

          {/* Field per jenis */}
          {data.category === "MEETING" ? (
            <Section title="Waktu">
              <InfoRow label="Tanggal" value={fullDate(data.date)} />
              <InfoRow label="Mulai" value={withTz(md.startTime, tzAbbr)} />
              <InfoRow label="Selesai" value={withTz(md.endTime, tzAbbr)} sub={md.duration ?? undefined} last />
            </Section>
          ) : null}

          {data.category === "TASK" ? (
            <>
              <Section title="Deadline">
                <InfoRow label="Tenggat" value={dueLabel(md.dueDate)} />
                <InfoRow label="Jam" value={withTz(md.dueTime, tzAbbr)} />
                <InfoRow label="Estimasi" value={formatEstimasi(md) ?? "—"} last />
              </Section>
              <Section title="Lainnya">
                <InfoRow label="Prioritas" value={md.priority ? PRIORITY_LABEL[md.priority] ?? md.priority : "—"} />
                <InfoRow label="Penanggung jawab" value={md.assignee ?? "—"} last />
              </Section>
            </>
          ) : null}

          {data.category === "FIELD" ? (
            <>
              <Section title="Jadwal">
                <InfoRow label="Tanggal" value={fullDate(data.date)} />
                <InfoRow label="Berangkat" value={withTz(md.departureTime, tzAbbr)} />
                <InfoRow label="Estimasi kembali" value={withTz(md.estimatedReturn, tzAbbr)} last />
              </Section>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Lokasi tujuan</Txt>
              <Card pad={14} radius={16}>
                {data.checkInLat != null && data.checkInLng != null ? (
                  <ShiftMap points={[{ name: md.destination || "Tujuan", latitude: data.checkInLat, longitude: data.checkInLng, radius: 60 }]} height={150} />
                ) : null}
                <View style={{ marginTop: data.checkInLat != null ? 12 : 0 }}>
                  <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{md.destination || "—"}</Txt>
                  {data.checkInLat != null && data.checkInLng != null ? (
                    <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 2 }}>{data.checkInLat.toFixed(5)}, {data.checkInLng.toFixed(5)}</Txt>
                  ) : null}
                </View>
              </Card>
            </>
          ) : null}

          {data.category === "TRAINING" ? (
            <>
              <Section title="Waktu">
                <InfoRow label="Mulai" value={withTz(md.startTime, tzAbbr)} />
                <InfoRow label="Selesai" value={withTz(md.endTime, tzAbbr)} sub={md.duration ?? undefined} last />
              </Section>
              <Section title="Detail">
                <InfoRow label="Format" value={md.format ? FORMAT_LABEL[md.format] ?? md.format : "—"} />
                <InfoRow label="Pemateri" value={md.trainer ?? "—"} />
                <InfoRow label="Materi" value={md.materials ?? "—"} last />
              </Section>
            </>
          ) : null}

          {data.category === "BREAK" ? (
            <Section title="Istirahat">
              <InfoRow label="Mulai" value={withTz(md.startTime, tzAbbr)} />
              <InfoRow label="Selesai" value={withTz(md.endTime, tzAbbr)} sub={md.duration ?? undefined} />
              <InfoRow label="Jenis" value={md.breakKind ? BREAK_KIND_LABEL[md.breakKind] ?? md.breakKind : "—"} last />
            </Section>
          ) : null}

          {data.category === "OTHER" && (md.startTime || md.endTime) ? (
            <Section title="Waktu">
              <InfoRow label="Mulai" value={withTz(md.startTime, tzAbbr)} />
              <InfoRow label="Selesai" value={withTz(md.endTime, tzAbbr)} last />
            </Section>
          ) : null}

          {/* Lampiran */}
          {attachments.length > 0 ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>Lampiran ({attachments.length})</Txt>
              <View style={{ gap: 8 }}>
                {attachments.map((att, i) => (
                  <AttachmentRow key={i} att={att} onPress={() => setPreview({ url: att.url, name: att.name, mimeType: att.mimeType })} />
                ))}
              </View>
            </>
          ) : null}

          {/* Catatan / Hasil */}
          {data.notes ? (
            <>
              <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>{data.category === "MEETING" ? "Catatan / Hasil" : "Catatan"}</Txt>
              <Card pad={14} radius={16}><Txt size={13} color={colors.neutral[700]} style={{ lineHeight: 20 }}>{data.notes}</Txt></Card>
            </>
          ) : null}
        </ScrollView>
      )}

      <DocPreviewModal doc={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>{title}</Txt>
      <Card pad={0} radius={16}>{children}</Card>
    </>
  );
}

function InfoRow({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.neutral[100] }}>
      <Txt size={12.5} weight="semibold" color={colors.neutral[500]}>{label}</Txt>
      <View style={{ alignItems: "flex-end", flexShrink: 1, marginLeft: 12 }}>
        <Txt size={13} weight="bold" color={colors.neutral[900]} numberOfLines={2} style={{ textAlign: "right" }}>{value}</Txt>
        {sub ? <Txt size={10.5} color={colors.neutral[400]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
    </View>
  );
}

function AttachmentRow({ att, onPress }: { att: ActivityAttachment; onPress: () => void }) {
  const isImg = isImageDoc(att.url, att.mimeType);
  const icon: IconName = isImg ? "camera" : "doc";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card pad={12} radius={14} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={colors.brand[600]} strokeWidth={2} />
        </View>
        <Txt size={13} weight="bold" color={colors.neutral[900]} style={{ flex: 1 }} numberOfLines={1}>{att.name}</Txt>
        <Icon name="eye" size={16} color={colors.neutral[400]} strokeWidth={2.2} />
      </Card>
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
