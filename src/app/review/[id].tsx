// Review fill — isi self/peer review per pertanyaan (rating/teks/pilihan) + draft/final.
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getReviewForm, submitReview, reviewDateLabel, methodLabel,
  type ReviewForm, type ReviewQuestion, type SubmitAnswer,
} from "@/lib/review";

type AnswerState = Record<string, { score?: number | null; text?: string; checks?: string[] }>;

function initAnswers(form: ReviewForm): AnswerState {
  const out: AnswerState = {};
  for (const q of form.questions) {
    if (q.type === "RATING") out[q.id] = { score: q.score };
    else if (q.type === "CHECKBOXES") {
      let checks: string[] = [];
      if (q.textAnswer) { try { const p = JSON.parse(q.textAnswer); if (Array.isArray(p)) checks = p.map(String); } catch { checks = []; } }
      out[q.id] = { checks };
    } else out[q.id] = { text: q.textAnswer ?? "" };
  }
  return out;
}

export default function ReviewFillScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"DRAFT" | "SUBMITTED" | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await getReviewForm(id);
      setForm(res);
      setAnswers(initAnswers(res));
      setNote(res.note ?? "");
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat formulir review");
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const readOnly = !form?.fillable || form?.status === "COMPLETED";

  function setAns(qid: string, patch: Partial<AnswerState[string]>) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }

  function buildAnswers(): SubmitAnswer[] {
    if (!form) return [];
    const out: SubmitAnswer[] = [];
    for (const q of form.questions) {
      const a = answers[q.id] ?? {};
      if (q.type === "RATING") {
        if (a.score != null) out.push({ questionId: q.id, score: a.score });
      } else if (q.type === "CHECKBOXES") {
        if (a.checks && a.checks.length > 0) out.push({ questionId: q.id, textAnswer: JSON.stringify(a.checks) });
      } else {
        if (a.text && a.text.trim()) out.push({ questionId: q.id, textAnswer: a.text.trim() });
      }
    }
    return out;
  }

  const answeredCount = useMemo(() => buildAnswers().length, [answers, form]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = form?.questions.length ?? 0;

  function missingRequired(): boolean {
    if (!form) return false;
    return form.questions.some((q) => {
      if (!q.required) return false;
      const a = answers[q.id] ?? {};
      if (q.type === "RATING") return a.score == null;
      if (q.type === "CHECKBOXES") return !a.checks || a.checks.length === 0;
      return !a.text || !a.text.trim();
    });
  }

  async function save(state: "DRAFT" | "SUBMITTED") {
    if (!id || saving) return;
    if (state === "SUBMITTED" && missingRequired()) {
      Alert.alert("Belum lengkap", "Lengkapi semua pertanyaan wajib sebelum mengirim.");
      return;
    }
    setSaving(state);
    try {
      await submitReview(id, { answers: buildAnswers(), note: note.trim() || null, status: state });
      if (state === "SUBMITTED") { router.back(); }
      else { Alert.alert("Tersimpan", "Draft review berhasil disimpan."); await load(); }
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi");
    } finally { setSaving(null); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>{form?.isSelf ? "Self Review" : "Review"}</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !form ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tugas tidak ditemukan"}</Txt>
          <Button label="Coba lagi" size="md" onPress={() => { setLoading(true); load(); }} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (readOnly ? 40 : 110) }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header info */}
            <Card pad={16} radius={18}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ flex: 1 }}>{form.reviewee.name}</Txt>
                <Pill tone="brand">{methodLabel(form.cycle.method)}</Pill>
              </View>
              {form.reviewee.position ? <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 2 }}>{form.reviewee.position}</Txt> : null}
              <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 6 }}>
                {form.cycle.name}{form.cycle.endDate ? ` · Tenggat ${reviewDateLabel(form.cycle.endDate)}` : ""}
              </Txt>
              {!readOnly ? (
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: "hidden" }}>
                    <View style={{ width: `${total > 0 ? Math.round((answeredCount / total) * 100) : 0}%`, height: "100%", backgroundColor: colors.brand[500], borderRadius: 3 }} />
                  </View>
                  <Txt size={11.5} weight="bold" color={colors.neutral[600]}>{answeredCount}/{total}</Txt>
                </View>
              ) : null}
            </Card>

            {readOnly && form.status === "COMPLETED" ? (
              <Card pad={12} radius={14} style={{ marginTop: 12, backgroundColor: colors.mint[100] }}>
                <Txt size={12.5} weight="semibold" color={colors.mint[700]} style={{ textAlign: "center" }}>Review ini sudah dikirim. Tampilan hanya-baca.</Txt>
              </Card>
            ) : readOnly ? (
              <Card pad={12} radius={14} style={{ marginTop: 12, backgroundColor: colors.amber[100] }}>
                <Txt size={12.5} weight="semibold" color={colors.amber[700]} style={{ textAlign: "center" }}>Siklus belum/atau tidak sedang aktif. Tampilan hanya-baca.</Txt>
              </Card>
            ) : null}

            {/* Pertanyaan */}
            <View style={{ gap: 12, marginTop: 16 }}>
              {form.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={i}
                  ans={answers[q.id] ?? {}}
                  readOnly={readOnly}
                  ratingMin={form.template?.ratingMin ?? 1}
                  ratingMax={form.template?.ratingMax ?? 5}
                  ratingLabels={form.template?.ratingLabels ?? null}
                  onScore={(s) => setAns(q.id, { score: s })}
                  onText={(t) => setAns(q.id, { text: t })}
                  onToggleCheck={(opt) => {
                    const cur = answers[q.id]?.checks ?? [];
                    setAns(q.id, { checks: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] });
                  }}
                  onChoose={(opt) => setAns(q.id, { text: opt })}
                />
              ))}
            </View>

            {/* Catatan umum */}
            {form.template?.allowComments ? (
              <View style={{ marginTop: 16 }}>
                <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginBottom: 8 }}>CATATAN UMUM (OPSIONAL)</Txt>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  editable={!readOnly}
                  placeholder="Tambahkan komentar keseluruhan"
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  style={[fieldStyle, { height: 90, textAlignVertical: "top", opacity: readOnly ? 0.7 : 1 }]}
                />
              </View>
            ) : null}
          </ScrollView>

          {!readOnly ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.neutral[25], flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button label={saving === "DRAFT" ? "…" : "Simpan Draft"} variant="outline" full disabled={!!saving} onPress={() => save("DRAFT")} /></View>
              <View style={{ flex: 1.4 }}><Button label={saving === "SUBMITTED" ? "Mengirim…" : "Kirim Review"} variant="primary" full disabled={!!saving} onPress={() => save("SUBMITTED")} /></View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function QuestionCard({
  q, index, ans, readOnly, ratingMin, ratingMax, ratingLabels, onScore, onText, onToggleCheck, onChoose,
}: {
  q: ReviewQuestion; index: number; ans: { score?: number | null; text?: string; checks?: string[] };
  readOnly: boolean; ratingMin: number; ratingMax: number; ratingLabels: Record<string, string> | null;
  onScore: (s: number) => void; onText: (t: string) => void; onToggleCheck: (opt: string) => void; onChoose: (opt: string) => void;
}) {
  const ratings: number[] = [];
  for (let n = ratingMin; n <= ratingMax; n += 1) ratings.push(n);
  return (
    <Card pad={16} radius={18}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Txt size={13.5} weight="extrabold" color={colors.brand[600]}>{index + 1}.</Txt>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
            <Txt size={13.5} weight="bold" color={colors.neutral[900]} style={{ flex: 1, lineHeight: 19 }}>{q.question}</Txt>
            {q.required ? <Txt size={14} weight="bold" color={colors.rose[500]}>*</Txt> : null}
          </View>
          {q.description ? <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 3, lineHeight: 17 }}>{q.description}</Txt> : null}
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        {q.type === "RATING" ? (
          <>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {ratings.map((n) => {
                const on = ans.score === n;
                return (
                  <Pressable key={n} disabled={readOnly} onPress={() => onScore(n)} style={{ flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.brand[500] : colors.neutral[50], borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[200] }}>
                    <Txt size={15} weight="extrabold" color={on ? "#fff" : colors.neutral[600]}>{n}</Txt>
                  </Pressable>
                );
              })}
            </View>
            {ratingLabels && (ratingLabels[String(ratingMin)] || ratingLabels[String(ratingMax)]) ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Txt size={10.5} color={colors.neutral[400]}>{ratingLabels[String(ratingMin)] ?? ""}</Txt>
                <Txt size={10.5} color={colors.neutral[400]}>{ratingLabels[String(ratingMax)] ?? ""}</Txt>
              </View>
            ) : null}
          </>
        ) : q.type === "PARAGRAPH" ? (
          <TextInput
            value={ans.text ?? ""}
            onChangeText={onText}
            editable={!readOnly}
            placeholder="Tulis jawaban Anda"
            placeholderTextColor={colors.neutral[400]}
            multiline
            style={[fieldStyle, { height: 96, textAlignVertical: "top", opacity: readOnly ? 0.7 : 1 }]}
          />
        ) : q.type === "MULTIPLE_CHOICE" ? (
          <View style={{ gap: 8 }}>
            {(q.options ?? []).map((opt) => {
              const on = ans.text === opt;
              return (
                <Pressable key={opt} disabled={readOnly} onPress={() => onChoose(opt)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[200], backgroundColor: on ? colors.brand[50] : "#fff" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.brand[500] : colors.neutral[300], alignItems: "center", justifyContent: "center" }}>
                    {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand[500] }} /> : null}
                  </View>
                  <Txt size={13.5} weight="semibold" color={colors.neutral[800]} style={{ flex: 1 }}>{opt}</Txt>
                </Pressable>
              );
            })}
          </View>
        ) : (
          // CHECKBOXES
          <View style={{ gap: 8 }}>
            {(q.options ?? []).map((opt) => {
              const on = (ans.checks ?? []).includes(opt);
              return (
                <Pressable key={opt} disabled={readOnly} onPress={() => onToggleCheck(opt)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: on ? colors.brand[500] : colors.neutral[200], backgroundColor: on ? colors.brand[50] : "#fff" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: on ? colors.brand[500] : colors.neutral[300], backgroundColor: on ? colors.brand[500] : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on ? <Icon name="check" size={13} color="#fff" strokeWidth={3} /> : null}
                  </View>
                  <Txt size={13.5} weight="semibold" color={colors.neutral[800]} style={{ flex: 1 }}>{opt}</Txt>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Card>
  );
}

const fieldStyle = {
  backgroundColor: "#fff",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.neutral[200],
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontFamily: fonts.regular,
  fontSize: 14,
  color: colors.neutral[900],
} as const;

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
