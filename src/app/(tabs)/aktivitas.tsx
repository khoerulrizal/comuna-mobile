import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";

export default function AktivitasScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Txt size={22} weight="extrabold" color={colors.neutral[900]}>
          Aktivitas
        </Txt>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Icon name="chart" size={40} color={colors.neutral[300]} />
        <Txt size={13} color={colors.neutral[400]}>
          Segera hadir
        </Txt>
      </View>
    </View>
  );
}
