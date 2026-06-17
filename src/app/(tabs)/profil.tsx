import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Icon, type IconName, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { me } from "@/data/mock";
import { getUser, type SessionUser } from "@/lib/session";
import { hasPin } from "@/lib/pin";
import { signOut } from "@/lib/auth";
import {
  authenticate,
  biometricDiagnostics,
  biometricLabel,
  getBiometricType,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricType,
} from "@/lib/biometric";

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bioType, setBioType] = useState<BiometricType>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [busy, setBusy] = useState(false);

  // Muat ulang status tiap kali layar difokuskan (mis. balik dari Ubah PIN).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [u, type, enabled, hp] = await Promise.all([
          getUser(),
          getBiometricType(),
          isBiometricEnabled(),
          hasPin(),
        ]);
        if (!active) return;
        setUser(u);
        setBioType(type);
        setBioEnabled(enabled);
        setPinSet(hp);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const label = biometricLabel(bioType);

  async function toggleBiometric(next: boolean) {
    if (busy) return;
    if (!next) {
      await setBiometricEnabled(false);
      setBioEnabled(false);
      return;
    }
    if (!pinSet) {
      Alert.alert("Atur PIN dulu", "Buat PIN terlebih dahulu sebelum mengaktifkan biometrik.");
      return;
    }
    setBusy(true);
    // Cek ulang langsung saat ditekan (deteksi bisa berubah setelah enroll di Settings).
    const type = await getBiometricType();
    if (!type) {
      const d = await biometricDiagnostics();
      setBusy(false);
      Alert.alert(
        "Biometrik belum aktif",
        `${d.reason}\n\n[diagnosa] platform=${d.platform}, sensor=${d.hasHardware}, terdaftar=${d.isEnrolled}, tipe=[${d.types.join(",")}]`,
      );
      return;
    }
    setBioType(type);
    const ok = await authenticate(`Aktifkan ${biometricLabel(type)}`);
    setBusy(false);
    if (!ok) return; // batal → biarkan toggle off
    await setBiometricEnabled(true);
    setBioEnabled(true);
  }

  function confirmLogout() {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  const name = user?.name || me.name;
  const subtitle = user?.email || me.location;
  const bioIcon: IconName = bioType === "fingerprint" ? "fingerprint" : "user";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.neutral[25] }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header profil */}
      <View style={{ paddingHorizontal: 20, alignItems: "center", gap: 10, marginTop: 12, marginBottom: 24 }}>
        <Avatar name={name} size={72} />
        <Txt size={18} weight="extrabold" color={colors.neutral[900]}>
          {name}
        </Txt>
        <Txt size={13} color={colors.neutral[500]}>
          {subtitle}
        </Txt>
      </View>

      {/* Keamanan */}
      <View style={{ paddingHorizontal: 16 }}>
        <Txt size={12} weight="bold" color={colors.neutral[400]} style={{ marginLeft: 6, marginBottom: 8, letterSpacing: 0.4 }}>
          KEAMANAN
        </Txt>
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.neutral[100],
            overflow: "hidden",
          }}
        >
          {/* Toggle biometrik */}
          <Row
            icon={bioIcon}
            accent={bioType === "fingerprint" ? colors.coral[500] : colors.brand[500]}
            title={`Buka dengan ${label}`}
            subtitle={
              bioEnabled
                ? "Aktif"
                : !pinSet
                  ? "Atur PIN dulu untuk mengaktifkan"
                  : "Nonaktif — ketuk untuk aktifkan"
            }
            right={
              <Switch
                value={bioEnabled}
                onValueChange={toggleBiometric}
                disabled={busy}
                trackColor={{ false: colors.neutral[200], true: colors.brand[400] }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          {/* Ubah / Buat PIN */}
          <Row
            icon="lock"
            accent={colors.brand[500]}
            title={pinSet ? "Ubah PIN" : "Buat PIN"}
            subtitle={pinSet ? "Ganti PIN unlock 6 digit" : "Belum diatur"}
            onPress={() => router.push("/create-pin")}
            right={<Icon name="chevronRight" size={18} color={colors.neutral[300]} strokeWidth={2} />}
          />
        </View>

        {/* Keluar */}
        <Pressable
          onPress={confirmLogout}
          style={({ pressed }) => ({
            marginTop: 24,
            height: 52,
            borderRadius: radii.md,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: colors.rose[100],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="logout" size={18} color={colors.rose[500]} strokeWidth={2} />
          <Txt size={14.5} weight="bold" color={colors.rose[500]}>
            Keluar
          </Txt>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  accent,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: IconName;
  accent: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: accent + "14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} color={accent} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={14.5} weight="bold" color={colors.neutral[800]}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={12} color={colors.neutral[400]}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.neutral[100], marginLeft: 64 }} />;
}
