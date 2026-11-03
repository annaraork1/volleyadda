import React from "react";
import { Platform, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../../src/theme";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(outline: IonName, filled: IonName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? filled : outline}
      size={size ?? 22}
      color={(color as string) || colors.muted}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 64 : 60,
          paddingTop: 6,
          paddingBottom: Platform.OS === "web" ? 10 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: 12,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Live",
          tabBarLabel: "Live",
          tabBarAccessibilityLabel: "Live",
          tabBarIcon: tabIcon("radio-outline", "radio"),
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: "Fixtures",
          tabBarLabel: "Fixtures",
          tabBarAccessibilityLabel: "Fixtures",
          tabBarIcon: tabIcon("calendar-outline", "calendar"),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "Standings",
          tabBarLabel: "Table",
          tabBarAccessibilityLabel: "Table",
          tabBarIcon: tabIcon("stats-chart-outline", "stats-chart"),
        }}
      />
      <Tabs.Screen
        name="teams/index"
        options={{
          title: "Teams",
          tabBarLabel: "Teams",
          tabBarAccessibilityLabel: "Teams",
          tabBarIcon: tabIcon("people-outline", "people"),
        }}
      />
    </Tabs>
  );
}
