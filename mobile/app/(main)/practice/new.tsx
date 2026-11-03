import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Btn,
  Card,
  Chips,
  ErrorText,
  Field,
  H1,
  H2,
  Muted,
  Row,
  Screen,
  confirmDialog,
  useAction,
} from "../../../src/components/ui";
import { fetchCatalog, practiceCreate, practiceHostKey, practiceQuickResult, storage } from "../../../src/api/client";
import {
  defaultPracticeFormat,
  filterCatalogPlayers,
  filterCatalogTeams,
  targetsFitBestOf,
  targetsPlaceholder,
  trimTargetsToBestOf,
  type CatalogPlayer,
  type CatalogTeam,
  type Format,
  type MasterCatalog,
  type PracticePlayer,
} from "../../../src/shared";
import { colors } from "../../../src/theme";

type Preset = "custom" | "b3-21" | "b3-25" | "b5-25" | "b1-25";

function formatFromPreset(p: Preset, timeouts: number, current: Format): Format {
  const base = { ...defaultPracticeFormat(), timeouts };
  switch (p) {
    case "b3-25":
      return { ...base, bestOf: 3, targets: [25, 25, 15] };
    case "b5-25":
      return { ...base, bestOf: 5, targets: [25, 25, 25, 25, 15] };
    case "b1-25":
      return { ...base, bestOf: 1, targets: [25], switchInDecider: false };
    case "b3-21":
      return { ...base, bestOf: 3, targets: [21, 21, 15] };
    default:
      return { ...current, timeouts };
  }
}

