import React from "react";
import { Text } from "react-native";
import { Card, H2, LiveGate, MatchCard, Muted, Row, Screen, StandingsTable, TeamLogo } from "../src/components/ui";
import { useLive } from "../src/context/LiveContext";
import { colors } from "../src/theme";

export default function Standings() {
  const { refresh, team } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state, calc) => {
          const playoffs = state.config.fixtures.filter((f) => f.stage !== "League").sort((a, b) => a.no - b.no);
          const champ = team(calc.champion);
          return (
            <>
              {champ && (
                <Card style={{ alignItems: "center", gap: 6, borderColor: colors.warn }}>
                  <Muted>CHAMPIONS</Muted>
                  <TeamLogo logo={champ.logo} color={champ.color} size={72} />
                  <H2>{champ.name}</H2>
                </Card>
              )}
              <H2>Points table</H2>
              <Card>
                <StandingsTable />
              </Card>
              <Muted>
                P played · W won · L lost · Sets won-lost · Pts league points. Tie-breaks follow the tournament rules.
              </Muted>
              {playoffs.length > 0 && (
                <>
                  <H2>Playoffs</H2>
                  {!calc.leagueDone && (
                    <Row>
                      <Text style={{ color: colors.muted }}>Playoff teams are decided once the league finishes.</Text>
                    </Row>
                  )}
                  {playoffs.map((f) => (
                    <MatchCard key={f.id} fx={f} />
                  ))}
                </>
              )}
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
