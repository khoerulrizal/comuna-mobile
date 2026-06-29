// Pinjaman (loan) — plafon/batas + daftar/detail + ajukan. Mirror kebijakan web (lib/loan-limit).
import { api } from "./api";
import { colors } from "@/theme/tokens";

export type LoanStatus = "PENDING" | "APPROVED" | "PAID" | "COMPENSATED" | "REJECTED" | "CANCELLED";

export interface LoanContext {
  maxAmount: number;       // batas per pengajuan (0 = belum diatur)
  maxInstallments: number;
  outstanding: number;     // total sisa hutang berjalan
  available: number;       // maxAmount - outstanding (informasi plafon)
  activeCount: number;
  pendingCount: number;
  interestRate: number;    // 0 = tanpa bunga
}

export interface LoanRow {
  id: string;
  amount: number;
  purpose: string | null;
  reason: string | null;
  installments: number;
  status: LoanStatus;
  paidCount: number;
  monthly: number;
  remaining: number;
  disbursedAt: string | null;
  disbursementMethod: string | null;
  dueDate: string | null;
  arrears: boolean;
  createdAt: string | null;
}

export interface LoanInstallmentEntry {
  period: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  paidVia: string | null;
  paidByName: string | null;
}

export interface LoanStatusLogEntry {
  status: LoanStatus;
  method: string | null;
  note: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface LoanDetail {
  id: string;
  amount: number;
  purpose: string | null;
  reason: string | null;
  installments: number;
  status: LoanStatus;
  approvedAt: string | null;
  disbursedAt: string | null;
  disbursementMethod: string | null;
  createdAt: string | null;
  paidCount: number;
  monthly: number;
  totalPaid: number;
  remaining: number;
  startPeriod: string | null;
  endPeriod: string | null;
  nextDuePeriod: string | null;
  nextDueAmount: number | null;
  installmentsList: LoanInstallmentEntry[];
  statusLogs: LoanStatusLogEntry[];
}

export interface LoanSubmitBody {
  amount: number;
  purpose?: string | null;
  reason?: string | null;
  installments: number;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getLoanContext() {
  return api<LoanContext>("/api/v1/loans/context", { auth: true });
}
export function getLoans() {
  return api<{ requests: LoanRow[] }>("/api/v1/loans/requests", { auth: true });
}
export function getLoan(id: string) {
  return api<LoanDetail>(`/api/v1/loans/requests/${id}`, { auth: true });
}
export function submitLoan(body: LoanSubmitBody) {
  return api<{ id: string }>("/api/v1/loans/requests", { method: "POST", auth: true, body });
}

// ── Tujuan pinjaman (kode = Loan.purpose) ──────────────────────────────────────
import type { IconName } from "@/components/ui";

export interface LoanPurposeOption {
  value: string;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
}

export const LOAN_PURPOSES: LoanPurposeOption[] = [
  { value: "RENOVASI", label: "Renovasi rumah", icon: "home", color: colors.brand[600], bg: colors.brand[100] },
  { value: "PENDIDIKAN", label: "Pendidikan", icon: "star", color: colors.amber[700], bg: colors.amber[100] },
  { value: "KESEHATAN", label: "Kesehatan", icon: "heart", color: colors.coral[700], bg: colors.coral[100] },
  { value: "DARURAT", label: "Darurat", icon: "info", color: colors.rose[700], bg: colors.rose[100] },
  { value: "MODAL_USAHA", label: "Modal usaha", icon: "briefcase", color: colors.mint[700], bg: colors.mint[100] },
  { value: "LAINNYA", label: "Lainnya", icon: "moreV", color: colors.neutral[600], bg: colors.neutral[100] },
];

export function purposeOption(value: string | null): LoanPurposeOption | null {
  if (!value) return null;
  return LOAN_PURPOSES.find((p) => p.value === value) ?? null;
}
export function loanPurposeLabel(value: string | null): string {
  return purposeOption(value)?.label ?? (value ?? "-");
}
export function purposeVisual(value: string | null): { icon: IconName; color: string; bg: string } {
  const o = purposeOption(value);
  return o ? { icon: o.icon, color: o.color, bg: o.bg } : { icon: "wallet", color: colors.brand[600], bg: colors.brand[100] };
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/** "2026-04" → "Apr 2026". */
export function periodLabel(period: string | null): string {
  if (!period) return "-";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS[m - 1]} ${y}`;
}

/** "26 Apr 2026 · 22:09" dari timestamp (waktu lokal perangkat). */
export function loanDateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function loanDateLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Pill status pinjaman (memperhitungkan tunggakan untuk pinjaman aktif). */
export function loanStatusPill(status: LoanStatus, arrears = false): { label: string; bg: string; fg: string } {
  switch (status) {
    case "PENDING": return { label: "Menunggu", bg: colors.amber[100], fg: colors.amber[700] };
    case "APPROVED": return { label: "Disetujui", bg: colors.brand[100], fg: colors.brand[700] };
    case "PAID":
      return arrears
        ? { label: "Ada Tunggakan", bg: colors.rose[100], fg: colors.rose[700] }
        : { label: "Aktif", bg: colors.brand[100], fg: colors.brand[700] };
    case "COMPENSATED": return { label: "Lunas", bg: colors.mint[100], fg: colors.mint[700] };
    case "REJECTED": return { label: "Ditolak", bg: colors.coral[100], fg: colors.coral[700] };
    case "CANCELLED": return { label: "Dibatalkan", bg: colors.neutral[100], fg: colors.neutral[600] };
    default: return { label: status, bg: colors.neutral[100], fg: colors.neutral[600] };
  }
}

export function disbursementMethodLabel(m: string | null): string | null {
  if (!m) return null;
  return m === "CASH" ? "Tunai" : m === "TRANSFER" ? "Transfer bank" : m;
}
