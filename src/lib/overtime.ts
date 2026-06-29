// Lembur (overtime) — kebijakan + ringkasan + daftar/detail/ajukan/batal + estimasi upah.
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";
import { colors } from "@/theme/tokens";

export type OvertimeStatus =
  | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "PAID" | "COMPENSATED";

export interface OvertimePolicyOption {
  id: string;
  name: string;
  compensationType: "PAY" | "LEAVE" | string;
  workScheduleDays: number;
  workdayRate1h: number;
  workdayRateNext: number;
  holidayRate1to7: number;
  holidayRate8h: number;
  holidayRateAbove: number;
  leaveExchangeRatio: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minRequestMinutesAhead: number;
  requireAttachment: boolean;
}

export interface OvertimeSummary {
  totalHours: number; // hanya yang sudah disetujui
  approvedPay: number; // total Rp kompensasi (disetujui)
  approvedLeaveHours: number; // total jam cuti kompensasi (disetujui)
}

export interface OvertimeContext {
  policies: OvertimePolicyOption[];
  monthlyWage: number;
  summary: OvertimeSummary | null;
  tzAbbr: string | null;
}

export interface OvertimeRequestRow {
  id: string;
  policyName: string;
  compensationType: string;
  date: string | null;
  startTime: string;
  endTime: string;
  totalHours: number;
  reason: string | null;
  status: OvertimeStatus;
  overtimePay: number | null;
  leaveHours: number | null;
  createdAt: string | null;
  currentStep: number;
  totalSteps: number;
  pendingApprover?: string | null;
}

export interface OvertimeApprovalEntry {
  stepOrder: number;
  approverName: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  decidedAt: string | null;
}

export interface OvertimeStatusLogEntry {
  status: OvertimeStatus;
  note: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface OvertimeRequestDetail extends OvertimeRequestRow {
  attachmentUrl: string | null;
  rejectionNote: string | null;
  approvals: OvertimeApprovalEntry[];
  statusLogs: OvertimeStatusLogEntry[];
  tzAbbr: string | null;
}

export interface OvertimeSubmitBody {
  policyId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24 jam)
  durationHours: number; // jam selesai dihitung server dari mulai + durasi
  reason?: string | null;
  attachmentUrl?: string | null;
}

/** Jam selesai "HH:mm" dari mulai + durasi (wrap 24 jam) — sama dgn server. */
export function addDurationToTime(startTime: string, hours: number): string {
  const [hh, mm] = startTime.split(":").map(Number);
  const endMin = hh * 60 + mm + Math.round(hours * 60);
  return `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getOvertimeContext() {
  return api<OvertimeContext>("/api/v1/overtime/context", { auth: true });
}
export function getOvertimeRequests(status?: OvertimeStatus) {
  const q = status ? `?status=${status}` : "";
  return api<{ requests: OvertimeRequestRow[] }>(`/api/v1/overtime/requests${q}`, { auth: true });
}
export function getOvertimeRequest(id: string) {
  return api<OvertimeRequestDetail>(`/api/v1/overtime/requests/${id}`, { auth: true });
}
export function submitOvertimeRequest(body: OvertimeSubmitBody) {
  return api<{ id: string }>("/api/v1/overtime/requests", { method: "POST", auth: true, body });
}
export function cancelOvertimeRequest(id: string) {
  return api<{ success: boolean }>(`/api/v1/overtime/requests/${id}/cancel`, { method: "POST", auth: true });
}
export async function uploadOvertimeAttachment(uri: string): Promise<string> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    { method: "POST", auth: true, body: { folder: "evidence", contentType: "image/jpeg", fileName: "lembur.jpg", size } },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Gagal mengunggah lampiran (HTTP ${res.status})`);
  return presign.fileUrl;
}

// ── Estimasi upah lembur (mirror lib/overtime-calc.ts server, PP 35/2021) ──────
const OVERTIME_HOURLY_DIVISOR = 173;

/** Hari istirahat mingguan: 5 hari kerja → Sab+Min; 6 hari → Min. (estimasi klien) */
export function isWeeklyRestDay(date: Date, workScheduleDays: number): boolean {
  const dow = date.getDay();
  if (workScheduleDays === 6) return dow === 0;
  return dow === 0 || dow === 6;
}

function overtimeRateHours(h: number, isHoliday: boolean, p: OvertimePolicyOption): number {
  if (h <= 0) return 0;
  if (!isHoliday) {
    const first = Math.min(h, 1);
    const rest = Math.max(0, h - 1);
    return first * p.workdayRate1h + rest * p.workdayRateNext;
  }
  const T = p.workScheduleDays === 6 ? 7 : 8;
  const bulk = Math.min(h, T) * p.holidayRate1to7;
  const transition = h > T ? Math.min(h - T, 1) * p.holidayRate8h : 0;
  const above = h > T + 1 ? (h - (T + 1)) * p.holidayRateAbove : 0;
  return bulk + transition + above;
}

export interface OvertimeEstimate { pay: number | null; leaveHours: number | null }

/** Estimasi kompensasi. monthlyWage = gaji pokok + tunjangan. (final dihitung saat payroll) */
export function estimateOvertime(
  monthlyWage: number,
  p: OvertimePolicyOption,
  totalHours: number,
  isHoliday: boolean,
): OvertimeEstimate {
  if (p.compensationType === "LEAVE") {
    return { pay: null, leaveHours: Math.round(totalHours * p.leaveExchangeRatio * 10) / 10 };
  }
  const hourly = monthlyWage / OVERTIME_HOURLY_DIVISOR;
  return { pay: Math.round(hourly * overtimeRateHours(totalHours, isHoliday, p)), leaveHours: null };
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DOW = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function otDateLabel(iso: string | null, withDow = false): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withDow ? `${DOW[d.getUTCDay()]}, ${base}` : base;
}

/** "26 Jun 2026 · 22:09" dari timestamp (waktu lokal perangkat). */
export function otDateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Durasi "HH:mm"→"HH:mm" jadi "3 jam" / "3j 30m". */
export function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 1440;
  return Math.round((mins / 60) * 100) / 100;
}
export function hoursLabel(h: number): string {
  const whole = Math.floor(h);
  const m = Math.round((h - whole) * 60);
  return m > 0 ? `${whole}j ${m}m` : `${whole} jam`;
}

export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function overtimeStatusPill(status: OvertimeStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "PENDING": return { label: "Menunggu", bg: colors.amber[100], fg: colors.amber[700] };
    case "APPROVED": return { label: "Disetujui", bg: colors.mint[100], fg: colors.mint[700] };
    case "PAID": return { label: "Dibayar", bg: colors.mint[100], fg: colors.mint[700] };
    case "COMPENSATED": return { label: "Jadi cuti", bg: colors.mint[100], fg: colors.mint[700] };
    case "REJECTED": return { label: "Ditolak", bg: colors.coral[100], fg: colors.coral[700] };
    case "CANCELLED": return { label: "Dibatalkan", bg: colors.neutral[100], fg: colors.neutral[600] };
    default: return { label: status, bg: colors.neutral[100], fg: colors.neutral[600] };
  }
}
