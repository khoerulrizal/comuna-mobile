// Gerbang kunci GLOBAL — dirender di root layout sebagai overlay di atas seluruh
// navigasi. Karena overlay (bukan redirect berbasis route), deep link / cold start
// ke route mana pun tetap tertutup oleh layar kunci. Juga MENGUNCI ULANG saat app
// kembali dari background → foreground.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { LockScreen } from "@/components/LockScreen";
import { isUnlocked, lock, subscribeLock } from "@/lib/app-lock";
import { hasSession } from "@/lib/auth";
import { hasPin } from "@/lib/pin";

// Route otentikasi yang TIDAK boleh ditutup overlay (agar alur lupa-PIN / ganti
// akun / buat-PIN tetap terlihat). Saat di route ini, kunci tidak ditampilkan.
const AUTH_ROUTES = new Set([
  "/",
  "/login",
  "/forgot-password",
  "/forgot-pin",
  "/create-pin",
  "/unlock",
]);

export function LockGate() {
  const pathname = usePathname();
  const [required, setRequired] = useState(false);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const appState = useRef(AppState.currentState);

  // Re-render saat status kunci berubah (markUnlocked / lock).
  useEffect(() => subscribeLock(force), []);

  // Kunci diperlukan bila ada sesi + PIN tersimpan.
  const refresh = useCallback(async () => {
    const [session, pin] = await Promise.all([hasSession(), hasPin()]);
    setRequired(session && pin);
  }, []);

  useEffect(() => {
    // refresh() men-setState SETELAH await (async) → bukan cascading render sinkron.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      // Kunci ULANG hanya saat benar-benar ke background (bukan "inactive" yang
      // transien, mis. prompt biometrik / app switcher). Foreground → hitung ulang.
      if (next === "background") lock();
      else if (next === "active" && prev !== "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (!required || isUnlocked() || AUTH_ROUTES.has(pathname)) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LockScreen />
    </View>
  );
}
