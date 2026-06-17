// Lupa PIN — kirim tautan reset PIN ke email terdaftar (alur link-via-email).
// Tahap: form email → sukses "cek email Anda". Tautan dibuka di browser (set PIN baru).
// Lintas iOS/Android.
import { useState } from "react";
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
import { Button, Icon, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { requestPinReset } from "@/lib/pin";

export default function ForgotPinScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const res = await requestPinReset(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal mengirim tautan");
      return;
    }
    setSent(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top + 8 }}>
      <StatusBar style="dark" />
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          height: 44,
        }}
      >
        <Pressable
          onPress={() => router.back()}
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
        <Txt size={15} weight="bold" color={colors.neutral[800]}>
          {sent ? "Cek Email Anda" : "Lupa PIN"}
        </Txt>
      </View>

      {sent ? (
        <SentState email={email} insets={insets} onResend={handleSubmit} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 24 }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: colors.brand[100],
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                marginBottom: 18,
              }}
            >
              <Icon name="lock" size={28} color={colors.brand[600]} strokeWidth={2} />
            </View>
            <Txt size={20} weight="extrabold" color={colors.neutral[800]}>
              Atur ulang PIN
            </Txt>
            <Txt
              size={13.5}
              color={colors.neutral[500]}
              style={{ marginTop: 6, marginBottom: 22, lineHeight: 20 }}
            >
              Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat PIN baru di browser.
            </Txt>

            <Txt size={12} weight="bold" color={colors.neutral[600]} style={{ marginBottom: 6 }}>
              Email
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
              <Icon name="user" size={18} color={colors.neutral[400]} strokeWidth={2} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nama@perusahaan.com"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
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
            </View>

            {error ? (
              <Txt size={12} color={colors.rose[700]} style={{ marginTop: 8 }}>
                {error}
              </Txt>
            ) : null}

            <Button
              label={loading ? "Mengirim…" : "Kirim Tautan Reset PIN"}
              size="lg"
              full
              onPress={loading ? undefined : handleSubmit}
              style={{ marginTop: 22 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function SentState({
  email,
  insets,
  onResend,
}: {
  email: string;
  insets: { bottom: number };
  onResend: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 22, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 22 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: colors.mint[100],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={44} color={colors.mint[700]} strokeWidth={2.5} />
        </View>
        <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 12 }}>
          <Txt size={21} weight="extrabold" color={colors.neutral[800]}>
            Tautan terkirim
          </Txt>
          <Txt size={14} color={colors.neutral[500]} style={{ textAlign: "center", lineHeight: 21 }}>
            Jika{" "}
            <Txt size={14} weight="bold" color={colors.neutral[700]}>
              {email.trim() || "email Anda"}
            </Txt>{" "}
            terdaftar, kami telah mengirim tautan untuk membuat PIN baru. Buka tautan di email, lalu
            masuk lagi dengan PIN baru Anda.
          </Txt>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Button label="Kembali" size="lg" full onPress={() => router.back()} />
        <Pressable onPress={onResend} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 8 }}>
          <Txt size={13} weight="bold" color={colors.brand[600]}>
            Tidak menerima email? Kirim ulang
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
