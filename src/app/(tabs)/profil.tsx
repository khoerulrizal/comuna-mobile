import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { me } from "@/data/mock";

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20, alignItems: "center", gap: 10, marginTop: 12 }}>
        <Avatar name={me.name} size={72} />
        <Txt size={18} weight="extrabold" color={colors.neutral[900]}>
          {me.name}
        </Txt>
        <Txt size={13} color={colors.neutral[500]}>
          {me.location}
        </Txt>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Icon name="user" size={40} color={colors.neutral[300]} />
        <Txt size={13} color={colors.neutral[400]}>
          Segera hadir
        </Txt>
      </View>
    </View>
  );
}
