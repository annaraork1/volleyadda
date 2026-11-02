import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Card, Empty, ErrorText, H2, Loading, Muted, Row, Screen, TeamLogo } from "../src/components/ui";
import { useLive } from "../src/context/LiveContext";
import { colors } from "../src/theme";

/** Venue / TV style overview of live score and table. */
export default function Display() {
  const { state, calc, error, refresh } = useLive();
  const live = useMemo(() => {
    if (!calc || !state) return null;
    return state.config.fixtures.find((f) => calc.ms[f.id]?.status === "live") || null;
  }, [calc, state]);

  if (!state || !calc) {
    return (
      <Screen>
        {error ? <ErrorText>{error}</ErrorText> : <Loading />}
      </Screen>
    );
  }

  const ms = live ? calc.ms[live.id] : null;
  const team = (id?: string | null) => state.config.teams.find((t) => t.id === id);

  return (
    <Screen onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      <H2>{state.meta.name}</H2>
      {live && ms ? (
        <Card>
          <Muted>LIVE</Muted>
          <Row style={{ justifyContent: "space-between", marginTop: 12 }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <TeamLogo logo={team(calc.resolved[live.id]?.a)?.logo} color={team(calc.resolved[live.id]?.a)?.color} size={64} />
              <Text style={{ color: colors.text, fontWeight: "700", marginTop: 8 }}>
                {team(calc.resolved[live.id]?.a)?.short}
              </Text>
              <Text style={{ color: colors.text, fontSize: 56, fontWeight: "800" }}>
                {ms.sets[ms.sets.length - 1]?.a ?? 0}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 24 }}>
              {ms.setsA} – {ms.setsB}
            </Text>
            <View style={{ alignItems: "center", flex: 1 }}>
              <TeamLogo logo={team(calc.resolved[live.id]?.b)?.logo} color={team(calc.resolved[live.id]?.b)?.color} size={64} />
              <Text style={{ color: colors.text, fontWeight: "700", marginTop: 8 }}>
                {team(calc.resolved[live.id]?.b)?.short}
              </Text>
              <Text style={{ color: colors.text, fontSize: 56, fontWeight: "800" }}>
                {ms.sets[ms.sets.length - 1]?.b ?? 0}
              </Text>
            </View>
          </Row>
        </Card>
      ) : (
        <Empty>No live match right now.</Empty>
      )}

      <H2>Table</H2>
      <Card>
        {(calc.table || []).slice(0, 10).map((row, i) => {
          const t = team(row.team);
          return (
            <Row key={row.team} style={{ justifyContent: "space-between", paddingVertical: 6 }}>
              <Row>
                <Text style={{ color: colors.muted, width: 28 }}>{i + 1}</Text>
                <TeamLogo logo={t?.logo} color={t?.color} size={28} />
                <Text style={{ color: colors.text, fontWeight: "600" }}>{t?.short || row.team}</Text>
              </Row>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{row.points}</Text>
            </Row>
          );
        })}
      </Card>
    </Screen>
  );
}
