// Kirim Feedback — pilih penerima, jenis (apresiasi/saran), kategori, pesan, anonim.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Card, Icon, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getRecipients, sendFeedback, FEEDBACK_CATEGORIES,
  type FeedbackType, type Recipient,
} from "@/lib/feedback";

export default function KirimFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [type, setType] = useState<FeedbackType>("APPRECIATION");
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [picker, setPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = !!recipient && message.trim().length > 0;

  async function submit() {
    if (!valid || !recipient || submitting) return;
    setSubmitting(true);
    try {
      await sendFeedback({
        toEmployeeId: recipient.id,
        type,
        category,
        message: message.trim(),
        anonymous,
      });
      router.back();
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal mengirim", e instanceof Error ? e.message : "Coba lagi");
    } finally { setSubmitting(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="close" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Kirim Feedback</Txt>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        {/* Penerima */}
        <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginBottom: 8 }}>PENERIMA</Txt>
        <Pressable onPress={() => setPicker(true)}>
          <Card pad={14} radius={16}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {recipient ? (
                recipient.photoUrl ? <Image source={{ uri: recipient.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Avatar name={recipient.name} size={40} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                  <Icon name="user" size={20} color={colors.brand[600]} strokeWidth={2} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold" color={recipient ? colors.neutral[900] : colors.neutral[400]}>{recipient ? recipient.name : "Pilih rekan kerja"}</Txt>
                {recipient?.position ? <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{recipient.position}</Txt> : null}
              </View>
              <Icon name="chevronRight" size={18} color={colors.neutral[300]} strokeWidth={2.2} />
            </View>
          </Card>
        </Pressable>

        {/* Jenis */}
        <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 8 }}>JENIS</Txt>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TypeButton active={type === "APPRECIATION"} onPress={() => setType("APPRECIATION")} icon="heart" label="Apresiasi" tint={colors.mint[500]} />
          <TypeButton active={type === "FEEDBACK"} onPress={() => setType("FEEDBACK")} icon="info" label="Saran" tint={colors.amber[500]} />
        </View>

        {/* Kategori */}
        <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 8 }}>KATEGORI (OPSIONAL)</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {FEEDBACK_CATEGORIES.map((c) => {
            const on = category === c;
            return (
              <Pressable key={c} onPress={() => setCategory(on ? null : c)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: on ? colors.brand[500] : "#fff", borderWidth: on ? 0 : 1, borderColor: colors.neutral[200] }}>
                <Txt size={12.5} weight="semibold" color={on ? "#fff" : colors.neutral[600]}>{c}</Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Pesan */}
        <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 8 }}>PESAN</Txt>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={type === "APPRECIATION" ? "Apresiasi apa yang ingin Anda sampaikan?" : "Saran membangun apa yang ingin Anda berikan?"}
          placeholderTextColor={colors.neutral[400]}
          multiline
          maxLength={2000}
          style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.neutral[900], height: 120, textAlignVertical: "top" }}
        />

        {/* Anonim */}
        <Card pad={14} radius={16} style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.neutral[100], alignItems: "center", justifyContent: "center" }}>
              <Icon name="eye" size={18} color={colors.neutral[600]} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Kirim anonim</Txt>
              <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>Nama Anda tidak ditampilkan ke penerima.</Txt>
            </View>
            <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ false: colors.neutral[200], true: colors.brand[400] }} thumbColor="#fff" />
          </View>
        </Card>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.neutral[25] }}>
        <Button label={submitting ? "Mengirim…" : "Kirim Feedback"} variant="primary" size="lg" full disabled={!valid || submitting} onPress={submit} />
      </View>

      {picker ? <RecipientPicker onClose={() => setPicker(false)} onPick={(r) => { setRecipient(r); setPicker(false); }} /> : null}
    </View>
  );
}

function TypeButton({ active, onPress, icon, label, tint }: { active: boolean; onPress: () => void; icon: "heart" | "info"; label: string; tint: string }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: active ? tint + "1A" : "#fff", borderWidth: 1.5, borderColor: active ? tint : colors.neutral[200] }}>
      <Icon name={icon} size={17} color={active ? tint : colors.neutral[500]} strokeWidth={2.2} />
      <Txt size={13.5} weight="bold" color={active ? tint : colors.neutral[600]}>{label}</Txt>
    </Pressable>
  );
}

function RecipientPicker({ onClose, onPick }: { onClose: () => void; onPick: (r: Recipient) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await getRecipients(query);
      setList(res.recipients);
    } catch { /* abaikan */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(16,13,26,0.45)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: insets.bottom + 12, maxHeight: "80%" }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} />
          </View>
          <Txt size={16} weight="extrabold" color={colors.neutral[900]} style={{ paddingHorizontal: 20 }}>Pilih Penerima</Txt>
          <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.neutral[50], borderRadius: 12, paddingHorizontal: 12 }}>
              <Icon name="search" size={16} color={colors.neutral[400]} strokeWidth={2} />
              <TextInput value={q} onChangeText={setQ} placeholder="Cari nama rekan" placeholderTextColor={colors.neutral[400]} style={{ flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.neutral[900] }} />
            </View>
          </View>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
              {list.length === 0 ? (
                <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center", paddingVertical: 30 }}>Tidak ada rekan ditemukan.</Txt>
              ) : list.map((r) => (
                <Pressable key={r.id} onPress={() => onPick(r)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: pressed ? colors.neutral[50] : "transparent" })}>
                  {r.photoUrl ? <Image source={{ uri: r.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Avatar name={r.name} size={40} />}
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="bold" color={colors.neutral[900]}>{r.name}</Txt>
                    <Txt size={11.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{[r.position, r.department].filter(Boolean).join(" · ") || "—"}</Txt>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
