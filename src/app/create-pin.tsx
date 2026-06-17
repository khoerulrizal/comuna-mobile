// Buat PIN — alur setelah login pertama. PIN 6 digit jadi kunci buka cepat berikutnya.
// Tahap: enter → confirm → (opsional) tawarkan biometrik → Home.
// Lintas iOS/Android. Desain konsisten dengan login (brand Comuna).
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Keypad, PinDots } from "@/components/PinPad";
import { Button, Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { PIN_LENGTH, setPin } from "@/lib/pin";
import {
  authenticate,
  biometricLabel,
  getBiometricType,
  setBiometricEnabled,
  type BiometricType,
} from "@/lib/biometric";

type Stage = "enter" | "confirm" | "bio";

export default function CreatePinScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>("enter");
  const [first, setFirst] = useState("");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bioType, setBioType] = useState<BiometricType>(null);

  useEffect(() => {
    getBiometricType().then(setBioType);
  }, []);

  function resetToEnter() {
    setPinValue("");
    setFirst("");
    setStage("enter");
  }

  async function commit(nextPin: string) {
    if (stage === "enter") {
      setFirst(nextPin);
      setPinValue("");
      setStage("confirm");
      return;
    }
    // stage === "confirm"
    if (nextPin !== first) {
      setError(true);
      setTimeout(() => {
        setError(false);
        resetToEnter();
      }, 600);
      return;
    }
    setSaving(true);
    const res = await setPin(nextPin);
    setSaving(false);
    if (!res.ok) {
      if (res.sessionExpired) {
        router.replace("/login");
        return;
      }
      setServerError(res.error ?? "Gagal menyimpan PIN");
      resetToEnter();
      return;
    }
    if (bioType) {
      setStage("bio");
    } else {
      router.replace("/home");
    }
  }

  function onDigit(d: string) {
    if (pin.length >= PIN_LENGTH || error || saving) return;
    setServerError(null);
    const next = pin + d;
    setPinValue(next);
    if (next.length === PIN_LENGTH) commit(next);
  }

  function onDelete() {
    setPinValue((p) => p.slice(0, -1));
  }

  async function enableBio() {
    const ok = await authenticate(`Aktifkan ${biometricLabel(bioType)}`);
    if (ok) await setBiometricEnabled(true);
    router.replace("/home");
  }

  if (stage === "bio") {
    return (
      <BioOffer
        bioType={bioType}
        onEnable={enableBio}
        onSkip={() => router.replace("/home")}
        insets={insets}
      />
    );
  }

  const title = stage === "enter" ? "Buat PIN" : "Konfirmasi PIN";
  const subtitle =
    stage === "enter"
      ? "Buat PIN 6 digit untuk membuka aplikasi dengan cepat & aman."
      : "Masukkan ulang PIN Anda untuk memastikan.";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.neutral[25],
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <StatusBar style="dark" />
      {/* Header: tombol kembali. Saat konfirmasi → kembali ke tahap masukkan. */}
      <View style={{ height: 44, justifyContent: "center", paddingHorizontal: 16 }}>
        <Pressable
          onPress={() => {
            if (stage === "confirm") {
              setStage("enter");
              setPinValue("");
              setFirst("");
            } else {
              router.back();
            }
          }}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.neutral[100],
          }}
        >
          <Icon name="chevronLeft" size={20} color={colors.neutral[700]} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: "space-between" }}>
        {/* Atas: ikon + judul + dots */}
        <View style={{ alignItems: "center", paddingHorizontal: 32, marginTop: 12, gap: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: colors.brand[100],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="lock" size={28} color={colors.brand[600]} strokeWidth={2} />
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Txt size={22} weight="extrabold" color={colors.neutral[800]}>
              {title}
            </Txt>
            <Txt
              size={13.5}
              color={colors.neutral[500]}
              style={{ textAlign: "center", lineHeight: 20 }}
            >
              {subtitle}
            </Txt>
          </View>
          <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />
          {error ? (
            <Txt size={12.5} weight="semibold" color={colors.rose[700]}>
              PIN tidak cocok. Coba lagi.
            </Txt>
          ) : serverError ? (
            <Txt size={12.5} weight="semibold" color={colors.rose[700]} style={{ textAlign: "center" }}>
              {serverError}
            </Txt>
          ) : saving ? (
            <Txt size={12.5} weight="semibold" color={colors.neutral[400]}>
              Menyimpan…
            </Txt>
          ) : null}
        </View>

        {/* Bawah: keypad */}
        <View style={{ paddingHorizontal: 24 }}>
          <Keypad onDigit={onDigit} onDelete={onDelete} />
        </View>
      </View>
    </View>
  );
}

function BioOffer({
  bioType,
  onEnable,
  onSkip,
  insets,
}: {
  bioType: BiometricType;
  onEnable: () => void;
  onSkip: () => void;
  insets: { top: number; bottom: number };
}) {
  const label = biometricLabel(bioType);
  const icon = bioType === "fingerprint" ? "fingerprint" : "user";
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.neutral[25],
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: colors.brand[100],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={44} color={colors.brand[600]} strokeWidth={2} />
        </View>
        <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 16 }}>
          <Txt size={22} weight="extrabold" color={colors.neutral[800]}>
            Aktifkan {label}?
          </Txt>
          <Txt
            size={14}
            color={colors.neutral[500]}
            style={{ textAlign: "center", lineHeight: 21 }}
          >
            Buka Comuna lebih cepat tanpa mengetik PIN. Anda tetap bisa memakai PIN kapan saja.
          </Txt>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Button label={`Aktifkan ${label}`} size="lg" full onPress={onEnable} />
        <Button label="Nanti saja" variant="ghost" size="lg" full onPress={onSkip} />
      </View>
    </View>
  );
}
