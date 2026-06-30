// Placeholder layar "Segera hadir" — header + pesan terpusat.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";

export default function ComingSoon({
  title, icon = "clock", desc,
}: { title: string; icon?: IconName; desc?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100], backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} />
        </Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ flex: 1, textAlign: "center" }}>{title}</Txt>
        <View style={{ width: 38 }} />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={32} color={colors.brand[600]} strokeWidth={1.8} />
        </View>
        <Txt size={16} weight="extrabold" color={colors.neutral[800]} style={{ textAlign: "center" }}>Segera hadir</Txt>
        <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center", lineHeight: 19 }}>
          {desc ?? "Fitur ini sedang dalam pengembangan dan akan tersedia di pembaruan berikutnya."}
        </Txt>
      </View>
    </View>
  );
}