export default function NewPractice() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MasterCatalog>({ teams: [], players: [] });
  const [labelA, setLabelA] = useState("Team A");
  const [labelB, setLabelB] = useState("Team B");
  const [sideA, setSideA] = useState<PracticePlayer[]>([]);
  const [sideB, setSideB] = useState<PracticePlayer[]>([]);
  const [mode, setMode] = useState<"live" | "quick">("live");
  const [preset, setPreset] = useState<Preset>("b3-21");
  const [format, setFormat] = useState<Format>(() => defaultPracticeFormat());
  const [targetsText, setTargetsText] = useState("21, 21, 15");
  const [timeouts, setTimeouts] = useState(2);
  const [publicScore, setPublicScore] = useState<"no" | "yes">("no");
  const [quickSets, setQuickSets] = useState({ a: "2", b: "1" });
  const [quickDetail, setQuickDetail] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  useEffect(() => {
    void fetchCatalog().then(setCatalog);
  }, []);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const next = formatFromPreset(p, timeouts, format);
    setFormat(next);
    setTargetsText(next.targets.join(", "));
  };

  const setBestOf = (bestOf: number) => {
    setPreset("custom");
    const targets = trimTargetsToBestOf(bestOf, format.targets);
    setFormat({ ...format, bestOf, targets, timeouts });
    setTargetsText(targets.join(", "));
  };

  const create = async () => {
    const aName = labelA.trim() || "Team A";
    const bName = labelB.trim() || "Team B";
    if (aName.toLowerCase() === bName.toLowerCase()) {
      setLocalErr("Side names must be different");
      return;
    }
    if (sideA.length < 1 || sideB.length < 1) {
      setLocalErr("Add at least one player to each side");
      return;
    }
    const fit = targetsFitBestOf(format.bestOf, format.targets);
    if (fit) {
      setLocalErr(fit);
      return;
    }
    setLocalErr(null);
    const fmt = { ...format, timeouts };
    const r = await run(() =>
      practiceCreate({
        mode,
        labelA: aName,
        labelB: bName,
        sideA,
        sideB,
        format: fmt,
        allowPublicScore: mode === "live" && publicScore === "yes",
      }),
    );
    if (!r) return;
    await storage.set(practiceHostKey(r.match.id), r.hostToken);

    if (mode === "quick") {
      const sa = parseInt(quickSets.a, 10);
      const sb = parseInt(quickSets.b, 10);
      let setScores: { a: number; b: number }[] | undefined;
      const lines = quickDetail
        .split(/[\n,]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length) {
        setScores = lines
          .map((l) => {
            const m = l.match(/^(\d+)\s*[-:]\s*(\d+)$/);
            return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
          })
          .filter(Boolean) as { a: number; b: number }[];
        if (!setScores.length) setScores = undefined;
      }
      if (Number.isInteger(sa) && Number.isInteger(sb)) {
        const done = await run(() => practiceQuickResult(r.match.id, r.hostToken, { a: sa, b: sb }, setScores));
        if (!done) {
          router.replace(`/practice/${r.match.id}`);
          return;
        }
      }
    }

    router.replace(`/practice/${r.match.id}`);
  };

  return (
    <Screen>
      <H1>New practice match</H1>
      <Muted>
        Side names and players can come from the tournament master list, or typed as new names for this practice only.
      </Muted>

      <Card>
        <H2>Sides</H2>
        <SideEditor
          side="A"
          label={labelA}
          setLabel={setLabelA}
          list={sideA}
          setList={setSideA}
          catalog={catalog}
          otherLabel={labelB}
        />
        <SideEditor
          side="B"
          label={labelB}
          setLabel={setLabelB}
          list={sideB}
          setList={setSideB}
          catalog={catalog}
          otherLabel={labelA}
        />
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

        <Muted>Format presets</Muted>
        <Chips
          value={preset}
          onChange={applyPreset}
          options={[
            { value: "b3-21", label: "Bo3 · 21" },
            { value: "b3-25", label: "Bo3 · 25" },
            { value: "b5-25", label: "Bo5 · 25" },
            { value: "b1-25", label: "1 set · 25" },
            { value: "custom", label: "Custom" },
          ]}
        />

        <Muted>Best of</Muted>
        <Chips
          value={format.bestOf}
          onChange={setBestOf}
          options={[1, 3, 5].map((n) => ({ value: n, label: String(n) }))}
        />
        <Field
          label="Points per set"
          value={targetsText}
          onChangeText={(t) => {
            setPreset("custom");
            setTargetsText(t);
            const parsed = t
              .split(/[,;\s\-/|]+/)
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isInteger(n) && n > 0 && n < 100);
            if (parsed.length) setFormat({ ...format, targets: parsed, timeouts });
          }}
          placeholder={targetsPlaceholder(format.bestOf)}
          keyboardType="numbers-and-punctuation"
          hint={targetsFitBestOf(format.bestOf, format.targets) || undefined}
        />

        {mode === "live" && (
          <>
            <Muted>Timeouts per team per set</Muted>
            <Chips
              value={timeouts}
              onChange={(n) => {
                setTimeouts(n);
                setFormat((f) => ({ ...f, timeouts: n }));
              }}
              options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
            />
            <Muted>Who can score? Default is host only — invite more scorers from the match screen.</Muted>
            <Chips
              value={publicScore}
              onChange={setPublicScore}
              options={[
                { value: "no", label: "Host only" },
                { value: "yes", label: "Anyone with link" },
              ]}
            />
          </>
        )}
      </Card>

      {mode === "quick" && (
        <Card>
          <H2>Quick result</H2>
          <Muted>Sets won required. Optional per-set scores like 21-18, 19-21, 15-12.</Muted>
          <Row gap={12}>
            <Field
              style={{ flex: 1 }}
              label={`Sets ${labelA}`}
              value={quickSets.a}
              onChangeText={(a) => setQuickSets((q) => ({ ...q, a }))}
              keyboardType="number-pad"
            />
            <Field
              style={{ flex: 1 }}
              label={`Sets ${labelB}`}
              value={quickSets.b}
              onChangeText={(b) => setQuickSets((q) => ({ ...q, b }))}
              keyboardType="number-pad"
            />
          </Row>
          <Field
            label="Per-set scores (optional)"
            value={quickDetail}
            onChangeText={setQuickDetail}
            placeholder="21-18, 19-21, 15-12"
          />
        </Card>
      )}

      <ErrorText>{localErr || error}</ErrorText>
      <Btn
        title={mode === "live" ? "Start live match" : "Save quick result"}
        onPress={create}
        loading={busy}
        disabled={!!targetsFitBestOf(format.bestOf, format.targets)}
      />
    </Screen>
  );
}

