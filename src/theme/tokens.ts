// Comuna design tokens — ported from the "Corelia HRIS Mobile" design bundle.
// Brand: indigo/violet #6B5BFF (sama dengan web Comuna). Friendly & rounded.

export const colors = {
  brand: {
    50: "#F3F2FF",
    100: "#E8E4FF",
    200: "#D0C8FF",
    300: "#A89AFF",
    400: "#8776FF",
    500: "#6B5BFF", // primary
    600: "#5543EC",
    700: "#4434C4",
    800: "#33278F",
    900: "#231C66",
    950: "#15103D",
  },
  // Accent: soft coral (highlights, notifications)
  coral: { 100: "#FFE8E0", 300: "#FFB199", 500: "#FF7A5C", 700: "#D94E2D" },
  // Accent: mint (success / approved)
  mint: { 100: "#DFF7EC", 300: "#8CE0B8", 500: "#2FB47A", 700: "#1C8055" },
  // Accent: amber (warnings / late)
  amber: { 100: "#FFF1D6", 300: "#FFC976", 500: "#F5A524", 700: "#B26B00" },
  // Accent: rose (errors / absent)
  rose: { 100: "#FFE1E6", 300: "#FF9EAE", 500: "#F2426A", 700: "#B31E45" },
  // Neutrals — subtly cool tone
  neutral: {
    0: "#FFFFFF",
    25: "#FBFAFE", // app background (warm white w/ hint of violet)
    50: "#F6F4FC",
    100: "#EDEAF5",
    200: "#DAD4E8",
    300: "#B8B0CC",
    400: "#8F86A8",
    500: "#6B6483",
    600: "#4E475F",
    700: "#2F2A3E",
    800: "#1C1827",
    900: "#100D1A",
  },
} as const;

export type Tone = "neutral" | "brand" | "mint" | "coral" | "amber" | "rose";

// Font family names registered via expo-font (see app/_layout.tsx).
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
  mono: "JetBrainsMono_500Medium",
} as const;

export const radii = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

// Soft shadow presets (iOS shadow* + Android elevation).
export const shadows = {
  card: {
    shadowColor: "#281E5A",
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  elevated: {
    shadowColor: "#281E5A",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

// ── Format helpers (id-ID) ───────────────────────────────────────────────
export const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
export const rupiahShort = (n: number) => {
  if (n >= 1_000_000)
    return "Rp " + (n / 1_000_000).toFixed(1).replace(".0", "") + " jt";
  if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + "rb";
  return "Rp " + n;
};
