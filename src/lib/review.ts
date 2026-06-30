// Review — tugas penilaian (self & reviewer) yang harus diisi karyawan.
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type ParticipantStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type QuestionType = "RATING" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOXES";

export interface ReviewTask {
  participantId: string;
  isSelf: boolean;
  cycleId: string;
  cycleName: string;
  method: string;
  cycleStatus: string;
  fillable: boolean;
  endDate: string | null;
  status: ParticipantStatus;
  revieweeName: string;
  revieweePosition: string | null;
  totalQuestions: number;
  answered: number;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  options: string[] | null;
  score: number | null;
  textAnswer: string | null;
}

export interface ReviewForm {
  participantId: string;
  isSelf: boolean;
  status: ParticipantStatus;
  fillable: boolean;
  cycle: { id: string; name: string; method: string; endDate: string | null };
  reviewee: { name: string; position: string | null };
  template: {
    name: string;
    ratingMin: number;
    ratingMax: number;
    ratingLabels: Record<string, string> | null;
    allowComments: boolean;
  } | null;
  note: string | null;
  questions: ReviewQuestion[];
}

export interface SubmitAnswer {
  questionId: string;
  score?: number | null;
  textAnswer?: string | null;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getReviewTasks() {
  return api<{ tasks: ReviewTask[] }>("/api/v1/reviews/tasks", { auth: true });
}

export function getReviewForm(participantId: string) {
  return api<ReviewForm>(`/api/v1/reviews/tasks/${participantId}`, { auth: true });
}

export function submitReview(
  participantId: string,
  body: { answers: SubmitAnswer[]; note?: string | null; status: "DRAFT" | "SUBMITTED" },
) {
  return api<{ success: boolean; status: ParticipantStatus }>(
    `/api/v1/reviews/tasks/${participantId}/submit`,
    { method: "POST", auth: true, body },
  );
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
export function reviewStatusMeta(status: ParticipantStatus): { label: string; tone: Tone } {
  switch (status) {
    case "COMPLETED": return { label: "Selesai", tone: "mint" };
    case "IN_PROGRESS": return { label: "Berlangsung", tone: "amber" };
    default: return { label: "Belum mulai", tone: "neutral" };
  }
}

export function methodLabel(method: string): string {
  switch (method) {
    case "360": return "360°";
    case "MANAGER": return "Manager";
    case "SELF": return "Self";
    case "PEER": return "Peer";
    default: return method;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function reviewDateLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Sisa hari menuju tenggat (UTC date). */
export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
