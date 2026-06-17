// Penyimpanan sesi (token + profil user) di SecureStore (Keychain/Keystore).
// Access token JWT pendek + refresh token panjang. Dipakai oleh api.ts & auth.ts.
import { deleteSecure, getSecure, setSecure } from "./secure";

const ACCESS_KEY = "comuna.session.access";
const REFRESH_KEY = "comuna.session.refresh";
const USER_KEY = "comuna.user";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string | null;
  companySlug?: string | null;
  avatarUrl?: string | null;
  hasPin: boolean;
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    setSecure(ACCESS_KEY, accessToken),
    setSecure(REFRESH_KEY, refreshToken),
  ]);
}

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: SessionUser,
): Promise<void> {
  await Promise.all([
    saveTokens(accessToken, refreshToken),
    setSecure(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getSecure(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getSecure(REFRESH_KEY);
}

export async function getUser(): Promise<SessionUser | null> {
  const raw = await getSecure(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** Perbarui sebagian field user tersimpan (mis. hasPin setelah set PIN). */
export async function patchUser(patch: Partial<SessionUser>): Promise<void> {
  const current = await getUser();
  if (!current) return;
  await setSecure(USER_KEY, JSON.stringify({ ...current, ...patch }));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    deleteSecure(ACCESS_KEY),
    deleteSecure(REFRESH_KEY),
    deleteSecure(USER_KEY),
  ]);
}
