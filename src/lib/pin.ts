// PIN unlock — kini diverifikasi di server (/api/v1/auth/pin*). PIN tak disimpan
// di device; server menyimpan bcrypt hash + lockout. Lintas iOS/Android.
import { api, ApiError, AuthError, NetworkError } from "./api";
import { getRefreshToken, getUser, patchUser, saveTokens } from "./session";

export const PIN_LENGTH = 6;

export interface SetPinResult {
  ok: boolean;
  error?: string;
  sessionExpired?: boolean;
}

export interface VerifyPinResult {
  ok: boolean;
  error?: string;
  remaining?: number; // sisa percobaan (PIN salah)
  locked?: boolean; // terkunci sementara (423)
  retryAfter?: number; // detik sampai bisa coba lagi
  sessionExpired?: boolean; // refresh token tak valid → harus login ulang
  pinNotSet?: boolean; // PIN belum diatur di server
}

/** Set / ganti PIN (butuh access token aktif). */
export async function setPin(pin: string): Promise<SetPinResult> {
  try {
    await api("/api/v1/auth/pin", { method: "POST", auth: true, body: { pin } });
    await patchUser({ hasPin: true });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, sessionExpired: true, error: "Sesi berakhir. Masuk kembali." };
    }
    if (e instanceof ApiError) return { ok: false, error: e.message };
    if (e instanceof NetworkError) return { ok: false, error: e.message };
    return { ok: false, error: "Gagal menyimpan PIN" };
  }
}

/** Verifikasi PIN saat buka kunci. Sukses → token baru tersimpan. */
export async function verifyPin(pin: string): Promise<VerifyPinResult> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { ok: false, sessionExpired: true, error: "Sesi berakhir. Masuk kembali." };
  }
  try {
    const data = await api<{ accessToken: string; refreshToken: string }>(
      "/api/v1/auth/pin/verify",
      { method: "POST", body: { refreshToken, pin } },
    );
    await saveTokens(data.accessToken, data.refreshToken);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      // 401 dengan reason → sesi/refresh tak valid; 401 dengan remaining → PIN salah.
      if (e.status === 401 && e.data.reason) {
        return { ok: false, sessionExpired: true, error: e.message };
      }
      if (e.status === 423) {
        return { ok: false, locked: true, retryAfter: e.data.retryAfter as number, error: e.message };
      }
      if (e.status === 400 && e.data.pinNotSet) {
        return { ok: false, pinNotSet: true, error: e.message };
      }
      return { ok: false, error: e.message, remaining: e.data.remaining as number | undefined };
    }
    if (e instanceof NetworkError) return { ok: false, error: e.message };
    return { ok: false, error: "Gagal memverifikasi PIN" };
  }
}

/** Apakah user sudah punya PIN (dari profil tersimpan). */
export async function hasPin(): Promise<boolean> {
  const user = await getUser();
  return !!user?.hasPin;
}

/** Minta tautan reset PIN ke email (alur link-via-email seperti lupa password). */
export async function requestPinReset(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!email.trim()) return { ok: false, error: "Email wajib diisi" };
  try {
    await api("/api/v1/auth/pin/forgot", { method: "POST", body: { email: email.trim() } });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    if (e instanceof NetworkError) return { ok: false, error: e.message };
    return { ok: false, error: "Gagal mengirim tautan" };
  }
}
