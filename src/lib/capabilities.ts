// Kapabilitas paket perusahaan — modul yang aktif. Dipakai untuk menyembunyikan
// menu/fitur yang tidak termasuk paket di seluruh aplikasi mobile.
import { api } from "./api";

export type ModuleState = "subscribed" | "demo" | "expired";

export interface Capabilities {
  modules: string[];
  state: ModuleState;
}

export function getCapabilities() {
  return api<Capabilities>("/api/v1/me/modules", { auth: true });
}

/** Kunci modul (selaras dengan web `lib/modules.ts`). */
export type ModuleKey =
  | "employees" | "mutations" | "reprimand" | "recruitment" | "onboarding" | "offboarding" | "orgchart"
  | "attendance" | "activities" | "leave" | "overtime" | "shifts" | "calendar"
  | "reimbursement" | "loans" | "bonus" | "payroll"
  | "reviews" | "feedback" | "kpi" | "okr"
  | "analytics" | "announcements" | "documents";
