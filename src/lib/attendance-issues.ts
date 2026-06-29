// Masalah Kehadiran — daftar + detail (read-only). Mirror domain berjenjang web.
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IconName } from "@/components/ui";

export type IssueStatus = "PENDING" | "APPROVED" | "REJECTED";
export type IssueCategory = "missed" | "location" | "tech";

export interface IssueItem {
  id: string;
  issueType: string;
  issueLabel: string;
  category: IssueCategory;
  date: string;
  dateLabel: string;
  status: IssueStatus;
  statusLabel: string;
  reason: string;
  clockIn: string | null;
  clockOut: string | null;
  expected: string | null;
  requestedStatus: string | null;
  submittedAt: string;
  submittedLabel: string;
  currentStep: number;
  totalSteps: number;
  decidedBy: string | null;
  rejectReason: string | null;
}

export interface IssueCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface IssueList {
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  counts: IssueCounts;
  issues: IssueItem[];
}

export interface IssueApproval {
  stepOrder: number;
  approverName: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  decidedAt: string | null;
  decidedLabel: string | null;
  isCurrent: boolean;
}

export interface IssueDetail extends IssueItem {
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  dateFull: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  completedAt: string | null;
  timeline: IssueApproval[];
}

// ── Opsi form koreksi (mirror web ATTENDANCE_ISSUE_TYPES + status) ─────────────
export const ISSUE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "late", label: "Terlambat" },
  { value: "missing_clock", label: "Tidak Clock-in / Clock-out" },
  { value: "outside_radius", label: "Di Luar Radius" },
  { value: "technical_issue", label: "Kendala Teknis" },
  { value: "absent", label: "Absen" },
  { value: "other", label: "Lainnya" },
];
export const ATT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PRESENT", label: "Hadir" },
  { value: "LATE", label: "Terlambat" },
  { value: "ABSENT", label: "Absen" },
  { value: "HOLIDAY", label: "Libur" },
];

export function issueTypeLabelOf(value: string): string {
  return ISSUE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? "Lainnya";
}
export function statusLabelOf(value: string): string {
  return ATT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export interface SubmitIssueInput {
  attendanceId: string;
  issueType: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // HH:mm
  clockOut: string | null;
  status: string | null;
  reason: string;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getIssues(status?: IssueStatus) {
  const q = status ? `?status=${status}` : "";
  return api<IssueList>(`/api/v1/attendance/issues${q}`, { auth: true });
}
export function getIssue(id: string) {
  return api<IssueDetail>(`/api/v1/attendance/issues/${id}`, { auth: true });
}
export function submitIssue(input: SubmitIssueInput) {
  return api<{ success: boolean; id: string }>("/api/v1/attendance/issues", { method: "POST", body: input, auth: true });
}

// ── Visual meta (mirror desain Corelia) ───────────────────────────────────────
export interface StatusMeta { label: string; color: string; bg: string; tone: string; icon: IconName }
export function statusMeta(s: IssueStatus): StatusMeta {
  switch (s) {
    case "APPROVED": return { label: "Disetujui", color: colors.mint[700], bg: colors.mint[100], tone: "mint", icon: "check" };
    case "REJECTED": return { label: "Ditolak", color: colors.coral[700], bg: colors.coral[100], tone: "coral", icon: "close" };
    default: return { label: "Menunggu Persetujuan", color: colors.amber[700], bg: colors.amber[100], tone: "amber", icon: "clock" };
  }
}

export interface CategoryMeta { icon: IconName; color: string; label: string }
export function categoryMeta(c: IssueCategory): CategoryMeta {
  switch (c) {
    case "location": return { icon: "mapPin", color: colors.brand[600], label: "Lokasi" };
    case "tech": return { icon: "info", color: colors.coral[700], label: "Teknis" };
    default: return { icon: "clock", color: colors.amber[700], label: "Kehadiran" };
  }
}
