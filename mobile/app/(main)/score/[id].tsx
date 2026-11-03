import React, { useCallback, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import {
  Btn,
  Card,
  Empty,
  H2,
  LiveGate,
  Muted,
  Screen,
  confirmDialog,
  useAction,
} from "../../../src/components/ui";
import { ScorerPad, type ScoreAction, type ScoreExtra } from "../../../src/components/ScorerPad";
import { BestPlayerPicker } from "../../../src/components/BestPlayerPicker";
import { usePresence } from "../../../src/components/Watching";
import { useLive } from "../../../src/context/LiveContext";
import type { MatchState } from "../../../src/shared";

function PadWithWatching(props: {
  id: string;
  season: string | null;
  live: boolean;
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  logoA?: string | null;
  logoB?: string | null;
  match: MatchState;
  serverOffset: number;
  busy: boolean;
  error?: string | null;
  onAction: (action: ScoreAction, extra?: ScoreExtra) => void;
  footer?: React.ReactNode;
}) {
  const watching = usePresence({
    kind: "t",
    id: props.id,
    live: props.live,
    beat: false,
    season: props.season,
  });
  return <ScorerPad {...props} watchingCount={watching} sharePathPrefix="/match" shareId={props.id} />;
}

export default function ScoreMatch() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { act, requestFresh, serverOffset, team, refresh, season } = useLive();
  const { busy, error, run } = useAction();
  const lock = useRef(false);

  useEffect(() => {
    requestFresh(true);
    return () => requestFresh(false);
  }, [requestFresh]);

  const onAction = useCallback(
    async (action: ScoreAction, extra: ScoreExtra = {}) => {
      if (lock.current) return;
      lock.current = true;
      try {
        await run(() => act({ type: action, id, ...extra }));
      } finally {
        lock.current = false;
      }
    },
    [act, id, run],
  );

  const dropMatch = async () => {
    const ok = await confirmDialog(
      "Drop this match?",
      "The score will be cleared and the match will go back to not started.",
      "Drop",
    );
    if (!ok) return;
    await run(() => act({ type: "resetMatch", id }));
  };

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
          if (!r.a || !r.b) {
            return (
              <Card>
                <H2>Teams not decided yet</H2>
                <Muted>
                  {r.labelA} vs {r.labelB}. This match can be scored once both teams are known.
                </Muted>
              </Card>
            );
          }
          const done = m.status === "done";
          return (
            <>
              <Muted>
                #{fx.no} · {fx.stage} · {state.config.tournament.short}
              </Muted>
              <PadWithWatching
                id={id}
                season={season}
                live={m.status === "live"}
                labelA={a?.name ?? r.labelA}
                labelB={b?.name ?? r.labelB}
                colorA={a?.color}
                colorB={b?.color}
                logoA={a?.logo}
                logoB={b?.logo}
                match={m}
                serverOffset={serverOffset}
                busy={busy}
                error={error}
                onAction={onAction}
                footer={
                  <>
                    {done && (
                      <Card>
                        <BestPlayerPicker
                          matchId={id}
                          teamA={r.a}
                          teamB={r.b}
                          title={
                            state.matches[id]?.bestPlayer
                              ? "Update man of the match"
                              : "Set man of the match"
                          }
                        />
                        <Btn title="Undo last point" variant="ghost" onPress={() => onAction("undo")} disabled={busy} />
                      </Card>
                    )}
                    {!done && m.status !== "scheduled" && (
                      <Btn title="Drop match (reset)" variant="ghost" onPress={() => void dropMatch()} />
                    )}
                    <Btn title="Open spectator view" variant="ghost" onPress={() => router.push(`/match/${id}`)} />
                    <Btn title="Back to matches" variant="secondary" onPress={() => router.push("/score")} />
                  </>
                }
              />
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
