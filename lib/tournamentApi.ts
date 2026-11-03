import type { SeasonStage } from "./types";

export interface TournamentListItem {
  key: string;
  name: string;
  short: string;
  subtitle: string;
  dates: string;
  logo: string;
  publicCode?: string;
  stage: SeasonStage | string;
  visibility?: "link" | "public";
  role?: string | null;
}

export interface TournamentAccess {
  ok: true;
  key: string;
  fixturesLocked: boolean;
  hasScorerPin: boolean;
  isOrganiser: boolean;
  invites: { emailNorm: string; role: string; teamId?: string; at: number }[];
  members: { userId: string; role: string; teamId?: string; email?: string }[];
  organiserNotices: { id: string; at: number; byEmail: string; message: string; read?: boolean }[];
}

type Fail = { ok: false; error: string };

async function parseJson<T>(res: Response): Promise<(T & { ok?: boolean }) | Fail> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    return { ok: false, error: String(data.error || data.message || res.statusText || "Failed") };
  }
  return data as T & { ok?: boolean };
}

export async function listMyTournaments(): Promise<TournamentListItem[]> {
  const r = await parseJson<{ tournaments: TournamentListItem[] }>(
    await fetch("/api/tournaments", { cache: "no-store" }),
  );
  if ("error" in r && r.ok === false) return [];
  return (r as { tournaments?: TournamentListItem[] }).tournaments || [];
}

export async function listPublicTournaments(): Promise<TournamentListItem[]> {
  const r = await parseJson<{ tournaments: TournamentListItem[] }>(
    await fetch("/api/tournaments/public", { cache: "no-store" }),
  );
  if ("error" in r && r.ok === false) return [];
  return (r as { tournaments?: TournamentListItem[] }).tournaments || [];
}

export async function lookupTournament(opts: { code?: string; key?: string }) {
  const q = new URLSearchParams();
  if (opts.code) q.set("code", opts.code);
  if (opts.key) q.set("key", opts.key);
  const r = await parseJson<{
    ok: true;
    key: string;
    publicCode?: string;
    name: string;
    logo: string;
    visibility?: string;
  }>(await fetch(`/api/tournaments/lookup?${q}`, { cache: "no-store" }));
  if ("error" in r && r.ok === false) throw new Error(r.error);
  return r as {
    ok: true;
    key: string;
    publicCode?: string;
    name: string;
    logo: string;
    visibility?: string;
  };
}

export async function fetchTournamentAccess(season: string): Promise<TournamentAccess> {
  const r = await parseJson<TournamentAccess>(
    await fetch(`/api/tournaments/access?season=${encodeURIComponent(season)}`, { cache: "no-store" }),
  );
  if ("error" in r && r.ok === false) throw new Error(r.error);
  return r as TournamentAccess;
}

export async function createTournament(input: {
  name: string;
  short?: string;
  subtitle?: string;
  dates?: string;
  logo: string;
  visibility?: "link" | "public";
  mode?: "blank" | "clone";
  cloneFrom?: string;
  startAt?: "registration" | "auction" | "matches";
  registrationOpen?: boolean;
}): Promise<{ key: string; publicCode: string }> {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "createTournament",
      mode: input.mode || "blank",
      name: input.name,
      short: input.short,
      subtitle: input.subtitle,
      dates: input.dates,
      logo: input.logo,
      visibility: input.visibility ?? "link",
      cloneFrom: input.cloneFrom,
      startAt: input.startAt === "matches" || input.startAt === "auction" ? input.startAt : undefined,
      registrationOpen: input.registrationOpen !== false,
    }),
  });
  const j = (await res.json()) as {
    ok?: boolean;
    error?: string;
    key?: string;
    publicCode?: string;
    state?: { tournamentKey?: string; meta?: { publicCode?: string } };
  };
  if (!j.ok) throw new Error(j.error || "Could not create tournament");
  const key = j.key || j.state?.tournamentKey;
  const publicCode = j.publicCode || j.state?.meta?.publicCode || "";
  if (!key) throw new Error("Create succeeded but no tournament key returned");
  return { key, publicCode };
}
