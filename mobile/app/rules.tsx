import React from "react";
import { Text } from "react-native";
import { Card, H2, LiveGate, Muted, Row, Screen } from "../src/components/ui";
import { useLive } from "../src/context/LiveContext";
import { TIE_LABELS, type Format } from "../src/shared";
import { colors } from "../src/theme";

function FormatCard({ title, f }: { title: string; f: Format }) {
  const rows: [string, string][] = [
    ["Sets", `Best of ${f.bestOf}`],
    ["Points per set", f.targets.join(", ")],
    ["Win by", String(f.winBy)],
    ["Score cap", f.cap > 0 ? String(f.cap) : "No cap"],
    ["Timeouts per team per set", String(f.timeouts)],
    ["Switch sides in deciding set", f.switchInDecider ? "Yes, at half-way" : "No"],
  ];
  return (
    <Card>
      <H2>{title}</H2>
      {rows.map(([k, v]) => (
        <Row key={k} style={{ justifyContent: "space-between" }}>
          <Muted>{k}</Muted>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{v}</Text>
        </Row>
      ))}
    </Card>
  );
}

export default function Rules() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => {
          const s = state.config.settings;
          return (
            <>
              <FormatCard title="League matches" f={s.league} />
              <FormatCard title="Playoff matches" f={s.playoff} />
              <Card>
                <H2>League points</H2>
                {Object.entries(s.points).map(([k, v]) => (
                  <Row key={k} style={{ justifyContent: "space-between" }}>
                    <Muted>Result {k.replace("-", " – ")}</Muted>
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      winner {v.w} · loser {v.l}
                    </Text>
                  </Row>
                ))}
              </Card>
              <Card>
                <H2>Tie-break order</H2>
                {s.tiebreak.map((k, i) => (
                  <Text key={k} style={{ color: colors.text }}>
                    {i + 1}. {TIE_LABELS[k] ?? k}
                  </Text>
                ))}
              </Card>
              <Muted>Official timeout length: {s.timeoutSeconds}s</Muted>
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
