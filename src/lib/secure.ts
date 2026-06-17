// Penyimpanan aman lintas-platform di atas expo-secure-store (Keychain iOS / Keystore Android).
// Aturan #2: token & kredensial sensitif WAJIB di Keychain/Keystore, bukan AsyncStorage.
//
// Catatan web: expo-secure-store tidak tersedia di web (lempar UnavailabilityError).
// Untuk menjaga `expo export --platform web` & preview tetap jalan, di web kita
// fallback ke localStorage (TIDAK aman — hanya untuk dev/preview, bukan produksi mobile).
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEYCHAIN_SERVICE = "id.comuna.app";
const options: SecureStore.SecureStoreOptions = { keychainService: KEYCHAIN_SERVICE };

const isWeb = Platform.OS === "web";

export async function setSecure(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, options);
}

export async function getSecure(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key, options);
}

export async function deleteSecure(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key, options);
}
