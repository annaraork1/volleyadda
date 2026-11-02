import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import {
  Btn,
  Card,
  ErrorText,
  Field,
  H1,
  H2,
  Loading,
  Muted,
  Pill,
  Row,
  Screen,
  confirmDialog,
  errMsg,
  useAction,
} from "../../src/components/ui";
import { ScorerPad, type ScoreAction, type ScoreExtra } from "../../src/components/ScorerPad";
import {
  practiceAbandon,
  practiceComplete,
  practiceGet,
  practiceHostKey,
  practiceQuickResult,
  practiceScore,
  storage,
} from "../../src/api/client";
import type { MatchState, PracticeMatchPublic } from "../../src/shared";
import { colors } from "../../src/theme";

export default function PracticeMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<PracticeMatchPublic | null>(null);
  const [state, setState] = useState<MatchState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const { busy, error, run } = useAction();
  const lock = useRef(false);

  useEffect(() => {
    void storage.get(practiceHostKey(id)).then((t) => setToken(t));
  }, [id]);

  const load = useCallback(async () => {
    if (token === undefined) return;
    try {
      const r = await practiceGet(id, token);
      setMatch(r.match);
      setState(r.state);
      setLoadError(null);
    } catch (e) {
      setLoadError(errMsg(e));
    }
  }, [id, token]);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (!busy) void load();
    }, 2000);
    return () => clearInterval(t);
  }, [load, busy]);

  const isHost = !!match?.isHost;
  const canScore = !!match && match.mode === "live" && match.status !== "done" && (isHost || match.allowPublicScore);

  useEffect(() => {
    if (!canScore) return;
    void activateKeepAwakeAsync("practice");
    return () => {
      void deactivateKeepAwake("practice");
    };
  }, [canScore]);

  const onAction = async (action: ScoreAction, extra: ScoreExtra = {}) => {
    if (lock.current) return;
    lock.current = true;
    try {
      const r = await run(() => practiceScore(id, token ?? null, action, extra));
      if (r) {
        setMatch(r.match);
        setState(r.state);
      }
    } finally {
      lock.current = false;
    }
  };

  if (!match) {
    return (
      <Screen>
        {loadError ? <ErrorText>{loadError}</ErrorText> : <Loading />}
        {loadError && <Btn title="Retry" variant="secondary" onPress={load} />}
      </Screen>
    );
  }

  const abandon = async () => {
    const ok = await confirmDialog("Abandon match?", "The match will be removed from the live list.", "Abandon");
    if (!ok) return;
    const r = await run(() => practiceAbandon(id, token ?? null));
    if (r) router.replace("/practice");
  };

  const header = (
    <Row style={{ justifyContent: "space-between" }}>
      <H1 style={{ fontSize: 20, flex: 1 }}>
        {match.labelA} vs {match.labelB}
      </H1>
      <Pill
        text={match.status === "done" ? "Final" : match.status === "live" ? "● Live" : "Draft"}
        color={match.status === "done" ? colors.good : match.status === "live" ? colors.live : colors.muted}
      />
    </Row>
  );

  /* ---------- finished ---------- */
  if (match.status === "done") {
    const w = match.winner === "A" ? match.labelA : match.winner === "B" ? match.labelB : null;
    return (
      <Screen onRefresh={load}>
        {header}
        <Card style={{ gap: 12 }}>
          {[
            { l: match.labelA, s: match.setsWon?.a ?? state?.setsA ?? 0, win: match.winner === "A" },
            { l: match.labelB, s: match.setsWon?.b ?? state?.setsB ?? 0, win: match.winner === "B" },
          ].map((x, i) => (
            <Row key={i} style={{ justifyContent: "space-between" }}>
              <Text style={{ color: x.win ? colors.good : colors.text, fontSize: 20, fontWeight: "700" }}>{x.l}</Text>
              <Text style={{ color: colors.text, fontSize: 40, fontWeight: "900" }}>{x.s}</Text>
            </Row>
          ))}
          {w && <Muted>🏆 {w} won</Muted>}
          {(match.setScores?.length ?? 0) > 0 && (
            <Muted>{match.setScores!.map((s) => `${s.a}–${s.b}`).join("  ·  ")}</Muted>
          )}
        </Card>
        <Btn
          title="Report a problem"
          variant="ghost"
          onPress={() => router.push({ pathname: "/report", params: { practice: id } })}
        />
        <Btn title="Score another match" onPress={() => router.replace("/practice/new")} />
      </Screen>
    );
  }

  /* ---------- quick (result-only) ---------- */
  if (match.mode === "quick") {
    return (
      <Screen onRefresh={load}>
        {header}
        {isHost ? (
          <QuickResultForm match={match} busy={busy} error={error} onSubmit={async (sets, scores) => {
            const r = await run(() => practiceQuickResult(id, token ?? null, sets, scores));
            if (r) setMatch(r.match);
          }} />
        ) : (
          <Muted>The host has not entered the result yet.</Muted>
        )}
      </Screen>
    );
  }

  /* ---------- live ---------- */
  const m = state;
  return (
    <Screen onRefresh={load}>
      {header}
      {m && canScore ? (
        <ScorerPad
          labelA={match.labelA}
          labelB={match.labelB}
          match={m}
          busy={busy}
          error={error}
          onAction={onAction}
          footer={
            <>
              {m.status === "done" && (
                <Btn
                  title="Save result"
                  onPress={async () => {
                    const r = await run(() => practiceComplete(id, token ?? null));
                    if (r) setMatch(r.match);
                  }}
                />
              )}
              {isHost && <Btn title="Abandon match" variant="ghost" onPress={abandon} />}
            </>
          }
        />
      ) : m ? (
        <Scoreboard match={match} m={m} />
      ) : (
        <Muted>Waiting for the host to start…</Muted>
      )}
      {!canScore && !isHost && match.allowPublicScore === false && (
        <Muted>Only the host can score this match. This screen updates live.</Muted>
      )}
    </Screen>
  );
}