function SideEditor({
  side,
  label,
  setLabel,
  list,
  setList,
  catalog,
  otherLabel,
}: {
  side: "A" | "B";
  label: string;
  setLabel: (v: string) => void;
  list: PracticePlayer[];
  setList: React.Dispatch<React.SetStateAction<PracticePlayer[]>>;
  catalog: MasterCatalog;
  otherLabel: string;
}) {
  const [teamQ, setTeamQ] = useState("");
  const [playerQ, setPlayerQ] = useState("");
  const [adhoc, setAdhoc] = useState("");

  const names = useMemo(() => new Set(list.map((p) => p.name.trim().toLowerCase())), [list]);
  const teamHits = useMemo(
    () =>
      filterCatalogTeams(
        catalog.teams,
        teamQ,
        new Set([otherLabel.trim().toLowerCase()].filter(Boolean)),
      ).slice(0, 8),
    [catalog.teams, teamQ, otherLabel],
  );
  const playerHits = useMemo(
    () => filterCatalogPlayers(catalog.players, playerQ, names).slice(0, 8),
    [catalog.players, playerQ, names],
  );

  const pickTeam = (t: CatalogTeam) => {
    setLabel(t.name);
    setTeamQ("");
  };

  const addCatalog = (p: CatalogPlayer) => {
    setList((s) => [...s, { name: p.name, skill: p.skill, photo: p.photo, source: "catalog" }]);
    setPlayerQ("");
  };

  const addAdhoc = () => {
    const name = adhoc.trim();
    if (!name) return;
    setList((s) => [...s, { name, source: "adhoc", photo: null }]);
    setAdhoc("");
  };

  const removePlayer = async (i: number) => {
    const p = list[i];
    const ok = await confirmDialog(`Remove "${p.name}"?`, `From ${label}`, "Remove");
    if (!ok) return;
    setList((s) => s.filter((_, j) => j !== i));
  };

  return (
    <View style={{ gap: 10, marginTop: 8, padding: 12, backgroundColor: colors.cardAlt, borderRadius: 12 }}>
      <H2>Side {side}</H2>
      <Field
        label="Side name"
        value={label}
        onChangeText={setLabel}
        placeholder="Type a name or search teams below"
        autoCapitalize="words"
      />
      <Field
        label="Search master teams"
        value={teamQ}
        onChangeText={setTeamQ}
        placeholder="Search master teams…"
        autoCapitalize="none"
      />
      {teamQ.trim() ? (
        <View style={{ gap: 6 }}>
          {teamHits.map((t) => (
            <Pressable key={`${t.id}-${t.name}`} onPress={() => pickTeam(t)} style={hitStyle}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{t.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {t.owner || "—"} · {t.seasonNames.join(", ")}
              </Text>
            </Pressable>
          ))}
          {teamHits.length === 0 && <Muted>No unused master teams match.</Muted>}
        </View>
      ) : null}

      <Muted>Players ({list.length})</Muted>
      {list.map((p, i) => (
        <Row key={`${p.name}-${i}`} style={{ justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, flex: 1 }}>
            {p.name}
            <Text style={{ color: colors.muted }}> · {p.source}</Text>
          </Text>
          <Btn title="Remove" variant="ghost" small onPress={() => void removePlayer(i)} />
        </Row>
      ))}

      <Field
        label="Search master players"
        value={playerQ}
        onChangeText={setPlayerQ}
        placeholder="Search master players…"
        autoCapitalize="none"
      />
      {playerQ.trim() ? (
        <View style={{ gap: 6 }}>
          {playerHits.map((p) => (
            <Pressable key={p.name} onPress={() => addCatalog(p)} style={hitStyle}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{p.skill}</Text>
            </Pressable>
          ))}
          {playerHits.length === 0 && <Muted>No matches.</Muted>}
        </View>
      ) : null}

      <Row gap={8}>
        <Field
          style={{ flex: 1 }}
          label="New player name"
          value={adhoc}
          onChangeText={setAdhoc}
          placeholder="Practice-only name"
          autoCapitalize="words"
        />
        <Btn title="Add" variant="secondary" onPress={addAdhoc} style={{ alignSelf: "flex-end", marginBottom: 2 }} />
      </Row>
    </View>
  );
}

const hitStyle = {
  padding: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
} as const;
