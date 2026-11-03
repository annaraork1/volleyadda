import React, { useEffect, useState } from "react";
import { Btn, Card, ErrorText, Field, H2, LiveGate, Muted, Row, Screen, TeamLogo, notify, useAction } from "../../../src/components/ui";
import { useLive } from "../../../src/context/LiveContext";
import type { Team } from "../../../src/shared";

const PALETTE = ["#F5BC28", "#E4572E", "#2EAD6B", "#4CC9F0", "#A78BFA", "#FB923C", "#F87171", "#60A5FA"];

export default function AdminTeams() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>{(state) => <Editor initial={state.config.teams} tkey={state.tournamentKey} />}</LiveGate>
    </Screen>
  );
}

function Editor({ initial, tkey }: { initial: Team[]; tkey: string }) {
  const { act } = useLive();
  const [teams, setTeams] = useState<Team[]>(initial);
  const { busy, error, run } = useAction();

  useEffect(() => {
    setTeams(initial);
  }, [tkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<Team>) => setTeams((ts) => ts.map((t, k) => (k === i ? { ...t, ...p } : t)));

  const add = () =>
    setTeams((ts) => {
      let n = ts.length + 1;
      while (ts.some((t) => t.id === `team${n}`)) n++;
      return [
        ...ts,
        {
          id: `team${n}`,
          name: `Team ${n}`,
          short: `T${n}`,
          color: PALETTE[(n - 1) % PALETTE.length],
          owner: "",
          logo: "",
          squad: [],
        },
      ];
    });

  const save = () =>
    run(async () => {
      await act({ type: "saveTeams", teams });
      notify("Teams saved");
    });

  return (
    <>
      <Muted>Add the teams that will play. Generate fixtures after saving. Squads come from the auction.</Muted>
      {teams.map((t, i) => (
        <Card key={t.id}>
          <Row gap={12}>
            <TeamLogo logo={t.logo} color={t.color} size={40} />
            <H2 style={{ flex: 1 }}>{t.name || "Team"}</H2>
            <Btn title="Remove" variant="ghost" small onPress={() => setTeams((ts) => ts.filter((_, k) => k !== i))} />
          </Row>
          <Field label="Team name" value={t.name} onChangeText={(v) => patch(i, { name: v })} autoCapitalize="words" />
          <Row gap={10}>
            <Field style={{ flex: 1 }} label="Short" value={t.short} onChangeText={(v) => patch(i, { short: v.toUpperCase() })} />
            <Field style={{ flex: 1 }} label="Colour" value={t.color} onChangeText={(v) => patch(i, { color: v })} />
          </Row>
          <Field label="Owner" value={t.owner} onChangeText={(v) => patch(i, { owner: v })} autoCapitalize="words" />
        </Card>
      ))}
      <Btn title="Add team" variant="secondary" onPress={add} />
      <ErrorText>{error}</ErrorText>
      <Btn title="Save teams" onPress={save} loading={busy} disabled={teams.length < 2} />
    </>
  );
}
