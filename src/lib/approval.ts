// Approval manager — daftar (pending/riwayat) + setujui/tolak pengajuan tim.
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type ApprovalKind = "LEAVE" | "OVERTIME" | "REIMBURSEMENT" | "ATTENDANCE";
export type Decision = "APPROVED" | "REJECTED";

export interface ApprovalItem {
  kind: ApprovalKind;
  requestId: string;
  name: string;
  photoUrl: string | null;
  title: string;
  reason: string;
  submittedAt: string | null;
  currentStep: number;
  totalSteps: number;
  // domain detail (opsional)
  days?: number;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  totalHours?: number;
  amount?: number;
  // history
  decision?: string;
  decidedAt?: string | null;
  note?: string | null;
}

export interface ApprovalListResponse {
  hasAccess: boolean;
  items: ApprovalItem[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getApprovals(status: "pending" | "history") {
  return api<ApprovalListResponse>(`/api/v1/manager/approvals?status=${status}`, { auth: true });
}

export function decideApproval(domain: ApprovalKind, requestId: string, decision: Decision, note?: string | null) {
  return api<{ success: boolean }>("/api/v1/manager/approvals/decide", {
    method: "POST",
    auth: true,
    body: { domain, requestId, decision, note: note ?? null },
  });
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
export function approvalTypeMeta(kind: ApprovalKind): { label: string; tone: Tone; icon: "plane" | "clock" | "receipt" | "fingerprint"; color: string } {
  switch (kind) {
    case "LEAVE": return { label: "Cuti", tone: "brand", icon: "plane", color: colors.brand[500] };
    case "OVERTIME": return { label: "Lembur", tone: "amber", icon: "clock", color: colors.amber[500] };
    case "REIMBURSEMENT": return { label: "Reimburse", tone: "mint", icon: "receipt", color: colors.mint[500] };
    default: return { label: "Kehadiran", tone: "coral", icon: "fingerprint", color: colors.coral[500] };
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function dmy(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function hhmm(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const rupiahShort = (n: number) => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1).replace(".0", "")} jt` : `Rp ${n.toLocaleString("id-ID")}`);

/** Ringkasan detail kanan (nilai utama + keterangan) per jenis. */
export function approvalDetail(it: ApprovalItem): { primary: string; secondary: string | null; highlight: boolean } {
  switch (it.kind) {
    case "LEAVE":
      return { primary: `${it.days ?? "-"} hari`, secondary: `${dmy(it.startDate)} – ${dmy(it.endDate)}`, highlight: false };
    case "OVERTIME":
      return { primary: `${it.totalHours ?? "-"} jam`, secondary: `${dmy(it.date)} · ${it.startTime ?? ""}–${it.endTime ?? ""}`, highlight: false };
    case "REIMBURSEMENT":
      return { primary: it.amount != null ? rupiahShort(it.amount) : "-", secondary: dmy(it.date), highlight: true };
    default:
      return { primary: dmy(it.date), secondary: it.startTime ? `${hhmm(it.startTime)}–${hhmm(it.endTime)}` : null, highlight: false };
  }
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function decisionMeta(decision: string | undefined): { label: string; tone: Tone } {
  if (decision === "APPROVED") return { label: "Disetujui", tone: "mint" };
  if (decision === "REJECTED") return { label: "Ditolak", tone: "rose" };
  return { label: "Menunggu", tone: "amber" };
}
