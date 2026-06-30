// KPI Saya — daftar/detail KPI karyawan + pencatatan progres indikator.
// Skor mengikuti model web: bobot rule tertinggi yang terpenuhi / total bobot.
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type KpiStatus = "NOT_STARTED" | "ACTIVE" | "COMPLETED";
export type KpiPeriod = "MONTHLY" | "YEARLY" | string;

export interface KpiAssignmentRow {
  id: string;
  kpiName: string;
  period: KpiPeriod;
  month: number | null;
  year: number;
  deadline: string | null;
  status: KpiStatus;
  scorePct: number;
  indicatorCount: number;
}

export interface KpiSummary {
  count: number;
  avgScore: number;
  completed: number;
  active: number;
}

export interface KpiListResponse {
  years: number[];
  summary: KpiSummary | null;
  assignments: KpiAssignmentRow[];
}

export interface KpiRule {
  comparison: string; // GT | LT | EQ
  target: number;
  weight: number;
}

export interface KpiProgressEntry {
  id: string;
  actualValue: number;
  note: string | null;
  evidenceType: string | null;
  evidenceData: string | null;
  createdAt: string | null;
}

export interface KpiIndicator {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  target: number | null;
  maxValue: number | null;
  rules: KpiRule[];
  latestActual: number | null;
  bestWeight: number;
  maxWeight: number;
  pct: number;
  weightSharePct: number;
  history: KpiProgressEntry[];
}

export interface KpiDetail {
  id: string;
  kpiName: string;
  period: KpiPeriod;
  month: number | null;
  year: number;
  deadline: string | null;
  status: KpiStatus;
  scorePct: number;
  indicators: KpiIndicator[];
  tzAbbr: string | null;
}

export interface KpiProgressBody {
  indicatorId: string;
  actualValue: number;
  note?: string | null;
  evidenceType?: "pdf" | "photo" | "url" | null;
  evidenceData?: string | null;
}

export interface KpiProgressResult {
  success: boolean;
  status: KpiStatus;
  scorePct: number;
  indicatorPct: number;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getKpiList(opts: { status?: KpiStatus; year?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.status) q.set("status", opts.status);
  if (opts.year) q.set("year", String(opts.year));
  const qs = q.toString();
  return api<KpiListResponse>(`/api/v1/kpi/assignments${qs ? `?${qs}` : ""}`, { auth: true });
}

export function getKpiDetail(id: string) {
  return api<KpiDetail>(`/api/v1/kpi/assignments/${id}`, { auth: true });
}

export function submitKpiProgress(id: string, body: KpiProgressBody) {
  return api<KpiProgressResult>(`/api/v1/kpi/assignments/${id}/progress`, {
    method: "POST",
    auth: true,
    body,
  });
}

export async function uploadKpiEvidence(uri: string): Promise<string> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    { method: "POST", auth: true, body: { folder: "evidence", contentType: "image/jpeg", fileName: "kpi.jpg", size } },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Gagal mengunggah bukti (HTTP ${res.status})`);
  return presign.fileUrl;
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
const Q_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const FULL_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Label periode singkat: "Jun 2026" (bulanan) atau "2026" (tahunan). */
export function kpiPeriodLabel(period: KpiPeriod, month: number | null, year: number): string {
  if (period === "MONTHLY" && month && month >= 1 && month <= 12) {
    return `${FULL_MONTHS[month - 1]} ${year}`;
  }
  return `${year}`;
}

/** Label periode ringkas untuk subtitle: "Jun 2026 · 4 indikator". */
export function kpiPeriodShort(period: KpiPeriod, month: number | null, year: number): string {
  if (period === "MONTHLY" && month && month >= 1 && month <= 12) {
    return `${Q_MONTHS[month - 1]} ${year}`;
  }
  return `Tahunan ${year}`;
}

export function kpiStatusPill(status: KpiStatus): { label: string; tone: Tone } {
  switch (status) {
    case "COMPLETED": return { label: "Selesai", tone: "mint" };
    case "ACTIVE": return { label: "Berjalan", tone: "brand" };
    default: return { label: "Belum mulai", tone: "neutral" };
  }
}

/** Status & warna per indikator dari persentase pencapaian (mengikuti tone desain). */
export function indicatorTone(pct: number): { tone: Tone; label: string; color: string } {
  if (pct >= 100) return { tone: "mint", label: "Tercapai", color: colors.mint[500] };
  if (pct > 0) return { tone: "brand", label: "On track", color: colors.brand[500] };
  return { tone: "amber", label: "Belum ada", color: colors.amber[500] };
}

/** Warna progress bar skor keseluruhan. */
export function scoreColor(pct: number): string {
  if (pct >= 100) return colors.mint[500];
  if (pct >= 70) return colors.brand[500];
  if (pct >= 40) return colors.amber[500];
  return colors.rose[500];
}

/** Format nilai sesuai unit indikator (id-ID). */
export function formatKpiValue(v: number | null, unit: string): string {
  if (v === null) return "–";
  switch (unit) {
    case "CURRENCY":
      return "Rp " + v.toLocaleString("id-ID");
    case "PERCENT":
      return `${v.toLocaleString("id-ID")}%`;
    case "DAYS":
      return `${v.toLocaleString("id-ID")} hari`;
    case "HOURS":
      return `${v.toLocaleString("id-ID")} jam`;
    case "SCORE":
      return `${v.toLocaleString("id-ID")} poin`;
    default:
      return v.toLocaleString("id-ID");
  }
}

export function kpiDeadlineLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${FULL_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
