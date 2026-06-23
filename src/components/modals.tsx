// Modal kit untuk layar Profil — Ubah PIN, konfirmasi, & pesan info.
// Konsisten dengan desain Comuna (brand indigo, rounded, Plus Jakarta Sans).
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button, Icon, type IconName, Txt } from "@/components/ui";
import { colors, radii, shadows } from "@/theme/tokens";
import { Keypad, PinDots } from "@/components/PinPad";
import { PIN_LENGTH, setPin } from "@/lib/pin";

// ── Shell: backdrop + kartu tengah ─────────────────────────────────────────
function Sheet({ children, onRequestClose }: { children: React.ReactNode; onRequestClose: () => void }) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(16,13,26,0.55)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={[
            { backgroundColor: "#fff", borderRadius: radii.xl, padding: 22 },
            shadows.elevated,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

function IconBadge({ icon, tint, bg }: { icon: IconName; tint: string; bg: string }) {
  return (
    <View
      style={{
        alignSelf: "center",
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
      }}
    >
      <Icon name={icon} size={26} color={tint} strokeWidth={2} />
    </View>
  );
}

// ── Pesan info (1 tombol) — mis. "hubungi HR" ──────────────────────────────
export function MessageModal({
  visible,
  icon = "info",
  tint = colors.brand[600],
  bg = colors.brand[100],
  title,
  message,
  buttonLabel = "Mengerti",
  onClose,
}: {
  visible: boolean;
  icon?: IconName;
  tint?: string;
  bg?: string;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Sheet onRequestClose={onClose}>
      <IconBadge icon={icon} tint={tint} bg={bg} />
      <Txt size={18} weight="extrabold" color={colors.neutral[900]} style={{ textAlign: "center" }}>
        {title}
      </Txt>
      <Txt
        size={13.5}
        color={colors.neutral[500]}
        style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}
      >
        {message}
      </Txt>
      <Button label={buttonLabel} size="md" full onPress={onClose} style={{ marginTop: 18 }} />
    </Sheet>
  );
}

// ── Konfirmasi Ya/Tidak — mis. Logout ──────────────────────────────────────
export function ConfirmModal({
  visible,
  icon = "info",
  tint = colors.rose[500],
  bg = colors.rose[100],
  title,
  message,
  confirmLabel = "Ya",
  cancelLabel = "Tidak",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  icon?: IconName;
  tint?: string;
  bg?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <Sheet onRequestClose={onCancel}>
      <IconBadge icon={icon} tint={tint} bg={bg} />
      <Txt size={18} weight="extrabold" color={colors.neutral[900]} style={{ textAlign: "center" }}>
        {title}
      </Txt>
      <Txt
        size={13.5}
        color={colors.neutral[500]}
        style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}
      >
        {message}
      </Txt>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
        <Button label={cancelLabel} variant="outline" size="md" onPress={onCancel} style={{ flex: 1 }} />
        <Button
          label={confirmLabel}
          variant={destructive ? "danger" : "primary"}
          size="md"
          onPress={onConfirm}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}

// ── Ubah PIN — masukkan PIN baru → konfirmasi → sukses ──────────────────────
type Stage = "enter" | "confirm" | "saving" | "success";

export function ChangePinModal({
  visible,
  onClose,
  onSessionExpired,
}: {
  visible: boolean;
  onClose: () => void;
  onSessionExpired?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("enter");
  const [first, setFirst] = useState("");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function reset() {
    setStage("enter");
    setFirst("");
    setPinValue("");
    setError(false);
    setServerError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function commit(nextPin: string) {
    if (stage === "enter") {
      setFirst(nextPin);
      setPinValue("");
      setStage("confirm");
      return;
    }
    if (nextPin !== first) {
      setError(true);
      setTimeout(() => {
        setError(false);
        setPinValue("");
        setFirst("");
        setStage("enter");
      }, 600);
      return;
    }
    setStage("saving");
    const res = await setPin(nextPin);
    if (!res.ok) {
      if (res.sessionExpired) {
        reset();
        onSessionExpired?.();
        return;
      }
      setServerError(res.error ?? "Gagal menyimpan PIN");
      setPinValue("");
      setFirst("");
      setStage("enter");
      return;
    }
    setStage("success");
  }

  function onDigit(d: string) {
    if (stage === "saving" || error) return;
    if (pin.length >= PIN_LENGTH) return;
    setServerError(null);
    const next = pin + d;
    setPinValue(next);
    if (next.length === PIN_LENGTH) commit(next);
  }

  function onDelete() {
    setPinValue((p) => p.slice(0, -1));
  }

  if (!visible) return null;

  if (stage === "success") {
    return (
      <Sheet onRequestClose={handleClose}>
        <IconBadge icon="check" tint={colors.mint[700]} bg={colors.mint[100]} />
        <Txt size={18} weight="extrabold" color={colors.neutral[900]} style={{ textAlign: "center" }}>
          PIN berhasil diganti
        </Txt>
        <Txt
          size={13.5}
          color={colors.neutral[500]}
          style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}
        >
          PIN unlock 6 digit Anda telah diperbarui. Gunakan PIN baru saat membuka aplikasi.
        </Txt>
        <Button label="Selesai" size="md" full onPress={handleClose} style={{ marginTop: 18 }} />
      </Sheet>
    );
  }

  const title = stage === "confirm" ? "Konfirmasi PIN Baru" : "Masukkan PIN Baru";
  const subtitle =
    stage === "confirm"
      ? "Masukkan ulang PIN baru untuk memastikan."
      : "Buat PIN 6 digit baru untuk membuka aplikasi.";

  return (
    <Sheet onRequestClose={handleClose}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt size={16} weight="extrabold" color={colors.neutral[900]}>
          Ubah PIN
        </Txt>
        <Pressable onPress={handleClose} hitSlop={8}>
          <Icon name="close" size={20} color={colors.neutral[400]} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={{ alignItems: "center", gap: 16, marginTop: 18 }}>
        <Txt size={15} weight="bold" color={colors.neutral[800]}>
          {title}
        </Txt>
        <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center", lineHeight: 18 }}>
          {subtitle}
        </Txt>
        <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />
        {error ? (
          <Txt size={12} weight="semibold" color={colors.rose[700]}>
            PIN tidak cocok. Coba lagi.
          </Txt>
        ) : serverError ? (
          <Txt size={12} weight="semibold" color={colors.rose[700]} style={{ textAlign: "center" }}>
            {serverError}
          </Txt>
        ) : stage === "saving" ? (
          <Txt size={12} weight="semibold" color={colors.neutral[400]}>
            Menyimpan…
          </Txt>
        ) : null}
      </View>

      <View style={{ marginTop: 14 }}>
        <Keypad onDigit={onDigit} onDelete={onDelete} />
      </View>
    </Sheet>
  );
}
