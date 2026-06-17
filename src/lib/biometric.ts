// Helper biometrik (Face ID / Touch ID / Sidik Jari / Iris) lintas-platform.
// Bungkus expo-local-authentication + simpan preferensi "aktif/nonaktif" di Keychain/Keystore.
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { deleteSecure, getSecure, setSecure } from "./secure";

const ENABLED_KEY = "comuna.biometric.enabled";

export type BiometricType = "face" | "fingerprint" | "iris" | null;

/** Tipe biometrik yang TERSEDIA & SUDAH terdaftar di device, atau null bila tak ada. */
export async function getBiometricType(): Promise<BiometricType> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return null;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
      return "face";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
      return "fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "iris";
    return null;
  } catch {
    return null; // mis. web / modul tak tersedia
  }
}

export interface BiometricDiagnostics {
  platform: string;
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  types: number[];
  reason: string;
}

/** Diagnosa kenapa biometrik tersedia / tidak — untuk debugging di perangkat. */
export async function biometricDiagnostics(): Promise<BiometricDiagnostics> {
  const platform = Platform.OS;
  if (platform === "web") {
    return {
      platform,
      available: false,
      hasHardware: false,
      isEnrolled: false,
      types: [],
      reason: "Biometrik tidak didukung di web. Buka lewat Expo Go / app native (iOS/Android).",
    };
  }
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const types = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];
    const available = hasHardware && isEnrolled && types.length > 0;
    let reason = "Biometrik siap dipakai.";
    if (!hasHardware) reason = "Perangkat ini tidak punya sensor biometrik (emulator tanpa sensor?).";
    else if (!isEnrolled)
      reason = "Belum ada Face ID / sidik jari terdaftar di Settings perangkat ini.";
    else if (types.length === 0) reason = "Sensor terdeteksi tapi tipe biometrik tidak terbaca.";
    return { platform, available, hasHardware, isEnrolled, types, reason };
  } catch (e) {
    return {
      platform,
      available: false,
      hasHardware: false,
      isEnrolled: false,
      types: [],
      reason: `Modul biometrik error: ${e instanceof Error ? e.message : "tidak diketahui"}. Mungkin tak tersedia di klien ini.`,
    };
  }
}

/** Label ramah pengguna untuk tipe biometrik. */
export function biometricLabel(type: BiometricType): string {
  switch (type) {
    case "face":
      return "Face ID";
    case "fingerprint":
      return "Sidik Jari";
    case "iris":
      return "Pindai Iris";
    default:
      return "Biometrik";
  }
}

/** Jalankan prompt biometrik. Return true bila berhasil. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Batal",
      fallbackLabel: "Gunakan PIN",
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

// ── Preferensi pengguna (apakah unlock biometrik diaktifkan) ─────────────────
export async function isBiometricEnabled(): Promise<boolean> {
  return (await getSecure(ENABLED_KEY)) === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await setSecure(ENABLED_KEY, "1");
  else await deleteSecure(ENABLED_KEY);
}
