// Tambah Aktivitas — form per-jenis (judul/deskripsi berborder, field khusus
// per jenis, lampiran foto/dokumen, lokasi pin utk Field) → POST ke web.
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { colors } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import { compressImage } from "@/lib/image";
import {
  ACTIVITY_TYPES, BREAK_KIND_OPTIONS, FORMAT_OPTIONS, PRIORITY_OPTIONS, activityTypeMeta,
  createActivity, uploadActivityFile, type ActivityAttachment, type ActivityCategory, type ActivityMetadata,
} from "@/lib/activity";

const DOW = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MM = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fullDate(d: Date) { return `${DOW[d.getDay()]}, ${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}`; }
function durationOf(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm); if (mins < 0) mins += 1440;
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h && m ? `${h} jam ${m} menit` : h ? `${h} jam` : `${m} menit`;
}

type TimeField = "start" | "end" | "departure" | "return" | "due";
interface PendingAttachment { uri: string; name: string; mimeType: string; isImage: boolean }

const DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export default function TambahAktivitasScreen() {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ActivityCategory>("MEETING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [estimatedReturn, setEstimatedReturn] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);

  const [priority, setPriority] = useState("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [trainer, setTrainer] = useState("");
  const [materials, setMaterials] = useState("");
  const [format, setFormat] = useState("OFFLINE");
  const [breakKind, setBreakKind] = useState("MEAL");
  const [estH, setEstH] = useState("");
  const [estM, setEstM] = useState("");

  // Field — lokasi tujuan (pin + alamat)
  const [fieldLat, setFieldLat] = useState<number | null>(null);
  const [fieldLng, setFieldLng] = useState<number | null>(null);
  const [fieldAddress, setFieldAddress] = useState("");
  const [showLoc, setShowLoc] = useState(false);

  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  const [showDate, setShowDate] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [timeField, setTimeField] = useState<TimeField | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const meta = activityTypeMeta(type);
  const showAttachments = type !== "BREAK";
  const notesRequired = type === "MEETING";

  function timeValue(f: TimeField): string | null {
    return f === "start" ? startTime : f === "end" ? endTime : f === "departure" ? departureTime : f === "return" ? estimatedReturn : dueTime;
  }
  function setTimeValue(f: TimeField, v: string) {
    if (f === "start") setStartTime(v); else if (f === "end") setEndTime(v);
    else if (f === "departure") setDepartureTime(v); else if (f === "return") setEstimatedReturn(v); else setDueTime(v);
  }

  async function pickPhoto() {
    let ImagePicker: typeof import("expo-image-picker");
    try { ImagePicker = await import("expo-image-picker"); }
    catch { Alert.alert("Fitur foto belum aktif", "Memerlukan versi aplikasi terbaru."); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Izin ditolak", "Aktifkan izin di Pengaturan."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.uri) {
      const uri = await compressImage(asset.uri, { width: asset.width });
      setAttachments((p) => [...p, { uri, name: asset.fileName || "foto.jpg", mimeType: "image/jpeg", isImage: true }]);
    }
  }

  async function pickDocument() {
    let DocumentPicker: typeof import("expo-document-picker");
    try { DocumentPicker = await import("expo-document-picker"); }
    catch { Alert.alert("Fitur dokumen belum aktif", "Memerlukan versi aplikasi terbaru."); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true, multiple: false });
    const asset = res.canceled ? null : res.assets?.[0];
    if (asset?.uri) {
      setAttachments((p) => [...p, { uri: asset.uri, name: asset.name || "dokumen", mimeType: asset.mimeType || "application/octet-stream", isImage: false }]);
    }
  }

  function buildMetadata(): ActivityMetadata {
    const md: ActivityMetadata = {};
    const t = title.trim(); if (t) md.title = t;
    const d = description.trim(); if (d) md.description = d;
    switch (type) {
      case "MEETING":
        if (startTime) md.startTime = startTime; if (endTime) md.endTime = endTime;
        { const dur = durationOf(startTime, endTime); if (dur) md.duration = dur; }
        break;
      case "TASK":
        if (dueDate) md.dueDate = ymd(dueDate); if (dueTime) md.dueTime = dueTime;
        if (estH.trim()) md.estimatedHours = Number(estH); if (estM.trim()) md.estimatedMinutes = Number(estM);
        md.priority = priority;
        if (assignee.trim()) md.assignee = assignee.trim();
        break;
      case "FIELD":
        if (departureTime) md.departureTime = departureTime; if (estimatedReturn) md.estimatedReturn = estimatedReturn;
        if (fieldAddress.trim()) md.destination = fieldAddress.trim();
        break;
      case "TRAINING":
        if (startTime) md.startTime = startTime; if (endTime) md.endTime = endTime;
        md.format = format; if (trainer.trim()) md.trainer = trainer.trim(); if (materials.trim()) md.materials = materials.trim();
        break;
      case "BREAK":
        if (startTime) md.startTime = startTime; if (endTime) md.endTime = endTime; md.breakKind = breakKind;
        break;
      default:
        if (startTime) md.startTime = startTime; if (endTime) md.endTime = endTime;
    }
    return md;
  }

  async function submit() {
    if (!title.trim()) { Alert.alert("Judul wajib", "Isi judul aktivitas dulu."); return; }
    if (notesRequired && !notes.trim()) { Alert.alert("Catatan/hasil wajib", "Isi catatan atau hasil meeting."); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const uploaded: ActivityAttachment[] = [];
      for (const att of attachments) {
        const url = await uploadActivityFile(att.uri, { contentType: att.mimeType, fileName: att.name });
        uploaded.push({ name: att.name, url, mimeType: att.mimeType });
      }
      const metadata = buildMetadata();
      if (uploaded.length) metadata.attachments = uploaded;
      await createActivity({
        category: type,
        date: ymd(date),
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        metadata,
        checkInLat: type === "FIELD" ? fieldLat : null,
        checkInLng: type === "FIELD" ? fieldLng : null,
      });
      Alert.alert("Tersimpan", "Aktivitas berhasil dicatat.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal", e instanceof ApiError ? e.message : "Tidak dapat menyimpan aktivitas.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="close" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Tambah Aktivitas</Txt>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        {/* Pemilih jenis */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ACTIVITY_TYPES.map((tp) => {
            const active = type === tp.value;
            return (
              <Pressable key={tp.value} onPress={() => setType(tp.value)} style={{ width: "31.5%", paddingVertical: 12, borderRadius: 14, alignItems: "center", gap: 6, backgroundColor: active ? tp.bg : "#fff", borderWidth: active ? 1.5 : 1, borderColor: active ? tp.color : colors.neutral[100] }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tp.bg, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={tp.icon} size={16} color={tp.color} strokeWidth={2} />
                </View>
                <Txt size={11.5} weight="bold" color={active ? tp.color : colors.neutral[700]}>{tp.label}</Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Judul + deskripsi — form berborder */}
        <SectionTitle>Judul & Deskripsi <Req /></SectionTitle>
        <View style={{ borderWidth: 1.5, borderColor: colors.neutral[200], borderRadius: 16, backgroundColor: "#fff", padding: 14, borderLeftWidth: 4, borderLeftColor: meta.color }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
              <Icon name={meta.icon} size={12} color={meta.color} strokeWidth={2.4} />
            </View>
            <Txt size={10.5} weight="extrabold" color={meta.color} style={{ letterSpacing: 0.5 }}>{meta.label.toUpperCase()}</Txt>
          </View>
          <TextInput value={title} onChangeText={setTitle} placeholder="Judul aktivitas" placeholderTextColor={colors.neutral[400]} style={{ fontSize: 18, fontWeight: "800", color: colors.neutral[900], padding: 0 }} />
          <View style={{ height: 1, backgroundColor: colors.neutral[100], marginVertical: 10 }} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Deskripsi (opsional)" placeholderTextColor={colors.neutral[400]} multiline style={{ fontSize: 13, color: colors.neutral[600], minHeight: 44, textAlignVertical: "top", padding: 0 }} />
        </View>

        {/* Tanggal (semua jenis) */}
        <SectionTitle>Tanggal</SectionTitle>
        <Card pad={0} radius={16}>
          <FieldRow icon="calendar" label={type === "MEETING" ? "Tanggal meeting" : "Tanggal"} value={fullDate(date)} onPress={() => setShowDate(true)} />
        </Card>

        {/* Field per jenis */}
        {type === "MEETING" || type === "TRAINING" || type === "BREAK" || type === "OTHER" ? (
          <>
            <SectionTitle>{type === "OTHER" ? "Waktu (opsional)" : "Waktu"}</SectionTitle>
            <Card pad={0} radius={16}>
              <FieldRow icon="clock" label="Mulai" value={startTime ?? "Pilih"} muted={!startTime} onPress={() => setTimeField("start")} />
              <Divider />
              <FieldRow icon="clock" label="Selesai" value={endTime ?? "Pilih"} sub={durationOf(startTime, endTime) ?? undefined} muted={!endTime} onPress={() => setTimeField("end")} last />
            </Card>
          </>
        ) : null}

        {type === "TRAINING" ? (
          <>
            <SectionTitle>Format</SectionTitle>
            <PillRow options={FORMAT_OPTIONS} selected={format} onSelect={setFormat} accent={meta.color} accentBg={meta.bg} />
            <TextField label="Pemateri (opsional)" value={trainer} onChangeText={setTrainer} placeholder="Nama trainer" />
            <TextField label="Materi (opsional)" value={materials} onChangeText={setMaterials} placeholder="Topik / materi" />
          </>
        ) : null}

        {type === "BREAK" ? (
          <>
            <SectionTitle>Jenis istirahat</SectionTitle>
            <PillRow options={BREAK_KIND_OPTIONS} selected={breakKind} onSelect={setBreakKind} accent={meta.color} accentBg={meta.bg} />
          </>
        ) : null}

        {type === "TASK" ? (
          <>
            <SectionTitle>Deadline</SectionTitle>
            <Card pad={0} radius={16}>
              <FieldRow icon="calendar" label="Tenggat" value={dueDate ? fullDate(dueDate) : "Pilih"} muted={!dueDate} onPress={() => setShowDueDate(true)} />
              <Divider />
              <FieldRow icon="clock" label="Jam" value={dueTime ?? "Pilih"} muted={!dueTime} onPress={() => setTimeField("due")} last />
            </Card>
            <SectionTitle>Estimasi waktu</SectionTitle>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumField label="Jam" value={estH} onChangeText={setEstH} />
              <NumField label="Menit" value={estM} onChangeText={setEstM} />
            </View>
            <SectionTitle>Prioritas</SectionTitle>
            <PillRow options={PRIORITY_OPTIONS} selected={priority} onSelect={setPriority} accent={meta.color} accentBg={meta.bg} />
            <TextField label="Penanggung jawab (opsional)" value={assignee} onChangeText={setAssignee} placeholder="Nama PIC" />
          </>
        ) : null}

        {type === "FIELD" ? (
          <>
            <SectionTitle>Jadwal</SectionTitle>
            <Card pad={0} radius={16}>
              <FieldRow icon="clock" label="Berangkat" value={departureTime ?? "Pilih"} muted={!departureTime} onPress={() => setTimeField("departure")} />
              <Divider />
              <FieldRow icon="clock" label="Estimasi kembali" value={estimatedReturn ?? "Pilih"} muted={!estimatedReturn} onPress={() => setTimeField("return")} last />
            </Card>
            <SectionTitle>Lokasi tujuan</SectionTitle>
            <Pressable onPress={() => setShowLoc(true)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Card pad={14} radius={16} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="mapPin" size={18} color={meta.color} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {fieldAddress ? (
                    <>
                      <Txt size={13} weight="bold" color={colors.neutral[900]} numberOfLines={2}>{fieldAddress}</Txt>
                      <Txt size={10.5} color={colors.neutral[400]} style={{ marginTop: 2 }}>{fieldLat?.toFixed(5)}, {fieldLng?.toFixed(5)}</Txt>
                    </>
                  ) : (
                    <Txt size={13} weight="bold" color={colors.neutral[400]}>Pilih lokasi di peta / cari alamat</Txt>
                  )}
                </View>
                <Icon name="chevronRight" size={16} color={colors.neutral[300]} />
              </Card>
            </Pressable>
          </>
        ) : null}

        {/* Lampiran foto/dokumen (semua kecuali Istirahat) */}
        {showAttachments ? (
          <>
            <SectionTitle>Lampiran foto/dokumen{type === "MEETING" ? " (opsional)" : ""}</SectionTitle>
            <View style={{ gap: 8 }}>
              {attachments.map((att, i) => (
                <Card key={i} pad={12} radius={14} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: att.isImage ? colors.mint[100] : colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Icon name={att.isImage ? "camera" : "doc"} size={18} color={att.isImage ? colors.mint[700] : colors.brand[600]} strokeWidth={2} />
                  </View>
                  <Txt size={13} weight="bold" color={colors.neutral[800]} style={{ flex: 1 }} numberOfLines={1}>{att.name}</Txt>
                  <Pressable onPress={() => setAttachments((p) => p.filter((_, j) => j !== i))} hitSlop={6}><Icon name="trash" size={16} color={colors.rose[700]} strokeWidth={2} /></Pressable>
                </Card>
              ))}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable onPress={pickPhoto} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], borderStyle: "dashed", backgroundColor: "#fff" }}>
                  <Icon name="camera" size={16} color={colors.brand[600]} strokeWidth={2} />
                  <Txt size={12.5} weight="bold" color={colors.brand[600]}>Foto</Txt>
                </Pressable>
                <Pressable onPress={pickDocument} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], borderStyle: "dashed", backgroundColor: "#fff" }}>
                  <Icon name="doc" size={16} color={colors.brand[600]} strokeWidth={2} />
                  <Txt size={12.5} weight="bold" color={colors.brand[600]}>Dokumen</Txt>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {/* Catatan / Hasil */}
        <SectionTitle>{type === "MEETING" ? "Catatan / Hasil" : "Catatan"} {notesRequired ? <Req /> : <Opt />}</SectionTitle>
        <Card pad={4} radius={16} style={notesRequired && !notes.trim() ? { borderWidth: 1.5, borderColor: colors.amber[300] } : undefined}>
          <TextInput value={notes} onChangeText={setNotes} placeholder={type === "MEETING" ? "Hasil / notulen meeting..." : "Catatan tambahan..."} placeholderTextColor={colors.neutral[400]} multiline style={{ minHeight: 80, padding: 12, fontSize: 14, color: colors.neutral[900], textAlignVertical: "top" }} />
        </Card>
      </ScrollView>

      {/* Footer simpan */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={submit} disabled={submitting} style={{ height: 52, borderRadius: 14, backgroundColor: colors.brand[500], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: submitting ? 0.6 : 1 }}>
          <Icon name="check" size={18} color="#fff" strokeWidth={2.6} />
          <Txt size={15} weight="extrabold" color="#fff">{submitting ? "Menyimpan..." : "Simpan Aktivitas"}</Txt>
        </Pressable>
      </View>

      <DatePicker visible={showDate} value={date} title="Tanggal aktivitas" onSelect={(d) => setDate(d)} onClose={() => setShowDate(false)} />
      <DatePicker visible={showDueDate} value={dueDate} title="Tenggat" onSelect={(d) => setDueDate(d)} onClose={() => setShowDueDate(false)} />
      <TimePicker visible={timeField != null} value={timeField ? timeValue(timeField) : null} title="Pilih waktu" onSelect={(t) => { if (timeField) setTimeValue(timeField, t); }} onClose={() => setTimeField(null)} />
      <LocationPickerModal
        visible={showLoc}
        initial={{ lat: fieldLat, lng: fieldLng, address: fieldAddress }}
        onSelect={(loc) => { setFieldLat(loc.lat); setFieldLng(loc.lng); setFieldAddress(loc.address); setShowLoc(false); }}
        onClose={() => setShowLoc(false)}
      />
    </View>
  );
}

function Req() { return <Txt size={12.5} weight="extrabold" color={colors.rose[500]}>*</Txt>; }
function Opt() { return <Txt size={11} weight="semibold" color={colors.neutral[400]}>(opsional)</Txt>; }
function SectionTitle({ children }: { children: ReactNode }) {
  return <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginTop: 18, marginBottom: 8 }}>{children}</Txt>;
}
function Divider() { return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 56 }} />; }

