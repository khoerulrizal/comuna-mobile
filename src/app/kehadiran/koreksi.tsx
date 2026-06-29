// Ajukan Koreksi Kehadiran — form (tipe/tanggal/status/clock in-out/alasan). Mirror dialog web.
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { colors, radii } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import {
  ATT_STATUS_OPTIONS, ISSUE_TYPE_OPTIONS, issueTypeLabelOf, statusLabelOf, submitIssue,
} from "@/lib/attendance-issues";

const MM = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fmtDate(d: Date) { return `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}`; }
function parseYmd(s: string | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); }
  return new Date();
}

export default function KoreksiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    attendanceId?: string; date?: string; clockIn?: string; clockOut?: string; status?: string; issueType?: string;
  }>();

  const [issueType, setIssueType] = useState(params.issueType || "late");
  const [date, setDate] = useState<Date>(() => parseYmd(params.date));
  const [status, setStatus] = useState(params.status || "PRESENT");
  const [clockIn, setClockIn] = useState<string | null>(params.clockIn || null);
  const [clockOut, setClockOut] = useState<string | null>(params.clockOut || null);
  const [reason, setReason] = useState("");

  const [showType, setShowType] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => !!params.attendanceId && reason.trim().length >= 3, [params.attendanceId, reason]);

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await submitIssue({
        attendanceId: params.attendanceId!,
        issueType,
        date: ymd(date),
        clockIn,
        clockOut,
        status,
        reason: reason.trim(),
      });
      Alert.alert("Berhasil", "Pengajuan koreksi terkirim dan menunggu persetujuan.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal", e instanceof ApiError ? e.message : "Tidak dapat mengirim pengajuan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="close" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Ajukan Koreksi</Txt>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <Txt size={12.5} color={colors.neutral[500]} style={{ marginBottom: 14, lineHeight: 18 }}>
          Pengajuan akan diproses sesuai workflow yang dikonfigurasi perusahaan.
        </Txt>

        <Card pad={0} radius={18}>
          <Field label="Tipe Masalah" value={issueTypeLabelOf(issueType)} icon="info" onPress={() => setShowType(true)} />
          <Divider />
          <Field label="Tanggal" value={fmtDate(date)} icon="calendar" onPress={() => setShowDate(true)} />
          <Divider />
          <Field label="Status" value={statusLabelOf(status)} icon="check" onPress={() => setShowStatus(true)} />
          <Divider />
          <Field label="Clock In" value={clockIn ?? "Pilih"} icon="clock" onPress={() => setShowIn(true)} muted={!clockIn} />
          <Divider />
          <Field label="Clock Out" value={clockOut ?? "Pilih"} icon="clock" onPress={() => setShowOut(true)} muted={!clockOut} last />
        </Card>

        <Txt size={13} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>
          Alasan <Txt size={13} weight="extrabold" color={colors.rose[500]}>*</Txt>
        </Txt>
        <Card pad={4} radius={16}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Jelaskan alasan koreksi..."
            placeholderTextColor={colors.neutral[400]}
            multiline
            style={{ minHeight: 96, padding: 12, fontSize: 14, color: colors.neutral[900], textAlignVertical: "top" }}
          />
        </Card>
        {reason.trim().length > 0 && reason.trim().length < 3 ? (
          <Txt size={11} color={colors.rose[700]} style={{ marginTop: 6 }}>Alasan minimal 3 karakter.</Txt>
        ) : null}
      </ScrollView>

      {/* Footer aksi */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, flexDirection: "row", gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], alignItems: "center", justifyContent: "center" }}>
          <Txt size={14.5} weight="bold" color={colors.neutral[700]}>Batal</Txt>
        </Pressable>
        <Pressable onPress={submit} disabled={!valid || submitting} style={{ flex: 1.6, height: 50, borderRadius: 14, backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center", opacity: !valid || submitting ? 0.5 : 1 }}>
          <Txt size={14.5} weight="extrabold" color="#fff">{submitting ? "Mengirim..." : "Kirim Pengajuan"}</Txt>
        </Pressable>
      </View>

      {/* Pickers */}
      <OptionSheet visible={showType} title="Tipe Masalah" options={ISSUE_TYPE_OPTIONS} selected={issueType} onSelect={(v) => { setIssueType(v); setShowType(false); }} onClose={() => setShowType(false)} insetBottom={insets.bottom} />
      <OptionSheet visible={showStatus} title="Status" options={ATT_STATUS_OPTIONS} selected={status} onSelect={(v) => { setStatus(v); setShowStatus(false); }} onClose={() => setShowStatus(false)} insetBottom={insets.bottom} />
      <DatePicker visible={showDate} value={date} title="Tanggal" onSelect={(d) => setDate(d)} onClose={() => setShowDate(false)} />
      <TimePicker visible={showIn} value={clockIn} title="Clock In" onSelect={(t) => setClockIn(t)} onClose={() => setShowIn(false)} />
      <TimePicker visible={showOut} value={clockOut} title="Clock Out" onSelect={(t) => setClockOut(t)} onClose={() => setShowOut(false)} />
    </View>
  );
}

function Field({ label, value, icon, onPress, last, muted }: { label: string; value: string; icon: IconName; onPress: () => void; last?: boolean; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color={colors.brand[600]} strokeWidth={2} />
      </View>
      <Txt size={13} weight="semibold" color={colors.neutral[500]} style={{ flex: 1 }}>{label}</Txt>
      <Txt size={13.5} weight="bold" color={muted ? colors.neutral[400] : colors.neutral[900]}>{value}</Txt>
      <Icon name="chevronRight" size={15} color={colors.neutral[300]} />
    </Pressable>
  );
}
function Divider() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 60 }} />; }

function OptionSheet({ visible, title, options, selected, onSelect, onClose, insetBottom }: {
  visible: boolean; title: string; options: { value: string; label: string }[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void; insetBottom: number;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "flex-end" }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: 16, paddingBottom: insetBottom + 12 }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ paddingHorizontal: 16, marginBottom: 8 }}>{title}</Txt>
          {options.map((o) => {
            const on = o.value === selected;
            return (
              <Pressable key={o.value} onPress={() => onSelect(o.value)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.brand[500] : colors.neutral[200], backgroundColor: on ? colors.brand[500] : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}
                </View>
                <Txt size={14} weight={on ? "bold" : "medium"} color={on ? colors.neutral[900] : colors.neutral[700]}>{o.label}</Txt>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
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
