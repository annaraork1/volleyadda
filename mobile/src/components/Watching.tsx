import React, { useEffect, useRef, useState } from "react";
import { AppState, Text, StyleSheet, View } from "react-native";
import { presenceBeat, presenceCount, storage } from "../api/client";
import { colors, fonts } from "../theme";

const PRESENCE_BEAT_MS = 12_000;
const VIEWER_KEY = "va_viewer_id";

function formatViewers(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

async function viewerId(): Promise<string> {
  const existing = await storage.get(VIEWER_KEY);
  if (existing && existing.length >= 8) return existing;
  const id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await storage.set(VIEWER_KEY, id);
  return id;
}

export function WatchingLine({ count }: { count: number | null }) {
  if (count == null) return null;
  const label = count === 1 ? "1 watching" : `${formatViewers(count)} watching`;
  return (
    <View style={s.row} accessibilityLabel={label}>
      <Text style={s.eye}>◉</Text>
      <Text style={s.num}>{formatViewers(count)}</Text>
    </View>
  );
}

/**
 * Live spectator presence. `beat` true = count this device as a spectator.
 * Scorer pads pass beat=false and only poll the count.
 */
export function usePresence(opts: {
  kind: "t" | "p";
  id: string;
  live: boolean;
  beat: boolean;
  season?: string | null;
}): number | null {
  const { kind, id, live, beat, season } = opts;
  const [count, setCount] = useState<number | null>(null);
  const seasonRef = useRef(season);
  seasonRef.current = season;

  useEffect(() => {
    if (!live || !id) {
      setCount(null);
      return;
    }
    if (kind === "t" && !season) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      if (AppState.currentState !== "active") return;
      try {
        if (beat) {
          const vid = await viewerId();
          const n = await presenceBeat({
            kind,
            id,
            viewerId: vid,
            season: seasonRef.current,
          });
          if (!cancelled) setCount(n);
        } else {
          const n = await presenceCount({ kind, id, season: seasonRef.current });
          if (!cancelled) setCount(n);
        }
      } catch {
        /* ignore transient */
      }
    };

    void tick();
    timer = setInterval(() => void tick(), PRESENCE_BEAT_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void tick();
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [kind, id, live, beat, season]);

  return count;
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  eye: { color: colors.muted, fontSize: 12 },
  num: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
});
