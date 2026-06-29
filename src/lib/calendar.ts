// Kalender Perusahaan (employee) — daftar acara bulanan + detail + RSVP.
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IconName } from "@/components/ui";

export type RsvpResponse = "YES" | "MAYBE" | "NO";
export type EventKind = "event" | "holiday";

export interface CalEvent {
  id: string;
  kind: EventKind;
  category: string; // holiday|company|training|social|deadline
  type: string;
  title: string;
  startDate: string | null; // ISO (date)
  endDate: string | null;
  startTime: string | null; // "HH:mm"
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  color: string;
  createdByName: string | null;
  scopeLabel: string | null;
}

export interface RsvpCounts { yes: number; maybe: number; no: number; total: number }

export interface CalEventDetail {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  color: string;
  createdByName: string | null;
  scopeLabel: string | null;
  rsvpEnabled: boolean;
  rsvp: RsvpCounts;
  myRsvp: RsvpResponse | null;
  tzAbbr: string | null;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getCalendar(month: string) {
  return api<{ month: string; events: CalEvent[]; tzAbbr: string | null }>(`/api/v1/calendar?month=${month}`, { auth: true });
}
export function getCalendarEvent(id: string) {
  return api<CalEventDetail>(`/api/v1/calendar/${id}`, { auth: true });
}
export function setRsvp(id: string, response: RsvpResponse | null) {
  return api<{ myRsvp: RsvpResponse | null }>(`/api/v1/calendar/${id}/rsvp`, { method: "POST", auth: true, body: { response } });
}

// ── Kategori (warna/label/ikon) ────────────────────────────────────────────────
export interface CatMeta { label: string; bg: string; fg: string; dot: string; icon: IconName }

const CAT: Record<string, CatMeta> = {
  holiday: { label: "Libur Nasional", bg: colors.rose[100], fg: colors.rose[700], dot: colors.rose[500], icon: "star" },
  company: { label: "Acara Perusahaan", bg: colors.brand[100], fg: colors.brand[700], dot: colors.brand[500], icon: "briefcase" },
  training: { label: "Training", bg: colors.amber[100], fg: colors.amber[700], dot: colors.amber[500], icon: "doc" },
  social: { label: "Sosial", bg: colors.mint[100], fg: colors.mint[700], dot: colors.mint[500], icon: "users" },
  deadline: { label: "Deadline", bg: colors.coral[100], fg: colors.coral[700], dot: colors.coral[500], icon: "target" },
};
export const CATEGORIES = Object.entries(CAT).map(([key, v]) => ({ key, ...v }));
export function catMeta(category: string): CatMeta {
  return CAT[category] ?? CAT.company;
}

// ── Format ─────────────────────────────────────────────────────────────────────
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DOW_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function dayOf(iso: string | null): number {
  return iso ? Number(iso.slice(8, 10)) : 0;
}
export function dowOf(iso: string | null): number {
  if (!iso) return 0;
  return new Date(iso).getUTCDay();
}
export function monthShortOf(iso: string | null): string {
  if (!iso) return "";
  return MONTHS_SHORT[Number(iso.slice(5, 7)) - 1];
}
export function fullDateLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${DOW_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function dayNameOf(iso: string | null): string {
  if (!iso) return "";
  return DOW_LONG[new Date(iso).getUTCDay()];
}

export function timeLabel(e: { isAllDay: boolean; startTime: string | null; endTime: string | null }): string {
  if (e.isAllDay) return "Sepanjang hari";
  if (e.startTime && e.endTime) return `${e.startTime} – ${e.endTime}`;
  return e.startTime ?? "—";
}

export interface WeekRange { key: string; label: string; sub: string; startDay: number; endDay: number }

/** Bagi bulan menjadi minggu kalender (baris grid, Minggu–Sabtu) untuk filter. */
export function monthWeeks(month: string): WeekRange[] {
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ms = MONTHS_SHORT[m - 1];
  const weeks: WeekRange[] = [];
  let start = 1;
  let n = 1;
  // Minggu pertama berakhir di Sabtu (panjang = 7 - firstDow).
  let len = 7 - firstDow;
  while (start <= daysInMonth) {
    const end = Math.min(start + len - 1, daysInMonth);
    weeks.push({ key: `w${n}`, label: `Minggu ${n}`, sub: `${start} – ${end} ${ms}`, startDay: start, endDay: end });
    start = end + 1;
    len = 7;
    n++;
  }
  return weeks;
}
