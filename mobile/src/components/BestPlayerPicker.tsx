import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, ErrorText, Field, H2, Muted, confirmDialog, useAction } from "./ui";
import { useLive } from "../context/LiveContext";
import { teamForPlayer } from "../shared";
import { colors } from "../theme";

/** Man-of-the-match picker from the two teams in this fixture. */
export function BestPlayerPicker({
  matchId,
  teamA,
  teamB,
  title = "Best player (optional)",
}: {
  matchId: string;
  teamA: string;
  teamB: string;
  title?: string;
}) {
  const { state, act, team } = useLive();
  const [query, setQuery] = useState("");
  const { busy, error, run, setError } = useAction();
  const [note, setNote] = useState("");

  const list = useMemo(() => {
    if (!state) return [];
    return [teamA, teamB].flatMap((tid) => {
      const t = state.config.teams.find((x) => x.id === tid);
      if (!t) return [];
      return t.squad
        .map((n) => state.players.find((p) => p.no === n))
        .filter(Boolean)
        .map((p) => ({ player: p!, team: t }));
    });
  }, [state, teamA, teamB]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      ({ player: p, team: t }) =>
        p.name.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q),
    );
  }, [list, query]);

  if (!state) return null;

  const current = state.matches[matchId]?.bestPlayer ?? null;
  const curPlayer = current ? state.players.find((p) => p.no === current.playerNo) : null;
  const curTeam = current ? team(current.teamId) : null;

  const save = async (playerNo: number | null) => {
    if (playerNo == null) {
      const ok = await confirmDialog("Clear best player?", "Remove the man of the match for this match.", "Clear");
      if (!ok) return;
    }
    setNote("");
    const r = await run(() => act({ type: "setBestPlayer", id: matchId, playerNo }));
    if (r) {
      setNote(playerNo == null ? "Best player cleared" : "Best player saved");
      setQuery("");
      setError(null);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <H2>{title}</H2>
      {curPlayer && curTeam ? (
        <Muted>
          Selected: {curPlayer.name} ({curTeam.name})
        </Muted>
      ) : (
        <Muted>Pick from either squad — used as MVP suggestions later.</Muted>
      )}
      {curPlayer ? <Btn title="Clear" variant="ghost" small onPress={() => void save(null)} disabled={busy} /> : null}
      <Field
        label="Search player"
        value={query}
        onChangeText={setQuery}
        placeholder="Search player…"
        autoCapitalize="none"
      />
      <View style={{ gap: 6 }}>
        {filtered.map(({ player: p, team: t }) => {
          const on = current?.playerNo === p.no;
          return (
            <Pressable
              key={p.no}
              disabled={busy}
              onPress={() => void save(p.no)}
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: on ? t.color || colors.accent : colors.border,
                backgroundColor: colors.card,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {t.name} · {p.skill}
              </Text>
            </Pressable>
          );
        })}
        {filtered.length === 0 && <Muted>No players match.</Muted>}
      </View>
      <ErrorText>{error}</ErrorText>
      {note ? <Muted>{note}</Muted> : null}
      {busy ? <Muted>Saving…</Muted> : null}
    </View>
  );
}

/** Read-only line for spectators when a match has a best player. */
export function BestPlayerNote({ matchId }: { matchId: string }) {
  const { state, team } = useLive();
  if (!state) return null;
  const bp = state.matches[matchId]?.bestPlayer;
  if (!bp) return null;
  const p = state.players.find((x) => x.no === bp.playerNo);
  const t = team(bp.teamId) ?? teamForPlayer(bp.playerNo, state.config.teams, state.players);
  if (!p || !t) return null;
  return (
    <Muted style={{ textAlign: "center" }}>
      Best player: {p.name} ({t.name})
    </Muted>
  );
}
