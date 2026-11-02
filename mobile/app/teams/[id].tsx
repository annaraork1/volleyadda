import React from "react";
import { Image, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, Empty, H1, LiveGate, Muted, Pill, Row, Screen, TeamLogo } from "../../src/components/ui";
import { absoluteUrl } from "../../src/api/absoluteUrl";
import { useLive } from "../../src/context/LiveContext";
import { colors } from "../../src/theme";

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state, calc) => {
          const t = state.config.teams.find((x) => x.id === id);
          if (!t) return <Empty>Team not found.</Empty>;
          const row = calc.table.find((r) => r.team === t.id);
          const squad = state.players.filter((p) => p.team === t.id || t.squad.includes(p.no));
          return (
            <>
              <Row gap={14}>
                <TeamLogo logo={t.logo} color={t.color} size={72} />
                <View style={{ flex: 1 }}>
                  <H1>{t.name}</H1>
                  {t.owner ? <Muted>Owner: {t.owner}</Muted> : null}
                </View>
              </Row>
              {row && (
                <Card>
                  <Row style={{ justifyContent: "space-around" }}>
                    {[
                      ["Played", row.played],
                      ["Won", row.won],
                      ["Lost", row.lost],
                      ["Points", row.points],
                    ].map(([k, v]) => (
                      <View key={String(k)} style={{ alignItems: "center" }}>
                        <Text style={{ color: colors.accent, fontSize: 24, fontWeight: "800" }}>{v}</Text>
                        <Muted>{k}</Muted>
                      </View>
                    ))}
                  </Row>
                </Card>
              )}
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Squad ({squad.length})</Text>
              {squad.length === 0 ? (
                <Empty>Squad not announced yet.</Empty>
              ) : (
                squad.map((p) => {
                  const photo = state.config.settings.showPhotos ? absoluteUrl(p.photo) : undefined;
                  return (
                    <Card key={p.no}>
                      <Row gap={12}>
                        {photo ? (
                          <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        ) : (
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: colors.cardAlt,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: colors.text, fontWeight: "700" }}>{p.no}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{p.name}</Text>
                          <Muted>#{p.no}</Muted>
                        </View>
                        <Pill text={p.skill} color={colors.muted} />
                      </Row>
                    </Card>
                  );
                })
              )}
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
