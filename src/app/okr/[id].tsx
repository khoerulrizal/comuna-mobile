// OKR detail — objective + key results (desain Corelia) + catat progres KR.
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getObjectiveDetail, submitKrProgress, formatKrValue, krStatusMeta,
  type ObjectiveDetail, type KeyResultDetail,
} from "@/lib/okr";
import { ProgressRing } from "./index";

export default function OkrDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ObjectiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KeyResultDetail | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setData(await getObjectiveDetail(id));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat detail OKR");
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Detail OKR</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "OKR tidak ditemukan"}</Txt>
          <Button label="Coba lagi" size="md" onPress={() => { setLoading(true); load(); }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          <Card pad={18} radius={20} elevated>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="target" size={22} color={colors.brand[600]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={11} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.4 }}>OBJECTIVE</Txt>
                <Txt size={16} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2, lineHeight: 21 }}>{data.title}</Txt>
                <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 4 }}>{data.quarter}</Txt>
              </View>
            </View>
            {data.description ? (
              <Txt size={12.5} color={colors.neutral[600]} style={{ marginTop: 12, lineHeight: 18 }}>{data.description}</Txt>
            ) : null}
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14, padding: 12, backgroundColor: colors.neutral[25], borderRadius: 14 }}>
              <ProgressRing pct={data.progress} size={62} />
              <View style={{ flex: 1 }}>
                <Txt size={12} weight="bold" color={colors.neutral[600]}>Progress keseluruhan</Txt>
                <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{data.keyResults.length} key results · berbobot</Txt>
              </View>
            </View>
          </Card>

          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <Txt size={15} weight="extrabold" color={colors.neutral[800]}>Key Results</Txt>
          </View>

          <View style={{ gap: 10 }}>
            {data.keyResults.map((kr, i) => (
              <KrCard key={kr.id} kr={kr} index={i} onPress={() => setEditing(kr)} />
            ))}
          </View>

          <Txt size={11.5} color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 18, lineHeight: 18 }}>
            Ketuk key result untuk memperbarui pencapaian.
          </Txt>
        </ScrollView>
      )}

      {editing ? (
        <KrProgressModal
          objectiveId={id!}
          kr={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      ) : null}
    </View>
  );
}

function KrCard({ kr, index, onPress }: { kr: KeyResultDetail; index: number; onPress: () => void }) {
  const meta = krStatusMeta(kr.status);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card pad={14} radius={16}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <Txt size={13.5} weight="semibold" color={colors.neutral[800]} style={{ flex: 1, lineHeight: 18 }}>KR {index + 1}. {kr.title}</Txt>
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, kr.pct)}%`, height: "100%", backgroundColor: meta.color, borderRadius: 3 }} />
          </View>
          <Txt size={12.5} weight="extrabold" color={meta.color} style={{ minWidth: 38, textAlign: "right" }}>{kr.pct}%</Txt>
        </View>
        <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 6, fontFamily: fonts.mono }}>
          {formatKrValue(kr.currentValue, kr.unit)} / {formatKrValue(kr.targetValue, kr.unit)}
        </Txt>
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

function KrProgressModal({
  objectiveId, kr, onClose, onSaved,
}: { objectiveId: string; kr: KeyResultDetail; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(String(kr.currentValue));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const num = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(num);

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await submitKrProgress(objectiveId, { keyResultId: kr.id, actualValue: num, note: note.trim() || null });
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
          <Txt size={16} weight="extrabold" color={colors.neutral[900]}>Perbarui Key Result</Txt>
          <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{kr.title}</Txt>
          <Txt size={11.5} color={colors.neutral[400]} style={{ marginTop: 6, fontFamily: fonts.mono }}>Target: {formatKrValue(kr.targetValue, kr.unit)}</Txt>

          <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 6 }}>
            NILAI SAAT INI{kr.unit !== "NUMBER" ? ` (${kr.unit})` : ""}
          </Txt>
          <TextInput value={value} onChangeText={(t) => setValue(sanitizeDecimal(t))} keyboardType="numeric" placeholder="contoh: 80" placeholderTextColor={colors.neutral[400]} style={inputStyle} />

          <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 14, marginBottom: 6 }}>CATATAN (OPSIONAL)</Txt>
          <TextInput value={note} onChangeText={setNote} placeholder="Keterangan singkat" placeholderTextColor={colors.neutral[400]} multiline style={[inputStyle, { height: 72, textAlignVertical: "top" }]} />

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
