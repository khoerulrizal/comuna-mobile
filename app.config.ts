// Config dinamis: memakai app.json sebagai basis, lalu MENYUNTIK Google Maps
// Android API key dari env (GMAPS_ANDROID_KEY) saat build — supaya key TIDAK
// di-hardcode/commit. iOS memakai Apple Maps (tanpa key).
//
// Expo membaca app.json lebih dulu dan mengoper isinya sebagai `config` di sini.
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Comuna",
  slug: config.slug ?? "comuna-mobile",
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        // Kosong → key tidak disuntik (Android Google Maps perlu ini; iOS tidak).
        apiKey: process.env.GMAPS_ANDROID_KEY || undefined,
      },
    },
  },
});
