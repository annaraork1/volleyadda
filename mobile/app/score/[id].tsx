import React, { useCallback, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { Btn, Card, Empty, H2, LiveGate, Muted, Screen, useAction } from "../../src/components/ui";
import { ScorerPad, type ScoreAction, type ScoreExtra } from "../../src/components/ScorerPad";
import { useLive } from "../../src/context/LiveContext";

export default function ScoreMatch() {
  useKeepAwake(); // screen stays on while scoring
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { act, requestFresh, serverOffset, team, refresh } = useLive();
  const { busy, error, run } = useAction();
  const lock = useRef(false);

  // scorers bypass the edge cache so they always see their own taps
  useEffect(() => {
    requestFresh(true);
    return () => requestFresh(false);
  }, [requestFresh]);

  const onAction = useCallback(
    async (action: ScoreAction, extra: ScoreExtra = {}) => {
      if (lock.current) return;
      lock.current = true;
      try {
        // action types match /api/action: start, point, timeout, adjust, resume, nextSet, undo
        await run(() => act({ type: action, id, ...extra }));
      } finally {
        lock.current = false;
      }
    },
    [act, id, run],
  );

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
          return (
            <>
              <Muted>
                #{fx.no} · {fx.stage} · {state.config.tournament.short}
              </Muted>
              <ScorerPad
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
                  <Btn title="Open spectator view" variant="ghost" onPress={() => router.push(`/match/${id}`)} />
                }
              />
            </>
          );
        }}
      </LiveGate>
    </Screen>
  );
}