function Scoreboard({ match, m }: { match: PracticeMatchPublic; m: MatchState }) {
  const cur = m.sets[m.cur];
  return (
    <Card style={{ gap: 14 }}>
      {[
        { l: match.labelA, sets: m.setsA, pts: cur?.a ?? 0, serve: m.serve === "A" },
        { l: match.labelB, sets: m.setsB, pts: cur?.b ?? 0, serve: m.serve === "B" },
      ].map((x, i) => (
        <Row key={i} style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {x.l} {x.serve && m.status === "live" ? "🏐" : ""}
            </Text>
            <Muted>Sets {x.sets}</Muted>
          </View>
          <Text style={{ color: colors.text, fontSize: 56, fontWeight: "900" }}>{m.status === "scheduled" ? "–" : x.pts}</Text>
        </Row>
      ))}
      {m.status !== "scheduled" && (
        <Muted>
          Set {m.cur + 1} of {m.format.bestOf} · {m.sets.map((s) => `${s.a}–${s.b}`).join(", ")}
        </Muted>
      )}
    </Card>
  );
}

function QuickResultForm({
  match,
  busy,
  error,
  onSubmit,
}: {
  match: PracticeMatchPublic;
  busy: boolean;
  error: string | null;
  onSubmit: (sets: { a: number; b: number }, scores?: { a: number; b: number }[]) => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [scores, setScores] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const submit = () => {
    const sa = parseInt(a, 10);
    const sb = parseInt(b, 10);
    if (!Number.isInteger(sa) || !Number.isInteger(sb)) {
      setLocalErr("Enter sets won for both teams");
      return;
    }
    setLocalErr(null);
    const parsed = scores
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = /^(\d+)\s*[-–:]\s*(\d+)$/.exec(p);
        return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
      })
      .filter((x): x is { a: number; b: number } => !!x);
    onSubmit({ a: sa, b: sb }, parsed.length ? parsed : undefined);
  };

  return (
    <Card>
      <H2>Enter the final result</H2>
      <Row gap={12}>
        <Field
          style={{ flex: 1 }}
          label={`${match.labelA} sets`}
          value={a}
          onChangeText={setA}
          keyboardType="number-pad"
        />
        <Field
          style={{ flex: 1 }}
          label={`${match.labelB} sets`}
          value={b}
          onChangeText={setB}
          keyboardType="number-pad"
        />
      </Row>
      <Field
        label="Set scores (optional)"
        value={scores}
        onChangeText={setScores}
        placeholder="21-15, 18-21, 15-12"
      />
      <ErrorText>{localErr || error}</ErrorText>
      <Btn title="Save result" onPress={submit} loading={busy} />
    </Card>
  );
}