function FieldRow({ icon, label, value, sub, onPress, last, muted }: { icon: IconName; label: string; value: string; sub?: string; onPress: () => void; last?: boolean; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={15} color={colors.brand[600]} strokeWidth={2} />
      </View>
      <Txt size={12.5} weight="semibold" color={colors.neutral[500]} style={{ flex: 1 }}>{label}</Txt>
      <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
        <Txt size={13} weight="bold" color={muted ? colors.neutral[400] : colors.neutral[900]} numberOfLines={1}>{value}</Txt>
        {sub ? <Txt size={10.5} color={colors.neutral[400]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      <Icon name="chevronRight" size={15} color={colors.neutral[300]} />
    </Pressable>
  );
}

function PillRow({ options, selected, onSelect, accent, accentBg }: { options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void; accent: string; accentBg: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === selected;
        return (
          <Pressable key={o.value} onPress={() => onSelect(o.value)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? accentBg : "#fff", borderWidth: on ? 0 : 1, borderColor: colors.neutral[100] }}>
            <Txt size={12.5} weight="bold" color={on ? accent : colors.neutral[600]}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function TextField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <>
      <SectionTitle>{label}</SectionTitle>
      <Card pad={4} radius={14}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.neutral[400]} style={{ padding: 12, fontSize: 14, color: colors.neutral[900] }} />
      </Card>
    </>
  );
}

function NumField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Card pad={4} radius={14}>
        <TextInput value={value} onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ""))} placeholder="0" keyboardType="number-pad" placeholderTextColor={colors.neutral[400]} style={{ padding: 12, fontSize: 16, fontWeight: "700", color: colors.neutral[900], textAlign: "center" }} />
      </Card>
      <Txt size={10.5} weight="semibold" color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 4 }}>{label}</Txt>
    </View>
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
