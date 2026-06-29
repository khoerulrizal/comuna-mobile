// Cuti (leave) — saldo + kebijakan + daftar/detail pengajuan + ajukan/batal.
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";
import { colors } from "@/theme/tokens";

export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "PAID"
  | "COMPENSATED";

export interface LeavePolicyOption {
  id: string;
  name: string;
  category: string;
  isPaid: boolean;
  isUnlimited: boolean;
  allowHalfDay: boolean;
  attachmentRequired: boolean;
  maxRequestDays: number | null;
  minRequestDaysAhead: number;
  defaultDays: number;
  policyType: string; // ANNUALLY | ANNIVERSARY | MONTHLY
  remaining: number | null; // sisa kuota (ANNUAL) — null utk kebijakan per-kejadian
  minWorkingMonths: number;
}

/** Subjudul ringkas kebijakan: maks per pengajuan, masa kerja, lampiran, tanpa-upah. */
export function policySubtitle(p: LeavePolicyOption): string {
  const parts: string[] = [];
  if (p.maxRequestDays != null) parts.push(`maks ${p.maxRequestDays} hari`);
  else if (!p.isUnlimited) parts.push(`maks ${p.defaultDays} hari`);
  if (p.minWorkingMonths > 0) parts.push(`min ${p.minWorkingMonths} bln kerja`);
  if (p.attachmentRequired) parts.push("perlu lampiran");
  if (!p.isPaid) parts.push("tanpa upah");
  return parts.join(" · ");
}

/** Batas hari per 1 pengajuan = gabungan maxRequestDays & kuota. null = tanpa batas. */
export function effectiveMaxDays(p: LeavePolicyOption): number | null {
  const caps: number[] = [];
  if (p.maxRequestDays != null) caps.push(p.maxRequestDays);
  if (!p.isUnlimited) caps.push(p.remaining != null ? p.remaining : p.defaultDays);
  return caps.length ? Math.min(...caps) : null;
}

/** Label periode kuota kebijakan. */
export function leavePeriodLabel(t: string): string {
  switch (t) {
    case "ANNUALLY": return "per tahun";
    case "MONTHLY": return "per bulan";
    case "ANNIVERSARY": return "per masa kerja";
    default: return "";
  }
}

