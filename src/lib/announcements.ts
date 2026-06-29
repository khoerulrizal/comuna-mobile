// Pengumuman (announcements) — list + detail + konfirmasi baca. Read + confirm.
import { api } from "./api";
import { colors } from "@/theme/tokens";

export interface AnnouncementCategory {
  name: string;
  color: string; // hex
}

export interface AnnouncementListItem {
  id: string;
  title: string;
  excerpt: string;
  bannerUrl: string | null;
  isPinned: boolean;
  requireConfirmation: boolean;
  confirmed: boolean;
  publishedAt: string;
  createdByName: string;
  category: AnnouncementCategory | null;
  attachmentCount: number;
}

export interface AnnouncementAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

export interface AnnouncementDetail {
  id: string;
  title: string;
  content: string; // HTML (rich text)
  bannerUrl: string | null;
  isPinned: boolean;
  requireConfirmation: boolean;
  confirmed: boolean;
  confirmedAt: string | null;
  publishedAt: string;
  expiresAt: string | null;
  createdByName: string;
  category: AnnouncementCategory | null;
  attachments: AnnouncementAttachment[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getAnnouncements(limit?: number) {
  const q = limit ? `?limit=${limit}` : "";
  return api<{ announcements: AnnouncementListItem[] }>(`/api/v1/announcements${q}`, { auth: true });
}
export function getAnnouncement(id: string) {
  return api<AnnouncementDetail>(`/api/v1/announcements/${id}`, { auth: true });
}
export function confirmAnnouncement(id: string, note?: string) {
  return api<{ success: boolean; confirmedAt: string }>(`/api/v1/announcements/${id}/confirm`, {
    method: "POST",
    auth: true,
    body: note ? { note } : {},
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Warna pill kategori (bg lembut + teks) dari hex kategori; fallback brand. */
export function categoryTint(cat: AnnouncementCategory | null): { bg: string; fg: string; label: string } {
  if (!cat) return { bg: colors.neutral[100], fg: colors.neutral[600], label: "Umum" };
  const hex = /^#[0-9a-fA-F]{6}$/.test(cat.color) ? cat.color : colors.brand[500];
  return { bg: `${hex}1A`, fg: hex, label: cat.name };
}

const MM = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "25 Apr" — tanggal ringkas. */
export function announcementShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MM[d.getMonth()]}`;
}

/** "25 Apr 2026 · 14:30" — tanggal lengkap. */
export function announcementFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

/** Ukuran file ringkas. */
export function fileSizeLabel(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
