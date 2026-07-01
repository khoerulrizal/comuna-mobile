// API client tunggal ke comuna-web. Menangani: base URL, JSON, Bearer access token,
// auto-refresh sekali saat 401, dan error terstruktur. Lintas iOS/Android.
import { API_BASE_URL, DEVICE_NAME } from "./config";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "./session";

/** Error dari server (status non-2xx) dengan pesan & payload. */
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** Gagal jaringan / tak bisa menjangkau server. */
export class NetworkError extends Error {
  constructor(message = "Tidak dapat terhubung ke server") {
    super(message);
    this.name = "NetworkError";
  }
}

/** Sesi tidak valid lagi (refresh gagal) — pemanggil harus arahkan ke login. */
export class AuthError extends Error {
  constructor(message = "Sesi berakhir") {
    super(message);
    this.name = "AuthError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Sertakan Bearer access token & coba refresh otomatis saat 401. */
  auth?: boolean;
  /** Batalkan request saat komponen unmount / berpindah layar (AbortController). */
  signal?: AbortSignal;
  /** internal: cegah loop refresh. */
  _retried?: boolean;
}

async function parse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Dedup refresh: panggilan paralel berbagi satu proses refresh.
let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await parse(res);
      const access = data.accessToken as string | undefined;
      const refresh = data.refreshToken as string | undefined;
      if (!access || !refresh) return null;
      await saveTokens(access, refresh);
      return access;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-device-name": DEVICE_NAME,
  };
  if (opts.auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    // Dibatalkan (unmount/pindah layar) → biarkan AbortError menyebar agar pemanggil
    // bisa mengabaikannya (bukan error jaringan yang perlu ditampilkan).
    if (opts.signal?.aborted) throw e;
    throw new NetworkError();
  }

  // Access token kedaluwarsa → coba refresh sekali, lalu ulangi request.
  if (res.status === 401 && opts.auth && !opts._retried) {
    const newAccess = await tryRefresh();
    if (newAccess) return api<T>(path, { ...opts, _retried: true });
    await clearSession();
    throw new AuthError();
  }

  const data = await parse(res);
  if (!res.ok) {
    const message = (data.error as string) || `Terjadi kesalahan (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
