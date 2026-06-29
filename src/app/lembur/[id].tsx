// Status Pengajuan Lembur — hero + progress + next-action + linimasa + detail. Ikut desain.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { DocPreviewModal, type PreviewDoc } from "@/components/DocPreviewModal";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  cancelOvertimeRequest, getOvertimeRequest, hoursLabel, otDateLabel, otDateTimeLabel,
  overtimeStatusPill, rupiah,
  type OvertimeRequestDetail, type OvertimeStatus,
} from "@/lib/overtime";

function stepLabel(order: number, total: number): string {
  if (total <= 2) return order === 1 ? "Pengkoreksi" : "Penyetuju";
  return `Langkah ${order}`;
}
function heroColors(status: OvertimeStatus): [string, string] {
  switch (status) {
    case "APPROVED": case "PAID": case "COMPENSATED": return [colors.mint[500], colors.mint[700]];
    case "REJECTED": return [colors.rose[500], colors.coral[700]];
    case "CANCELLED": return [colors.neutral[500], colors.neutral[700]];
    default: return [colors.amber[500], colors.coral[500]];
  }
}
function statusText(s: OvertimeStatus): string {
  return s === "APPROVED" ? "Disetujui" : s === "PAID" ? "Dibayar" : s === "COMPENSATED" ? "Jadi cuti"
    : s === "REJECTED" ? "Ditolak" : s === "CANCELLED" ? "Dibatalkan" : "Dalam Proses";
}

