import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState as RNAppState } from "react-native";
import { fetchState, postAction, storage } from "../api/client";
import {
  anyMatchLive,
  computeAll,
  nextPollDelayMs,
  type AppState,
  type Team,
} from "../shared";

const SEASON_KEY = "va_season";

export type Calc = ReturnType<typeof computeAll>;

interface LiveCtx {
  /** Latest tournament snapshot from /api/state. */
  state: AppState | null;
  /** computeAll(state): resolved teams, derived match states, standings. */
  calc: Calc | null;
  error: string | null;
  loading: boolean;
  /** Selected tournament key; null = the site's active tournament. */
  season: string | null;
  setSeason: (key: string | null) => void;
  /** Server clock minus device clock (ms) – use for timeout countdowns. */
  serverOffset: number;
  refresh: (fresh?: boolean) => Promise<AppState | null>;
  /** POST /api/action for the selected tournament and apply the returned state. */
  act: (body: { type: string } & Record<string, unknown>) => Promise<AppState | null>;
  /** Scorer screens call this so polling bypasses the edge cache (?fresh). */
  requestFresh: (on: boolean) => void;
  team: (id: string | null | undefined) => Team | undefined;
}

const Ctx = createContext<LiveCtx | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [season, setSeasonState] = useState<string | null>(null);
  const [serverOffset, setServerOffset] = useState(0);

  const seasonRef = useRef<string | null>(null);
  const freshRef = useRef(0);
  const liveRef = useRef(false);
  const seqRef = useRef(0);
  const appliedSeq = useRef(0);
  const [seasonReady, setSeasonReady] = useState(false);

  // restore the last selected tournament
  useEffect(() => {
    (async () => {
      const k = await storage.get(SEASON_KEY);
      if (k) {
        seasonRef.current = k;
        setSeasonState(k);
      }
      setSeasonReady(true);
    })();
  }, []);

  const apply = useCallback((s: AppState, seq: number) => {
    if (seq < appliedSeq.current) return;
    appliedSeq.current = seq;
    setState(s);
    setError(null);
    setLoading(false);
    if (typeof s.serverTime === "number") setServerOffset(s.serverTime - Date.now());
    liveRef.current = anyMatchLive(computeAll(s).ms);
  }, []);

  const refresh = useCallback(
    async (fresh = false): Promise<AppState | null> => {
      const seq = ++seqRef.current;
      try {
        const s = await fetchState({ season: seasonRef.current, fresh: fresh || freshRef.current > 0 });
        apply(s, seq);
        return s;
      } catch (e: any) {
        setError(e?.message || "Could not load");
        setLoading(false);
        return null;
      }
    },
    [apply],
  );

  const setSeason = useCallback((key: string | null) => {
    seasonRef.current = key;
    setSeasonState(key);
    setState(null);
    setLoading(true);
    appliedSeq.current = seqRef.current + 1; // drop in-flight responses for the old season
    if (key) void storage.set(SEASON_KEY, key);
    else void storage.del(SEASON_KEY);
  }, []);

  // polling loop (cadence from lib/livePoll.ts)
  useEffect(() => {
    if (!seasonReady) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = RNAppState.currentState !== "background" && RNAppState.currentState !== "inactive";

    const tick = async () => {
      if (stopped) return;
      const t0 = Date.now();
      if (active) await refresh();
      if (stopped) return;
      const delay = nextPollDelayMs(liveRef.current, Date.now() - t0);
      timer = setTimeout(tick, delay);
    };

    const sub = RNAppState.addEventListener("change", (st) => {
      const nowActive = st === "active";
      if (nowActive && !active) {
        active = true;
        if (timer) clearTimeout(timer);
        void tick();
      } else if (!nowActive) {
        active = false;
      }
    });

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [seasonReady, season, refresh]);

  const act = useCallback(
    async (body: { type: string } & Record<string, unknown>): Promise<AppState | null> => {
      const seq = ++seqRef.current;
      const r = await postAction({ ...body, season: seasonRef.current ?? undefined });
      if (r.state) {
        apply(r.state, seq);
        return r.state;
      }
      return null;
    },
    [apply],
  );

  const requestFresh = useCallback((on: boolean) => {
    freshRef.current = Math.max(0, freshRef.current + (on ? 1 : -1));
  }, []);

  const calc = useMemo(() => (state ? computeAll(state) : null), [state]);

  const team = useCallback(
    (id: string | null | undefined) => (id && state ? state.config.teams.find((t) => t.id === id) : undefined),
    [state],
  );

  const value = useMemo<LiveCtx>(
    () => ({ state, calc, error, loading, season, setSeason, serverOffset, refresh, act, requestFresh, team }),
    [state, calc, error, loading, season, setSeason, serverOffset, refresh, act, requestFresh, team],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive must be used inside <LiveProvider>");
  return v;
}
