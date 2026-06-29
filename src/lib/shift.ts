// Shift Saya — jadwal 7 hari + rekap bulanan + detail per hari. Read-only.
// Reuse domain web via /api/v1/attendance/shift.
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IconName } from "@/components/ui";

export type ShiftState = "today" | "upcoming" | "off" | "holiday";

export interface Office {
  id: string;
  name: string;
  city: string | null;
}

export interface ScheduleDay {
  date: string; // "YYYY-MM-DD"
  day: string; // "Sen"
  dateNum: string; // "27"
  dateFull: string; // "Sen, 27 Apr"
  state: ShiftState;
  isToday: boolean;
  name: string;
  locationType: string | null; // WFO | WFH | WFA | MULTIPLE | null
  startTime: string | null;
  endTime: string | null;
  durationLabel: string | null;
  location: string; // ringkasan ("Jakarta HQ +2")
  offices: Office[]; // kantor tempat bisa absen (WFO/MULTIPLE)
  officeCount: number;
  note: string | null;
}

export interface ShiftStats {
  totalMinutes: number;
  targetMinutes: number;
  totalLabel: string;
  targetLabel: string;
  overtimeMinutes: number;
  overtimeLabel: string;
  monthProgress: number;
  workedDays: number;
  wfhDays: number;
  offDays: number;
}

export interface ShiftOverview {
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  todayDate: string;
  monthLabel: string;
  today: ScheduleDay;
  upcoming: ScheduleDay[];
  stats: ShiftStats;
}

export interface ShiftTimelineItem {
  time: string;
  label: string;
  kind: "in" | "break" | "event" | "out";
  done: boolean;
}

export interface ShiftLocation {
  name: string;
  address: string | null;
  kind: string; // "office" | "home"
  latitude: number;
  longitude: number;
  radius: number;
}

export interface ShiftDayDetail {
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  date: string;
  dateFull: string;
  state: ShiftState;
  isToday: boolean;
  name: string;
  locationType: string | null;
  startTime: string | null;
  endTime: string | null;
  durationLabel: string | null;
  location: string;
  radius: number | null;
  anywhere: boolean; // WFA — bebas lokasi
  locations: ShiftLocation[];
  timeline: ShiftTimelineItem[];
  holidayName: string | null;
  info: { type: string; manager: string; team: string; code: string | null };
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getShiftOverview() {
  return api<ShiftOverview>("/api/v1/attendance/shift", { auth: true });
}
export function getShiftDay(date: string) {
  return api<ShiftDayDetail>(`/api/v1/attendance/shift/${date}`, { auth: true });
}

// ── Visual meta (mirror desain Corelia) ───────────────────────────────────────
export interface StateHero {
  grad: [string, string];
  badge: string;
}
export function heroMeta(state: ShiftState): StateHero {
  switch (state) {
    case "today": return { grad: [colors.brand[600], colors.coral[500]], badge: "HARI INI" };
    case "holiday": return { grad: [colors.coral[500], colors.amber[500]], badge: "LIBUR NASIONAL" };
    case "off": return { grad: [colors.neutral[700], colors.neutral[500]], badge: "OFF" };
    default: return { grad: [colors.brand[700], colors.brand[500]], badge: "TERJADWAL" };
  }
}

export interface TypeVisual {
  icon: IconName;
  color: string;
  bg: string;
}
/** Ikon/warna baris jadwal — pilih dari locationType + state. */
export function typeVisual(d: { state: ShiftState; locationType: string | null }): TypeVisual {
  if (d.state === "holiday") return { icon: "heart", color: colors.coral[700], bg: colors.coral[100] };
  if (d.state === "off") return { icon: "moon", color: colors.neutral[500], bg: colors.neutral[100] };
  switch (d.locationType) {
    case "WFH": return { icon: "home", color: colors.mint[700], bg: colors.mint[100] };
    case "WFA": return { icon: "globe", color: colors.brand[600], bg: colors.brand[100] };
    default: return { icon: "clock", color: colors.brand[600], bg: colors.brand[100] };
  }
}

export interface StateBadge {
  label: string;
  color: string;
  bg: string;
}
export function stateBadge(d: { state: ShiftState; isToday: boolean }): StateBadge | null {
  if (d.state === "today" || d.isToday) return { label: "Hari ini", color: colors.brand[700], bg: colors.brand[100] };
  if (d.state === "holiday") return { label: "Libur", color: colors.coral[700], bg: colors.coral[100] };
  if (d.state === "off") return { label: "Off", color: colors.neutral[600], bg: colors.neutral[100] };
  return null;
}
