import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Btn,
  Card,
  Empty,
  H2,
  LiveGate,
  Muted,
  Pill,
  Row,
  Screen,
  TeamLogo,
  statusColor,
} from "../../src/components/ui";
import { useLive } from "../../src/context/LiveContext";
import { colors } from "../../src/theme";

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh, team, season } = useLive();

  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state, calc) => {
          const fx = state.config.fixtures.find((f) => f.id === id);
          const m = calc.ms[id];
          const r = calc.resolved[id];
          if (!fx || !m || !r) return <Empty>Match not found in this tournament.</Empty>;
          const a = team(r.a);
          const b = team(r.b);
          const cur = m.sets[m.cur];
          const bestOf = m.format.bestOf;
          return (
            <>
              <Row style={{ justifyContent: "space-between" }}>
                <Muted>
                  #{fx.no} · {fx.stage}
                  {fx.time ? ` · ${fx.day} ${fx.time}` : ""}
                </Muted>
                <Pill
                  text={m.status === "live" ? "● Live" : m.status === "done" ? "Final" : "Upcoming"}
                  color={statusColor(m.status)}
                />
              </Row>

              <Card style={{ gap: 18 }}>
                {[
                  { t: a, label: r.labelA, sets: m.setsA, pts: cur?.a ?? 0, serving: m.serve === "A", win: m.winner === "A", to: cur?.toA ?? 0 },
                  { t: b, label: r.labelB, sets: m.setsB, pts: cur?.b ?? 0, serving: m.serve === "B", win: m.winner === "B", to: cur?.toB ?? 0 },
                ].map((x, i) => (
                  <Row key={i} style={{ justifyContent: "space-between" }}>
                    <Row style={{ flex: 1 }} gap={10}>
                      <TeamLogo logo={x.t?.logo} color={x.t?.color} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: x.win ? colors.good : colors.text, fontSize: 18, fontWeight: "700" }}>
                          {x.t?.name ?? x.label} {m.status === "live" && x.serving ? "🏐" : ""}
                        </Text>
                        <Muted>
                          Sets {x.sets} · Timeouts used {x.to}/{m.format.timeouts}
                        </Muted>
                      </View>
                    </Row>
                    <Text style={{ color: colors.text, fontSize: 52, fontWeight: "900", minWidth: 70, textAlign: "right" }}>
                      {m.status === "scheduled" ? "–" : x.pts}
                    </Text>
                  </Row>
                ))}
                {m.status !== "scheduled" && (
                  <Muted>
                    {m.status === "done"
                      ? `Final · best of ${bestOf}`
                      : `Set ${m.cur + 1} of ${bestOf} · first to ${cur?.target}`}
                  </Muted>
                )}
                {m.timeout && <Text style={{ color: colors.warn, fontWeight: "700" }}>⏱ Timeout in progress</Text>}
                {m.awaitingNext && <Text style={{ color: colors.accent }}>Set finished — waiting for the next set</Text>}
                {m.switchNow && <Text style={{ color: colors.warn, fontWeight: "700" }}>Switch sides!</Text>}
              </Card>

              {m.sets.length > 0 && m.status !== "scheduled" && (
                <Card>
                  <H2>Sets</H2>
                  {m.sets.map((s, i) => (
                    <Row key={i} style={{ justifyContent: "space-between" }}>
                      <Muted>
                        Set {i + 1} (to {s.target})
                      </Muted>
                      <Text style={{ color: s.winner ? colors.text : colors.accent, fontWeight: "700", fontSize: 16 }}>
                        {s.a} – {s.b}
                      </Text>
                    </Row>
                  ))}
                </Card>
              )}

              <Btn title="Score this match" variant="secondary" onPress={() => router.push(`/score/${id}`)} />
              <Btn
                title="Photos from this match"
                variant="ghost"
                onPress={() => router.push({ pathname: "/gallery", params: { matchId: id } })}
              />
              <Btn
                title="Report a problem"
                variant="ghost"
                onPress={() => router.push({ pathname: "/report", params: { match: id, season: season || undefined } })}
              />
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
