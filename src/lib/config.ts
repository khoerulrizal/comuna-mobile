// Konfigurasi runtime mobile. URL API dibaca dari env EXPO_PUBLIC_API_BASE_URL
// (lihat .env.local / .env.example). Real device WAJIB pakai IP LAN, bukan localhost.
import { Platform } from "react-native";
import * as Device from "expo-device";

const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

/** Base URL API tanpa trailing slash. */
export const API_BASE_URL = raw.replace(/\/+$/, "");

/** Label device untuk audit/registrasi refresh token di server. */
export const DEVICE_NAME = [Platform.OS, Device.modelName].filter(Boolean).join(" ") || "mobile";
