import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Btn, Card, Chips, ErrorText, Field, H1, Muted, Screen, useAction } from "../../src/components/ui";
import { practiceCreate, practiceHostKey, storage } from "../../src/api/client";
import { defaultPracticeFormat, type Format } from "../../src/shared";

type Preset = "b3-21" | "b3-25" | "b5-25" | "b1-25";

function formatFor(p: Preset, timeouts: number): Format {
  const base = defaultPracticeFormat();
  switch (p) {
    case "b3-25":
      return { ...base, bestOf: 3, targets: [25, 25, 15], timeouts };
    case "b5-25":
      return { ...base, bestOf: 5, targets: [25, 25, 25, 25, 15], timeouts };
    case "b1-25":
      return { ...base, bestOf: 1, targets: [25], timeouts, switchInDecider: false };
    default:
      return { ...base, bestOf: 3, targets: [21, 21, 15], timeouts };
  }
}

export default function NewPractice() {
  const router = useRouter();
  const [labelA, setLabelA] = useState("Team A");
  const [labelB, setLabelB] = useState("Team B");
  const [mode, setMode] = useState<"live" | "quick">("live");
  const [preset, setPreset] = useState<Preset>("b3-21");
  const [timeouts, setTimeouts] = useState<number>(2);
  const [publicScore, setPublicScore] = useState<"no" | "yes">("no");
  const { busy, error, run } = useAction();

  const create = async () => {
    const r = await run(() =>
      practiceCreate({
        mode,
        labelA: labelA.trim() || "Team A",
        labelB: labelB.trim() || "Team B",
        format: formatFor(preset, timeouts),
        allowPublicScore: publicScore === "yes",
      }),
    );
    if (!r) return;
    await storage.set(practiceHostKey(r.match.id), r.hostToken);
    router.replace(`/practice/${r.match.id}`);
  };

  return (
    <Screen>
      <H1>Score one match</H1>
      <Muted>No tournament needed. Anyone can follow along from the link; only you (the host) score unless you allow others.</Muted>
      <Card>
        <Field label="Team A" value={labelA} onChangeText={setLabelA} autoCapitalize="words" />
        <Field label="Team B" value={labelB} onChangeText={setLabelB} autoCapitalize="words" />
      </Card>
      <Card>
        <Muted>How do you want to record it?</Muted>
        <Chips
          value={mode}
          onChange={setMode}
          options={[
            { value: "live", label: "Live scoring" },
            { value: "quick", label: "Enter final result" },
          ]}
        />
        <Muted>Format</Muted>
        <Chips
          value={preset}
          onChange={setPreset}
          options={[
            { value: "b3-21", label: "Best of 3 · 21/21/15" },
            { value: "b3-25", label: "Best of 3 · 25/25/15" },
            { value: "b5-25", label: "Best of 5 · 25" },
            { value: "b1-25", label: "One set · 25" },
          ]}
        />
        {mode === "live" && (
          <>
            <Muted>Timeouts per team per set</Muted>
            <Chips
              value={timeouts}
              onChange={setTimeouts}
              options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
            />
            <Muted>Let anyone with the link score?</Muted>
            <Chips
              value={publicScore}
              onChange={setPublicScore}
              options={[
                { value: "no", label: "Only me" },
                { value: "yes", label: "Anyone" },
              ]}
            />
          </>
        )}
      </Card>
      <ErrorText>{error}</ErrorText>
      <Btn title={mode === "live" ? "Start scoring" : "Continue"} onPress={create} loading={busy} />
    </Screen>
  );
}
