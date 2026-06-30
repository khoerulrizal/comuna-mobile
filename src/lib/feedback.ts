// Feedback — lihat feedback masuk/terkirim + kirim apresiasi/saran ke rekan kerja.
import { api } from "./api";
import { colors, type Tone } from "@/theme/tokens";

export type FeedbackType = "APPRECIATION" | "FEEDBACK";

export const FEEDBACK_CATEGORIES = [
  "Kolaborasi", "Komunikasi", "Eksekusi", "Kualitas", "Leadership", "Inovasi",
] as const;

export interface FeedbackParty {
  name: string;
  position: string | null;
  photoUrl: string | null;
}

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  category: string | null;
  message: string;
  anonymous: boolean;
  readAt: string | null;
  createdAt: string | null;
  counterpart: FeedbackParty;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  unread: number;
}

export interface Recipient {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  photoUrl: string | null;
}

export interface SendFeedbackBody {
  toEmployeeId: string;
  type: FeedbackType;
  category?: string | null;
  message: string;
  anonymous: boolean;
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getFeedbacks(box: "inbox" | "sent", type?: FeedbackType) {
  const q = new URLSearchParams({ box });
  if (type) q.set("type", type);
  return api<FeedbackListResponse>(`/api/v1/feedbacks?${q.toString()}`, { auth: true });
}

export function getRecipients(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return api<{ recipients: Recipient[] }>(`/api/v1/feedbacks/recipients${qs}`, { auth: true });
}

export function sendFeedback(body: SendFeedbackBody) {
  return api<{ success: boolean; id: string }>("/api/v1/feedbacks", { method: "POST", auth: true, body });
}

export function markFeedbackRead(id: string) {
  return api<{ success: boolean }>(`/api/v1/feedbacks/${id}/read`, { method: "POST", auth: true });
}

// ── Helpers tampilan ───────────────────────────────────────────────────────────
export function feedbackTypeMeta(type: FeedbackType): { label: string; tone: Tone; icon: "heart" | "info"; color: string } {
  return type === "APPRECIATION"
    ? { label: "Apresiasi", tone: "mint", icon: "heart", color: colors.mint[700] }
    : { label: "Saran", tone: "amber", icon: "info", color: colors.amber[700] };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function feedbackTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
