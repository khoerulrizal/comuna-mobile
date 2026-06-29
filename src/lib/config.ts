// Konfigurasi runtime mobile.
//
// URL API:
//   - Produksi: dari env EXPO_PUBLIC_API_BASE_URL (mis. https://portal.comuna.id).
//   - Dev: bila env tidak diset, OTOMATIS mengikuti IP mesin Metro/Expo (port 3000),
//     jadi tak perlu ganti IP manual saat IP LAN berubah (DHCP). Server web (Next)
//     diasumsikan jalan di mesin yang sama dengan Expo, port 3000.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

// Host Metro yang melayani bundle, mis. "192.168.1.8:8081" → ambil IP-nya.
function metroHostBase(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;
  const host = hostUri?.split(":")[0]?.trim();
  return host ? `http://${host}:3000` : null;
}

const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const resolved =
  explicit && explicit.length > 0
    ? explicit
    : metroHostBase() ?? "http://localhost:3000";

/** Base URL API tanpa trailing slash. */
export const API_BASE_URL = resolved.replace(/\/+$/, "");

/** Label device untuk audit/registrasi refresh token di server. */
export const DEVICE_NAME = [Platform.OS, Device.modelName].filter(Boolean).join(" ") || "mobile";

// Peta (expo-maps) butuh DEV BUILD + (Android) Google Maps API key. Default OFF →
// fallback tampilan koordinat sampai siap. Aktifkan: EXPO_PUBLIC_MAPS_ENABLED=1.
export const MAPS_ENABLED = process.env.EXPO_PUBLIC_MAPS_ENABLED?.trim() === "1";

// Google Maps JavaScript API key (untuk pemilih lokasi berbasis WebView, mis.
// aktivitas Field). Kosong → fallback OpenStreetMap. Bisa pakai key web yang sama
// bila referrer WebView (lihat baseUrl) diizinkan di Google Cloud Console.
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
