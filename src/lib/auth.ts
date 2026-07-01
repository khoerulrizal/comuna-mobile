// Auth service — integrasi ke API token aman Comuna (/api/v1/auth/*).
// Token disimpan di SecureStore via session.ts. Lintas iOS/Android.
import { api, ApiError, NetworkError } from "./api";
import { setBiometricEnabled } from "./biometric";
import {
  clearSession,
  getRefreshToken,
  saveSession,
  saveTokens,
  type SessionUser,
} from "./session";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

function messageFor(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof NetworkError) return e.message;
  return fallback;
}

/** Login dengan email + password. Menyimpan token + profil bila berhasil. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await api<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email: email.trim(), password },
    });
    await saveSession(data.accessToken, data.refreshToken, data.user);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messageFor(e, "Gagal masuk") };
  }
}

/** Apakah ada sesi tersimpan (refresh token). */
export async function hasSession(): Promise<boolean> {
  return (await getRefreshToken()) !== null;
}

/** Tukar refresh token → access token baru (dipakai setelah unlock biometrik). */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await api<{ accessToken: string; refreshToken: string }>(
      "/api/v1/auth/refresh",
      { method: "POST", body: { refreshToken } },
    );
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Keluar: cabut refresh token di server lalu bersihkan sesi lokal. */
export async function signOut(): Promise<void> {
  // Lepas token push perangkat ini SEBELUM sesi dibersihkan (butuh access token).
  // Dynamic import agar expo-notifications tak dimuat lebih awal dari perlu.
  try {
    const { unregisterForPush } = await import("./push");
    await unregisterForPush();
  } catch {
    // abaikan
  }
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await api("/api/v1/auth/logout", { method: "POST", body: { refreshToken } });
    } catch {
      // abaikan — tetap bersihkan lokal
    }
  }
  await Promise.all([clearSession(), setBiometricEnabled(false)]);
}

/** Minta tautan reset password ke email (alur link-via-email). */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!email.trim()) return { ok: false, error: "Email wajib diisi" };
  try {
    await api("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email: email.trim() },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messageFor(e, "Gagal mengirim tautan") };
  }
}
