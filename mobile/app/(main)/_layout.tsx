import React from "react";
import { Image, Pressable, Text } from "react-native";
import { Drawer } from "expo-router/drawer";
import { router } from "expo-router";
import { AppDrawer } from "../../src/components/AppDrawer";
import { colors, fonts } from "../../src/theme";

const HIDDEN = { drawerItemStyle: { display: "none" as const } };

function HeaderBrand() {
  return (
    <Pressable
      onPress={() => router.push("/")}
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <Image
        source={require("../../assets/logo.png")}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.displayExtra,
          fontSize: 20,
        }}
      >
        VolleyAdda
      </Text>
    </Pressable>
  );
}

export default function MainDrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <AppDrawer {...(props as any)} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontSize: 18,
          color: colors.text,
        },
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: colors.bg, width: 300 },
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.55)",
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "VolleyAdda",
          headerTitle: () => <HeaderBrand />,
          ...HIDDEN,
        }}
      />
      <Drawer.Screen name="gallery" options={{ title: "Gallery", ...HIDDEN }} />
      <Drawer.Screen name="awards" options={{ title: "Awards", ...HIDDEN }} />
      <Drawer.Screen name="rules" options={{ title: "Rules", ...HIDDEN }} />
      <Drawer.Screen name="seasons" options={{ title: "Seasons", ...HIDDEN }} />
      <Drawer.Screen name="register" options={{ title: "Register", ...HIDDEN }} />
      <Drawer.Screen name="report" options={{ title: "Report a problem", ...HIDDEN }} />
      <Drawer.Screen name="display" options={{ title: "Venue display", ...HIDDEN }} />
      <Drawer.Screen name="match/[id]" options={{ title: "Match", ...HIDDEN }} />
      <Drawer.Screen name="teams/[id]" options={{ title: "Team", ...HIDDEN }} />
      <Drawer.Screen name="score/index" options={{ title: "Score a match", ...HIDDEN }} />
      <Drawer.Screen name="score/[id]" options={{ title: "Scorer", headerShown: false, ...HIDDEN }} />
      <Drawer.Screen name="practice/index" options={{ title: "Practice matches", ...HIDDEN }} />
      <Drawer.Screen name="practice/new" options={{ title: "New practice match", ...HIDDEN }} />
      <Drawer.Screen name="practice/[id]" options={{ title: "Practice match", ...HIDDEN }} />
      <Drawer.Screen name="auction/live" options={{ title: "Auction live", ...HIDDEN }} />
      <Drawer.Screen name="auction/board" options={{ title: "Auction board", ...HIDDEN }} />
      <Drawer.Screen name="auction/owner" options={{ title: "Owner bidding", ...HIDDEN }} />
      <Drawer.Screen name="auction/console" options={{ title: "Auction console", ...HIDDEN }} />
      <Drawer.Screen name="auction/projector" options={{ title: "Projector", headerShown: false, ...HIDDEN }} />
      <Drawer.Screen name="standings/race" options={{ title: "Race calculator", ...HIDDEN }} />
      <Drawer.Screen name="admin/index" options={{ title: "Organiser", ...HIDDEN }} />
      <Drawer.Screen name="admin/teams" options={{ title: "Teams", ...HIDDEN }} />
      <Drawer.Screen name="admin/fixtures" options={{ title: "Fixtures", ...HIDDEN }} />
      <Drawer.Screen name="admin/rules" options={{ title: "Match rules", ...HIDDEN }} />
      <Drawer.Screen name="admin/registrations" options={{ title: "Registrations", ...HIDDEN }} />
      <Drawer.Screen name="tournament/create" options={{ title: "Create tournament", ...HIDDEN }} />
      <Drawer.Screen name="tournament/[key]" options={{ title: "Tournament", ...HIDDEN }} />
      <Drawer.Screen name="notices" options={{ title: "Notifications", ...HIDDEN }} />
    </Drawer>
  );
}
