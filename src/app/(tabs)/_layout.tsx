import React from "react";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";

// Derive the tab-bar prop type from expo-router's own Tabs (avoids @react-navigation mismatch).
type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  home: { label: "Home", icon: "home" },
  aktivitas: { label: "Aktivitas", icon: "chart" },
  profil: { label: "Profil", icon: "user" },
};

// Custom bottom tab bar — ported from the design's BottomTabs (3 tabs).
function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderTopWidth: 0.5,
        borderTopColor: colors.neutral[100],
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {state.routes.map((route, i) => {
        const meta = TAB_META[route.name] ?? { label: route.name, icon: "home" as IconName };
        const isActive = state.index === i;
        const color = isActive ? colors.brand[500] : colors.neutral[400];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isActive && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: "center", gap: 3 }}
          >
            <Icon
              name={meta.icon}
              size={24}
              color={color}
              strokeWidth={isActive ? 2.2 : 1.7}
              fill={isActive ? colors.brand[100] : "none"}
            />
            <Txt weight={isActive ? "bold" : "medium"} size={10.5} color={color}>
              {meta.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="aktivitas" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
