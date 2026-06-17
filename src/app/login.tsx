// Login — ported dari desain "Corelia HRIS Mobile" (LoginScreen), brand Comuna.
// Lintas-platform (iOS & Android). Auth via service (sementara stub → API aman menyusul).
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import ComunaWordmark from "@/assets/logo/comuna-wordmark-white.svg";
import { Button, Icon, type IconName, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { hasSession, refreshSession, signIn } from "@/lib/auth";
import { hasPin } from "@/lib/pin";
import {
  authenticate,
  getBiometricType,
  isBiometricEnabled,
  type BiometricType,
} from "@/lib/biometric";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioType, setBioType] = useState<BiometricType>(null);

  // Deteksi biometrik yang tersedia di device untuk menampilkan tombol yang relevan.
  useEffect(() => {
    getBiometricType().then(setBioType);
  }, []);

  async function routeAfterAuth() {
    // PIN belum dibuat → arahkan ke pembuatan PIN; jika sudah → langsung Home.
    if (await hasPin()) router.replace("/home");
    else router.replace("/create-pin");
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal masuk");
      return;
    }
    await routeAfterAuth();
  }

  // Login cepat via biometrik: hanya berlaku bila user pernah masuk & mengaktifkannya
  // di device ini. Jika belum, arahkan untuk masuk dengan password dulu.
  async function handleBiometric() {
    setError(null);
    const [enabled, session] = await Promise.all([isBiometricEnabled(), hasSession()]);
    if (!enabled || !session) {
      setError("Masuk dengan password dulu untuk mengaktifkan login biometrik.");
      return;
    }
    const ok = await authenticate("Masuk ke Comuna");
    if (!ok) return;
    // Sesi ada tapi access token mungkin kedaluwarsa → segarkan via refresh token.
    const refreshed = await refreshSession();
    if (!refreshed) {
      setError("Sesi berakhir. Silakan masuk dengan password.");
      return;
    }
    await routeAfterAuth();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25] }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Hero */}
          <LinearGradient
            colors={[colors.brand[600], colors.brand[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + 20,
              paddingBottom: 36,
              paddingHorizontal: 22,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
          >
            <ComunaWordmark width={120} height={26} />
            <Txt size={26} weight="extrabold" color="#fff" style={{ marginTop: 22 }}>
              Selamat datang 👋
            </Txt>
            <Txt size={13.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>
              Masuk untuk memulai hari kerja Anda
            </Txt>
          </LinearGradient>

          {/* Form */}
          <View style={{ padding: 22 }}>
            <Field
              label="Email atau ID Karyawan"
              icon="user"
              value={email}
              onChangeText={setEmail}
              placeholder="nama@perusahaan.com"
              keyboardType="email-address"
            />
            <Field
              label="Password"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              trailing={
                <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={8}>
                  <Icon name="eye" size={18} color={colors.neutral[400]} />
                </Pressable>
              }
            />

            {error ? (
              <Txt size={12} color={colors.rose[700]} style={{ marginTop: 2, marginBottom: 4 }}>
                {error}
              </Txt>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              <Pressable
                onPress={() => setRemember((r) => !r)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                hitSlop={6}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: remember ? colors.brand[500] : "transparent",
                    borderWidth: remember ? 0 : 1.5,
                    borderColor: colors.neutral[300],
                  }}
                >
                  {remember && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
                </View>
                <Txt size={12.5} weight="semibold" color={colors.neutral[700]}>
                  Ingat saya
                </Txt>
              </Pressable>
              <Pressable onPress={() => router.push("/forgot-password")} hitSlop={6}>
                <Txt size={12.5} weight="bold" color={colors.brand[600]}>
                  Lupa password?
                </Txt>
              </Pressable>
            </View>

            <Button
              label={loading ? "Memproses…" : "Masuk"}
              size="lg"
              full
              onPress={loading ? undefined : handleLogin}
            />

            {/* Biometrik — tampil hanya bila device mendukung & sudah terdaftar. */}
            {bioType ? (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.neutral[100] }} />
                  <Txt
                    size={11}
                    weight="bold"
                    color={colors.neutral[400]}
                    style={{ letterSpacing: 0.5 }}
                  >
                    ATAU
                  </Txt>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.neutral[100] }} />
                </View>

                <BioQuick
                  icon={bioType === "fingerprint" ? "fingerprint" : "user"}
                  label={
                    bioType === "face"
                      ? "Masuk dengan Face ID"
                      : bioType === "fingerprint"
                        ? "Masuk dengan Sidik Jari"
                        : "Masuk dengan Biometrik"
                  }
                  accent={bioType === "fingerprint" ? colors.coral[500] : colors.brand[500]}
                  onPress={handleBiometric}
                />
              </>
            ) : null}

            <View style={{ alignItems: "center", marginTop: 28 }}>
              <Txt size={12.5} color={colors.neutral[500]}>
                Belum punya akun?{" "}
                <Txt size={12.5} weight="bold" color={colors.neutral[600]}>
                  Hubungi HR Anda
                </Txt>
              </Txt>
              <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 10 }}>
                Atau
              </Txt>
              <Pressable onPress={() => router.push("https://portal.comuna.id/register")} hitSlop={6}>
                <Txt size={12.5} weight="bold" color={colors.brand[600]} style={{ marginTop: 10 }}>
                  Daftarkan Perusahaan
                </Txt>
              </Pressable>
            </View> 
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  icon,
  trailing,
  ...input
}: {
  label: string;
  icon: IconName;
  trailing?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Txt size={12} weight="bold" color={colors.neutral[600]} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 52,
          paddingHorizontal: 14,
          backgroundColor: "#fff",
          borderWidth: 1.5,
          borderColor: colors.neutral[200],
          borderRadius: 14,
        }}
      >
        <Icon name={icon} size={18} color={colors.neutral[400]} strokeWidth={2} />
        <TextInput
          {...input}
          placeholderTextColor={colors.neutral[400]}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontFamily: fonts.medium,
            fontSize: 14.5,
            color: colors.neutral[900],
            padding: 0,
          }}
        />
        {trailing}
      </View>
    </View>
  );
}

function BioQuick({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: IconName;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: 56,
        paddingHorizontal: 16,
        borderRadius: radii.md,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: colors.neutral[100],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: accent + "14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} color={accent} strokeWidth={2} />
      </View>
      <Txt size={14.5} weight="bold" color={colors.neutral[800]}>
        {label}
      </Txt>
    </Pressable>
  );
}
