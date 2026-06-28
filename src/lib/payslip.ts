// Slip Gaji (payslip) — daftar per periode + detail rincian pendapatan/potongan.
import { api } from "./api";
import { colors } from "@/theme/tokens";

export type TransferStatus = "PENDING" | "TRANSFERRED" | "FAILED";

export interface PayslipRow {
  id: string;
  period: string; // "YYYY-MM"
  periodStart: string | null;
  periodEnd: string | null;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  taxAmount: number;
  transferStatus: TransferStatus;
  transferDate: string | null;
}

export interface PayslipItem {
  id: string;
  type: string; // "BENEFIT" | "DEDUCTION" | "EARNING" | "TAX"
  name: string;
  amount: number;
  category: string | null;
  sourceType: string | null; // "SANKSI" | "LEMBUR" | "ANGSURAN" | null
}

export interface PayslipDetail {
  id: string;
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  baseSalary: number;
  grossSalary: number;
  totalBenefits: number;
  totalDeductions: number;
  overtimePay: number;
  otherEarnings: number;
  bonusEarnings: number;
  taxAmount: number;
  netSalary: number;
  transferStatus: TransferStatus;
  transferDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  pdfUrl: string | null;
  employeeName: string | null;
  employeeNumber: string | null;
  companyName: string | null;
  items: PayslipItem[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export function getPayslips() {
  return api<{ payslips: PayslipRow[] }>("/api/v1/payslips", { auth: true });
}
export function getPayslip(id: string) {
  return api<PayslipDetail>(`/api/v1/payslips/${id}`, { auth: true });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/** "2026-04" → "April 2026". */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-04" → "Apr 2026" (chip pendek). */
export function periodShort(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "25 Apr 2026" dari ISO (tanggal kalender, UTC). */
export function dayMonthLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "25 Apr 2026 · 14:30" — tanggal + jam (waktu lokal perangkat). */
export function dateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function transferStatusPill(s: TransferStatus): { label: string; bg: string; fg: string } {
  switch (s) {
    case "TRANSFERRED": return { label: "Dibayar", bg: colors.mint[100], fg: colors.mint[700] };
    case "FAILED": return { label: "Gagal", bg: colors.rose[100], fg: colors.rose[700] };
    default: return { label: "Menunggu transfer", bg: colors.amber[100], fg: colors.amber[700] };
  }
}

export function paymentMethodLabel(m: string | null): string | null {
  if (!m) return null;
  switch (m) {
    case "TRANSFER": return "Transfer bank";
    case "CASH": return "Tunai";
    case "COMPAY": return "ComPay";
    default: return m;
  }
}

export interface BreakdownRow {
  key: string;
  label: string;
  sub: string | null;
  amount: number;
}

export interface CompositionSeg {
  label: string;
  amount: number;
  pct: number;
  color: string;
}

export interface PayslipBreakdown {
  earnings: BreakdownRow[];
  deductions: BreakdownRow[];
  composition: CompositionSeg[];
  totalDeductions: number; // gross - net (otoritatif untuk hero)
}

/** Susun rincian pendapatan & potongan dari agregat + item slip. */
export function buildBreakdown(p: PayslipDetail): PayslipBreakdown {
  const benefitNames = p.items
    .filter((it) => it.type === "BENEFIT")
    .map((it) => it.name);

  // Komponen standar selalu ditampilkan walau bernilai nol (transparansi).
  const earnings: BreakdownRow[] = [
    { key: "basic", label: "Gaji pokok", sub: null, amount: p.baseSalary },
    { key: "benefits", label: "Tunjangan", sub: benefitNames.join(" + ") || null, amount: p.totalBenefits },
    { key: "overtime", label: "Upah lembur", sub: null, amount: p.overtimePay },
    { key: "bonus", label: "Bonus", sub: null, amount: p.bonusEarnings },
    { key: "other", label: "Komponen lainnya", sub: "Non-pajak (mis. reimbursement)", amount: p.otherEarnings },
  ];

  const deductions: BreakdownRow[] = p.items
    .filter((it) => it.type === "DEDUCTION")
    .map((it) => ({ key: it.id, label: it.name, sub: deductionSub(it), amount: it.amount }));

  // PPh 21: pakai item TAX bila ada, jika tidak pakai agregat taxAmount.
  // Selalu ditampilkan walau nol.
  const taxFromItems = p.items.filter((it) => it.type === "TAX").reduce((s, it) => s + it.amount, 0);
  const pph21 = taxFromItems > 0 ? taxFromItems : p.taxAmount;
  deductions.push({ key: "pph21", label: "PPh 21", sub: "Pajak penghasilan", amount: pph21 });

  const composition: CompositionSeg[] = [
    { label: "Pokok", amount: p.baseSalary, color: colors.brand[500], pct: 0 },
    { label: "Tunjangan", amount: p.totalBenefits, color: colors.brand[300], pct: 0 },
    { label: "Lembur", amount: p.overtimePay, color: colors.amber[500], pct: 0 },
    { label: "Bonus", amount: p.bonusEarnings, color: colors.coral[500], pct: 0 },
    { label: "Lainnya", amount: p.otherEarnings, color: colors.mint[500], pct: 0 },
  ].filter((s) => s.amount > 0);
  const compTotal = composition.reduce((s, c) => s + c.amount, 0) || 1;
  composition.forEach((c) => (c.pct = Math.round((c.amount / compTotal) * 100)));

  return { earnings, deductions, composition, totalDeductions: Math.max(0, p.grossSalary - p.netSalary) };
}

/** HTML slip gaji untuk dirender jadi PDF (expo-print). Data → PDF, bukan unggahan. */
export function payslipHtml(p: PayslipDetail, b: PayslipBreakdown): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const row = (label: string, sub: string | null, amount: number, neg = false) => `
    <tr>
      <td class="lbl"><div class="nm">${esc(label)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</td>
      <td class="amt ${neg ? "neg" : ""}">${neg ? "-" : ""}${esc(rupiah(amount))}</td>
    </tr>`;
  const pill = transferStatusPill(p.transferStatus);
  const gross = p.grossSalary;
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    * { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; box-sizing: border-box; }
    body { margin: 0; color: #1B1830; padding: 28px 30px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6B5BFF; padding-bottom: 14px; }
    .brand { font-size: 20px; font-weight: 800; color: #4434C4; }
    .doc { font-size: 11px; color: #6b6880; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #4a4760; line-height: 1.5; }
    .period { font-size: 13px; font-weight: 700; color: #1B1830; }
    .who { margin: 18px 0 4px; }
    .who .nm2 { font-size: 16px; font-weight: 800; }
    .who .role { font-size: 12px; color: #6b6880; }
    .status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
      background: ${pill.bg}; color: ${pill.fg}; }
    h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .6px; color: #6b6880; margin: 22px 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 9px 0; border-bottom: 1px solid #ECEAF5; vertical-align: top; }
    .lbl .nm { font-size: 13px; font-weight: 600; }
    .lbl .sub { font-size: 11px; color: #908da3; margin-top: 1px; }
    .amt { text-align: right; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .amt.neg { color: #B31E45; }
    .net { margin-top: 22px; background: linear-gradient(135deg,#231C66,#4434C4); color:#fff; border-radius: 14px; padding: 16px 18px;
      display: flex; justify-content: space-between; align-items: center; }
    .net .l { font-size: 12px; opacity: .85; }
    .net .v { font-size: 24px; font-weight: 800; }
    .foot { margin-top: 22px; font-size: 10px; color: #a3a0b5; text-align: center; line-height: 1.6; }
  </style></head><body>
    <div class="top">
      <div>
        <div class="brand">${esc(p.companyName ?? "Comuna")}</div>
        <div class="doc">Slip Gaji Karyawan</div>
      </div>
      <div class="meta">
        <div class="period">${esc(periodLabel(p.period))}</div>
        <div>${p.transferDate ? "Dibayar " + esc(dateTimeLabel(p.transferDate)) : "Belum dibayar"}</div>
        ${paymentMethodLabel(p.paymentMethod) ? `<div>${esc(paymentMethodLabel(p.paymentMethod)!)}</div>` : ""}
      </div>
    </div>
    <div class="who">
      <div class="nm2">${esc(p.employeeName ?? "-")}</div>
      <div class="role">${p.employeeNumber ? "NIP " + esc(p.employeeNumber) : ""}</div>
      <span class="status">${esc(pill.label)}</span>
    </div>
    <h3>Pendapatan</h3>
    <table>${b.earnings.map((e) => row(e.label, e.sub, e.amount)).join("")}
      <tr><td class="lbl"><div class="nm">Total Pendapatan (Gross)</div></td><td class="amt">${esc(rupiah(gross))}</td></tr>
    </table>
    <h3>Potongan</h3>
    <table>${b.deductions.map((d) => row(d.label, d.sub, d.amount, true)).join("")}
      <tr><td class="lbl"><div class="nm">Total Potongan</div></td><td class="amt neg">-${esc(rupiah(b.totalDeductions))}</td></tr>
    </table>
    <div class="net"><div class="l">Take-home pay</div><div class="v">${esc(rupiah(p.netSalary))}</div></div>
    <div class="foot">Dokumen ini dibuat otomatis oleh sistem Comuna HRIS dan sah tanpa tanda tangan basah.<br/>Dicetak dari aplikasi Comuna.</div>
  </body></html>`;
}

function deductionSub(it: PayslipItem): string | null {
  switch (it.sourceType) {
    case "ANGSURAN": return "Cicilan pinjaman";
    case "SANKSI": return "Sanksi kehadiran";
    case "LEMBUR": return null;
    default: return it.category;
  }
}
