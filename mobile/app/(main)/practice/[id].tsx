import React, { useCallback, useEffect, useRef, useState } from "react";
import { Share, Text, View } from "react-native";
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
  notify,
  useAction,
} from "../../../src/components/ui";
import { ScorerPad, type ScoreAction, type ScoreExtra } from "../../../src/components/ScorerPad";
import { joinApiUrl } from "../../../src/api/absoluteUrl";
import {
  practiceAbandon,
  practiceClaimScorer,
  practiceComplete,
  practiceDelete,
  practiceGet,
  practiceHostKey,
  practiceInviteScorer,
  practiceQuickResult,
  practiceRevokeScorer,
  practiceScore,
  practiceScorerKey,
  storage,
} from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { MatchState, PracticeMatchPublic, PracticePlayer } from "../../../src/shared";
import { colors } from "../../../src/theme";

export default function PracticeMatch() {
  const { id, scorerToken: scorerFromUrl } = useLocalSearchParams<{ id: string; scorerToken?: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [match, setMatch] = useState<PracticeMatchPublic | null>(null);
  const [state, setState] = useState<MatchState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);
  const [scorerToken, setScorerToken] = useState<string | null | undefined>(undefined);
  const [inviteEmail, setInviteEmail] = useState("");
  const { busy, error, run } = useAction();
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromUrl = typeof scorerFromUrl === "string" ? scorerFromUrl : Array.isArray(scorerFromUrl) ? scorerFromUrl[0] : "";
      if (fromUrl) await storage.set(practiceScorerKey(id), fromUrl);
      const [h, s] = await Promise.all([storage.get(practiceHostKey(id)), storage.get(practiceScorerKey(id))]);
      if (cancelled) return;
      setHostToken(h);
      setScorerToken(s);
      if (fromUrl && isSignedIn) {
        try {
          await practiceClaimScorer(id, fromUrl);
        } catch {
          /* invite still works via token */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, scorerFromUrl, isSignedIn]);

  const tokensReady = hostToken !== undefined && scorerToken !== undefined;

  const load = useCallback(async () => {
    if (!tokensReady) return;
    try {
      const r = await practiceGet(id, { hostToken, scorerToken });
      setMatch(r.match);
      setState(r.state);
      setLoadError(null);
    } catch (e) {
      setLoadError(errMsg(e));
    }
  }, [id, hostToken, scorerToken, tokensReady]);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (!busy) void load();
    }, 2000);
    return () => clearInterval(t);
  }, [load, busy]);

  const isHost = !!match?.isHost;
  const isScorer = !!match?.isScorer;
  const canScore =
    !!match &&
    match.mode === "live" &&
    match.status !== "done" &&
    (isHost || isScorer || match.allowPublicScore);

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
      const r = await run(() => practiceScore(id, { hostToken, scorerToken }, action, extra));
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
    const r = await run(() => practiceAbandon(id, hostToken ?? null));
    if (r) router.replace("/practice");
  };

  const invite = async () => {
    if (!hostToken) return;
    const r = await run(() =>
      practiceInviteScorer(id, hostToken, {
        email: inviteEmail.trim() || undefined,
        label: inviteEmail.trim() || "Scorer",
      }),
    );
    if (!r) return;
    setMatch(r.match);
    setInviteEmail("");
    const link = joinApiUrl(`/practice/${id}?scorerToken=${encodeURIComponent(r.scorerToken)}`);
    try {
      await Share.share({
        message: `Score this practice match on VolleyAdda:\n${link}`,
        url: link,
        title: "Invite scorer",
      });
    } catch {
      notify("Scorer invited", "Share the link from your invite list if the share sheet was cancelled.");
    }
  };

  const revoke = async (inviteId: string) => {
    if (!hostToken) return;
    const ok = await confirmDialog("Revoke scorer?", "They will no longer be able to score this match.", "Revoke");
    if (!ok) return;
    const r = await run(() => practiceRevokeScorer(id, hostToken, inviteId));
    if (r) setMatch(r.match);
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

  const shareMatch = async () => {
    const url = joinApiUrl(`/practice/${id}`);
    const title = `${match.labelA} vs ${match.labelB}`;
    try {
      await Share.share({ message: `${title} — practice match\n${url}`, url, title });
    } catch {
      /* cancelled */
    }
  };

  const hostInvitePanel =
    isHost && match.mode === "live" && match.status !== "done" ? (
      <Card style={{ gap: 10 }}>
        <H2>Invite scorers</H2>
        <Muted>Host-only by default. Invite by email and/or share a scorer link. You can revoke anytime.</Muted>
        <Field
          label="Email (optional)"
          value={inviteEmail}
          onChangeText={setInviteEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="scorer@example.com"
        />
        <Btn title="Create invite link" onPress={() => void invite()} loading={busy} />
        {(match.scorers || []).filter((s) => !s.revokedAt).length === 0 ? (
          <Muted>No active scorers yet.</Muted>
        ) : (
          (match.scorers || [])
            .filter((s) => !s.revokedAt)
            .map((s) => (
              <Row key={s.id} style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{s.label || s.emailNorm || "Scorer"}</Text>
                  {s.emailNorm ? <Muted>{s.emailNorm}</Muted> : <Muted>Link invite</Muted>}
                </View>
                <Btn title="Revoke" variant="ghost" small onPress={() => void revoke(s.id)} />
              </Row>
            ))
        )}
        <ErrorText>{error}</ErrorText>
      </Card>
    ) : null;

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
        <RosterCard title={match.labelA} players={match.sideA} />
        <RosterCard title={match.labelB} players={match.sideB} />
        <Btn title="Share result" variant="secondary" onPress={() => void shareMatch()} />
        {isHost && (
          <Btn
            title="Delete from history"
            variant="danger"
            onPress={async () => {
              const ok = await confirmDialog(
                "Delete this practice?",
                "It will be removed from history permanently.",
                "Delete",
              );
              if (!ok) return;
              const r = await run(() => practiceDelete(id, hostToken ?? null));
              if (r) {
                notify("Deleted");
                router.replace("/practice");
              }
            }}
          />
        )}
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
          <QuickResultForm
            match={match}
            busy={busy}
            error={error}
            onSubmit={async (sets, scores) => {
              const r = await run(() => practiceQuickResult(id, hostToken ?? null, sets, scores));
              if (r) setMatch(r.match);
            }}
          />
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
          sharePathPrefix="/practice"
          shareId={id}
          footer={
            <>
              {m.status === "done" && (
                <Btn
                  title="Save result"
                  onPress={async () => {
                    const r = await run(() => practiceComplete(id, { hostToken, scorerToken }));
                    if (r) setMatch(r.match);
                  }}
                />
              )}
              {isHost && <Btn title="Abandon match" variant="ghost" onPress={abandon} />}
            </>
          }
        />
      ) : m ? (
        <>
          <Scoreboard match={match} m={m} />
          <Btn title="Share spectator link" variant="secondary" onPress={() => void shareMatch()} />
        </>
      ) : (
        <Muted>Waiting for the host to start…</Muted>
      )}
      {hostInvitePanel}
      {!canScore && !isHost && (
        <Muted>Only the host or an invited scorer can score. This screen updates live for spectators.</Muted>
      )}
      {isScorer && !isHost && <Muted>You are scoring as an invited scorer.</Muted>}
    </Screen>
  );
}

function RosterCard({ title, players }: { title: string; players?: PracticePlayer[] }) {
  if (!players?.length) return null;
  return (
    <Card>
      <H2>{title}</H2>
      {players.map((p, i) => (
        <Muted key={`${p.name}-${i}`}>
          {p.name}
          {p.skill ? ` · ${p.skill}` : ""}
        </Muted>
      ))}
    </Card>
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
      .filter(Boolean) as { a: number; b: number }[];
    onSubmit({ a: sa, b: sb }, parsed.length ? parsed : undefined);
  };

  return (
    <Card style={{ gap: 10 }}>
      <Muted>
        Enter the final sets for {match.labelA} vs {match.labelB}.
      </Muted>
      <Field label={`${match.labelA} sets`} value={a} onChangeText={setA} keyboardType="number-pad" />
      <Field label={`${match.labelB} sets`} value={b} onChangeText={setB} keyboardType="number-pad" />
      <Field
        label="Set scores (optional)"
        value={scores}
        onChangeText={setScores}
        placeholder="21-19, 19-21, 15-10"
      />
      <ErrorText>{localErr || error}</ErrorText>
      <Btn title="Save result" onPress={submit} loading={busy} />
    </Card>
  );
}
