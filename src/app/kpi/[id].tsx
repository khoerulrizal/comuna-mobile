// KPI detail — skor keseluruhan + indikator (desain Corelia KpiScreen) + catat progres.
import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, TextInput, View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getKpiDetail, submitKpiProgress, uploadKpiEvidence,
  formatKpiValue, indicatorTone, kpiDeadlineLabel, kpiPeriodShort, kpiStatusPill, scoreColor,
  type KpiDetail, type KpiIndicator,
} from "@/lib/kpi";

export default function KpiDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<KpiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KpiIndicator | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setData(await getKpiDetail(id));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat detail KPI");
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const pill = data ? kpiStatusPill(data.status) : null;
  const barColor = data ? scoreColor(data.scorePct) : colors.brand[500];

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]} numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>Detail KPI</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "KPI tidak ditemukan"}</Txt>
          <Button label="Coba lagi" size="md" onPress={() => { setLoading(true); load(); }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {/* Hero skor keseluruhan */}
          <LinearGradient colors={[colors.brand[600], colors.brand[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Txt size={11} weight="bold" color="rgba(255,255,255,0.8)" style={{ letterSpacing: 0.5 }}>SKOR KESELURUHAN</Txt>
              {pill ? (
                <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.2)" }}>
                  <Txt size={10.5} weight="extrabold" color="#fff">{pill.label}</Txt>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <Txt size={48} weight="extrabold" color="#fff" style={{ fontFamily: fonts.extrabold }}>{data.scorePct}</Txt>
              <Txt size={16} color="rgba(255,255,255,0.7)">/ 100</Txt>
            </View>
            <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, data.scorePct)}%`, height: "100%", backgroundColor: "#fff", borderRadius: 4 }} />
            </View>
            <Txt size={12} weight="semibold" color="#fff" style={{ marginTop: 12 }}>{data.kpiName}</Txt>
            <Txt size={11.5} color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
              {kpiPeriodShort(data.period, data.month, data.year)}
              {data.deadline ? ` · Tenggat ${kpiDeadlineLabel(data.deadline)}` : ""}
            </Txt>
          </LinearGradient>

          {/* Indikator */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 }}>
            <Txt size={15} weight="extrabold" color={colors.neutral[800]}>Indikator</Txt>
            <Txt size={11.5} weight="bold" color={colors.neutral[500]}>{data.indicators.length} item</Txt>
          </View>

          <View style={{ gap: 10 }}>
            {data.indicators.map((ind) => (
              <IndicatorCard key={ind.id} ind={ind} onPress={() => setEditing(ind)} />
            ))}
          </View>

          <Txt size={11.5} color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 18, lineHeight: 18 }}>
            Ketuk indikator untuk mencatat pencapaian terbaru.{"\n"}Skor diperbarui otomatis sesuai bobot pencapaian.
          </Txt>
        </ScrollView>
      )}

      {editing ? (
        <ProgressModal
          assignmentId={id!}
          indicator={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      ) : null}
    </View>
  );
}

function IndicatorCard({ ind, onPress }: { ind: KpiIndicator; onPress: () => void }) {
  const t = indicatorTone(ind.pct);
  const targetLabel = ind.target !== null ? `Target ${formatKpiValue(ind.target, ind.unit)}` : "Tanpa target acuan";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card pad={14} radius={18}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="bold" color={colors.neutral[900]}>{ind.name}</Txt>
            <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 2 }}>{targetLabel}</Txt>
          </View>
          <Pill tone={t.tone}>{t.label}</Pill>
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, ind.pct)}%`, height: "100%", backgroundColor: t.color, borderRadius: 4 }} />
          </View>
          <Txt size={13} weight="extrabold" color={t.color} style={{ minWidth: 40, textAlign: "right" }}>{ind.pct}%</Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100], borderStyle: "dashed" }}>
          <Txt size={11.5} color={colors.neutral[500]}>
            <Txt size={11.5} weight="bold" color={colors.neutral[800]}>{formatKpiValue(ind.latestActual, ind.unit)}</Txt> pencapaian
          </Txt>
          <Txt size={11.5} color={colors.neutral[500]}>
            Bobot <Txt size={11.5} weight="bold" color={colors.neutral[800]}>{ind.weightSharePct}%</Txt>
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}

