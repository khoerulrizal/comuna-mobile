// Reimbursement (klaim) — kategori + aturan + ringkasan + daftar/detail/ajukan/batal.
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";
import { colors } from "@/theme/tokens";

export type ReimburseStatus =
  | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "PAID" | "COMPENSATED";

export interface ReimburseCategory {
  id: string;
  name: string;
  icon: string | null;
  maxPerRequest: number | null;
  maxPerMonth: number | null;
  requireReceipt: boolean;
  usedThisMonth: number; // pemakaian karyawan utk kategori ini bulan berjalan
}

export interface ReimburseSummary {
  totalThisMonth: number; // total terpakai (selain ditolak/dibatalkan)
  paidThisMonth: number;
  pendingThisMonth: number;
  count: number;
}

export interface ReimburseContext {
  categories: ReimburseCategory[];
  monthlyLimit: number | null; // limit umum perusahaan / bulan
  usedThisMonth: number;
  summary: ReimburseSummary;
}

export interface ReimburseRequestRow {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string | null;
  status: ReimburseStatus;
  paymentMethod: string | null;
  createdAt: string | null;
  currentStep: number;
  totalSteps: number;
  pendingApprover?: string | null;
}

export interface ReimburseApprovalEntry {
  stepOrder: number;
  approverName: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  decidedAt: string | null;
}

export interface ReimburseAttachment {
  url: string;
  name: string;
  mimeType: string | null;
}

export interface ReimburseStatusLogEntry {
  status: ReimburseStatus;
  paymentMethod: string | null;
  note: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface ReimburseRequestDetail extends ReimburseRequestRow {
  attachments: ReimburseAttachment[];
  rejectionNote: string | null;
  approvals: ReimburseApprovalEntry[];
  statusLogs: ReimburseStatusLogEntry[];
}

export interface ReimburseSubmitBody {
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string | null;
  attachments?: { url: string; name: string; mimeType?: string | null; sizeBytes?: number | null }[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getReimburseContext() {
  return api<ReimburseContext>("/api/v1/reimbursements/context", { auth: true });
}
export function getReimburseRequests(status?: ReimburseStatus) {
  const q = status ? `?status=${status}` : "";
  return api<{ requests: ReimburseRequestRow[] }>(`/api/v1/reimbursements/requests${q}`, { auth: true });
}
export function getReimburseRequest(id: string) {
  return api<ReimburseRequestDetail>(`/api/v1/reimbursements/requests/${id}`, { auth: true });
}
export function submitReimburseRequest(body: ReimburseSubmitBody) {
  return api<{ id: string }>("/api/v1/reimbursements/requests", { method: "POST", auth: true, body });
}
export function cancelReimburseRequest(id: string) {
  return api<{ success: boolean }>(`/api/v1/reimbursements/requests/${id}/cancel`, { method: "POST", auth: true });
}

/** Unggah satu bukti (foto) ke Spaces via presign; kembalikan metadata lampiran. */
export async function uploadReimburseAttachment(uri: string): Promise<ReimburseAttachment> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    { method: "POST", auth: true, body: { folder: "evidence", contentType: "image/jpeg", fileName: "bukti-reimburse.jpg", size } },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Gagal mengunggah bukti (HTTP ${res.status})`);
  return { url: presign.fileUrl, name: "Bukti", mimeType: "image/jpeg" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function reimburseDateLabel(iso: string | null, long = false): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const m = long ? MONTHS_LONG[d.getUTCMonth()] : MONTHS[d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}

/** "26 Jun 2026 · 22:09" dari timestamp (waktu lokal perangkat). */
export function reimburseDateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function currentMonthLabel(): string {
  const d = new Date();
  return `${MONTHS_LONG[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

/** Ikon + warna kartu per kategori (heuristik nama, ikut gaya desain). */
export function categoryVisual(name: string): { icon: string; color: string; bg: string } {
  const n = name.toLowerCase();
  if (/(transport|transportasi|grab|gojek|taksi|taxi|parkir|bensin|bbm|tol|perjalan|travel)/.test(n))
    return { icon: "car", color: colors.brand[600], bg: colors.brand[100] };
  if (/(makan|meal|konsumsi|lunch|dinner|snack|jamuan)/.test(n))
    return { icon: "money", color: colors.mint[700], bg: colors.mint[100] };
  if (/(sehat|health|obat|medic|dokter|apotek|rumah sakit|klinik)/.test(n))
    return { icon: "heart", color: colors.coral[700], bg: colors.coral[100] };
  if (/(software|langganan|aplikasi|tools|saas|lisensi|license|internet|pulsa|paket data)/.test(n))
    return { icon: "star", color: colors.amber[700], bg: colors.amber[100] };
  if (/(operasional|atk|alat|kantor|office|perlengkapan|supplies)/.test(n))
    return { icon: "doc", color: colors.neutral[600], bg: colors.neutral[100] };
  return { icon: "receipt", color: colors.brand[600], bg: colors.brand[100] };
}

export function reimburseStatusPill(status: ReimburseStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "PENDING": return { label: "Menunggu", bg: colors.amber[100], fg: colors.amber[700] };
    case "APPROVED": return { label: "Disetujui", bg: colors.mint[100], fg: colors.mint[700] };
    case "PAID": return { label: "Dibayar", bg: colors.mint[100], fg: colors.mint[700] };
    case "COMPENSATED": return { label: "Selesai", bg: colors.mint[100], fg: colors.mint[700] };
    case "REJECTED": return { label: "Ditolak", bg: colors.coral[100], fg: colors.coral[700] };
    case "CANCELLED": return { label: "Dibatalkan", bg: colors.neutral[100], fg: colors.neutral[600] };
    default: return { label: status, bg: colors.neutral[100], fg: colors.neutral[600] };
  }
}

export function paymentMethodLabel(m: string | null): string | null {
  if (!m) return null;
  switch (m) {
    case "CASH": return "Tunai";
    case "TRANSFER": return "Transfer bank";
    case "PAYROLL": return "Lewat penggajian";
    default: return m;
  }
}
