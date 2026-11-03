import React from "react";
import { Share, Text, View } from "react-native";
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
} from "../../../src/components/ui";
import { BestPlayerNote, BestPlayerPicker } from "../../../src/components/BestPlayerPicker";
import { PressureBallBadge } from "../../../src/components/PressureBallBadge";
import { WatchingLine, usePresence } from "../../../src/components/Watching";
import { joinApiUrl } from "../../../src/api/absoluteUrl";
import { useAuth } from "../../../src/context/AuthContext";
import { useLive } from "../../../src/context/LiveContext";
import { pressureBalls } from "../../../src/shared";
import { colors } from "../../../src/theme";

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh, team, season } = useLive();
  const { isSignedIn } = useAuth();

  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state, calc) => {
          const fx = state.config.fixtures.find((f) => f.id === id);
          const m = calc.ms[id];
          const r = calc.resolved[id];
          if (!fx || !m || !r) return <Empty>Match not found in this tournament.</Empty>;
          return (
            <MatchBody
              id={id}
              state={state}
              m={m}
              r={r}
              fx={fx}
              team={team}
              season={season}
              isSignedIn={isSignedIn}
              router={router}
            />
          );
        }}
      </LiveGate>
    </Screen>
  );
}

function MatchBody({
  id,
  state,
  m,
  r,
  fx,
  team,
  season,
  isSignedIn,
  router,
}: {
  id: string;
  state: import("../../../src/shared").AppState;
  m: import("../../../src/shared").MatchState;
  r: { a: string | null; b: string | null; labelA: string; labelB: string };
  fx: import("../../../src/shared").Fixture;
  team: (id: string | null | undefined) => import("../../../src/shared").Team | undefined;
  season: string | null;
  isSignedIn: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const a = team(r.a);
  const b = team(r.b);
  const cur = m.sets[m.cur];
  const bestOf = m.format.bestOf;
  const title = `${a?.name ?? r.labelA} vs ${b?.name ?? r.labelB}`;
  const watching = usePresence({
    kind: "t",
    id,
    live: m.status === "live",
    beat: true,
    season,
  });
  const balls =
    m.status === "live" && cur && !m.awaitingNext && !m.timeout
      ? pressureBalls(cur.a, cur.b, cur.target, m.format, m.setsA, m.setsB, { live: true })
      : { A: null, B: null };

  const share = async () => {
    const url = joinApiUrl(`/match/${id}`);
    try {
      await Share.share({ message: `${title} — live score\n${url}`, url, title });
    } catch {
      /* cancelled */
    }
  };

  return (
            <>
              <Row style={{ justifyContent: "space-between" }}>
                <Muted>
                  #{fx.no} · {fx.stage}
                  {fx.time ? ` · ${fx.day} ${fx.time}` : ""}
                </Muted>
                <Row gap={8}>
                  <WatchingLine count={watching} />
                  <Pill
                    text={m.status === "live" ? "● Live" : m.status === "done" ? "Final" : "Upcoming"}
                    color={statusColor(m.status)}
                  />
                </Row>
              </Row>

              <Card style={{ gap: 18 }}>
                {[
                  { t: a, label: r.labelA, sets: m.setsA, pts: cur?.a ?? 0, serving: m.serve === "A", win: m.winner === "A", to: cur?.toA ?? 0, ball: balls.A },
                  { t: b, label: r.labelB, sets: m.setsB, pts: cur?.b ?? 0, serving: m.serve === "B", win: m.winner === "B", to: cur?.toB ?? 0, ball: balls.B },
                ].map((x, i) => (
                  <Row key={i} style={{ justifyContent: "space-between" }}>
                    <Row style={{ flex: 1 }} gap={10}>
                      <TeamLogo logo={x.t?.logo} color={x.t?.color} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: x.win ? colors.good : colors.text, fontSize: 18, fontWeight: "700" }}>
                          {x.t?.name ?? x.label} {m.status === "live" && x.serving ? "🏐" : ""}
                        </Text>
                        <PressureBallBadge kind={x.ball} />
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
                <BestPlayerNote matchId={id} />
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

              {m.status === "done" && r.a && r.b && isSignedIn && (
                <Card>
                  <BestPlayerPicker
                    matchId={id}
                    teamA={r.a}
                    teamB={r.b}
                    title={state.matches[id]?.bestPlayer ? "Update man of the match" : "Set man of the match"}
                  />
                </Card>
              )}

              <Btn title="Share match" variant="secondary" onPress={() => void share()} />
              {m.status !== "done" && (
                <Btn title="Score this match" variant="secondary" onPress={() => router.push(`/score/${id}`)} />
              )}
              {m.status === "done" && isSignedIn && (
                <Btn title="Open scorer" variant="ghost" onPress={() => router.push(`/score/${id}`)} />
              )}
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
}