/** Bersihkan input jadi desimal valid: digit + satu pemisah (./,) + minus di depan. */
function sanitizeDecimal(s: string): string {
  let out = s.replace(/[^0-9.,-]/g, "").replace(/(?!^)-/g, "");
  const sep = out.search(/[.,]/);
  if (sep !== -1) out = out.slice(0, sep + 1) + out.slice(sep + 1).replace(/[.,]/g, "");
  return out;
}

function ProgressModal({
  assignmentId, indicator, onClose, onSaved,
}: { assignmentId: string; indicator: KpiIndicator; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(indicator.latestActual !== null ? String(indicator.latestActual) : "");
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const num = Number(value.replace(",", "."));
  const overMax = indicator.maxValue != null && Number.isFinite(num) && num > indicator.maxValue;
  const valid = value.trim() !== "" && Number.isFinite(num) && !overMax;

  async function pickPhoto() {
    let ImagePicker: typeof import("expo-image-picker");
    try { ImagePicker = await import("expo-image-picker"); }
    catch { Alert.alert("Tidak tersedia", "Pemilih gambar tidak tersedia di build ini."); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Izin ditolak", "Beri izin akses galeri untuk melampirkan bukti."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      let evidenceData: string | null = null;
      let evidenceType: "photo" | null = null;
      if (photoUri) { evidenceData = await uploadKpiEvidence(photoUri); evidenceType = "photo"; }
      await submitKpiProgress(assignmentId, {
        indicatorId: indicator.id,
        actualValue: num,
        note: note.trim() || null,
        evidenceType,
        evidenceData,
      });
      onSaved();
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi");
    } finally { setSaving(false); }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(16,13,26,0.45)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} />
          </View>
          <Txt size={16} weight="extrabold" color={colors.neutral[900]}>Catat Pencapaian</Txt>
          <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{indicator.name}</Txt>

          <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 6 }}>
            NILAI AKTUAL{indicator.unit !== "NUMBER" ? ` (${indicator.unit})` : ""}
          </Txt>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(sanitizeDecimal(t))}
            keyboardType="numeric"
            placeholder="contoh: 95"
            placeholderTextColor={colors.neutral[400]}
            style={inputStyle}
          />
          {overMax ? (
            <Txt size={11.5} weight="semibold" color={colors.rose[700]} style={{ marginTop: 6 }}>
              Maksimal {formatKpiValue(indicator.maxValue, indicator.unit)}.
            </Txt>
          ) : null}

          <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 14, marginBottom: 6 }}>CATATAN (OPSIONAL)</Txt>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Keterangan singkat pencapaian"
            placeholderTextColor={colors.neutral[400]}
            multiline
            style={[inputStyle, { height: 72, textAlignVertical: "top" }]}
          />

          <Pressable onPress={pickPhoto} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], borderStyle: "dashed" }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 40, height: 40, borderRadius: 8 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="camera" size={18} color={colors.brand[600]} strokeWidth={2} />
              </View>
            )}
            <Txt size={13} weight="semibold" color={colors.neutral[700]}>{photoUri ? "Ganti bukti foto" : "Lampirkan bukti (opsional)"}</Txt>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <View style={{ flex: 1 }}><Button label="Batal" variant="outline" full onPress={onClose} /></View>
            <View style={{ flex: 1.4 }}><Button label={saving ? "Menyimpan…" : "Simpan"} variant="primary" full disabled={!valid || saving} onPress={save} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const inputStyle = {
  backgroundColor: colors.neutral[50],
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontFamily: fonts.semibold,
  fontSize: 14,
  color: colors.neutral[900],
} as const;

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
