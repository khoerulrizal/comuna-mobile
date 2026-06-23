// Comuna mobile UI kit — ported from the design's corelia-ui.jsx to React Native.
import React from "react";
import {
  Pressable,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radii, shadows, type Tone } from "@/theme/tokens";

export { Icon, type IconName } from "./Icon";

// ── Text ──────────────────────────────────────────────────────────────────
type Weight = keyof typeof fonts;

export function Txt({
  children,
  weight = "regular",
  size = 14,
  color = colors.neutral[800],
  style,
  ...rest
}: TextProps & {
  weight?: Weight;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts[weight], fontSize: size, color, letterSpacing: -0.2 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  pad = 16,
  radius = radii.lg,
  elevated = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  pad?: number;
  radius?: number;
  elevated?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.neutral[0],
          borderRadius: radius,
          padding: pad,
        },
        elevated ? shadows.elevated : shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Pill / Badge ────────────────────────────────────────────────────────────
const PILL_TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutral[100], fg: colors.neutral[700] },
  brand: { bg: colors.brand[100], fg: colors.brand[700] },
  mint: { bg: colors.mint[100], fg: colors.mint[700] },
  coral: { bg: colors.coral[100], fg: colors.coral[700] },
  amber: { bg: colors.amber[100], fg: colors.amber[700] },
  rose: { bg: colors.rose[100], fg: colors.rose[700] },
};

export function Pill({
  children,
  tone = "neutral",
  style,
}: {
  children: React.ReactNode;
  tone?: Tone;
  style?: ViewStyle;
}) {
  const t = PILL_TONES[tone];
  // Bungkus dalam <Txt> bila ada child string/angka (termasuk hasil interpolasi
  // yang menjadi array, mis. `Teks ({n} m)`), agar tidak ada teks telanjang di View.
  const hasText = React.Children.toArray(children).some(
    (c) => typeof c === "string" || typeof c === "number",
  );
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: radii.pill,
          backgroundColor: t.bg,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      {hasText ? (
        <Txt weight="semibold" size={11.5} color={t.fg}>
          {children}
        </Txt>
      ) : (
        children
      )}
    </View>
  );
}

// ── Button ──────────────────────────────────────────────────────────────────
type ButtonVariant =
  | "primary"
  | "dark"
  | "ghost"
  | "outline"
  | "soft"
  | "danger"
  | "success";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANTS: Record<ButtonVariant, { bg: string; fg: string; bd: string }> = {
  primary: { bg: colors.brand[500], fg: "#fff", bd: "transparent" },
  dark: { bg: colors.neutral[800], fg: "#fff", bd: "transparent" },
  ghost: { bg: "transparent", fg: colors.brand[600], bd: "transparent" },
  outline: { bg: "#fff", fg: colors.neutral[700], bd: colors.neutral[200] },
  soft: { bg: colors.brand[100], fg: colors.brand[700], bd: "transparent" },
  danger: { bg: colors.rose[500], fg: "#fff", bd: "transparent" },
  success: { bg: colors.mint[500], fg: "#fff", bd: "transparent" },
};
const BTN_SIZES: Record<ButtonSize, { h: number; px: number; fs: number; r: number }> = {
  sm: { h: 36, px: 14, fs: 13.5, r: 12 },
  md: { h: 48, px: 18, fs: 15, r: 16 },
  lg: { h: 56, px: 22, fs: 16, r: 18 },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  onPress,
  left,
  style,
}: {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  left?: React.ReactNode;
  style?: ViewStyle;
}) {
  const v = BTN_VARIANTS[variant];
  const s = BTN_SIZES[size];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: s.h,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderWidth: 1,
          borderColor: v.bd,
          borderRadius: s.r,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: full ? "100%" : undefined,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        variant === "primary" && !disabled ? shadows.elevated : null,
        style,
      ]}
    >
      {left}
      <Txt weight="bold" size={s.fs} color={v.fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────
export function Avatar({
  name = "AB",
  size = 40,
  style,
}: {
  name?: string;
  size?: number;
  style?: ViewStyle;
}) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.brand[300],
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Txt weight="bold" size={size * 0.38} color="#fff">
        {initials}
      </Txt>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        },
        style,
      ]}
    >
      <Txt weight="extrabold" size={15} color={colors.neutral[800]}>
        {title}
      </Txt>
      {action ? (
        <Pressable
          onPress={onAction}
          style={{
            backgroundColor: colors.brand[100],
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: radii.pill,
          }}
        >
          <Txt weight="bold" size={11.5} color={colors.brand[600]}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
