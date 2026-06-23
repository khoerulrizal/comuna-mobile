// Profil karyawan dari API aman comuna-web (GET /api/v1/profile, Bearer).
import { api } from "./api";

export interface ProfileTenure {
  years: number;
  months: number;
  totalMonths: number;
  label: string;
}

export interface Profile {
  header: {
    fullName: string;
    position: string | null;
    employeeNumber: string | null;
    photoUrl: string | null;
  };
  stats: {
    tenure: ProfileTenure | null;
    annualLeaveRemaining: number | null;
    reviewScore: number | null;
  };
  personal: {
    email: string;
    phone: string | null;
    dateOfBirth: string | null; // ISO
    gender: string | null;
    genderLabel: string | null;
    maritalStatus: string | null;
    maritalStatusLabel: string | null;
  };
  work: {
    status: string | null;
    statusLabel: string | null;
    isActive: boolean;
    contractType: string | null;
    contractLabel: string | null;
    contractEndDate: string | null;
    department: string | null;
    branch: string | null;
    supervisor: string | null;
  };
  hasPin: boolean;
}

export async function getProfile(): Promise<Profile> {
  return api<Profile>("/api/v1/profile", { auth: true });
}

/** Format ISO date → "14 Juli 1996" (id-ID). */
export function formatTanggal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
