// Ajukan Reimbursement — form (kategori/jumlah/tanggal/deskripsi/bukti) + aturan kategori.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Icon, Txt } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import {
  getReimburseContext, submitReimburseRequest, uploadReimburseAttachment, categoryVisual, rupiah,
  type ReimburseCategory, type ReimburseContext,
} from "@/lib/reimburse";

const MM = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function fmt(d: Date | null) { return d ? `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}` : "Pilih"; }
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Format angka mentah → ribuan id-ID ("380000" → "380.000"). */
function groupThousands(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export default function AjukanReimburseScreen() {
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<ReimburseContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [desc, setDesc] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]); // local uris

  const [showCategory, setShowCategory] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadErr(null);
      setCtx(await getReimburseContext());
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setLoadErr(e instanceof Error ? e.message : "Gagal memuat kategori reimbursement");
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  const categories = ctx?.categories ?? [];
  const cat = useMemo(() => categories.find((c) => c.id === categoryId) ?? null, [categories, categoryId]);
  const amount = Number(amountRaw.replace(/\D/g, "")) || 0;

  // Sisa kuota efektif (kategori & umum) untuk pengajuan ini.
  const catRemaining = cat?.maxPerMonth != null ? Math.max(0, cat.maxPerMonth - cat.usedThisMonth) : null;
  const generalRemaining = ctx?.monthlyLimit != null ? Math.max(0, ctx.monthlyLimit - ctx.usedThisMonth) : null;
  const overPerRequest = cat?.maxPerRequest != null && amount > cat.maxPerRequest;
  const overCatMonth = catRemaining != null && amount > catRemaining;
  const overGeneral = generalRemaining != null && amount > generalRemaining;
  const needReceipt = !!cat?.requireReceipt && attachments.length === 0;

  const violation = overPerRequest
    ? `Melebihi maksimal ${rupiah(cat!.maxPerRequest!)} per pengajuan`
    : overCatMonth
      ? `Melebihi sisa limit kategori bulan ini (${rupiah(catRemaining!)})`
      : overGeneral
        ? `Melebihi sisa limit bulanan (${rupiah(generalRemaining!)})`
        : null;

  const valid = !!categoryId && amount > 0 && !!date && !needReceipt && !violation;

  function pickAttachment() {
    Alert.alert("Bukti / Struk", "Pilih sumber", [
      { text: "Kamera", onPress: () => grab("camera") },
      { text: "Galeri", onPress: () => grab("library") },
      { text: "Batal", style: "cancel" },
    ]);
  }
  async function grab(src: "camera" | "library") {
    let ImagePicker: typeof import("expo-image-picker");
    try { ImagePicker = await import("expo-image-picker"); }
    catch { Alert.alert("Fitur lampiran belum aktif", "Memerlukan versi aplikasi terbaru."); return; }
    const perm = src === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Izin ditolak", "Aktifkan izin di Pengaturan."); return; }
    const res = src === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"], allowsMultipleSelection: true });
    if (!res.canceled) {
      const uris = res.assets.map((a) => a.uri).filter(Boolean);
      if (uris.length) setAttachments((prev) => [...prev, ...uris]);
    }
  }

  async function submit() {
    if (!valid || !date || submitting) return;
    setSubmitting(true);
    try {
      const uploaded = [];
      for (const uri of attachments) uploaded.push(await uploadReimburseAttachment(uri));
      const r = await submitReimburseRequest({
        category: cat!.name,
        amount,
        date: toYMD(date),
        description: desc.trim() || null,
        attachments: uploaded.map((a) => ({ url: a.url, name: a.name, mimeType: a.mimeType })),
      });
      router.replace({
        pathname: "/reimburse/sukses",
        params: { id: r.id, category: cat!.name, amount: String(amount), date: fmt(date), desc: desc.trim() },
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
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Ajukan Klaim</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : loadErr ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{loadErr}</Txt></Card></View>
      ) : categories.length === 0 ? (
        <View style={{ padding: 16 }}><Card pad={16}>
          <Txt size={13} weight="bold" color={colors.neutral[700]} style={{ textAlign: "center" }}>Belum ada kategori reimbursement</Txt>
          <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center", marginTop: 4 }}>Hubungi admin/HR untuk mengaktifkan kategori klaim.</Txt>
        </Card></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
            {/* Jumlah hero */}
            <Card pad={16} radius={18}>
              <Txt size={11.5} color={colors.neutral[500]} weight="semibold">Jumlah klaim (Rp)</Txt>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                <Txt size={22} weight="extrabold" color={colors.neutral[400]}>Rp </Txt>
                <TextInput
                  value={groupThousands(amountRaw)}
                  onChangeText={(t) => setAmountRaw(t.replace(/\D/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[300]}
                  keyboardType="number-pad"
                  style={{ flex: 1, fontSize: 26, fontFamily: fonts.extrabold, color: colors.neutral[900], padding: 0 }}
                />
              </View>
            </Card>

            {/* Kategori / tanggal */}
            <Sh title="Detail Klaim" />
            <Card pad={0} radius={18}>
              <FormRow label="Kategori" value={cat?.name ?? "Pilih kategori"}
                sub={cat ? (catSubtitle(cat) || undefined) : undefined}
                icon={cat ? categoryVisual(cat.name).icon : "receipt"} color={colors.brand[500]} onPress={() => setShowCategory(true)} />
              <Divider />
              <FormRow label="Tanggal" value={fmt(date)} icon="calendar" color={colors.coral[500]} onPress={() => setShowDate(true)} />
            </Card>

            {/* Info aturan kategori */}
            {cat ? (
              <View style={{ marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: colors.brand[50] }}>
                <Txt size={10.5} weight="extrabold" color={colors.brand[700]} style={{ letterSpacing: 0.3 }}>ATURAN KATEGORI</Txt>
                <View style={{ marginTop: 6, gap: 4 }}>
                  {cat.maxPerRequest != null ? <RuleLine icon="info" text={`Maksimal ${rupiah(cat.maxPerRequest)} per pengajuan`} warn={overPerRequest} /> : null}
                  {cat.maxPerMonth != null ? <RuleLine icon="calendar" text={`Sisa limit kategori ${rupiah(catRemaining ?? 0)} (dari ${rupiah(cat.maxPerMonth)}/bln)`} warn={overCatMonth} /> : null}
                  {generalRemaining != null ? <RuleLine icon="wallet" text={`Sisa limit bulanan ${rupiah(generalRemaining)}`} warn={overGeneral} /> : null}
                  <RuleLine icon={cat.requireReceipt ? "upload" : "check"} text={cat.requireReceipt ? "Wajib melampirkan bukti/struk" : "Bukti opsional"} warn={needReceipt} />
                </View>
              </View>
            ) : null}
            {violation ? <Txt size={12} weight="semibold" color={colors.rose[700]} style={{ marginTop: 8 }}>{violation}</Txt> : null}

            {/* Deskripsi */}
            <Sh title="Deskripsi (opsional)" />
            <Card pad={14} radius={18}>
              <TextInput value={desc} onChangeText={setDesc} placeholder="contoh: Grab ke kantor klien BSD" placeholderTextColor={colors.neutral[400]} multiline
                style={{ minHeight: 70, fontSize: 13.5, fontFamily: fonts.regular, color: colors.neutral[800], textAlignVertical: "top", lineHeight: 20 }} />
            </Card>

            {/* Bukti */}
            <Sh title={`Bukti / Struk${cat?.requireReceipt ? "" : " (opsional)"}`} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {attachments.map((uri, i) => (
                <View key={`${uri}-${i}`} style={{ width: 86, height: 108, borderRadius: 14, overflow: "hidden", backgroundColor: colors.neutral[100] }}>
                  <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
                  <Pressable onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={6}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="close" size={12} color="#fff" strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={pickAttachment} style={{ width: 86, height: 108, borderRadius: 14, borderWidth: 1.5, borderColor: needReceipt ? colors.rose[300] : colors.neutral[200], borderStyle: "dashed", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={18} color={colors.brand[600]} strokeWidth={2.2} /></View>
                <Txt size={11} weight="bold" color={colors.brand[600]}>Tambah</Txt>
              </Pressable>
            </View>

            {/* Alur persetujuan */}
            <Sh title="Alur Persetujuan" />
            <Card pad={14} radius={18}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}><Icon name="user" size={16} color={colors.brand[600]} /></View>
                <Icon name="arrowRight" size={14} color={colors.neutral[300]} />
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}><Icon name="users" size={16} color={colors.mint[700]} /></View>
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Txt size={11.5} weight="bold" color={colors.neutral[700]}>Anda → Penyetuju → Keuangan</Txt>
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
                <Txt size={14} weight="extrabold" color="#fff">Kirim Klaim</Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {/* Sheet pilih kategori */}
      <Modal transparent visible={showCategory} animationType="slide" onRequestClose={() => setShowCategory(false)} statusBarTranslucent>
        <Pressable onPress={() => setShowCategory(false)} style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 12 }}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} /></View>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ paddingHorizontal: 16, marginBottom: 8 }}>Pilih Kategori</Txt>
            <ScrollView style={{ maxHeight: 380 }}>
              {categories.map((c) => {
                const v = categoryVisual(c.name);
                return (
                  <Pressable key={c.id} onPress={() => { setCategoryId(c.id); setShowCategory(false); }} style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: v.bg, alignItems: "center", justifyContent: "center" }}><Icon name={v.icon as never} size={16} color={v.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} weight="semibold" color={colors.neutral[800]}>{c.name}</Txt>
                      {catSubtitle(c) ? <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{catSubtitle(c)}</Txt> : null}
                    </View>
                    {c.id === categoryId ? <Icon name="check" size={18} color={colors.brand[500]} strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePicker visible={showDate} value={date} max={new Date()} title="Tanggal transaksi" onSelect={setDate} onClose={() => setShowDate(false)} />
    </View>
  );
}

function catSubtitle(c: ReimburseCategory): string {
  const parts: string[] = [];
  if (c.maxPerRequest != null) parts.push(`maks ${rupiah(c.maxPerRequest)}/klaim`);
  if (c.maxPerMonth != null) parts.push(`${rupiah(c.maxPerMonth)}/bln`);
  if (c.requireReceipt) parts.push("wajib bukti");
  return parts.join(" · ");
}

function Sh({ title }: { title: string }) {
  return <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 16, marginBottom: 8, letterSpacing: 0.2 }}>{title}</Txt>;
}
function Divider() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 62 }} />; }
function RuleLine({ icon, text, warn }: { icon: string; text: string; warn?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon name={icon as never} size={13} color={warn ? colors.rose[500] : colors.brand[600]} />
      <Txt size={11.5} color={warn ? colors.rose[700] : colors.neutral[600]} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}
function FormRow({ label, value, sub, icon, color, onPress }: { label: string; value: string; sub?: string; icon: string; color: string; onPress?: () => void }) {
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
