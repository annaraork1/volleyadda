import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, Empty, LiveGate, Muted, Row, Screen, TeamLogo } from "../../src/components/ui";
import { useLive } from "../../src/context/LiveContext";
import { colors } from "../../src/theme";

export default function Teams() {
  const { refresh } = useLive();
  const router = useRouter();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) =>
          state.config.teams.length === 0 ? (
            <Empty>No teams yet.</Empty>
          ) : (
            <>
              {state.config.teams.map((t) => (
                <Pressable key={t.id} onPress={() => router.push(`/teams/${t.id}`)}>
                  <Card>
                    <Row gap={12}>
                      <TeamLogo logo={t.logo} color={t.color} size={52} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{t.name}</Text>
                        <Muted>{t.owner ? `Owner: ${t.owner} · ` : ""}{t.squad.length} players</Muted>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
                    </Row>
                  </Card>
                </Pressable>
              ))}
            </>
          )
        }
      </LiveGate>
    </Screen>
  );
}
