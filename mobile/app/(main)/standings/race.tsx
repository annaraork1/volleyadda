import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Card,
  Empty,
  H1,
  H2,
  LiveGate,
  Loading,
  Muted,
  Screen,
  TeamLogo,
} from "../../../src/components/ui";
import { useLive } from "../../../src/context/LiveContext";
import {
  COARSE_LABELS,
  COARSE_RESULTS,
  enumeratePathsToRank,
  formatPathLabel,
  PLAYOFF_QUALIFY,
  projectRace,
  type CoarseResult,
  type OutcomeMap,
} from "../../../src/shared";
import { colors, fonts } from "../../../src/theme";

export default function RaceScreen() {
  const { team: teamParam, target: targetParam } = useLocalSearchParams<{ team?: string; target?: string }>();
  const { refresh, team } = useLive();
  const [teamId, setTeamId] = useState(typeof teamParam === "string" ? teamParam : "");
  const [target, setTarget] = useState(() => {
    const n = Number(targetParam);
    return Number.isFinite(n) && n > 0 ? n : PLAYOFF_QUALIFY;
  });
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});

  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>
        {(state) => {
          const teams = state.config.teams;
          const effective = teamId || teams[0]?.id || "";
          if (!effective) return <Empty>No teams yet.</Empty>;
          return (
            <RaceInner
              state={state}
              teams={teams}
              teamId={effective}
              setTeamId={setTeamId}
              target={target}
              setTarget={setTarget}
              outcomes={outcomes}
              setOutcomes={setOutcomes}
              team={team}
            />
          );
        }}
      </LiveGate>
    </Screen>
  );
}

function RaceInner({
  state,
  teams,
  teamId,
  setTeamId,
  target,
  setTarget,
  outcomes,
  setOutcomes,
  team,
}: {
  state: import("../../../src/shared").AppState;
  teams: import("../../../src/shared").Team[];
  teamId: string;
  setTeamId: (id: string) => void;
  target: number;
  setTarget: (n: number) => void;
  outcomes: OutcomeMap;
  setOutcomes: React.Dispatch<React.SetStateAction<OutcomeMap>>;
  team: (id: string | null | undefined) => import("../../../src/shared").Team | undefined;
}) {
  const [paths, setPaths] = useState<ReturnType<typeof enumeratePathsToRank>>([]);
  const [pathsBusy, setPathsBusy] = useState(false);

  const projection = useMemo(
    () => projectRace(state, teamId, target, outcomes),
    [state, teamId, target, outcomes],
  );

  useEffect(() => {
    let cancelled = false;
    setPathsBusy(true);
    const t = setTimeout(() => {
      const found = enumeratePathsToRank(state, teamId, target);
      if (!cancelled) {
        setPaths(found.slice(0, 8));
        setPathsBusy(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [state, teamId, target]);

  const remaining = projection?.remaining ?? [];

  return (
    <>
      <H1>Race calculator</H1>
      <Muted>What-if remaining league games for a playoff cut.</Muted>

      <H2>Team</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {teams.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTeamId(t.id)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: teamId === t.id ? colors.accent : colors.border,
              backgroundColor: teamId === t.id ? colors.accent : colors.cardAlt,
            }}
          >
            <Text style={{ color: teamId === t.id ? colors.onAccent : colors.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>
              {t.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <H2>Cut line (rank ≤)</H2>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[2, 3, 4, 5, 6].map((n) => (
          <Pressable
            key={n}
            onPress={() => setTarget(n)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: target === n ? colors.accent : colors.cardAlt,
            }}
          >
            <Text style={{ color: target === n ? colors.onAccent : colors.text }}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {projection && (
        <Card>
          <RowTeam teamId={teamId} team={team} />
          <Muted>
            Now #{projection.currentRank} → projected #{projection.projectedRank} ·{" "}
            {projection.projectedRank > 0 && projection.projectedRank <= target ? "Inside cut" : "Outside cut"} with
            current what-ifs
          </Muted>
        </Card>
      )}

      <H2>Remaining matches</H2>
      {remaining.length === 0 ? (
        <Muted>No remaining league matches.</Muted>
      ) : (
        remaining.map((rem) => {
          const fx = rem.fx;
          const key = fx.id;
          const cur = outcomes[key];
          return (
            <Card key={key}>
              <Muted>
                #{fx.no} · {fx.day} {fx.time} · vs {rem.oppLabel}
              </Muted>
              <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>
                You are side {rem.side}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {COARSE_RESULTS.map((res: CoarseResult) => (
                  <Pressable
                    key={res}
                    onPress={() =>
                      setOutcomes((o) => {
                        const next = { ...o };
                        if (next[key] === res) delete next[key];
                        else next[key] = res;
                        return next;
                      })
                    }
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: cur === res ? colors.accent : colors.cardAlt,
                    }}
                  >
                    <Text style={{ color: cur === res ? colors.onAccent : colors.text, fontSize: 12 }}>
                      {COARSE_LABELS[res]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          );
        })
      )}

      <H2>Paths to make the cut</H2>
      {pathsBusy ? (
        <Loading label="Searching…" />
      ) : paths.length === 0 ? (
        <Muted>No short paths found (or already decided).</Muted>
      ) : (
        paths.map((p, i) => (
          <Card key={i}>
            <Muted>
              {formatPathLabel(p, remaining, (id) => team(id)?.name || id)} · ends #{p.rank}
            </Muted>
          </Card>
        ))
      )}
    </>
  );
}

function RowTeam({
  teamId,
  team,
}: {
  teamId: string;
  team: (id: string | null | undefined) => import("../../../src/shared").Team | undefined;
}) {
  const t = team(teamId);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TeamLogo logo={t?.logo} color={t?.color} size={36} />
      <H2>{t?.name || teamId}</H2>
    </View>
  );
}
