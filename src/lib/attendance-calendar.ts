// Kehadiran — kalender bulanan + detail per hari (read-only). Terpisah dari
// lib/attendance.ts (alur clock-in/out).
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IssueApproval, IssueCategory, IssueStatus } from "./attendance-issues";

/** Pengajuan koreksi terakhir untuk satu kehadiran (dari /attendance/day). */
export interface DayCorrection {
  id: string;
  issueType: string;
  issueLabel: string;
  category: IssueCategory;
  status: IssueStatus;
  statusLabel: string;
  currentStep: number;
  totalSteps: number;
  reason: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  requestedStatus: string | null;
  submittedAt: string;
  submittedLabel: string;
  timeline: IssueApproval[];
}

export type AttStatus = "present" | "late" | "leave" | "absent" | "holiday" | "off" | "future";

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  status: AttStatus;
  isToday: boolean;
  clockIn: string | null;
  clockOut: string | null;
  workingHours: number | null;
  holidayName: string | null;
}

export interface CalendarSummary {
  workMinutes: number;
  overtimeMinutes: number;
  avgInMinutes: number | null;
  avgOutMinutes: number | null;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

export interface AttendanceCalendar {
  month: string;
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  shift: { name: string; startTime: string; endTime: string; locationType: string } | null;
  issueCount: number;
  days: CalendarDay[];
  summary: CalendarSummary;
}

export interface ClockPunch {
  time: string | null;
  lat: number | null;
  lng: number | null;
  locationLabel: string | null;
  distanceMeters: number | null;
  refLat: number | null;
  refLng: number | null;
  refName: string | null;
  refRadius: number | null;
  photo: string | null;
  note: string | null;
  faceScore: number | null;
  facePassed: boolean | null;
}

export interface AttendanceDay {
  date: string;
  status: AttStatus;
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  shift: { name: string; startTime: string | null; endTime: string | null; locationType: string | null } | null;
  workingHours: number | null;
  lateMinutes: number | null;
  clockIn: ClockPunch | null;
  clockOut: ClockPunch | null;
  leave: { policyName: string | null; reason: string | null } | null;
  holidayName: string | null;
  attendanceId: string | null;
  attendanceStatus: string | null;
  canSubmitCorrection: boolean;
  correction: DayCorrection | null;
}

/** Ringkasan kehadiran bulanan (kartu Home). */
export interface AttendanceStats {
  month: string;
  monthLabel: string;
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  present: number;
  late: number;
  leave: number;
  absent: number;
  workMinutes: number;
  targetMinutes: number;
  workLabel: string;
  targetLabel: string;
  progress: number;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getAttendanceCalendar(month: string) {
  return api<AttendanceCalendar>(`/api/v1/attendance/calendar?month=${month}`, { auth: true });
}
export function getAttendanceStats(month?: string) {
  const q = month ? `?month=${month}` : "";
  return api<AttendanceStats>(`/api/v1/attendance/stats${q}`, { auth: true });
}
export function getAttendanceDay(date: string) {
  return api<AttendanceDay>(`/api/v1/attendance/day/${date}`, { auth: true });
}

// ── Status meta (warna kalender) ───────────────────────────────────────────────
export interface StatusVisual { bg: string; fg: string; dot: string | null; hollow?: boolean }

export function statusVisual(s: AttStatus): StatusVisual {
  switch (s) {
    case "present": return { bg: colors.mint[100], fg: colors.mint[700], dot: colors.mint[500] };
    case "late": return { bg: colors.amber[100], fg: colors.amber[700], dot: colors.amber[500] };
    case "leave": return { bg: colors.brand[100], fg: colors.brand[700], dot: colors.brand[500] };
    case "absent": return { bg: colors.rose[100], fg: colors.rose[700], dot: colors.rose[500] };
    case "holiday": return { bg: "transparent", fg: colors.neutral[400], dot: null, hollow: true };
    case "off": return { bg: "transparent", fg: colors.neutral[400], dot: null };
    default: return { bg: "transparent", fg: colors.neutral[300], dot: null }; // future
  }
}

export function statusLabel(s: AttStatus): string {
  switch (s) {
    case "present": return "Hadir";
    case "late": return "Terlambat";
    case "leave": return "Cuti";
    case "absent": return "Absen";
    case "holiday": return "Libur";
    case "off": return "Libur";
    default: return "Belum tercatat";
  }
}

// ── Format ─────────────────────────────────────────────────────────────────────
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DOW_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Geser bulan "YYYY-MM" ±n. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Day-of-week (0=Min..6=Sab) dari "YYYY-MM-DD". */
export function dowOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

/** "Kamis, 23 April 2026". */
export function fullDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DOW_LONG[dowOf(date)]}, ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export function minutesToHHmm(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "162j 14m" dari menit. */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

/** Jam:menit lokal (zona perusahaan) dari ISO + offset menit. */
export function timeFromIso(iso: string | null, tzOffsetMinutes: number): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const local = (((utcMin + tzOffsetMinutes) % 1440) + 1440) % 1440;
  return minutesToHHmm(local);
}
