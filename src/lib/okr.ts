// OKR Saya — objective + key result milik karyawan, beserta pencatatan progres.
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type KeyResultStatus = "NOT_STARTED" | "DONE" | "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

export interface KeyResultRow {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string; // NUMBER | PERCENT | RUPIAH
  weight: number;
  pct: number;
  status: KeyResultStatus;
}

export interface KeyResultProgressEntry {
  id: string;
  actualValue: number;
  note: string | null;
  createdAt: string | null;
}

export interface KeyResultDetail extends KeyResultRow {
  history: KeyResultProgressEntry[];
}

export interface ObjectiveRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  quarter: string;
  progress: number;
  keyResults: KeyResultRow[];
}

export interface ObjectiveDetail extends Omit<ObjectiveRow, "keyResults"> {
  keyResults: KeyResultDetail[];
}

export interface OkrListResponse {
  quarters: string[];
  summary: { count: number; avgProgress: number } | null;
  objectives: ObjectiveRow[];
}

export interface KrProgressResult {
  success: boolean;
  keyResultStatus: KeyResultStatus;
  keyResultPct: number;
  objectiveProgress: number;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getOkrList() {
  return api<OkrListResponse>("/api/v1/okr/objectives", { auth: true });
}

export function getObjectiveDetail(id: string) {
  return api<ObjectiveDetail>(`/api/v1/okr/objectives/${id}`, { auth: true });
}

export function submitKrProgress(objectiveId: string, body: { keyResultId: string; actualValue: number; note?: string | null }) {
  return api<KrProgressResult>(`/api/v1/okr/objectives/${objectiveId}/progress`, {
    method: "POST",
    auth: true,
    body,
  });
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
export function krStatusMeta(status: KeyResultStatus): { tone: Tone; label: string; color: string } {
  switch (status) {
    case "DONE": return { tone: "mint", label: "Tercapai", color: colors.mint[500] };
    case "ON_TRACK": return { tone: "brand", label: "On track", color: colors.brand[500] };
    case "AT_RISK": return { tone: "amber", label: "Berisiko", color: colors.amber[500] };
    case "OFF_TRACK": return { tone: "rose", label: "Off track", color: colors.rose[500] };
    default: return { tone: "neutral", label: "Belum mulai", color: colors.neutral[400] };
  }
}

export function objectiveProgressColor(pct: number): string {
  if (pct >= 100) return colors.mint[500];
  if (pct >= 70) return colors.brand[500];
  if (pct >= 40) return colors.amber[500];
  return colors.rose[500];
}

/** Format nilai KR sesuai unit (id-ID). */
export function formatKrValue(v: number, unit: string): string {
  switch (unit) {
    case "RUPIAH":
      return "Rp " + v.toLocaleString("id-ID");
    case "PERCENT":
      return `${v.toLocaleString("id-ID")}%`;
    default:
      return v.toLocaleString("id-ID");
  }
}
