// Ajukan Lembur — hero + tanggal/waktu/jenis/alasan + estimasi upah live. Ikut desain.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import { compressImage } from "@/lib/image";
import {
  getOvertimeContext, submitOvertimeRequest, uploadOvertimeAttachment,
  addDurationToTime, hoursLabel, isWeeklyRestDay, estimateOvertime, rupiah,
  type OvertimePolicyOption,
} from "@/lib/overtime";

const MM = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function fmtDate(d: Date | null) { return d ? `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}` : "Pilih tanggal"; }
function toYMD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export default function AjukanLemburScreen() {
  const insets = useSafeAreaInsets();
  const [policies, setPolicies] = useState<OvertimePolicyOption[]>([]);
  const [monthlyWage, setMonthlyWage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [policyId, setPolicyId] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(2); // jam
  const [reason, setReason] = useState("");
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);

  const [showPolicy, setShowPolicy] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tzAbbr, setTzAbbr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadErr(null);
      const ctx = await getOvertimeContext();
      setPolicies(ctx.policies); setMonthlyWage(ctx.monthlyWage); setTzAbbr(ctx.tzAbbr);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setLoadErr(e instanceof Error ? e.message : "Gagal memuat kebijakan lembur");
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const policy = useMemo(() => policies.find((p) => p.id === policyId) ?? null, [policies, policyId]);
  const maxDur = policy?.maxHoursPerDay ?? 4;
  const totalHours = duration;
  const endTime = startTime ? addDurationToTime(startTime, duration) : null;
  const isHoliday = policy && date ? isWeeklyRestDay(date, policy.workScheduleDays) : false;
  const estimate = policy && totalHours > 0 ? estimateOvertime(monthlyWage, policy, totalHours, isHoliday) : null;
  const overDay = duration > maxDur;
  const valid = !!policyId && !!date && !!startTime && duration > 0 && !overDay && !(policy?.requireAttachment && !attachmentUri);

  function pickAttachment() {
    Alert.alert("Lampiran", "Pilih sumber", [
      { text: "Kamera", onPress: () => grab("camera") },
      { text: "Galeri", onPress: () => grab("library") },
      { text: "Batal", style: "cancel" },
    ]);
  }
  async function grab(src: "camera" | "library") {
    let ImagePicker: typeof import("expo-image-picker");
    try { ImagePicker = await import("expo-image-picker"); }
    catch { Alert.alert("Fitur lampiran belum aktif", "Lampiran memerlukan versi aplikasi terbaru."); return; }
    const perm = src === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Izin ditolak", "Aktifkan izin di Pengaturan."); return; }
    const res = src === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.uri) setAttachmentUri(await compressImage(asset.uri, { width: asset.width }));
  }

  async function submit() {
    if (!valid || !date || !startTime || submitting) return;
    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (attachmentUri) attachmentUrl = await uploadOvertimeAttachment(attachmentUri);
      const r = await submitOvertimeRequest({ policyId, date: toYMD(date), startTime, durationHours: duration, reason: reason.trim() || null, attachmentUrl });
      router.replace({
        pathname: "/lembur/sukses",
        params: {
          id: r.id,
          date: `${fmtDate(date)}`,
          time: `${startTime} – ${endTime}${tzAbbr ? ` ${tzAbbr}` : ""}`,
          hours: hoursLabel(totalHours),
          reason: reason.trim(),
          comp: estimate ? (estimate.pay != null ? rupiah(estimate.pay) : `${estimate.leaveHours} jam cuti`) : "",
        },
      });
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal mengajukan", e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Coba lagi");
    } finally { setSubmitting(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="close" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Ajukan Lembur</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : loadErr ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{loadErr}</Txt></Card></View>
      ) : policies.length === 0 ? (
        <View style={{ padding: 16 }}><Card pad={16}>
          <Txt size={13} weight="bold" color={colors.neutral[700]} style={{ textAlign: "center" }}>Lembur belum tersedia</Txt>
          <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center", marginTop: 4 }}>Hubungi admin/HR untuk mengaktifkan kebijakan & alur persetujuan lembur.</Txt>
        </Card></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
            <Sh title="Detail Pengajuan" />
            <Card pad={0} radius={18}>
              <Row label="Jenis Lembur" value={policy?.name ?? "Pilih jenis lembur"} sub={policy ? (policy.compensationType === "LEAVE" ? "Dikompensasi jadi cuti" : "Dibayar sebagai upah lembur") : undefined} icon="money" color={colors.amber[500]} onPress={() => setShowPolicy(true)} />
              <Div />
              <Row label="Tanggal" value={fmtDate(date)} sub={date ? (isHoliday ? "Hari libur (tarif lebih tinggi)" : "Hari kerja") : undefined} icon="calendar" color={colors.brand[500]} onPress={() => setShowDate(true)} />
              <Div />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Waktu mulai (24 jam) */}
                <Pressable onPress={() => setShowStart(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.mint[500] + "22", alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={16} color={colors.mint[500]} /></View>
                  <View style={{ marginLeft: 12 }}><Txt size={11.5} color={colors.neutral[500]}>Waktu Mulai</Txt><Txt size={14} weight="semibold" color={startTime ? colors.neutral[800] : colors.neutral[400]}>{startTime ? `${startTime}${tzAbbr ? ` ${tzAbbr}` : ""}` : "--:--"}</Txt></View>
                </Pressable>
                {/* Durasi (stepper, maks kebijakan) */}
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 10 }}>
                  <Pressable onPress={() => setDuration((d) => Math.max(0.5, Math.round((d - 0.5) * 10) / 10))} hitSlop={6} style={[stepBtn, { backgroundColor: colors.neutral[100] }]}><Txt size={18} weight="extrabold" color={colors.neutral[600]}>−</Txt></Pressable>
                  <View style={{ alignItems: "center", minWidth: 52 }}>
                    <Txt size={11.5} color={colors.neutral[500]}>Durasi</Txt>
                    <Txt size={15} weight="extrabold" color={colors.neutral[900]}>{duration}j</Txt>
                  </View>
                  <Pressable onPress={() => setDuration((d) => Math.min(maxDur, Math.round((d + 0.5) * 10) / 10))} hitSlop={6} style={[stepBtn, { backgroundColor: colors.brand[500] }]}><Icon name="plus" size={14} color="#fff" strokeWidth={2.6} /></Pressable>
                </View>
              </View>
            </Card>
            {startTime ? (
              <Txt size={12} weight="semibold" color={overDay ? colors.rose[700] : colors.neutral[600]} style={{ marginTop: 8 }}>
                Durasi {hoursLabel(duration)} · selesai {endTime}{overDay ? ` · melebihi maks ${maxDur} jam/hari` : ""}
              </Txt>
            ) : null}

            <Sh title="Alasan" />
            <Card pad={14} radius={18}>
              <TextInput value={reason} onChangeText={setReason} placeholder="Alasan / pekerjaan yang dikerjakan…" placeholderTextColor={colors.neutral[400]} multiline
                style={{ minHeight: 80, fontSize: 13.5, fontFamily: fonts.regular, color: colors.neutral[800], textAlignVertical: "top", lineHeight: 20 }} />
            </Card>

            {policy?.requireAttachment ? (
              <>
                <Sh title="Lampiran (wajib)" />
                {attachmentUri ? (
                  <Card pad={14} radius={18}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Image source={{ uri: attachmentUri }} style={{ width: 48, height: 48, borderRadius: 10 }} />
                      <Txt size={13} weight="semibold" color={colors.neutral[700]} style={{ flex: 1 }}>Dokumen terlampir</Txt>
                      <Pressable onPress={() => setAttachmentUri(null)}><Txt size={13} weight="bold" color={colors.rose[700]}>Hapus</Txt></Pressable>
                    </View>
                  </Card>
                ) : (
                  <Pressable onPress={pickAttachment} style={{ borderWidth: 1.5, borderColor: colors.neutral[200], borderStyle: "dashed", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.neutral[50], alignItems: "center", justifyContent: "center" }}><Icon name="upload" size={18} color={colors.neutral[600]} strokeWidth={2} /></View>
                    <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Upload SPL / dokumen</Txt>
                  </Pressable>
                )}
              </>
            ) : null}

            {/* Estimasi upah */}
            {estimate ? (
              <>
                <Sh title="Estimasi Kompensasi" />
                <Card pad={14} radius={18}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Txt size={13} weight="semibold" color={colors.neutral[700]}>{estimate.pay != null ? "Estimasi upah lembur" : "Kompensasi cuti"}</Txt>
                    <Txt size={18} weight="extrabold" color={colors.mint[700]} style={{ fontFamily: fonts.extrabold }}>
                      {estimate.pay != null ? rupiah(estimate.pay) : `${estimate.leaveHours} jam`}
                    </Txt>
                  </View>
                  <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 8, lineHeight: 15 }}>
                    {isHoliday ? "Tarif hari libur" : "Tarif hari kerja"} · mengacu PP 35/2021. Nilai final dikonfirmasi saat payroll run.
                  </Txt>
                </Card>
              </>
            ) : null}
          </ScrollView>

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
            <Pressable onPress={submit} disabled={!valid || submitting} style={{ opacity: !valid || submitting ? 0.5 : 1 }}>
              <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={18} color="#fff" strokeWidth={2.4} />}
                <Txt size={14} weight="extrabold" color="#fff">Ajukan Lembur</Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {/* Sheet jenis lembur */}
      <Modal transparent visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)} statusBarTranslucent>
        <Pressable onPress={() => setShowPolicy(false)} style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 12 }}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} /></View>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ paddingHorizontal: 16, marginBottom: 8 }}>Pilih Jenis Lembur</Txt>
            <ScrollView style={{ maxHeight: 340 }}>
              {policies.map((p) => (
                <Pressable key={p.id} onPress={() => { setPolicyId(p.id); setShowPolicy(false); }} style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}><Icon name="money" size={16} color={colors.amber[700]} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="semibold" color={colors.neutral[800]}>{p.name}</Txt>
                    <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{p.compensationType === "LEAVE" ? "Kompensasi cuti" : "Upah lembur"} · maks {p.maxHoursPerDay} jam/hari</Txt>
                  </View>
                  {p.id === policyId ? <Icon name="check" size={18} color={colors.brand[500]} strokeWidth={2.4} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePicker visible={showDate} value={date} title="Tanggal lembur" onSelect={setDate} onClose={() => setShowDate(false)} />
      <TimePicker visible={showStart} value={startTime} title="Waktu mulai" onSelect={setStartTime} onClose={() => setShowStart(false)} />
    </View>
  );
}

function Sh({ title }: { title: string }) { return <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8, letterSpacing: 0.2 }}>{title}</Txt>; }
function Div() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 62 }} />; }
function Row({ label, value, sub, icon, color, onPress }: { label: string; value: string; sub?: string; icon: string; color: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt size={11.5} color={colors.neutral[500]}>{label}</Txt>
        <Txt size={14} weight="semibold" color={colors.neutral[800]} style={{ marginTop: 1 }}>{value}</Txt>
        {sub ? <Txt size={11} color={colors.neutral[400]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={18} color={colors.neutral[300]} /> : null}
    </Pressable>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};

const stepBtn = {
  width: 30, height: 30, borderRadius: 8,
  alignItems: "center" as const, justifyContent: "center" as const,
};
