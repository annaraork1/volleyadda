import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, LiveGate, Muted, Pill, Row, Screen, TeamLogo } from "../../src/components/ui";
import { useLive } from "../../src/context/LiveContext";
import { colors } from "../../src/theme";

export default function Seasons() {
  const { refresh, setSeason } = useLive();
  const router = useRouter();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => (
          <>
            <Muted>Tap a season to view its fixtures, table and results.</Muted>
            {state.registry.tournaments.map((t) => {
              const open = t.key === state.tournamentKey;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setSeason(t.key);
                    router.replace("/");
                  }}
                >
                  <Card style={open ? { borderColor: colors.accent } : undefined}>
                    <Row gap={12}>
                      <TeamLogo logo={t.logo} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{t.name}</Text>
                        <Muted>{[t.subtitle, t.dates].filter(Boolean).join(" · ")}</Muted>
                      </View>
                      {open && <Pill text="Open" />}
                      {t.key === state.registry.activeKey && <Pill text="Active" color={colors.good} />}
                    </Row>
                  </Card>
                </Pressable>
              );
            })}
          </>
        )}
      </LiveGate>
    </Screen>
  );
}
