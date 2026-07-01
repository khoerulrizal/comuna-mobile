// Push notifikasi mobile via Expo Notifications. Registrasi token → server,
// tampilkan banner saat foreground, dan buka bell saat notifikasi di-tap.
// Best-effort: kegagalan push TAK PERNAH menggagalkan app.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerPushToken, unregisterPushToken } from "./notifications";
import { DEVICE_NAME } from "./config";

// Tampilkan notifikasi saat app di FOREGROUND (banner + suara + badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let currentToken: string | null = null;

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/** Minta izin + ambil Expo push token + daftarkan ke server. Aman dipanggil berulang. */
export async function registerForPush(): Promise<void> {
  try {
    // Token hanya tersedia di perangkat fisik (bukan emulator/web).
    if (Platform.OS === "web" || !Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Umum",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6B5BFF",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId = easProjectId();
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = resp.data;
    await registerPushToken(resp.data, Platform.OS, DEVICE_NAME);
  } catch (e) {
    console.warn("registerForPush:", e instanceof Error ? e.message : e);
  }
}

/** Lepas token saat logout (agar HP ini berhenti menerima push untuk akun tsb). */
export async function unregisterForPush(): Promise<void> {
  try {
    if (currentToken) await unregisterPushToken(currentToken);
  } catch {
    // abaikan
  }
  currentToken = null;
}

/**
 * Pasang listener tap-notifikasi → buka layar bell. Panggil sekali (mis. di root
 * layout). Mengembalikan fungsi cleanup.
 */
export function attachNotificationTapHandler(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => {
    router.push("/notifikasi");
  });
  return () => sub.remove();
}