export interface LeaveAnnual {
  name: string;
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveContext {
  year: number;
  annual: LeaveAnnual | null;
  policies: LeavePolicyOption[];
}

export interface LeaveRequestRow {
  id: string;
  policyName: string;
  category: string;
  isPaid: boolean;
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
  isHalfDay: boolean;
  status: LeaveStatus;
  reason: string | null;
  createdAt: string | null;
  currentStep: number;
  totalSteps: number;
}

export interface LeaveApprovalEntry {
  stepOrder: number;
  approverName: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  decidedAt: string | null;
}

export interface LeaveStatusLogEntry {
  status: LeaveStatus;
  note: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface LeaveRequestDetail extends LeaveRequestRow {
  halfDaySession: string | null;
  attachmentUrl: string | null;
  rejectionNote: string | null;
  approvals: LeaveApprovalEntry[];
  statusLogs: LeaveStatusLogEntry[];
}

export interface LeaveSubmitBody {
  policyId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
  reason: string;
  attachmentUrl?: string | null;
}

// ── Kebijakan cuti (detail + kuota & pemakaian per periode) ───────────────────
export interface LeavePolicyDetail {
  id: string;
  name: string;
  category: string;
  description: string | null;
  legalBasis: string | null;
  policyType: string; // ANNUALLY | ANNIVERSARY | MONTHLY
  isPaid: boolean;
  isUnlimited: boolean;
  allowHalfDay: boolean;
  halfDayHours: number | null;
  attachmentRequired: boolean;
  allowLeaveDebt: boolean;
  defaultDays: number;
  maxRequestDays: number | null;
  minRequestDaysAhead: number;
  minWorkingMonths: number;
  carryForwardType: string;
  carryForwardMaxDays: number | null;
  carryForwardExpireMonths: number | null;
  autoApproveAfterDays: number | null;
  quota: number | null; // null = tanpa batas
  used: number;
  pending: number;
  remaining: number | null;
  periodLabel: string; // "Tahun 2026" / "Juni 2026"
  quotaPeriodLabel: string; // "per tahun" / "per bulan" / "per masa kerja"
}

export interface LeavePoliciesResponse {
  year: number;
  policies: LeavePolicyDetail[];
}

export function getLeavePolicies() {
  return api<LeavePoliciesResponse>("/api/v1/leave/policies", { auth: true });
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getLeaveContext() {
  return api<LeaveContext>("/api/v1/leave/context", { auth: true });
}

export function getLeaveRequests(status?: LeaveStatus) {
  const q = status ? `?status=${status}` : "";
  return api<{ requests: LeaveRequestRow[] }>(`/api/v1/leave/requests${q}`, { auth: true });
}

export function getLeaveRequest(id: string) {
  return api<LeaveRequestDetail>(`/api/v1/leave/requests/${id}`, { auth: true });
}

export function submitLeaveRequest(body: LeaveSubmitBody) {
  return api<{ id: string }>("/api/v1/leave/requests", { method: "POST", auth: true, body });
}

export function cancelLeaveRequest(id: string) {
  return api<{ success: boolean }>(`/api/v1/leave/requests/${id}/cancel`, {
    method: "POST",
    auth: true,
  });
}

/** Unggah lampiran (foto/dokumen) ke Spaces via presign; kembalikan URL CDN. */
export async function uploadLeaveAttachment(uri: string): Promise<string> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    {
      method: "POST",
      auth: true,
      body: { folder: "evidence", contentType: "image/jpeg", fileName: "lampiran-cuti.jpg", size },
    },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Gagal mengunggah lampiran (HTTP ${res.status})`);
  return presign.fileUrl;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "12 Juni 2026" dari ISO/yyyy-mm-dd (dibaca sebagai tanggal kalender, UTC). */
export function formatLeaveDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "26 Jun 2026 · 22:09" dari timestamp (waktu lokal perangkat). */
export function leaveDateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "12 – 14 Jun 2026" / "12 Jun 2026" bila satu hari. */
export function leaveRangeLabel(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "-";
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : s;
  const sameDay = s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10);
  const sm = MONTHS[s.getUTCMonth()].slice(0, 3);
  const em = MONTHS[e.getUTCMonth()].slice(0, 3);
  if (sameDay) return `${s.getUTCDate()} ${sm} ${s.getUTCFullYear()}`;
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    return `${s.getUTCDate()} – ${e.getUTCDate()} ${em} ${e.getUTCFullYear()}`;
  }
  return `${s.getUTCDate()} ${sm} – ${e.getUTCDate()} ${em} ${e.getUTCFullYear()}`;
}

/** Date → "YYYY-MM-DD" (komponen lokal; dipakai untuk dikirim ke API). */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Jumlah hari kalender inklusif antara dua "YYYY-MM-DD". */
export function inclusiveDays(startYMD: string, endYMD: string): number {
  const s = new Date(startYMD);
  const e = new Date(endYMD);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

/** Ikon + warna kartu per kategori cuti (ikut desain). */
export function leaveCategoryVisual(category: string): { icon: string; color: string; bg: string } {
  switch (category) {
    case "ANNUAL":
    case "LONG_SERVICE":
      return { icon: "plane", color: colors.brand[600], bg: colors.brand[100] };
    case "SICK":
    case "MENSTRUAL":
    case "MISCARRIAGE":
      return { icon: "heart", color: colors.coral[700], bg: colors.coral[100] };
    case "MATERNITY":
    case "PATERNITY":
    case "MARRIAGE":
    case "CHILD_MARRIAGE":
    case "CIRCUMCISION":
      return { icon: "star", color: colors.amber[700], bg: colors.amber[100] };
    case "HAJJ":
    case "UMROH":
    case "BEREAVEMENT":
      return { icon: "calendar", color: colors.mint[700], bg: colors.mint[100] };
    default:
      return { icon: "calendar", color: colors.brand[600], bg: colors.brand[100] };
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  ANNUAL: "Tahunan", LONG_SERVICE: "Masa Kerja Panjang", SICK: "Sakit",
  MENSTRUAL: "Haid", MATERNITY: "Melahirkan", MISCARRIAGE: "Keguguran",
  PATERNITY: "Pendamping", MARRIAGE: "Menikah", CHILD_MARRIAGE: "Menikahkan Anak",
  CIRCUMCISION: "Khitan Anak", BAPTISM: "Baptis Anak", BEREAVEMENT: "Duka Cita",
  HAJJ: "Haji", UMROH: "Umroh", UNPAID: "Tanpa Upah", CUSTOM: "Lainnya",
};
export function leaveCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "Lainnya";
}

/** Pasangan warna pill status (bg/fg) + label — ikut desain. */
export function leaveStatusPill(status: LeaveStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "PENDING":
      return { label: "Menunggu", bg: colors.amber[100], fg: colors.amber[700] };
    case "APPROVED":
      return { label: "Disetujui", bg: colors.mint[100], fg: colors.mint[700] };
    case "REJECTED":
      return { label: "Ditolak", bg: colors.coral[100], fg: colors.coral[700] };
    case "CANCELLED":
      return { label: "Dibatalkan", bg: colors.neutral[100], fg: colors.neutral[600] };
    default:
      return { label: status, bg: colors.neutral[100], fg: colors.neutral[600] };
  }
}

/** Label + tone (Pill) untuk status pengajuan. */
export function leaveStatusMeta(status: LeaveStatus): {
  label: string;
  tone: "amber" | "mint" | "rose" | "neutral";
  color: string;
} {
  switch (status) {
    case "PENDING":
      return { label: "Menunggu", tone: "amber", color: colors.amber[700] };
    case "APPROVED":
      return { label: "Disetujui", tone: "mint", color: colors.mint[700] };
    case "REJECTED":
      return { label: "Ditolak", tone: "rose", color: colors.rose[700] };
    case "CANCELLED":
      return { label: "Dibatalkan", tone: "neutral", color: colors.neutral[600] };
    default:
      return { label: status, tone: "neutral", color: colors.neutral[600] };
  }
}
