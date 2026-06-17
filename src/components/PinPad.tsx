// Komponen PIN reusable: indikator titik + keypad numerik dengan tombol biometrik opsional.
// Dipakai di Buat PIN (create-pin) & Buka Kunci (unlock). Lintas iOS/Android.
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";

// ── Indikator titik PIN ─────────────────────────────────────────────────────
export function PinDots({
  length,
  filled,
  error = false,
}: {
  length: number;
  filled: number;
  error?: boolean;
}) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-7, { duration: 50 }),
        withTiming(7, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shake]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View
      style={[{ flexDirection: "row", gap: 16, justifyContent: "center" }, style]}
    >
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        const color = error
          ? colors.rose[500]
          : isFilled
            ? colors.brand[500]
            : colors.neutral[200];
        return (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: isFilled ? color : "transparent",
              borderWidth: isFilled ? 0 : 2,
              borderColor: color,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

// ── Keypad numerik ──────────────────────────────────────────────────────────
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function Keypad({
  onDigit,
  onDelete,
  bioIcon,
  onBio,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  bioIcon?: IconName;
  onBio?: () => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          rowGap: 18,
          columnGap: 24,
        }}
      >
        {KEYS.map((k) => (
          <Key key={k} label={k} onPress={() => onDigit(k)} />
        ))}
        {/* Slot kiri-bawah: biometrik atau kosong */}
        {bioIcon && onBio ? (
          <Key icon={bioIcon} onPress={onBio} />
        ) : (
          <View style={{ width: KEY_SIZE, height: KEY_SIZE }} />
        )}
        <Key label="0" onPress={() => onDigit("0")} />
        <Key icon="chevronLeft" onPress={onDelete} muted />
      </View>
    </View>
  );
}

const KEY_SIZE = 72;

function Key({
  label,
  icon,
  onPress,
  muted = false,
}: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: KEY_SIZE,
        height: KEY_SIZE,
        borderRadius: KEY_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colors.neutral[100] : "transparent",
      })}
    >
      {label ? (
        <Txt size={28} weight="semibold" color={colors.neutral[800]}>
          {label}
        </Txt>
      ) : icon ? (
        <Icon
          name={icon}
          size={26}
          color={muted ? colors.neutral[500] : colors.brand[500]}
          strokeWidth={2}
        />
      ) : null}
    </Pressable>
  );
}
