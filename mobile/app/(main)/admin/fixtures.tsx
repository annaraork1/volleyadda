import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Btn, Card, Chips, ErrorText, Field, H2, LiveGate, Muted, Row, Screen, confirmDialog, notify, useAction } from "../../../src/components/ui";
import { postAction } from "../../../src/api/client";
import { useLive } from "../../../src/context/LiveContext";
import { slotLabel, type Config, type Fixture, type FixtureGenDay, type FixtureGenSettings } from "../../../src/shared";
import { colors } from "../../../src/theme";

export default function AdminFixtures() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>{(state) => <Generator config={state.config} />}</LiveGate>
    </Screen>
  );
}

function Generator({ config }: { config: Config }) {
  const router = useRouter();
  const { season, refresh } = useLive();
  const today = new Date().toISOString().slice(0, 10);
  const [days, setDays] = useState<FixtureGenDay[]>(
    config.fixtureGen?.days?.length
      ? config.fixtureGen.days
      : [{ date: today, label: "Day 1", start: "9:00 AM", end: "6:00 PM" }],
  );
  const [slot, setSlot] = useState(String(config.fixtureGen?.leagueSlotMinutes ?? 45));
  const [pslot, setPslot] = useState(String(config.fixtureGen?.playoffSlotMinutes ?? 60));
  const [brk, setBrk] = useState(String(config.fixtureGen?.breakBeforePlayoffsMinutes ?? 30));
  const [playoff, setPlayoff] = useState<FixtureGenSettings["playoffFormat"]>(config.fixtureGen?.playoffFormat ?? "qualifier");
  const [rr, setRr] = useState<FixtureGenSettings["roundRobin"]>(config.fixtureGen?.roundRobin ?? "single");
  const [preview, setPreview] = useState<Fixture[] | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const prev = useAction();
  const save = useAction();

  const patchDay = (i: number, p: Partial<FixtureGenDay>) => setDays((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const input = (): FixtureGenSettings => ({
    days,
    leagueSlotMinutes: Number(slot) || 45,
    playoffSlotMinutes: Number(pslot) || 60,
    breakBeforePlayoffsMinutes: Number(brk) || 0,
    playoffFormat: playoff,
    roundRobin: rr,
    teamOrder: config.teams.map((t) => t.id),
  });

  const doPreview = () =>
    prev.run(async () => {
      const r = await postAction({ type: "generateFixturesPreview", input: input(), season: season ?? undefined });
      if ((r as any).error) throw new Error(String((r as any).error));
      setPreview((r as any).fixtures as Fixture[]);
      const rep = (r as any).report;
      setReport(rep ? (typeof rep === "string" ? rep : JSON.stringify(rep)) : null);
    });

  const doSave = async () => {
    if (!preview) return;
    const ok = await confirmDialog(
      "Save fixtures?",
      `${preview.length} matches will replace the current fixtures and the tournament moves to Matches.`,
      "Save",
    );
    if (!ok) return;
    await save.run(async () => {
      await postAction({
        type: "saveGeneratedFixtures",
        fixtures: preview,
        fixtureGen: input(),
        season: season ?? undefined,
      });
      await refresh(true);
      notify("Fixtures saved");
      router.replace("/fixtures");
    });
  };

  if (config.teams.length < 2) {
    return (
      <Card>
        <H2>Add teams first</H2>
        <Muted>You need at least two teams to generate fixtures.</Muted>
        <Btn title="Go to teams" onPress={() => router.replace("/admin/teams")} />
      </Card>
    );
  }

  const hasRoster =
    config.players.length > 0 || config.teams.some((t) => Array.isArray(t.squad) && t.squad.length > 0);
  if (!hasRoster) {
    return (
      <Card>
        <H2>Add rosters first</H2>
        <Muted>Add players or team squads before generating fixtures.</Muted>
        <Btn title="Go to teams" onPress={() => router.replace("/admin/teams")} />
      </Card>
    );
  }

  return (
    <>
      <Muted>{config.teams.length} teams. Times use the format “9:00 AM”. Stages are skippable from Organiser.</Muted>
      {days.map((d, i) => (
        <Card key={i}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>Day {i + 1}</H2>
            {days.length > 1 && (
              <Btn title="Remove" small variant="ghost" onPress={() => setDays((x) => x.filter((_, k) => k !== i))} />
            )}
          </Row>
          <Field label="Label" value={d.label} onChangeText={(v) => patchDay(i, { label: v })} autoCapitalize="sentences" />
          <Field label="Date (YYYY-MM-DD)" value={d.date} onChangeText={(v) => patchDay(i, { date: v })} />
          <Row gap={10}>
            <Field style={{ flex: 1 }} label="Start" value={d.start} onChangeText={(v) => patchDay(i, { start: v })} autoCapitalize="characters" />
            <Field style={{ flex: 1 }} label="End" value={d.end} onChangeText={(v) => patchDay(i, { end: v })} autoCapitalize="characters" />
          </Row>
        </Card>
      ))}
      <Btn
        title="Add day"
        variant="secondary"
        onPress={() => setDays((d) => [...d, { date: today, label: `Day ${d.length + 1}`, start: "9:00 AM", end: "6:00 PM" }])}
      />
      <Card>
        <Row gap={10}>
          <Field style={{ flex: 1 }} label="League slot (min)" value={slot} onChangeText={setSlot} keyboardType="number-pad" />
          <Field style={{ flex: 1 }} label="Playoff slot (min)" value={pslot} onChangeText={setPslot} keyboardType="number-pad" />
        </Row>
        <Field label="Break before playoffs (min)" value={brk} onChangeText={setBrk} keyboardType="number-pad" />
        <Muted>League format</Muted>
        <Chips
          value={rr}
          onChange={setRr}
          options={[
            { value: "single", label: "Single round-robin" },
            { value: "double", label: "Double round-robin" },
          ]}
        />
        <Muted>Playoffs</Muted>
        <Chips
          value={playoff}
          onChange={setPlayoff}
          options={[
            { value: "qualifier", label: "Qualifiers + Final" },
            { value: "semis", label: "Semis + Final" },
            { value: "final", label: "Final only" },
            { value: "none", label: "None" },
          ]}
        />
        <ErrorText>{prev.error}</ErrorText>
        <Btn title="Preview fixtures" onPress={doPreview} loading={prev.busy} />
      </Card>

      {preview && (
        <>
          <H2>Preview ({preview.length} matches)</H2>
          {report && <Muted>{report}</Muted>}
          <Card>
            {preview.map((f) => (
              <View key={f.id} style={{ paddingVertical: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  #{f.no} {slotLabel(f.a, previewConfig(config, preview))} vs {slotLabel(f.b, previewConfig(config, preview))}
                </Text>
                <Muted>
                  {f.stage} · {f.day} {f.time}
                </Muted>
              </View>
            ))}
          </Card>
          <ErrorText>{save.error}</ErrorText>
          <Btn title="Save fixtures" onPress={doSave} loading={save.busy} />
        </>
      )}
    </>
  );
}

/** slotLabel resolves "winner of" references against config.fixtures; use the preview list instead. */
function previewConfig(config: Config, fixtures: Fixture[]): Config {
  return { ...config, fixtures };
}
