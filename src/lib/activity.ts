// Aktivitas kerja harian — timeline + tambah. Kontrak field = activity-types.ts web.
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IconName } from "@/components/ui";

export type ActivityCategory = "MEETING" | "TASK" | "FIELD" | "TRAINING" | "BREAK" | "OTHER";

export interface ActivityAttachment {
  name: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ActivityMetadata {
  title?: string;
  description?: string;
  attachments?: ActivityAttachment[];
  startTime?: string;
  endTime?: string;
  duration?: string;
  recurrence?: string;
  priority?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedHours?: number;
  estimatedMinutes?: number;
  assignee?: string;
  departureTime?: string;
  estimatedReturn?: string;
  destination?: string;
  format?: string;
  sessions?: number;
  materials?: string;
  trainer?: string;
  breakKind?: string;
}

export interface ActivityItem {
  id: string;
  category: ActivityCategory;
  date: string;
  notes: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  metadata: ActivityMetadata;
  createdAt: string;
}

export interface DateChip {
  date: string;
  dow: string;
  dayNum: string;
  isToday: boolean;
}

export interface ClockEntry {
  time: string; // "HH:mm"
  locationLabel: string | null;
  late?: boolean;
  lateMinutes?: number | null;
  photoUrl: string | null;
}
export interface DayAttendance {
  tzAbbr: string | null;
  clockIn: ClockEntry | null;
  clockOut: ClockEntry | null;
}

export interface ActivityList {
  date: string;
  todayDate: string;
  dateChips: DateChip[];
  attendance: DayAttendance | null;
  activities: ActivityItem[];
}

export interface ActivityCreateBody {
  category: ActivityCategory;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  notes?: string;
  metadata?: ActivityMetadata;
  photoUrl?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getActivities(date?: string) {
  const q = date ? `?date=${date}` : "";
  return api<ActivityList>(`/api/v1/activities${q}`, { auth: true });
}
export function createActivity(body: ActivityCreateBody) {
  return api<{ success: boolean; id: string }>("/api/v1/activities", { method: "POST", auth: true, body });
}
export function getActivity(id: string) {
  return api<ActivityItem>(`/api/v1/activities/${id}`, { auth: true });
}

/** Unggah satu lampiran (foto/dokumen) ke Spaces via presign; kembalikan URL CDN.
 * Folder "attachments" (maks 15MB, izinkan pdf/doc/docx + gambar). */
export async function uploadActivityFile(uri: string, opts: { contentType: string; fileName: string }): Promise<string> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    { method: "POST", auth: true, body: { folder: "attachments", contentType: opts.contentType, fileName: opts.fileName, size } },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": opts.contentType, ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Gagal mengunggah lampiran (HTTP ${res.status})`);
  return presign.fileUrl;
}

// ── Meta visual per jenis (mirror desain Corelia) ─────────────────────────────
export interface ActivityTypeMeta {
  value: ActivityCategory;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  bg: string;
}
export const ACTIVITY_TYPES: ActivityTypeMeta[] = [
  { value: "MEETING", label: "Meeting", description: "Pertemuan, diskusi, atau rapat tim", icon: "users", color: colors.brand[600], bg: colors.brand[100] },
  { value: "TASK", label: "Task", description: "Pekerjaan dengan deadline & estimasi", icon: "edit", color: colors.coral[700], bg: colors.coral[100] },
  { value: "FIELD", label: "Field", description: "Kunjungan lapangan ke lokasi/klien", icon: "mapPin", color: colors.amber[700], bg: colors.amber[100] },
  { value: "TRAINING", label: "Training", description: "Pelatihan, workshop, atau sesi belajar", icon: "star", color: colors.mint[700], bg: colors.mint[100] },
  { value: "BREAK", label: "Istirahat", description: "Makan, kopi, salat, atau istirahat lain", icon: "coffee", color: colors.neutral[600], bg: colors.neutral[100] },
  { value: "OTHER", label: "Lainnya", description: "Aktivitas lain di luar kategori utama", icon: "moreV", color: colors.brand[600], bg: colors.brand[100] },
];
export function activityTypeMeta(value: string | null | undefined): ActivityTypeMeta {
  if (!value) return ACTIVITY_TYPES[5];
  return ACTIVITY_TYPES.find((t) => t.value === value.toUpperCase()) ?? ACTIVITY_TYPES[5];
}

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Rendah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HIGH", label: "Tinggi" },
];
export const BREAK_KIND_OPTIONS = [
  { value: "MEAL", label: "Makan" },
  { value: "COFFEE", label: "Coffee Break" },
  { value: "PRAYER", label: "Ibadah" },
  { value: "OTHER", label: "Lainnya" },
];
export const FORMAT_OPTIONS = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "HYBRID", label: "Hybrid" },
];
const PRIORITY_LABEL: Record<string, string> = { HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };
const BREAK_KIND_LABEL: Record<string, string> = { MEAL: "Makan", COFFEE: "Coffee Break", PRAYER: "Ibadah", OTHER: "Lainnya" };
const FORMAT_LABEL: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline / Tatap Muka", HYBRID: "Hybrid" };

