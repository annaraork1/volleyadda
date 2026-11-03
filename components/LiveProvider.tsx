"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { computeAll } from "@/lib/engine";
import { anyMatchLive, nextPollDelayMs } from "@/lib/livePoll";
import type { AppState, Team } from "@/lib/types";

type Computed = ReturnType<typeof computeAll>;
export type StaffRole = "admin" | "scorer" | "auctioneer" | "owner";

interface Ctx {
  state: AppState | null;
  calc: Computed | null;
  error: string | null;
  updatedAt: number;
  /** True until the first successful /api/state load (and while season switches). */
  loading: boolean;
  /** Count of in-flight /api/action writes. */
  saving: number;
  /**
   * Selected tournament key.
   * null = no tournament selected (do not fall back to registry activeKey).
   */
  season: string | null;
  /** True after localStorage season key has been read. */
  seasonReady: boolean;
  setSeason: (key: string | null) => void;
  seasonHref: (path: string) => string;
  refresh: (fresh?: boolean) => Promise<void>;
  act: (
    type: string,
    payload?: Record<string, unknown>,
    opts?: { noAccept?: boolean },
  ) => Promise<{ ok: boolean; error?: string; state?: AppState }>;
  accept: (s: AppState) => void;
  setHold: (h: boolean) => void;
  team: (id: string | null | undefined) => Team | undefined;
  pin: string;
  role: StaffRole | null;
  /** Set when role === "owner". */
  ownerTeamId: string | null;
  roleReady: boolean;
  setPin: (p: string) => void;
  login: (
    pin: string,
    opts?: { teamId?: string },
  ) => Promise<{ ok: boolean; role?: StaffRole; teamId?: string; error?: string }>;
  logout: () => void;
}

const LiveCtx = createContext<Ctx | null>(null);
const PIN_KEY = "tnhvpl-pin";
const OWNER_TEAM_KEY = "tnhvpl-owner-team";
const SEASON_KEY = "va_season";

const STAFF_ROLES: StaffRole[] = ["admin", "scorer", "auctioneer", "owner"];
function asStaffRole(r: unknown): StaffRole | null {
  return typeof r === "string" && (STAFF_ROLES as string[]).includes(r) ? (r as StaffRole) : null;
}

/** Monotonic write watermark — match CAS `v` only rises on successful writes. */
function matchesRevision(s: AppState): number {
  let n = 0;
  for (const m of Object.values(s.matches)) n += m?.v ?? 0;
  return n;
}

function readPin() {
  try {
    return localStorage.getItem(PIN_KEY) ?? "";
  } catch {
    return "";
  }
}

function readStoredSeason(): string | null {
  try {
    return localStorage.getItem(SEASON_KEY);
  } catch {
    return null;
  }
}

function writeStoredSeason(key: string | null) {
  try {
    if (key) localStorage.setItem(SEASON_KEY, key);
    else localStorage.removeItem(SEASON_KEY);
  } catch {
    /* ignore */
  }
}

async function checkPin(
  p: string,
  opts?: { teamId?: string; season?: string | null },
): Promise<{ ok: boolean; role?: StaffRole; teamId?: string; error?: string }> {
  try {
    const r = await fetch("/api/action", {
      method: "POST",
      headers: { "content-type": "application/json", ...(p ? { "x-pin": p } : {}) },
      body: JSON.stringify({
        type: "checkPin",
        ...(opts?.teamId ? { teamId: opts.teamId } : {}),
        ...(opts?.season ? { season: opts.season } : {}),
      }),
    }).then((x) => x.json());
    if (!r.ok) return { ok: false, error: r.error ?? "Wrong PIN" };
    const role = asStaffRole(r.role);
    if (!role) return { ok: false, error: "Wrong PIN" };
    return { ok: true, role, teamId: typeof r.teamId === "string" ? r.teamId : undefined };
  } catch {
    return { ok: false, error: "No connection" };
  }
}

function readOwnerTeam() {
  try {
    return localStorage.getItem(OWNER_TEAM_KEY) ?? "";
  } catch {
    return "";
  }
}

