// Ringkasan Performa untuk kartu di Home (1 panggilan agregat).
import { api } from "./api";

export interface PerformaSummary {
  available: { kpi: boolean; okr: boolean; feedback: boolean; reviews: boolean };
  kpi: { avgScore: number; kpiCount: number; indicatorCount: number } | null;
  okr: { avgProgress: number; count: number } | null;
  feedback: { unread: number; fromNames: string[] };
  review: { cycleName: string; daysLeft: number | null; progressPct: number; pendingCount: number } | null;
}

export function getPerformaSummary() {
  return api<PerformaSummary>("/api/v1/performa/summary", { auth: true });
}
