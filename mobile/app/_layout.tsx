import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/context/AuthContext";
import { LiveProvider } from "../src/context/LiveContext";
import { colors } from "../src/theme";

const titles: Record<string, string> = {
  index: "VolleyAdda",
  "auth/login": "Sign in",
  "auth/signup": "Create account",
  "match/[id]": "Match",
  fixtures: "Fixtures",
  standings: "Standings",
  "teams/index": "Teams",
  "teams/[id]": "Team",
  rules: "Rules",
  awards: "Awards",
  seasons: "Seasons",
  "score/index": "Score a match",
  "score/[id]": "Scorer",
  "practice/index": "Practice matches",
  "practice/new": "New practice match",
  "practice/[id]": "Practice match",
  register: "Player registration",
  "admin/index": "Organiser",
  "admin/teams": "Teams",
  "admin/fixtures": "Fixtures",
  "admin/rules": "Match rules",
  "admin/registrations": "Registrations",
  "auction/board": "Auction board",
  "auction/owner": "Owner bidding",
  "auction/console": "Auction console",
  gallery: "Gallery",
  report: "Report a problem",
  "tournament/create": "Create tournament",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LiveProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "slide_from_right",
            }}
          >
            {Object.entries(titles).map(([name, title]) => (
              <Stack.Screen key={name} name={name} options={{ title }} />
            ))}
          </Stack>
        </LiveProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
