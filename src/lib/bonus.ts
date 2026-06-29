// Bonus & Insentif (employee, read-only) — daftar bonus + ringkasan per tahun.
import { api } from "./api";
import { colors } from "@/theme/tokens";
import type { IconName } from "@/components/ui";

export type BonusType = "PERFORMANCE" | "THR" | "ANNUAL" | "PROJECT" | "REFERRAL" | "OTHER";
export type BonusStatus = "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";

export interface BonusRow {
  id: string;
  type: BonusType;
  name: string;
  categoryName: string | null;
  amount: number;
  period: string; // "YYYY-MM"
  status: BonusStatus;
  paymentMethod: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

export interface BonusStatusLogEntry {
  status: BonusStatus;
  paymentMethod: string | null;
  note: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface BonusDetail {
  id: string;
  type: BonusType;
  name: string;
  categoryName: string | null;
  amount: number;
  pph21: number;
  nett: number;
  period: string;
  status: BonusStatus;
  paymentMethod: string | null;
  notes: string | null;
  employeeName: string | null;
  employeeNumber: string | null;
  department: string | null;
  branch: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
  statusLogs: BonusStatusLogEntry[];
}

export function getBonuses() {
  return api<{ bonuses: BonusRow[] }>("/api/v1/bonus", { auth: true });
}
export function getBonus(id: string) {
  return api<BonusDetail>(`/api/v1/bonus/${id}`, { auth: true });
}

// ── Status & metode ────────────────────────────────────────────────────────────
export function bonusStatusPill(s: BonusStatus): { label: string; bg: string; fg: string } {
  switch (s) {
    case "DRAFT": return { label: "Draft", bg: colors.amber[100], fg: colors.amber[700] };
    case "APPROVED": return { label: "Disetujui", bg: colors.brand[100], fg: colors.brand[700] };
    case "PAID": return { label: "Dibayar", bg: colors.mint[100], fg: colors.mint[700] };
    case "CANCELLED": return { label: "Dibatalkan", bg: colors.neutral[100], fg: colors.neutral[600] };
    default: return { label: s, bg: colors.neutral[100], fg: colors.neutral[600] };
  }
}

export function bonusMethodLabel(m: string | null): string | null {
  if (!m) return null;
  switch (m) {
    case "CASH": return "Tunai";
    case "TRANSFER": return "Transfer bank";
    case "PAYROLL": return "Lewat penggajian";
    default: return m;
  }
}

/** "28 Jun 2026 · 18:56" — tanggal + jam (waktu lokal). */
export function dateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Meta per jenis bonus (ikon + warna + label) ────────────────────────────────
interface TypeMeta { label: string; short: string; icon: IconName; color: string; bg: string }

const TYPE_META: Record<BonusType, TypeMeta> = {
  PERFORMANCE: { label: "Performance", short: "Performance", icon: "star", color: colors.brand[600], bg: colors.brand[100] },
  THR: { label: "Tunjangan Hari Raya", short: "THR", icon: "heart", color: colors.coral[700], bg: colors.coral[100] },
  ANNUAL: { label: "Bonus Tahunan", short: "Tahunan", icon: "calendar", color: colors.amber[700], bg: colors.amber[100] },
  PROJECT: { label: "Bonus Proyek", short: "Proyek", icon: "briefcase", color: colors.mint[700], bg: colors.mint[100] },
  REFERRAL: { label: "Referral Bonus", short: "Referral", icon: "users", color: colors.mint[700], bg: colors.mint[100] },
  OTHER: { label: "Bonus Lainnya", short: "Lainnya", icon: "money", color: colors.neutral[600], bg: colors.neutral[100] },
};

export function bonusTypeMeta(t: BonusType): TypeMeta {
  return TYPE_META[t] ?? TYPE_META.OTHER;
}

// ── Format ─────────────────────────────────────────────────────────────────────
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/** Tahun dari periode "YYYY-MM" (fallback paidAt/createdAt). */
export function bonusYear(b: BonusRow): number {
  const py = Number(b.period?.slice(0, 4));
  if (py) return py;
  const d = b.paidAt ?? b.createdAt;
  return d ? new Date(d).getFullYear() : new Date().getFullYear();
}

/** "Q1 2026" tidak ada di data — pakai bulan periode "Maret 2026". */
export function periodLabel(period: string | null): string {
  if (!period) return "-";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "28 Mar 2026" dari ISO (tanggal kalender). */
export function dayLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Ringkasan per tahun (dihitung di klien) ────────────────────────────────────
export interface TypeStat { type: BonusType; total: number }

export interface YearSummary {
  received: number;     // total PAID tahun ini
  potential: number;    // PAID + APPROVED (akan datang)
  progressPct: number;  // received / potential
  paidCount: number;
  stats: TypeStat[];    // total per jenis (PAID)
  upcoming: BonusRow[]; // APPROVED belum cair
  history: BonusRow[];  // PAID
}

export function summarizeYear(bonuses: BonusRow[], year: number): YearSummary {
  const inYear = bonuses.filter((b) => bonusYear(b) === year);
  const history = inYear.filter((b) => b.status === "PAID");
  const upcoming = inYear.filter((b) => b.status === "APPROVED");

  const received = history.reduce((s, b) => s + b.amount, 0);
  const upcomingTotal = upcoming.reduce((s, b) => s + b.amount, 0);
  const potential = received + upcomingTotal;

  const byType = new Map<BonusType, number>();
  for (const b of history) byType.set(b.type, (byType.get(b.type) ?? 0) + b.amount);
  const stats: TypeStat[] = [...byType.entries()]
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    received,
    potential,
    progressPct: potential > 0 ? Math.round((received / potential) * 100) : 0,
    paidCount: history.length,
    stats,
    upcoming,
    history,
  };
}

/** Daftar tahun yang punya data (desc), selalu sertakan tahun berjalan. */
export function bonusYears(bonuses: BonusRow[]): number[] {
  const set = new Set<number>(bonuses.map(bonusYear));
  set.add(new Date().getFullYear());
  return [...set].sort((a, b) => b - a);
}