export function activityTitle(a: ActivityItem): string {
  return a.metadata.title?.trim() || activityTypeMeta(a.category).label;
}

export function formatEstimasi(md: ActivityMetadata): string | null {
  const h = md.estimatedHours ?? 0;
  const m = md.estimatedMinutes ?? 0;
  if (!h && !m) return null;
  const parts: string[] = [];
  if (h) parts.push(`${h} jam`);
  if (m) parts.push(`${m} menit`);
  return parts.join(" ");
}

/** Jam aktivitas untuk ditampilkan (jam mulai diutamakan). */
export function activityTimeLabel(md: ActivityMetadata): string | null {
  if (md.startTime && md.endTime) return `${md.startTime} – ${md.endTime}`;
  if (md.startTime) return md.startTime;
  if (md.departureTime) return md.departureTime;
  if (md.dueTime) return md.dueTime;
  return null;
}

/** Ringkasan detail spesifik per jenis (mirror buildActivitySummary web). */
export function activitySummary(category: string, md: ActivityMetadata): string {
  const cat = (category ?? "OTHER").toUpperCase();
  const parts: string[] = [];
  const timeRange = md.startTime && md.endTime ? `${md.startTime}–${md.endTime}` : md.startTime ?? null;
  switch (cat) {
    case "MEETING":
      if (timeRange) parts.push(timeRange);
      if (md.duration) parts.push(`Durasi ${md.duration}`);
      if (md.recurrence) parts.push(`Ulang: ${md.recurrence}`);
      break;
    case "TASK":
      if (md.dueDate) {
        const d = new Date(md.dueDate);
        const ds = Number.isNaN(d.getTime()) ? md.dueDate
          : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        parts.push(`Tenggat ${ds}${md.dueTime ? ` ${md.dueTime}` : ""}`);
      }
      { const est = formatEstimasi(md); if (est) parts.push(`Est. ${est}`); }
      if (md.priority && PRIORITY_LABEL[md.priority]) parts.push(`Prioritas ${PRIORITY_LABEL[md.priority]}`);
      if (md.assignee) parts.push(`PIC ${md.assignee}`);
      break;
    case "FIELD":
      if (md.destination) parts.push(md.destination);
      if (md.departureTime) parts.push(`Berangkat ${md.departureTime}`);
      if (md.estimatedReturn) parts.push(`Kembali ${md.estimatedReturn}`);
      break;
    case "TRAINING":
      if (timeRange) parts.push(timeRange);
      if (md.format) parts.push(FORMAT_LABEL[md.format] ?? md.format);
      if (md.trainer) parts.push(`Trainer ${md.trainer}`);
      if (md.materials) parts.push(`Materi: ${md.materials}`);
      break;
    case "BREAK":
      if (timeRange) parts.push(timeRange);
      if (md.breakKind) parts.push(BREAK_KIND_LABEL[md.breakKind] ?? md.breakKind);
      break;
    default:
      if (timeRange) parts.push(timeRange);
  }
  return parts.join(" · ");
}

export function hhmmToMin(v: string | undefined | null): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Total menit kerja tercatat hari itu (Σ end−start; lewat tengah malam di-wrap). */
export function activitiesTotalMinutes(items: ActivityItem[]): number {
  let total = 0;
  for (const a of items) {
    const s = hhmmToMin(a.metadata.startTime);
    const e = hhmmToMin(a.metadata.endTime);
    if (s != null && e != null) { let d = e - s; if (d < 0) d += 1440; total += d; }
  }
  return total;
}

/** "6j 32m" / "45m". */
export function durationLabel(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}j ${m}m`;
  return h ? `${h}j` : `${m}m`;
}
