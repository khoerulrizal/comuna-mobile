// Manager — akses atasan ke BAWAHAN LANGSUNG (Tim Saya + Performa Tim).
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type TeamAttStatus = "in" | "late" | "leave" | "off";

export interface ManagerContext {
  isManager: boolean;
  teamCount: number;
  managerName: string | null;
  departmentName: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
  status: TeamAttStatus;
  hoursToday: string;
  kpi: number;
  okr: number;
}

export interface TeamSummary {
  count: number;
  present: number;
  late: number;
  leave: number;
  avgKpi: number;
  avgOkr: number;
}

export interface TeamListResponse {
  summary: TeamSummary | null;
  members: TeamMember[];
}

export interface RankingMember {
  id: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
  kpi: number;
  okr: number;
  delta?: number | null;
}

/** Band KPI: ≥85 excellent, 70–84 good, <70 risk. */
export function kpiBand(kpi: number): "excellent" | "good" | "risk" {
  if (kpi >= 85) return "excellent";
  if (kpi >= 70) return "good";
  return "risk";
}

export const BAND_META: Record<"excellent" | "good" | "risk", { label: string; color: string; bg: string }> = {
  excellent: { label: "Excellent", color: colors.mint[700], bg: colors.mint[100] },
  good: { label: "Good", color: colors.brand[700], bg: colors.brand[100] },
  risk: { label: "Risk", color: colors.coral[700], bg: colors.coral[100] },
};

export interface TeamOkr {
  title: string;
  ownerName: string;
  krCount: number;
  progress: number;
}

export interface TeamPerformance {
  period: { year: number; month: number };
  summary: { count: number; avgKpi: number; avgOkr: number } | null;
  distribution: { excellent: number; good: number; risk: number };
  review: { done: number; total: number };
  top: RankingMember | null;
  ranking: RankingMember[];
  teamOkr: TeamOkr[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getManagerContext() {
  return api<ManagerContext>("/api/v1/manager/context", { auth: true });
}

export function getTeam() {
  return api<TeamListResponse>("/api/v1/manager/team", { auth: true });
}

export function getTeamPerformance(opts: { year?: number; month?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.year) q.set("year", String(opts.year));
  if (opts.month) q.set("month", String(opts.month));
  const qs = q.toString();
  return api<TeamPerformance>(`/api/v1/manager/team/performance${qs ? `?${qs}` : ""}`, { auth: true });
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
export function attStatusMeta(s: TeamAttStatus): { label: string; tone: Tone; dot: string } {
  switch (s) {
    case "in": return { label: "Hadir", tone: "mint", dot: colors.mint[500] };
    case "late": return { label: "Terlambat", tone: "amber", dot: colors.amber[500] };
    case "leave": return { label: "Cuti", tone: "brand", dot: colors.brand[500] };
    default: return { label: "Libur", tone: "neutral", dot: colors.neutral[400] };
  }
}

/** Warna sesuai band KPI (≥85 excellent, ≥70 good, else risk). */
export function kpiBandColor(kpi: number): string {
  if (kpi >= 85) return colors.mint[500];
  if (kpi >= 70) return colors.brand[600];
  return colors.coral[500];
}

export const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// ── Jadwal Tim ─────────────────────────────────────────────────────────────────
export type ShiftCode = "r" | "w" | "l" | "x" | "o" | "h";

export interface ScheduleDay { ymd: string; dow: string; dayNum: number; isToday: boolean }
export interface ScheduleMember { id: string; name: string; photoUrl: string | null; codes: ShiftCode[] }
export interface RosterItem { id: string; name: string; photoUrl: string | null; code: ShiftCode; timeLabel: string }
export interface TeamSchedule {
  offset: number;
  isCurrentWeek: boolean;
  weekLabel: string;
  days: ScheduleDay[];
  members: ScheduleMember[];
  today: { ymd: string; label: string; roster: RosterItem[] } | null;
}

export function getTeamSchedule(offset: number) {
  return api<TeamSchedule>(`/api/v1/manager/team/schedule?offset=${offset}`, { auth: true });
}

// ── Laporan Tim ────────────────────────────────────────────────────────────────
export type Period = "week" | "month" | "quarter";

export interface ReportMetric {
  value: string;
  delta: string;
  deltaTone: "up" | "down" | "flat";
  sub: string;
  trend: number[];
}

export interface TeamReport {
  periodLabel: string;
  teamSize: number;
  metrics: {
    attendance: ReportMetric;
    overtime: ReportMetric;
    leave: ReportMetric;
    reimburse: ReportMetric;
  } | null;
}

export function getTeamReport(p: { period: Period; year: number; month: number; week: number; quarter: number }) {
  const q = new URLSearchParams({
    period: p.period, year: String(p.year), month: String(p.month), week: String(p.week), quarter: String(p.quarter),
  });
  return api<TeamReport>(`/api/v1/manager/team/report?${q.toString()}`, { auth: true });
}

export const MONTHS_FULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const SHIFT_CODE_META: Record<ShiftCode, { label: string; short: string; bg: string; fg: string }> = {
  r: { label: "Regular", short: "R", bg: colors.brand[100], fg: colors.brand[700] },
  w: { label: "WFH", short: "W", bg: colors.mint[100], fg: colors.mint[700] },
  l: { label: "Cuti", short: "C", bg: colors.coral[100], fg: colors.coral[700] },
  x: { label: "Telat", short: "T", bg: colors.amber[100], fg: colors.amber[700] },
  o: { label: "Off", short: "·", bg: colors.neutral[50], fg: colors.neutral[400] },
  h: { label: "Libur", short: "L", bg: colors.rose[100], fg: colors.rose[700] },
};
