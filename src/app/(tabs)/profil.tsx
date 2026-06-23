// Profil — desain "Corelia HRIS Mobile" (ProfileScreen), data nyata dari API aman.
// Cover gradient + stats mengambang + Informasi Pribadi/Pekerjaan/Pengaturan.
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Switch, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Button, Card, Icon, type IconName, SectionHeader, Txt } from "@/components/ui";
import { ChangePinModal, ConfirmModal, MessageModal } from "@/components/modals";
import { colors } from "@/theme/tokens";
import { formatTanggal, getProfile, type Profile } from "@/lib/profile";
import { hasPin } from "@/lib/pin";
import { signOut } from "@/lib/auth";
import { AuthError } from "@/lib/api";
import {
  authenticate,
  biometricDiagnostics,
  biometricLabel,
  getBiometricType,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricType,
} from "@/lib/biometric";

const HELP_URL = "https://comuna.id/pusat-pengetahuan";

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bioType, setBioType] = useState<BiometricType>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [busy, setBusy] = useState(false);

  // Modal state
  const [showPin, setShowPin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showHr, setShowHr] = useState(false);
  const [bioDiag, setBioDiag] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [p, type, enabled, hp] = await Promise.all([
        getProfile(),
        getBiometricType(),
        isBiometricEnabled(),
        hasPin(),
      ]);
      setProfile(p);
      setBioType(type);
      setBioEnabled(enabled);
      setPinSet(hp);
    } catch (e) {
      if (e instanceof AuthError) {
        router.replace("/login");
        return;
      }
      setLoadError(e instanceof Error ? e.message : "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat ulang tiap layar difokuskan (mis. setelah ubah PIN).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
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
      setShowPin(true);
      return;
    }
    setBusy(true);
    const type = await getBiometricType();
    if (!type) {
      const d = await biometricDiagnostics();
      setBusy(false);
      // Diagnosa singkat lewat MessageModal lebih ramah, tapi pakai info sederhana.
      setBioDiag(`${d.reason}`);
      return;
    }
    setBioType(type);
    const ok = await authenticate(`Aktifkan ${biometricLabel(type)}`);
    setBusy(false);
    if (!ok) return;
    await setBiometricEnabled(true);
    setBioEnabled(true);
  }

  async function doLogout() {
    setShowLogout(false);
    await signOut();
    router.replace("/login");
  }

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.neutral[25], alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand[500]} />
        <Txt size={13} color={colors.neutral[400]} style={{ marginTop: 12 }}>
          Memuat profil…
        </Txt>
      </View>
    );
  }
  if (loadError && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.neutral[25], alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.rose[100], alignItems: "center", justifyContent: "center" }}>
          <Icon name="info" size={26} color={colors.rose[500]} strokeWidth={2} />
        </View>
        <Txt size={15} weight="bold" color={colors.neutral[800]}>
          Gagal memuat profil
        </Txt>
        <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center" }}>
          {loadError}
        </Txt>
        <Button label="Coba lagi" size="md" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const p = profile!;
  const h = p.header;
  const s = p.stats;
  const tenureLabel = s.tenure ? s.tenure.label : "-";
  const leaveLabel = s.annualLeaveRemaining != null ? String(s.annualLeaveRemaining) : "-";
  const reviewLabel = s.reviewScore != null ? String(s.reviewScore) : "-";

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25] }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        {/* Cover + avatar */}
        <LinearGradient
          colors={[colors.brand[700], colors.brand[500], colors.coral[500]]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingBottom: 70, paddingHorizontal: 20, overflow: "hidden" }}
        >
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          />
          <Txt size={15} weight="extrabold" color="#fff">
            Profil
          </Txt>

          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,255,255,0.6)" }}>
              {h.photoUrl ? (
                <Image source={{ uri: h.photoUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <Avatar name={h.fullName} size={72} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={19} weight="extrabold" color="#fff">
                {h.fullName}
              </Txt>
              {h.position ? (
                <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }}>
                  {h.position}
                </Txt>
              ) : null}
              {h.employeeNumber ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 8,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 999,
                  }}
                >
                  <Txt size={10.5} weight="bold" color="#fff">
                    NIK {h.employeeNumber}
                  </Txt>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
          {/* Quick stats — floating */}
          <Card pad={0} radius={22} elevated>
            <View style={{ flexDirection: "row" }}>
              <MetaCell n={tenureLabel} label="Masa kerja" />
              <MetaCell n={leaveLabel} label="Sisa cuti" border />
              <MetaCell n={reviewLabel} label="Review" border />
            </View>
          </Card>

          {/* Informasi Pribadi */}
          <View style={{ marginTop: 18 }}>
            <SectionHeader title="Informasi Pribadi" action="Edit" onAction={() => setShowHr(true)} />
            <Card pad={0} radius={18}>
              <InfoRow label="Email" value={p.personal.email} icon="info" color={colors.brand[500]} />
              <InfoRow label="Telepon" value={p.personal.phone ?? "-"} icon="clock" color={colors.mint[500]} />
              <InfoRow
                label="Tanggal Lahir"
                value={formatTanggal(p.personal.dateOfBirth) ?? "-"}
                icon="star"
                color={colors.coral[500]}
              />
              <InfoRow
                label="Jenis Kelamin"
                value={p.personal.genderLabel ?? "-"}
                icon="user"
                color={colors.brand[500]}
              />
              <InfoRow
                label="Status Perkawinan"
                value={p.personal.maritalStatusLabel ?? "-"}
                icon="users"
                color={colors.amber[500]}
                last
              />
            </Card>
          </View>

          {/* Informasi Pekerjaan */}
          <View style={{ marginTop: 18 }}>
            <SectionHeader title="Informasi Pekerjaan" />
            <Card pad={0} radius={18}>
              <InfoRow
                label="Status"
                value={statusValue(p.work)}
                icon="briefcase"
                color={p.work.isActive ? colors.mint[500] : colors.rose[500]}
              />
              <InfoRow label="Departemen" value={p.work.department ?? "-"} icon="users" color={colors.brand[500]} />
              <InfoRow label="Cabang" value={p.work.branch ?? "-"} icon="building" color={colors.amber[500]} />
              <InfoRow label="Atasan Langsung" value={p.work.supervisor ?? "-"} icon="user" color={colors.neutral[500]} last />
            </Card>
          </View>

          {/* Pengaturan */}
          <View style={{ marginTop: 18 }}>
            <SectionHeader title="Pengaturan" />
            <Card pad={0} radius={18}>
              <InfoRow
                label={`Buka dengan ${label}`}
                value={bioEnabled ? "Aktif" : !pinSet ? "Atur PIN dulu" : "Nonaktif"}
                icon={bioType === "fingerprint" ? "fingerprint" : "user"}
                color={bioType === "fingerprint" ? colors.coral[500] : colors.brand[500]}
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
              <InfoRow
                label={pinSet ? "Ubah PIN" : "Buat PIN"}
                value={pinSet ? "PIN unlock 6 digit" : "Belum diatur"}
                icon="shield"
                color={colors.amber[500]}
                chevron
                onPress={() => setShowPin(true)}
              />
              <InfoRow
                label="Bantuan"
                value="Pusat Pengetahuan"
                icon="info"
                color={colors.mint[500]}
                chevron
                onPress={() => Linking.openURL(HELP_URL)}
                last
              />
            </Card>
          </View>

          {/* Keluar */}
          <View style={{ marginTop: 18 }}>
            <Card pad={0} radius={18}>
              <Pressable
                onPress={() => setShowLogout(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.rose[100],
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="logout" size={18} color={colors.rose[500]} strokeWidth={2} />
                </View>
                <Txt size={14} weight="bold" color={colors.rose[700]}>
                  Keluar
                </Txt>
              </Pressable>
            </Card>
          </View>

          <Txt size={10.5} color={colors.neutral[400]} style={{ textAlign: "center", marginTop: 16 }}>
            Comuna v1.0.0 · Build 2606
          </Txt>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <ChangePinModal
        visible={showPin}
        onClose={() => {
          setShowPin(false);
          load();
        }}
        onSessionExpired={() => router.replace("/login")}
      />
      <ConfirmModal
        visible={showLogout}
        icon="logout"
        title="Keluar dari akun?"
        message="Anda perlu masuk kembali dengan email & kata sandi untuk menggunakan aplikasi."
        confirmLabel="Ya, keluar"
        cancelLabel="Tidak"
        onConfirm={doLogout}
        onCancel={() => setShowLogout(false)}
      />
      <MessageModal
        visible={showHr}
        icon="users"
        title="Edit Profil"
        message="Untuk mengubah data profil Anda, silakan hubungi tim HR perusahaan Anda."
        onClose={() => setShowHr(false)}
      />
      <MessageModal
        visible={!!bioDiag}
        icon="fingerprint"
        tint={colors.coral[500]}
        bg={colors.coral[100]}
        title="Biometrik belum aktif"
        message={bioDiag ?? ""}
        onClose={() => setBioDiag(null)}
      />
    </View>
  );
}

function statusValue(w: Profile["work"]): string {
  const base = w.statusLabel ?? "-";
  if (w.contractLabel) return `${base} · ${w.contractLabel}`;
  return base;
}

function MetaCell({ n, label, border }: { n: string; label: string; border?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: "center",
        borderLeftWidth: border ? 1 : 0,
        borderColor: colors.neutral[100],
      }}
    >
      <Txt size={17} weight="extrabold" color={colors.neutral[900]}>
        {n}
      </Txt>
      <Txt size={10.5} weight="semibold" color={colors.neutral[500]} style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
  color,
  chevron,
  right,
  onPress,
  last,
}: {
  label: string;
  value: string;
  icon: IconName;
  color: string;
  chevron?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 13,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderColor: colors.neutral[100],
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: color + "1A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={16} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={11} weight="semibold" color={colors.neutral[500]}>
          {label}
        </Txt>
        {value ? (
          <Txt size={13.5} weight="bold" color={colors.neutral[800]} style={{ marginTop: 1 }}>
            {value}
          </Txt>
        ) : null}
      </View>
      {right ?? (chevron ? <Icon name="chevronRight" size={15} color={colors.neutral[300]} strokeWidth={2} /> : null)}
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
