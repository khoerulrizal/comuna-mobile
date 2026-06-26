// Buka Kunci — muncul saat app dibuka kembali dengan sesi + PIN tersimpan.
// PIN diverifikasi ke server (/pin/verify); biometrik → refresh sesi. Lintas iOS/Android.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Keypad, PinDots } from "@/components/PinPad";
import { Txt } from "@/components/ui";
import ComunaMark from "@/assets/logo/comuna_logo_primary_transparent.svg";
import { colors } from "@/theme/tokens";
import { PIN_LENGTH, verifyPin } from "@/lib/pin";
import {
  authenticate,
  getBiometricType,
  isBiometricEnabled,
  type BiometricType,
} from "@/lib/biometric";
import { refreshSession, signOut } from "@/lib/auth";

export default function UnlockScreen() {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bioType, setBioType] = useState<BiometricType>(null);
  const bioTried = useRef(false);

  const unlock = useCallback(() => {
    router.replace("/home");
  }, []);

  const backToLogin = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, []);

  // Biometrik: autentikasi lokal → segarkan sesi (refresh token) → masuk.
  const doBiometric = useCallback(async () => {
    if (busy || locked) return;
    const ok = await authenticate("Buka Comuna");
    if (!ok) return;
    setBusy(true);
    const refreshed = await refreshSession();
    setBusy(false);
    if (refreshed) unlock();
    else backToLogin();
  }, [busy, locked, unlock, backToLogin]);

  // Saat mount: deteksi biometrik & auto-prompt sekali bila diaktifkan.
  useEffect(() => {
    (async () => {
      const [type, enabled] = await Promise.all([getBiometricType(), isBiometricEnabled()]);
      setBioType(type);
      if (type && enabled && !bioTried.current) {
        bioTried.current = true;
        doBiometric();
      }
    })();
  }, [doBiometric]);

  async function commit(candidate: string) {
    setBusy(true);
    const res = await verifyPin(candidate);
    setBusy(false);

    if (res.ok) {
      unlock();
      return;
    }
    if (res.sessionExpired) {
      setMessage("Sesi berakhir. Mengarahkan ke login…");
      setTimeout(backToLogin, 800);
      return;
    }
    if (res.pinNotSet) {
      router.replace("/create-pin");
      return;
    }
    if (res.locked) {
      const mins = res.retryAfter ? Math.ceil(res.retryAfter / 60) : 15;
      setLocked(true);
      setError(true);
      setPin("");
      setMessage(`PIN terkunci ±${mins} menit. Coba lagi nanti atau reset PIN.`);
      setTimeout(() => setError(false), 600);
      return;
    }
    // PIN salah
    setError(true);
    setMessage(
      res.remaining != null ? `PIN salah. ${res.remaining} percobaan tersisa.` : res.error ?? "PIN salah",
    );
    setTimeout(() => {
      setError(false);
      setPin("");
    }, 600);
  }

  function onDigit(d: string) {
    if (pin.length >= PIN_LENGTH || error || busy || locked) return;
    setMessage(null);
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) commit(next);
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.neutral[25],
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        {/* Atas: avatar + sapaan + dots */}
        <View style={{ alignItems: "center", paddingHorizontal: 32, marginTop: 24, gap: 24 }}>
          <ComunaMark width={72} height={72} />
          <View style={{ alignItems: "center", gap: 6 }}>
            <Txt size={22} weight="extrabold" color={colors.neutral[800]}>
              Selamat datang kembali
            </Txt>
            <Txt size={13.5} color={colors.neutral[500]}>
              Masukkan PIN untuk membuka
            </Txt>
          </View>
          <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />
          {busy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={colors.brand[500]} />
              <Txt size={12.5} weight="semibold" color={colors.neutral[500]}>
                Memverifikasi…
              </Txt>
            </View>
          ) : message ? (
            <Txt
              size={12.5}
              weight="semibold"
              color={locked ? colors.amber[700] : colors.rose[700]}
              style={{ textAlign: "center" }}
            >
              {message}
            </Txt>
          ) : null}
        </View>

        {/* Bawah: keypad (+ biometrik bila tersedia) + Lupa PIN + ganti akun */}
        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          <Keypad
            onDigit={onDigit}
            onDelete={() => setPin((p) => p.slice(0, -1))}
            bioIcon={bioType ? (bioType === "fingerprint" ? "fingerprint" : "user") : undefined}
            onBio={bioType ? doBiometric : undefined}
          />
          <View style={{ alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.push("/forgot-pin")} hitSlop={8}>
              <Txt size={13} weight="bold" color={colors.brand[600]}>
                Lupa PIN?
              </Txt>
            </Pressable>
            <Pressable onPress={backToLogin} hitSlop={8}>
              <Txt size={13} weight="semibold" color={colors.neutral[500]}>
                Masuk dengan akun lain
              </Txt>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
