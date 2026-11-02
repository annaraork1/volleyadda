import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Btn, ErrorText, Muted, Row, TeamLogo } from "./ui";
import { colors, radius } from "../theme";
import type { MatchState, Side } from "../shared";

export type ScoreAction = "start" | "point" | "timeout" | "adjust" | "resume" | "nextSet" | "undo";
export interface ScoreExtra {
  side?: Side;
  serve?: Side;
  delta?: 1 | -1;
}

interface Props {
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  logoA?: string | null;
  logoB?: string | null;
  match: MatchState;
  /** server clock minus device clock, ms */
  serverOffset?: number;
  busy: boolean;
  error?: string | null;
  onAction: (action: ScoreAction, extra?: ScoreExtra) => void;
  footer?: React.ReactNode;
}

/**
 * Scorer keypad: point, timeout, undo, next set (+ start with serve choice and +/-1 corrections).
 * Used for tournament matches (/api/action) and practice matches (/api/practice).
 */
export function ScorerPad({
  labelA,
  labelB,
  colorA = colors.accent,
  colorB = colors.warn,
  logoA,
  logoB,
  match: m,
  serverOffset = 0,
  busy,
  error,
  onAction,
  footer,
}: Props) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!m.timeout) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [m.timeout]);

  /* -------- not started: choose serve -------- */
  if (m.status === "scheduled") {
    return (
      <View style={{ gap: 14 }}>
        <Text style={s.big}>Who serves first?</Text>
        <Muted>Choose the team that serves the first rally. The match starts immediately.</Muted>
        <Pressable
          disabled={busy}
          style={[s.serveBtn, { borderColor: colorA }]}
          onPress={() => onAction("start", { serve: "A" })}
        >
          <TeamLogo logo={logoA} color={colorA} size={44} />
          <Text style={s.serveText}>{labelA}</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          style={[s.serveBtn, { borderColor: colorB }]}
          onPress={() => onAction("start", { serve: "B" })}
        >
          <TeamLogo logo={logoB} color={colorB} size={44} />
          <Text style={s.serveText}>{labelB}</Text>
        </Pressable>
        <ErrorText>{error}</ErrorText>
        {footer}
      </View>
    );
  }

  const cur = m.sets[m.cur];
  const done = m.status === "done";
  const locked = busy || done || m.awaitingNext || !!m.timeout;
  const remainingMs = m.timeout ? Math.max(0, m.timeout.endsAt - (now + serverOffset)) : 0;
  const canResume = !!m.timeout && (m.timeout.startedAt === 0 || remainingMs <= 800);

  const pad = (side: Side) => {
    const isA = side === "A";
    const label = isA ? labelA : labelB;
    const color = isA ? colorA : colorB;
    const pts = isA ? cur.a : cur.b;
    const setsWon = isA ? m.setsA : m.setsB;
    const serving = m.serve === side && !done;
    const toUsed = isA ? cur.toA : cur.toB;
    return (
      <Pressable
        key={side}
        disabled={locked}
        onPress={() => onAction("point", { side })}
        style={({ pressed }) => [
          s.pad,
          { borderColor: color, opacity: locked && !pressed ? 0.7 : 1, backgroundColor: pressed ? color + "33" : colors.card },
        ]}
      >
        <Row style={{ justifyContent: "space-between", alignSelf: "stretch" }}>
          <Row gap={8} style={{ flex: 1 }}>
            <TeamLogo logo={isA ? logoA : logoB} color={color} size={28} />
            <Text style={s.padLabel} numberOfLines={1}>
              {label}
            </Text>
          </Row>
          <Text style={s.padSets}>Sets {setsWon}</Text>
        </Row>
        <Text style={[s.padScore, { color }]}>{pts}</Text>
        <Row style={{ justifyContent: "space-between", alignSelf: "stretch" }}>
          <Text style={{ color: colors.muted }}>{serving ? "🏐 Serving" : " "}</Text>
          <Text style={{ color: colors.muted }}>
            TO {toUsed}/{m.format.timeouts}
          </Text>
        </Row>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.setInfo}>
          Set {m.cur + 1} of {m.format.bestOf} · to {cur.target}
        </Text>
        <Text style={[s.setInfo, { color: m.status === "live" ? colors.live : colors.good }]}>
          {m.status === "live" ? "● LIVE" : "FINAL"}
        </Text>
      </Row>

      {m.switchNow && <Text style={s.banner}>🔄 Switch sides!</Text>}

      {pad("A")}
      {pad("B")}

      {m.timeout && (
        <View style={s.timeoutBox}>
          <Text style={s.timeoutText}>
            ⏱ Timeout — {m.timeout.side === "A" ? labelA : labelB}
          </Text>
          <Text style={s.timeoutClock}>{m.timeout.startedAt ? Math.ceil(remainingMs / 1000) + "s" : "…"}</Text>
          <Btn title="Resume play" onPress={() => onAction("resume")} disabled={busy || !canResume} />
        </View>
      )}

      {m.awaitingNext && !done && (
        <View style={s.timeoutBox}>
          <Text style={s.timeoutText}>
            Set {m.cur + 1} to {m.sets[m.cur].winner === "A" ? labelA : labelB}
          </Text>
          <Btn title={`Start set ${m.cur + 2}`} onPress={() => onAction("nextSet")} loading={busy} />
        </View>
      )}

      {done && (
        <View style={s.timeoutBox}>
          <Text style={s.timeoutText}>
            🏆 {m.winner === "A" ? labelA : labelB} won {Math.max(m.setsA, m.setsB)}–{Math.min(m.setsA, m.setsB)}
          </Text>
          <Muted>{m.sets.map((x) => `${x.a}–${x.b}`).join("  ·  ")}</Muted>
        </View>
      )}

      <Row gap={8}>
        <Btn
          title={`TO ${labelA.slice(0, 8)}`}
          variant="secondary"
          style={{ flex: 1 }}
          small
          disabled={locked || cur.toA >= m.format.timeouts}
          onPress={() => onAction("timeout", { side: "A" })}
        />
        <Btn
          title="Undo"
          variant="ghost"
          style={{ flex: 1 }}
          small
          disabled={busy}
          onPress={() => onAction("undo")}
        />
        <Btn
          title={`TO ${labelB.slice(0, 8)}`}
          variant="secondary"
          style={{ flex: 1 }}
          small
          disabled={locked || cur.toB >= m.format.timeouts}
          onPress={() => onAction("timeout", { side: "B" })}
        />
      </Row>

      <Pressable onPress={() => setShowAdjust((v) => !v)}>
        <Text style={{ color: colors.accent, textAlign: "center" }}>
          {showAdjust ? "Hide score corrections" : "Score corrections (±1)"}
        </Text>
      </Pressable>
      {showAdjust && (
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {(["A", "B"] as Side[]).flatMap((side) =>
            ([-1, 1] as const).map((d) => (
              <Btn
                key={side + d}
                small
                variant="secondary"
                style={{ flexGrow: 1 }}
                title={`${side === "A" ? labelA.slice(0, 8) : labelB.slice(0, 8)} ${d > 0 ? "+1" : "−1"}`}
                disabled={busy || !!m.timeout}
                onPress={() => onAction("adjust", { side, delta: d })}
              />
            )),
          )}
        </Row>
      )}

      <ErrorText>{error}</ErrorText>
      {footer}
    </View>
  );
}

const s = StyleSheet.create({
  big: { color: colors.text, fontSize: 24, fontWeight: "800" },
  serveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  serveText: { color: colors.text, fontSize: 20, fontWeight: "700", flexShrink: 1 },
  setInfo: { color: colors.muted, fontWeight: "700", fontSize: 14 },
  pad: {
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    gap: 6,
    minHeight: 190,
    justifyContent: "space-between",
  },
  padLabel: { color: colors.text, fontSize: 18, fontWeight: "700", flexShrink: 1 },
  padSets: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  padScore: { fontSize: 84, fontWeight: "900", lineHeight: 92 },
  banner: {
    backgroundColor: colors.warn,
    color: "#1b1300",
    textAlign: "center",
    fontWeight: "800",
    padding: 10,
    borderRadius: radius.sm,
    fontSize: 16,
  },
  timeoutBox: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeoutText: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  timeoutClock: { color: colors.warn, fontSize: 40, fontWeight: "900", textAlign: "center" },
});
