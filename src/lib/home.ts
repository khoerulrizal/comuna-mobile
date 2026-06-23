// Ringkasan Home (profil + shift hari ini) dari API aman comuna-web.
import { api } from "./api";

export interface HomeOffice {
  id: string;
  name: string;
  city: string | null;
}

export interface HomeShift {
  id: string;
  name: string;
  locationType: "WFO" | "WFH" | "WFA" | "MULTIPLE";
  /** Label lokasi untuk WFH/WFA; null untuk WFO/MULTIPLE (pakai offices). */
  locationLabel: string | null;
  isWorkingDay: boolean;
  holidayName: string | null; // nama libur nasional bila hari ini libur
  dayLabel: string;
  startTime: string | null; // "HH:mm"
  endTime: string | null;
  timezone: string;
  tzAbbr: string | null; // WIB | WITA | WIT | null
  offices: HomeOffice[];
  officeCount: number;
}

export type AttendanceStatus = "BEFORE_CLOCKIN" | "CLOCKED_IN" | "DONE";

export interface HomeToday {
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
  serverEpochMs: number;
  clockIn: string | null; // ISO
  clockOut: string | null; // ISO
  attendanceStatus: AttendanceStatus;
  breakMinutes: number;
  targetMinutes: number | null; // null bila bukan hari kerja
  workedMinutes: number | null; // null bila belum clock-out
}

export interface Home {
  profile: {
    fullName: string;
    firstName: string;
    photoUrl: string | null;
    greeting: string;
  };
  shift: HomeShift | null;
  today: HomeToday;
}

export async function getHome(): Promise<Home> {
  return api<Home>("/api/v1/home", { auth: true });
}

// ── Helper waktu (zona shift, tanpa Intl) ──────────────────────────────────
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const p2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Komponen wall-clock di zona ber-offset (Indonesia tanpa DST). */
function wall(epochMs: number, offsetMin: number) {
  const d = new Date(epochMs + offsetMin * 60000);
  return {
    h: d.getUTCHours(),
    m: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    dow: d.getUTCDay(),
    date: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
  };
}

/** "HH:mm:ss" waktu sekarang di zona shift. */
export function liveClock(epochMs: number, offsetMin: number): string {
  const w = wall(epochMs, offsetMin);
  return `${p2(w.h)}:${p2(w.m)}:${p2(w.s)}`;
}

/** "Hari ini, Senin 06 Juni 2026". */
export function dateLabel(epochMs: number, offsetMin: number): string {
  const w = wall(epochMs, offsetMin);
  return `Hari ini, ${HARI[w.dow]} ${p2(w.date)} ${BULAN[w.month]} ${w.year}`;
}

/** ISO → "HH:mm:ss" di zona shift (null bila kosong). */
export function timeHMS(iso: string | null, offsetMin: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const w = wall(t, offsetMin);
  return `${p2(w.h)}:${p2(w.m)}:${p2(w.s)}`;
}

/** Menit → "8j 30m" / "8j" / "30m". */
export function formatDuration(min: number | null): string | null {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}j ${m}m`;
  if (h > 0) return `${h}j`;
  return `${m}m`;
}

/** Ringkas lokasi clock untuk ditampilkan di satu baris. */
export function clockLocationSummary(shift: HomeShift): {
  text: string;
  extra: number; // jumlah kantor tersembunyi (0 bila tidak ada)
} {
  if (shift.locationType === "WFA") return { text: "Di mana saja", extra: 0 };
  if (shift.locationType === "WFH") return { text: "Di Rumah", extra: 0 };
  if (shift.locationLabel) return { text: shift.locationLabel, extra: 0 };
  const names = shift.offices.map((o) => o.name);
  if (names.length === 0) return { text: "—", extra: 0 };
  if (names.length <= 3) return { text: names.join(" · "), extra: 0 };
  return { text: names.slice(0, 3).join(" · "), extra: names.length - 3 };
}