function withSeason(path: string, season: string | null) {
  if (!season) return path;
  const [base, hash] = path.split("#");
  const [pathname, qs] = base.split("?");
  const params = new URLSearchParams(qs || "");
  params.set("season", season);
  const q = params.toString();
  return `${pathname}?${q}${hash ? `#${hash}` : ""}`;
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const seasonParam = searchParams.get("season");
  const [season, setSeasonState] = useState<string | null>(null);
  const [seasonReady, setSeasonReady] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(0);
  const [pin, setPinState] = useState("");
  const [role, setRole] = useState<StaffRole | null>(null);
  const [ownerTeamId, setOwnerTeamId] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const ownerTeamRef = useRef<string | null>(null);
  const fastUntil = useRef(0);
  const lastServer = useRef(0);
  const lastRev = useRef(0);
  const hold = useRef(false);
  const liveRef = useRef(false);
  const seasonRef = useRef<string | null>(null);
  const hasState = useRef(false);

  const setHold = useCallback((h: boolean) => {
    hold.current = h;
  }, []);

  const setSeason = useCallback((key: string | null) => {
    seasonRef.current = key;
    setSeasonState(key);
    writeStoredSeason(key);
    lastServer.current = 0;
    lastRev.current = 0;
    hasState.current = false;
    setState(null);
    setError(null);
    liveRef.current = false;
    if (key) setLoading(true);
    else setLoading(false);
  }, []);

  // Restore persisted season; URL ?season= wins when present.
  useEffect(() => {
    const fromUrl = seasonParam?.trim() || null;
    const stored = readStoredSeason();
    const initial = fromUrl || stored;
    seasonRef.current = initial;
    setSeasonState(initial);
    if (fromUrl && fromUrl !== stored) writeStoredSeason(fromUrl);
    if (!initial) setLoading(false);
    setSeasonReady(true);
  }, []);

  // Sync URL ?season= into selection after ready.
  useEffect(() => {
    if (!seasonReady) return;
    const fromUrl = seasonParam?.trim() || null;
    if (fromUrl && fromUrl !== seasonRef.current) {
      setSeason(fromUrl);
    }
  }, [seasonParam, seasonReady, setSeason]);

  const setPin = useCallback((p: string) => {
    setPinState(p);
    try {
      if (p) localStorage.setItem(PIN_KEY, p);
      else localStorage.removeItem(PIN_KEY);
    } catch {}
    if (!p) {
      setRole(null);
      setOwnerTeamId(null);
      ownerTeamRef.current = null;
      try {
        localStorage.removeItem(OWNER_TEAM_KEY);
      } catch {}
      setRoleReady(true);
    }
  }, []);

  const login = useCallback(
    async (raw: string, opts?: { teamId?: string }) => {
      const p = raw.trim();
      if (!p) return { ok: false, error: "Enter a PIN" };
      const r = await checkPin(p, { teamId: opts?.teamId, season: seasonRef.current });
      if (!r.ok || !r.role) {
        setPin("");
        setRole(null);
        setOwnerTeamId(null);
        ownerTeamRef.current = null;
        setRoleReady(true);
        return { ok: false, error: r.error ?? "Wrong PIN" };
      }
      setPin(p);
      setRole(r.role);
      const tid = r.role === "owner" ? r.teamId || opts?.teamId || null : null;
      setOwnerTeamId(tid);
      ownerTeamRef.current = tid;
      try {
        if (tid) localStorage.setItem(OWNER_TEAM_KEY, tid);
        else localStorage.removeItem(OWNER_TEAM_KEY);
      } catch {}
      setRoleReady(true);
      return { ok: true, role: r.role, teamId: tid ?? undefined };
    },
    [setPin],
  );

  const logout = useCallback(() => {
    setPin("");
  }, [setPin]);

  const refreshRole = useCallback(async () => {
    const stored = readPin();
    const storedTeam = readOwnerTeam();
    setRoleReady(false);
    if (stored) setPinState(stored);
    const r = await checkPin(stored, {
      teamId: storedTeam || undefined,
      season: seasonRef.current,
    });
    if (r.ok && r.role) {
      setRole(r.role);
      const tid = r.role === "owner" ? r.teamId || storedTeam || null : null;
      setOwnerTeamId(tid);
      ownerTeamRef.current = tid;
    } else if (stored) {
      // Keep PIN for venue devices, but clear stale role if check failed without session.
      setRole(null);
      setOwnerTeamId(null);
      ownerTeamRef.current = null;
    } else {
      setRole(null);
      setOwnerTeamId(null);
      ownerTeamRef.current = null;
    }
    setRoleReady(true);
  }, []);

  useEffect(() => {
    if (!seasonReady) return;
    void refreshRole();
  }, [season, seasonReady, refreshRole]);

  const accept = useCallback((s: AppState, fromPoll = false) => {
    if (fromPoll && hold.current) return;
    const rev = matchesRevision(s);
    if (rev < lastRev.current) return;
    if (rev === lastRev.current && s.serverTime < lastServer.current) return;
    lastRev.current = rev;
    lastServer.current = s.serverTime;
    setState(s);
    hasState.current = true;
    setUpdatedAt(Date.now());
    setError(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(
    async (fresh = false) => {
      const s = seasonRef.current;
      if (!s) {
        setState(null);
        hasState.current = false;
        setError(null);
        setLoading(false);
        liveRef.current = false;
        return;
      }
      if (!hasState.current) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fresh) params.set("fresh", String(Date.now()));
        params.set("season", s);
        const r = await fetch(`/api/state?${params}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        accept(await r.json(), true);
      } catch {
        setError("Can't reach the server. Retrying…");
        if (!hasState.current) setLoading(false);
      }
    },
    [accept],
  );

  // Reset poll clock when selected season changes.
  useEffect(() => {
    if (!seasonReady) return;
    lastServer.current = 0;
    lastRev.current = 0;
    hasState.current = false;
    setState(null);
    if (season) {
      setLoading(true);
      void refresh(true);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, seasonReady]);

  useEffect(() => {
    if (!seasonReady) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        void tick();
      }, delay);
    };

    let first = true;
    const tick = async () => {
      if (!alive) return;
      if (!seasonRef.current) {
        schedule(5000);
        return;
      }
      if (inFlight) {
        schedule(nextPollDelayMs(liveRef.current, 0));
        return;
      }
      const start = Date.now();
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        inFlight = true;
        try {
          const bypass = first || Date.now() < fastUntil.current;
          first = false;
          await refresh(bypass);
        } finally {
          inFlight = false;
        }
      }
      if (!alive) return;
      schedule(nextPollDelayMs(liveRef.current, Date.now() - start));
    };

    void tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      void refresh(true);
      if (e.persisted) first = true;
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refresh, seasonReady]);

  const act = useCallback(
    async (type: string, payload: Record<string, unknown> = {}, opts?: { noAccept?: boolean }) => {
      if (!seasonRef.current && type !== "createTournament") {
        return { ok: false, error: "Select a tournament first" };
      }
      const trackSave = !opts?.noAccept;
      if (trackSave) setSaving((n) => n + 1);
      try {
        const seasonKey = seasonRef.current;
        const ot = ownerTeamRef.current;
        const r = await fetch("/api/action", {
          method: "POST",
          headers: { "content-type": "application/json", ...(readPin() ? { "x-pin": readPin() } : {}) },
          body: JSON.stringify({
            type,
            ...payload,
            ...(seasonKey ? { season: seasonKey } : {}),
            ...(ot && !payload.teamId ? { teamId: ot } : {}),
          }),
        });
        const j = await r.json();
        if (!j.ok) return { ok: false, error: j.error ?? "Something went wrong" };
        if (j.state && !opts?.noAccept) accept(j.state);
        fastUntil.current = Date.now() + 60_000;
        return { ok: true, state: j.state as AppState };
      } catch {
        return { ok: false, error: "No connection. Your tap was not saved." };
      } finally {
        if (trackSave) setSaving((n) => Math.max(0, n - 1));
      }
    },
    [accept],
  );

  const calc = useMemo(() => (state ? computeAll(state) : null), [state]);
  liveRef.current = anyMatchLive(calc?.ms);
  const team = useCallback((id: string | null | undefined) => state?.config.teams.find((t) => t.id === id), [state]);
  const seasonHref = useCallback((path: string) => withSeason(path, season), [season]);

  return (
    <LiveCtx.Provider
      value={{
        state,
        calc,
        error,
        updatedAt,
        loading,
        saving,
        season,
        seasonReady,
        setSeason,
        seasonHref,
        refresh,
        act,
        accept,
        setHold,
        team,
        pin,
        role,
        ownerTeamId,
        roleReady,
        setPin,
        login,
        logout,
      }}
    >
      {children}
    </LiveCtx.Provider>
  );
}

export function useLive() {
  const c = useContext(LiveCtx);
  if (!c) throw new Error("useLive outside LiveProvider");
  return c;
}
