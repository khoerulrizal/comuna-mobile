// Ajukan Cuti — hero saldo + form (jenis/tanggal/half-day/alasan/lampiran) + alur. Ikut desain.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import {
  getLeaveContext, submitLeaveRequest, uploadLeaveAttachment, toYMD, leaveCategoryVisual,
  type LeaveAnnual, type LeavePolicyOption,
} from "@/lib/leave";

function daysInclusive(a: Date, b: Date) { return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const MM = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function fmt(d: Date | null) { return d ? `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}` : "Pilih"; }

export default function AjukanCutiScreen() {
  const insets = useSafeAreaInsets();
  const [annual, setAnnual] = useState<LeaveAnnual | null>(null);
  const [policies, setPolicies] = useState<LeavePolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [policyId, setPolicyId] = useState("");
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [session, setSession] = useState<"MORNING" | "AFTERNOON">("MORNING");
  const [reason, setReason] = useState("");
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);

  const [showPolicy, setShowPolicy] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadErr(null);
      const ctx = await getLeaveContext();
      setAnnual(ctx.annual); setPolicies(ctx.policies);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setLoadErr(e instanceof Error ? e.message : "Gagal memuat kebijakan cuti");
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const policy = useMemo(() => policies.find((p) => p.id === policyId) ?? null, [policies, policyId]);
  const minStart = useMemo(() => addDays(new Date(), policy?.minRequestDaysAhead ?? 0), [policy]);
  const totalDays = isHalfDay ? 0.5 : start && end ? daysInclusive(start, end) : 0;
  const overMax = policy?.maxRequestDays != null && totalDays > policy.maxRequestDays;
  const valid = !!policyId && !!start && (isHalfDay || !!end) && reason.trim().length >= 3 && !(policy?.attachmentRequired && !attachmentUri) && !overMax;

  function selectPolicy(p: LeavePolicyOption) { setPolicyId(p.id); if (!p.allowHalfDay) setIsHalfDay(false); setShowPolicy(false); }

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
    catch { Alert.alert("Fitur lampiran belum aktif", "Lampiran memerlukan versi aplikasi terbaru. Pengajuan tanpa lampiran tetap bisa dikirim."); return; }
    const perm = src === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Izin ditolak", "Aktifkan izin di Pengaturan."); return; }
    const res = src === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    if (!res.canceled && res.assets[0]?.uri) setAttachmentUri(res.assets[0].uri);
  }

  async function submit() {
    if (!valid || !start || submitting) return;
    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (attachmentUri) attachmentUrl = await uploadLeaveAttachment(attachmentUri);
      const r = await submitLeaveRequest({
        policyId, startDate: toYMD(start), endDate: toYMD(isHalfDay ? start : end!),
        isHalfDay, halfDaySession: isHalfDay ? session : null, reason: reason.trim(), attachmentUrl,
      });
      const remainingAfter = policy?.category === "ANNUAL" && annual ? Math.round((annual.remaining - totalDays) * 100) / 100 : "";
      router.replace({
        pathname: "/cuti/sukses",
        params: {
          id: r.id, policyName: policy?.name ?? "Cuti",
          range: isHalfDay ? `${fmt(start)} · ½ hari` : `${fmt(start)} – ${fmt(end)}`,
          days: String(totalDays), reason: reason.trim(),
          annualTotal: annual ? String(annual.total) : "", remainingAfter: String(remainingAfter),
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
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Ajukan Cuti</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : loadErr ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{loadErr}</Txt></Card></View>
      ) : policies.length === 0 ? (
        <View style={{ padding: 16 }}><Card pad={16}>
          <Txt size={13} weight="bold" color={colors.neutral[700]} style={{ textAlign: "center" }}>Belum ada jenis cuti tersedia</Txt>
          <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center", marginTop: 4 }}>Hubungi admin/HR untuk mengaktifkan kebijakan & alur persetujuan cuti.</Txt>
        </Card></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
            {/* Saldo hero */}
            {annual ? (
              <LinearGradient colors={[colors.brand[600], colors.brand[400]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18 }}>
                <Txt size={12} color="rgba(255,255,255,0.85)" weight="semibold">Saldo {annual.name.toLowerCase()}</Txt>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                  <Txt size={42} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{annual.remaining}</Txt>
                  <Txt size={15} color="rgba(255,255,255,0.85)">dari {annual.total} hari</Txt>
                </View>
                <View style={{ marginTop: 10, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <View style={{ width: `${annual.total > 0 ? Math.min(100, (annual.used / annual.total) * 100) : 0}%`, height: "100%", backgroundColor: "#fff", borderRadius: 3 }} />
                </View>
              </LinearGradient>
            ) : null}

            {/* Jenis & tanggal */}
            <Sh title="Detail Cuti" />
            <Card pad={0} radius={18}>
              <FormRow label="Jenis" value={policy?.name ?? "Pilih jenis cuti"}
                sub={policy ? `${policy.isPaid ? "Berbayar" : "Tanpa upah"}${policy.maxRequestDays != null ? ` · maks ${policy.maxRequestDays} hari` : ""}` : undefined}
                icon={policy ? (leaveCategoryVisual(policy.category).icon) : "plane"} color={colors.brand[500]} onPress={() => setShowPolicy(true)} />
              <Divider />
              <FormRow label={isHalfDay ? "Tanggal" : "Mulai"} value={fmt(start)} icon="calendar" color={colors.mint[500]} onPress={() => setShowStart(true)} />
              {!isHalfDay ? (<><Divider /><FormRow label="Selesai" value={fmt(end)} icon="calendar" color={colors.mint[500]} onPress={() => start && setShowEnd(true)} dim={!start} /></>) : null}
              {policy?.allowHalfDay ? (
                <><Divider />
                  <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={16} color={colors.amber[700]} /></View>
                    <Txt size={13.5} weight="semibold" color={colors.neutral[800]} style={{ flex: 1, marginLeft: 12 }}>Setengah hari</Txt>
                    <Switch value={isHalfDay} onValueChange={setIsHalfDay} trackColor={{ false: colors.neutral[200], true: colors.brand[400] }} thumbColor="#fff" />
                  </View>
                  {isHalfDay ? (
                    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                      {(["MORNING", "AFTERNOON"] as const).map((s) => {
                        const on = session === s;
                        return <Pressable key={s} onPress={() => setSession(s)} style={{ flex: 1, paddingVertical: 9, borderRadius: radii.md, alignItems: "center", backgroundColor: on ? colors.brand[500] : colors.neutral[100] }}><Txt size={12.5} weight="semibold" color={on ? "#fff" : colors.neutral[600]}>{s === "MORNING" ? "Pagi" : "Siang"}</Txt></Pressable>;
                      })}
                    </View>
                  ) : null}
                </>
              ) : null}
            </Card>
            {totalDays > 0 ? (
              <Txt size={12} weight="semibold" color={overMax ? colors.rose[700] : colors.neutral[500]} style={{ marginTop: 8 }}>
                Total {isHalfDay ? "0,5" : totalDays} hari{overMax ? ` · melebihi maks ${policy?.maxRequestDays} hari` : ""}
              </Txt>
            ) : null}

            {/* Alasan */}
            <Sh title="Alasan" />
            <Card pad={14} radius={18}>
              <TextInput value={reason} onChangeText={setReason} placeholder="Tuliskan alasan pengajuan cuti…" placeholderTextColor={colors.neutral[400]} multiline
                style={{ minHeight: 90, fontSize: 13.5, fontFamily: fonts.regular, color: colors.neutral[800], textAlignVertical: "top", lineHeight: 20 }} />
            </Card>

            {/* Lampiran */}
            <Sh title={`Lampiran${policy?.attachmentRequired ? "" : " (opsional)"}`} />
            {attachmentUri ? (
              <Card pad={14} radius={18}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={{ uri: attachmentUri }} style={{ width: 48, height: 48, borderRadius: 10 }} />
                  <Txt size={13} weight="semibold" color={colors.neutral[700]} style={{ flex: 1 }}>Dokumen terlampir</Txt>
                  <Pressable onPress={pickAttachment}><Txt size={13} weight="bold" color={colors.brand[600]}>Ganti</Txt></Pressable>
                  <Pressable onPress={() => setAttachmentUri(null)}><Txt size={13} weight="bold" color={colors.rose[700]}>Hapus</Txt></Pressable>
                </View>
              </Card>
            ) : (
              <Pressable onPress={pickAttachment} style={{ borderWidth: 1.5, borderColor: colors.neutral[200], borderStyle: "dashed", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff" }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.neutral[50], alignItems: "center", justifyContent: "center" }}><Icon name="upload" size={18} color={colors.neutral[600]} strokeWidth={2} /></View>
                <View style={{ flex: 1 }}>
                  <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Upload dokumen</Txt>
                  <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>Undangan, surat dokter, dll{policy?.attachmentRequired ? " · wajib" : ""}</Txt>
                </View>
              </Pressable>
            )}

            {/* Alur persetujuan */}
            <Sh title="Alur Persetujuan" />
            <Card pad={14} radius={18}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}><Icon name="user" size={16} color={colors.brand[600]} /></View>
                <Icon name="arrowRight" size={14} color={colors.neutral[300]} />
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}><Icon name="users" size={16} color={colors.mint[700]} /></View>
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Txt size={11.5} weight="bold" color={colors.neutral[700]}>Anda → Penyetuju</Txt>
                  <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>Diteruskan sesuai kebijakan perusahaan</Txt>
                </View>
              </View>
            </Card>
          </ScrollView>

          {/* Footer submit */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
            <Pressable onPress={submit} disabled={!valid || submitting} style={{ opacity: !valid || submitting ? 0.5 : 1 }}>
              <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={18} color="#fff" strokeWidth={2.4} />}
                <Txt size={14} weight="extrabold" color="#fff">Ajukan Cuti</Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {/* Sheet pilih jenis */}
      <Modal transparent visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)} statusBarTranslucent>
        <Pressable onPress={() => setShowPolicy(false)} style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 12 }}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} /></View>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ paddingHorizontal: 16, marginBottom: 8 }}>Pilih Jenis Cuti</Txt>
            <ScrollView style={{ maxHeight: 380 }}>
              {policies.map((p) => {
                const v = leaveCategoryVisual(p.category);
                return (
                  <Pressable key={p.id} onPress={() => selectPolicy(p)} style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: v.bg, alignItems: "center", justifyContent: "center" }}><Icon name={v.icon as never} size={16} color={v.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} weight="semibold" color={colors.neutral[800]}>{p.name}</Txt>
                      <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{p.isPaid ? "Berbayar" : "Tanpa upah"}{p.attachmentRequired ? " · perlu lampiran" : ""}{p.allowHalfDay ? " · bisa ½ hari" : ""}</Txt>
                    </View>
                    {p.id === policyId ? <Icon name="check" size={18} color={colors.brand[500]} strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePicker visible={showStart} value={start} min={minStart} title="Tanggal mulai" onSelect={(d) => { setStart(d); if (end && d > end) setEnd(null); }} onClose={() => setShowStart(false)} />
      <DatePicker visible={showEnd} value={end} min={start ?? minStart} title="Tanggal selesai" onSelect={setEnd} onClose={() => setShowEnd(false)} />
    </View>
  );
}

function Sh({ title }: { title: string }) {
  return <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8, letterSpacing: 0.2 }}>{title}</Txt>;
}
function Divider() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 62 }} />; }
function FormRow({ label, value, sub, icon, color, onPress, dim }: { label: string; value: string; sub?: string; icon: string; color: string; onPress?: () => void; dim?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}><Icon name={icon as never} size={16} color={color} /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Txt size={11.5} color={colors.neutral[500]}>{label}</Txt>
        <Txt size={14} weight="semibold" color={dim ? colors.neutral[400] : colors.neutral[800]} style={{ marginTop: 1 }}>{value}</Txt>
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
