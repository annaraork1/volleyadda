import React from "react";
import { Text, View } from "react-native";
import { Card, Empty, LiveGate, Muted, Row, Screen, TeamLogo } from "../../src/components/ui";
import { useLive } from "../../src/context/LiveContext";
import { AWARD_IDS, AWARD_LABELS, emptyAwards } from "../../src/shared";
import { colors } from "../../src/theme";

export default function Awards() {
  const { refresh, team } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state, calc) => {
          const awards = { ...emptyAwards(), ...(state.config.awards || {}) };
          const final = state.config.fixtures.find((f) => f.stage === "Final");
          const finalDone = !!final && calc.ms[final.id]?.status === "done";
          const any = AWARD_IDS.some((id) => awards[id]);
          return (
            <>
              {!finalDone && !any && <Empty>Awards are announced after the Final.</Empty>}
              {AWARD_IDS.map((id) => {
                const e = awards[id];
                const p = e ? state.players.find((x) => x.no === e.playerNo) : undefined;
                const t = e ? team(e.teamId) : undefined;
                return (
                  <Card key={id}>
                    <Muted>{AWARD_LABELS[id].toUpperCase()}</Muted>
                    {e ? (
                      <Row gap={12}>
                        <TeamLogo logo={t?.logo} color={t?.color} size={44} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                            {p?.name ?? `Player #${e.playerNo}`}
                          </Text>
                          <Muted>
                            #{e.playerNo} · {t?.name ?? e.teamId}
                          </Muted>
                        </View>
                      </Row>
                    ) : (
                      <Muted>Not announced yet</Muted>
                    )}
                  </Card>
                );
              })}
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
