import React, { useEffect, useState } from "react";
import { Card, Btn, Chips, ErrorText, Field, H2, LiveGate, Muted, Row, Screen, notify, useAction } from "../../../src/components/ui";
import { useLive } from "../../../src/context/LiveContext";
import type { Format, Settings } from "../../../src/shared";

export default function AdminRules() {
  const { refresh } = useLive();
  return (
    <Screen onRefresh={() => refresh(true)}>
      <LiveGate>{(state) => <Editor settings={state.config.settings} tkey={state.tournamentKey} />}</LiveGate>
    </Screen>
  );
}

function FormatEditor({ title, f, onChange }: { title: string; f: Format; onChange: (f: Format) => void }) {
  const [targets, setTargets] = useState(f.targets.join(","));
  useEffect(() => setTargets(f.targets.join(",")), [f.targets]);
  return (
    <Card>
      <H2>{title}</H2>
      <Muted>Best of</Muted>
      <Chips
        value={f.bestOf}
        onChange={(bestOf) => onChange({ ...f, bestOf })}
        options={[1, 3, 5].map((n) => ({ value: n, label: String(n) }))}
      />
      <Field
        label="Points per set (comma separated, last repeats)"
        value={targets}
        onChangeText={(v) => {
          setTargets(v);
          const nums = v
            .split(/[,\s]+/)
            .map((x) => parseInt(x, 10))
            .filter((n) => Number.isInteger(n) && n > 0);
          if (nums.length) onChange({ ...f, targets: nums });
        }}
        keyboardType="numbers-and-punctuation"
        placeholder="21,21,15"
      />
      <Row gap={10}>
        <Field
          style={{ flex: 1 }}
          label="Win by"
          value={String(f.winBy)}
          keyboardType="number-pad"
          onChangeText={(v) => onChange({ ...f, winBy: parseInt(v, 10) || 1 })}
        />
        <Field
          style={{ flex: 1 }}
          label="Cap (0 = none)"
          value={String(f.cap)}
          keyboardType="number-pad"
          onChangeText={(v) => onChange({ ...f, cap: parseInt(v, 10) || 0 })}
        />
        <Field
          style={{ flex: 1 }}
          label="Timeouts"
          value={String(f.timeouts)}
          keyboardType="number-pad"
          onChangeText={(v) => onChange({ ...f, timeouts: parseInt(v, 10) || 0 })}
        />
      </Row>
      <Muted>Switch sides in deciding set</Muted>
      <Chips
        value={f.switchInDecider ? "yes" : "no"}
        onChange={(v) => onChange({ ...f, switchInDecider: v === "yes" })}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
    </Card>
  );
}

function Editor({ settings, tkey }: { settings: Settings; tkey: string }) {
  const { act } = useLive();
  const [s, setS] = useState<Settings>(settings);
  const { busy, error, run } = useAction();

  useEffect(() => setS(settings), [tkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPoint = (key: string, side: "w" | "l", v: string) =>
    setS((cur) => ({
      ...cur,
      points: { ...cur.points, [key]: { ...cur.points[key], [side]: Number(v) || 0 } },
    }));

  return (
    <>
      <Muted>Changing set rules re-checks matches that were already scored.</Muted>
      <FormatEditor title="League matches" f={s.league} onChange={(league) => setS({ ...s, league })} />
      <FormatEditor title="Playoff matches" f={s.playoff} onChange={(playoff) => setS({ ...s, playoff })} />
      <Card>
        <H2>League points</H2>
        {Object.keys(s.points)
          .sort()
          .reverse()
          .map((k) => (
            <Row key={k} gap={10}>
              <Muted style={{ width: 70 }}>Result {k.replace("-", "–")}</Muted>
              <Field
                style={{ flex: 1 }}
                label="Winner"
                value={String(s.points[k].w)}
                keyboardType="number-pad"
                onChangeText={(v) => setPoint(k, "w", v)}
              />
              <Field
                style={{ flex: 1 }}
                label="Loser"
                value={String(s.points[k].l)}
                keyboardType="number-pad"
                onChangeText={(v) => setPoint(k, "l", v)}
              />
            </Row>
          ))}
        <Field
          label="Timeout length (seconds)"
          value={String(s.timeoutSeconds)}
          keyboardType="number-pad"
          onChangeText={(v) => setS({ ...s, timeoutSeconds: parseInt(v, 10) || 30 })}
        />
      </Card>
      <ErrorText>{error}</ErrorText>
      <Btn
        title="Save rules"
        loading={busy}
        onPress={() =>
          run(async () => {
            await act({ type: "saveSettings", settings: s });
            notify("Rules saved");
          })
        }
      />
    </>
  );
}