export default function LemburDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<OvertimeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getOvertimeRequest(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat detail"); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const progress = useMemo(() => {
    if (!data) return { done: 0, total: 0, pct: 0 };
    const total = data.totalSteps || 0;
    const done = ["APPROVED", "PAID", "COMPENSATED"].includes(data.status) ? total : data.approvals.filter((a) => a.decision === "APPROVED").length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [data]);
  const nextApprover = data?.approvals.find((a) => a.decision === "PENDING")?.approverName ?? null;
  const comp = data ? (data.overtimePay != null ? rupiah(data.overtimePay) : data.leaveHours != null ? `${data.leaveHours} jam cuti` : null) : null;

  function confirmCancel() {
    Alert.alert("Batalkan pengajuan?", "Pengajuan lembur ini akan dibatalkan.", [
      { text: "Tidak", style: "cancel" },
      { text: "Batalkan", style: "destructive", onPress: async () => {
        if (!id) return; setCancelling(true);
        try { await cancelOvertimeRequest(id); await load(); }
        catch (e) { Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal membatalkan"); }
        finally { setCancelling(false); }
      } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Status Pengajuan</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ditemukan"}</Txt></Card></View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: data.status === "PENDING" ? insets.bottom + 90 : insets.bottom + 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          >
            <LinearGradient colors={heroColors(data.status)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}>
                  <Txt size={10.5} weight="extrabold" color="#fff" style={{ letterSpacing: 0.4, fontFamily: fonts.mono }}>{data.id.slice(0, 10).toUpperCase()}</Txt>
                </View>
                <Txt size={11.5} weight="bold" color="rgba(255,255,255,0.95)">{statusText(data.status)}</Txt>
              </View>
              <Txt size={18} weight="extrabold" color="#fff" style={{ marginTop: 14 }}>Lembur · {hoursLabel(data.totalHours)}</Txt>
              <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }}>{otDateLabel(data.date, true)} · {data.startTime} – {data.endTime}{data.tzAbbr ? ` ${data.tzAbbr}` : ""}</Txt>
              {progress.total > 0 ? (
                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.95)">{progress.done} dari {progress.total} langkah selesai</Txt>
                    <Txt size={10.5} weight="extrabold" color="rgba(255,255,255,0.95)">{progress.pct}%</Txt>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                    <View style={{ width: `${progress.pct}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
                  </View>
                </View>
              ) : null}
            </LinearGradient>

            {data.status === "PENDING" && nextApprover ? (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.brand[500], flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={16} color={colors.brand[600]} strokeWidth={2.2} /></View>
                <View style={{ flex: 1 }}>
                  <Txt size={10.5} weight="extrabold" color={colors.brand[600]} style={{ letterSpacing: 0.3 }}>MENUNGGU</Txt>
                  <Txt size={13} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{nextApprover}</Txt>
                  <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{stepLabel(data.currentStep, data.totalSteps)}</Txt>
                </View>
              </View>
            ) : null}

            {data.status === "REJECTED" && data.rejectionNote ? (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: colors.coral[100] }}>
                <Txt size={10.5} weight="extrabold" color={colors.coral[700]}>ALASAN PENOLAKAN</Txt>
                <Txt size={12.5} color={colors.coral[700]} style={{ marginTop: 2 }}>{data.rejectionNote}</Txt>
              </View>
            ) : null}

            {data.approvals.length > 0 ? (
              <>
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Linimasa Approval</Txt>
                <Card pad={16} radius={18}>
                  {data.approvals.map((a, i) => {
                    const tone = a.decision === "APPROVED" ? colors.mint[500] : a.decision === "REJECTED" ? colors.coral[700] : colors.amber[500];
                    const icon = a.decision === "APPROVED" ? "check" : a.decision === "REJECTED" ? "close" : "clock";
                    const last = i === data.approvals.length - 1;
                    return (
                      <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ alignItems: "center" }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={15} color="#fff" strokeWidth={2.4} /></View>
                          {!last ? <View style={{ width: 2, flex: 1, backgroundColor: colors.neutral[100], marginVertical: 2 }} /> : null}
                        </View>
                        <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
                          <Txt size={13} weight="bold" color={colors.neutral[900]}>{stepLabel(a.stepOrder, data.totalSteps)}</Txt>
                          <Txt size={12} color={colors.neutral[600]} style={{ marginTop: 1 }}>{a.approverName}</Txt>
                          <Txt size={11} color={colors.neutral[400]} style={{ marginTop: 1 }}>
                            {a.decision === "PENDING" ? "Menunggu" : a.decision === "APPROVED" ? "Disetujui" : "Ditolak"}{a.decidedAt ? ` · ${otDateLabel(a.decidedAt)}` : ""}
                          </Txt>
                          {a.note ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 3, fontStyle: "italic" }}>“{a.note}”</Txt> : null}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {/* Riwayat Status — linimasa transisi status (diajukan → disetujui → dst) */}
            {data.statusLogs.length > 0 ? (
              <>
                <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Riwayat Status</Txt>
                <Card pad={16} radius={18}>
                  {data.statusLogs.map((l, i) => {
                    const pill = overtimeStatusPill(l.status);
                    const last = i === data.statusLogs.length - 1;
                    return (
                      <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ alignItems: "center" }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pill.fg, marginTop: 4 }} />
                          {!last ? <View style={{ width: 2, flex: 1, backgroundColor: colors.neutral[100], marginVertical: 2 }} /> : null}
                        </View>
                        <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: pill.bg }}>
                              <Txt size={9.5} weight="extrabold" color={pill.fg} style={{ letterSpacing: 0.3 }}>{pill.label.toUpperCase()}</Txt>
                            </View>
                            <Txt size={11} color={colors.neutral[500]}>{otDateTimeLabel(l.changedAt)}</Txt>
                          </View>
                          {l.note ? <Txt size={11.5} color={colors.neutral[600]} style={{ marginTop: 3 }}>{l.note}</Txt> : null}
                          {l.changedByName ? <Txt size={11} color={colors.neutral[400]} style={{ marginTop: 1 }}>oleh {l.changedByName}</Txt> : null}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8 }}>Detail</Txt>
            <Card pad={0} radius={16}>
              {comp ? <><DRow label="Kompensasi" value={comp} icon="wallet" color={colors.mint[700]} bg={colors.mint[100]} valueColor={colors.mint[700]} /><Div /></> : null}
              <DRow label="Tanggal" value={otDateLabel(data.date, true)} icon="calendar" color={colors.brand[600]} bg={colors.brand[100]} />
              <Div />
              <DRow label="Waktu" value={`${data.startTime} – ${data.endTime}${data.tzAbbr ? ` ${data.tzAbbr}` : ""} · ${hoursLabel(data.totalHours)}`} icon="clock" color={colors.amber[700]} bg={colors.amber[100]} />
              {data.reason ? <><Div /><DRow label="Alasan" value={data.reason} icon="check" color={colors.coral[700]} bg={colors.coral[100]} /></> : null}
              {data.attachmentUrl ? <><Div /><Pressable onPress={() => setPreviewDoc({ url: data.attachmentUrl!, name: "Lampiran Lembur" })}><DRow label="Lampiran" value="Lihat dokumen →" icon="link" color={colors.brand[600]} bg={colors.brand[100]} valueColor={colors.brand[600]} /></Pressable></> : null}
            </Card>
          </ScrollView>

          {data.status === "PENDING" ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
              <Pressable onPress={confirmCancel} disabled={cancelling} style={{ paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.coral[300], alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                {cancelling ? <ActivityIndicator color={colors.coral[700]} /> : <Icon name="trash" size={16} color={colors.coral[700]} />}
                <Txt size={14} weight="bold" color={colors.coral[700]}>Batalkan Pengajuan</Txt>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </View>
  );
}

function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 60 }} />; }
function DRow({ label, value, icon, color, bg, valueColor }: { label: string; value: string; icon: string; color: string; bg: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ width: 80, marginLeft: 12 }}>{label}</Txt>
      <Txt size={13} weight="semibold" color={valueColor ?? colors.neutral[800]} style={{ flex: 1, textAlign: "right" }}>{value}</Txt>
    </View>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
