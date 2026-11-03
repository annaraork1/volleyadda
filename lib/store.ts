import { Redis } from "@upstash/redis";
import { emptyAwards, normalizeAwards } from "./awards";
import { buildMasterCatalog, type MasterCatalog } from "./catalog";
import { defaultConfig, defaultSettings, seedPlayers } from "./defaults";
import {
  defaultAuctionSettings,
  defaultRegistrationSettings,
  needsWorkflowBackfill,
  withWorkflowDefaults,
} from "./season";
import { nsKey, nsKeys, redisCredentials } from "./redisNs.ts";
import { newPublicCode, newTournamentKey } from "./tournamentKeys";
import {
  DEFAULT_LOGO,
  DEFAULT_TOURNAMENT_KEY,
  REGISTRY_KEY,
  emptyRegistry,
  isValidTournamentKey,
  metaFor,
  normalizePublicCode,
  normalizeRegistry,
} from "./tournaments";
import type { AppState, Config, MatchDoc, Registry, TournamentMeta } from "./types";

/**
 * Storage: Upstash Redis when its env vars are present (Vercel → Storage → Upstash for Redis),
 * otherwise an in-memory store that is fine for local testing but is NOT shared between
 * serverless instances, so it must not be used for the real event.
 *
 * All keys are namespaced with REDIS_KEY_PREFIX (default `vada:`) so VolleyAdda can share
 * an Upstash instance with TNH without colliding on `tnhvpl:*` keys.
 */
const creds = redisCredentials();
const redis = creds ? new Redis({ url: creds.url, token: creds.token }) : null;
const g = globalThis as unknown as { __mem?: Map<string, string> };
const mem = (g.__mem ??= new Map<string, string>());

export const storageKind: AppState["storage"] = redis ? "redis" : "memory";
export { nsKey, REDIS_KEY_PREFIX } from "./redisNs";

export const cfgKey = (prefix: string) => `${prefix}:config`;
export const matchKey = (prefix: string, id: string) => `${prefix}:m:${id}`;
export const privateKey = (prefix: string) => `${prefix}:private`;
export const auctionKey = (prefix: string) => `${prefix}:auction`;
export const ownersKey = (prefix: string) => `${prefix}:owners`;
export const regIndexKey = (prefix: string) => `${prefix}:reg:index`;
export const regEntryKey = (prefix: string, id: string) => `${prefix}:reg:${id}`;
export const photoKey = (prefix: string, playerId: string) => `${prefix}:ph:${playerId}`;

const CAS = `
local cur = redis.call('GET', KEYS[1])
local expected = tonumber(ARGV[2])
if cur then
  local ok, d = pcall(cjson.decode, cur)
  local v = 0
  if ok and type(d) == 'table' and d.v then v = tonumber(d.v) end
  if v ~= expected then return 0 end
elseif expected ~= 0 then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1])
return 1`;

export async function readRaw<T>(keys: string[]): Promise<(T | null)[]> {
  const physical = nsKeys(keys);
  if (redis) {
    if (!physical.length) return [];
    return (await redis.mget<(T | null)[]>(...physical)) as (T | null)[];
  }
  return physical.map((k) => (mem.has(k) ? (JSON.parse(mem.get(k)!) as T) : null));
}

export async function writeRaw(key: string, value: unknown): Promise<void> {
  const physical = nsKey(key);
  const json = JSON.stringify(value);
  if (redis) await redis.set(physical, json);
  else mem.set(physical, json);
}

export async function delRaw(key: string): Promise<void> {
  const physical = nsKey(key);
  if (redis) await redis.del(physical);
  else mem.delete(physical);
}

async function cas(key: string, value: { v: number }, expected: number): Promise<boolean> {
  const physical = nsKey(key);
  const json = JSON.stringify(value);
  if (redis) {
    const r = await redis.eval(CAS, [physical], [json, String(expected)]);
    return Number(r) === 1;
  }
  const cur = mem.get(physical);
  const v = cur ? Number(JSON.parse(cur).v ?? 0) : 0;
  if (v !== expected) return false;
  mem.set(physical, json);
  return true;
}

function normalizeConfig(cfg: Config | null, fallback: Config): Config {
  const config = cfg ?? fallback;
  const sec = config.settings?.timeoutSeconds;
  const awards = normalizeAwards(config.awards);
  // Legacy configs omit `players` — fill from seed. Explicit [] (blank season) is kept.
  const players = Array.isArray(config.players) ? config.players : seedPlayers();
  let base: Config = {
    ...config,
    awards,
    players,
    teams: Array.isArray(config.teams) ? config.teams : [],
    fixtures: Array.isArray(config.fixtures) ? config.fixtures : [],
  };
  if (!Number.isInteger(sec) || (sec as number) < 5 || (sec as number) > 300) {
    base = {
      ...base,
      settings: { ...defaultSettings, ...config.settings, timeoutSeconds: defaultSettings.timeoutSeconds },
    };
  }
  return withWorkflowDefaults(base);
}

export async function update<T extends { v: number }>(
  key: string,
  fallback: () => T,
  fn: (cur: T) => T | string,
): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const [cur] = await readRaw<T>([key]);
    const base = cur ?? fallback();
    const next = fn(structuredClone(base));
    if (typeof next === "string") throw new ActionError(next);
    next.v = (base.v ?? 0) + 1;
    if (await cas(key, next, base.v ?? 0)) return next;
  }
  throw new ActionError("Busy, please try again");
}

export class ActionError extends Error {}

export async function loadRegistry(): Promise<Registry> {
  const [raw] = await readRaw<Registry>([REGISTRY_KEY]);
  if (raw && raw.tournaments?.length) return normalizeRegistry(raw);

  const key = DEFAULT_TOURNAMENT_KEY;
  const [cfg] = await readRaw<Config>([cfgKey(key)]);
  const fallback = defaultConfig();
  const config = normalizeConfig(cfg, fallback);
  const seedMeta: TournamentMeta = {
    key,
    name: config.tournament.name,
    short: config.tournament.short,
    subtitle: config.tournament.subtitle,
    dates: config.tournament.dates,
    logo: DEFAULT_LOGO,
    createdAt: Date.now(),
  };
  const reg = emptyRegistry(seedMeta);
  await update<Registry>(REGISTRY_KEY, () => reg, () => structuredClone(reg));
  if (!cfg?.players?.length) {
    await update<Config>(cfgKey(key), defaultConfig, (c) => ({
      ...normalizeConfig(c, fallback),
      players: seedPlayers(),
    }));
  }
  return reg;
}

export async function resolveTournamentKey(requested?: string | null): Promise<{ key: string; registry: Registry }> {
  const registry = await loadRegistry();
  if (requested && isValidTournamentKey(requested) && registry.tournaments.some((t) => t.key === requested)) {
    return { key: requested, registry };
  }
  return { key: registry.activeKey, registry };
}

export async function loadState(requestedKey?: string | null): Promise<AppState> {
  const { key, registry } = await resolveTournamentKey(requestedKey);
  const meta = metaFor(registry, key);
  const fallback = defaultConfig();
  const [cfgHint] = await readRaw<Config>([cfgKey(key)]);
  const fixtureIds = (cfgHint?.fixtures?.length ? cfgHint.fixtures : fallback.fixtures).map((f) => f.id);
  const keys = [cfgKey(key), ...fixtureIds.map((id) => matchKey(key, id))];
  const [cfg, ...ms] = await readRaw<Config | MatchDoc>(keys);
  let config = normalizeConfig(cfg as Config | null, fallback);

  // Persist Season 5 / legacy workflow metadata once (stage, auction, registration, fixtureGen).
  if (cfg && needsWorkflowBackfill(cfg as Config)) {
    try {
      config = await updateConfig(key, (c) => withWorkflowDefaults(normalizeConfig(c, fallback)));
    } catch {
      /* read path still serves in-memory defaults */
    }
  }

  const matches: Record<string, MatchDoc> = {};
  config.fixtures.forEach((f) => {
    const idx = fixtureIds.indexOf(f.id);
    const fromList = idx >= 0 ? (ms[idx] as MatchDoc | null) : null;
    matches[f.id] = fromList && typeof fromList === "object" && Array.isArray(fromList.ev) ? fromList : { v: 0, ev: [] };
  });
  return {
    config,
    players: config.players,
    matches,
    storage: storageKind,
    serverTime: Date.now(),
    tournamentKey: key,
    meta,
    viewingArchive: key !== registry.activeKey,
    registry,
  };
}

/** Unique teams & players across every registered season (for admin search / reuse). */
export async function loadMasterCatalog(): Promise<MasterCatalog> {
  const registry = await loadRegistry();
  const keys = registry.tournaments.map((t) => t.key);
  if (!keys.length) return { teams: [], players: [] };
  const cfgs = await readRaw<Config>(keys.map((k) => cfgKey(k)));
  const entries = keys.flatMap((key, i) => {
    const raw = cfgs[i];
    if (!raw || typeof raw !== "object") return [];
    const meta = metaFor(registry, key);
    const config = normalizeConfig(raw, defaultConfig());
    return [
      {
        key,
        name: meta.name,
        createdAt: meta.createdAt,
        teams: config.teams,
        players: config.players,
      },
    ];
  });
  return buildMasterCatalog(entries);
}

export const updateConfig = (prefix: string, fn: (c: Config) => Config | string) =>
  update<Config>(cfgKey(prefix), defaultConfig, fn);

export const updateMatch = (prefix: string, id: string, fn: (m: MatchDoc) => MatchDoc | string) =>
  update<MatchDoc>(matchKey(prefix, id), () => ({ v: 0, ev: [] }), fn);

export const updateRegistry = (fn: (r: Registry) => Registry | string) =>
  update<Registry>(REGISTRY_KEY, () => emptyRegistry(), asyncSafeReg(fn));

function asyncSafeReg(fn: (r: Registry) => Registry | string) {
  return (r: Registry) => fn(r);
}

/**
 * Reset one tournament only: clear all match scores / MOTM picks and awards.
 * Keeps that season's rules, teams, players, fixtures and timings.
 */
export async function resetAll(prefix: string) {
  const [cfg] = await readRaw<Config>([cfgKey(prefix)]);
  const config = normalizeConfig(cfg, defaultConfig());
  const ids = config.fixtures.map((f) => f.id);
  const matchKeys = nsKeys(ids.map((id) => matchKey(prefix, id)));
  if (redis) {
    if (matchKeys.length) await redis.del(...matchKeys);
  } else {
    matchKeys.forEach((k) => mem.delete(k));
  }
  await update<Config>(cfgKey(prefix), defaultConfig, (c) => ({
    ...normalizeConfig(c, defaultConfig()),
    awards: emptyAwards(),
  }));
}

/** Create season: blank or clone (match scores start empty). */
export async function createTournamentSeason(opts: {
  /** Omit or empty to auto-generate an opaque key (PRODUCT option D). */
  key?: string;
  name: string;
  short: string;
  subtitle: string;
  dates: string;
  logo: string;
  mode: "blank" | "clone";
  cloneFrom?: string;
  /** "workflow" (default): team shells only, stage=registration. "archive": full copy of players/fixtures. */
  cloneStyle?: "workflow" | "archive";
}): Promise<{ registry: Registry; key: string; publicCode: string }> {
  let key = (opts.key || "").trim().toLowerCase();
  if (!key) key = newTournamentKey();
  if (!isValidTournamentKey(key)) {
    throw new ActionError("Key must be lowercase letters, numbers and hyphens (e.g. t-ab12cd)");
  }
  const logo = (opts.logo || "").trim();
  if (!logo || logo === DEFAULT_LOGO) {
    throw new ActionError("Tournament logo is required");
  }
  const logoSafe = logo.slice(0, 400_000);
  const registry = await loadRegistry();
  if (registry.tournaments.some((t) => t.key === key)) throw new ActionError("That tournament key already exists");

  let publicCode = newPublicCode();
  for (let i = 0; i < 8; i++) {
    if (!registry.tournaments.some((t) => t.publicCode && normalizePublicCode(t.publicCode) === publicCode)) break;
    publicCode = newPublicCode();
  }

  const workflowDefaults = {
    stage: "registration" as const,
    stageLog: [] as Config["stageLog"],
    registration: defaultRegistrationSettings(),
    auction: defaultAuctionSettings(),
  };

  let config: Config;
  if (opts.mode === "clone") {
    const from =
      opts.cloneFrom && registry.tournaments.some((t) => t.key === opts.cloneFrom) ? opts.cloneFrom! : registry.activeKey;
    const src = await loadState(from);
    const archive = opts.cloneStyle === "archive";
    if (archive) {
      // Full snapshot for demos / archive copies (players, squads, fixtures).
      config = {
        ...structuredClone(src.config),
        v: 0,
        tournament: {
          name: opts.name.slice(0, 60),
          short: (opts.short || src.config.tournament.short).slice(0, 20),
          subtitle: opts.subtitle.slice(0, 80),
          dates: opts.dates.slice(0, 60),
        },
        awards: emptyAwards(),
        players: structuredClone(src.players),
      };
    } else {
      // Workflow clone: team shells only; clear players/fixtures; start at registration.
      // Do not copy registrations, private data, auction log, or owner PINs.
      config = {
        ...structuredClone(src.config),
        v: 0,
        tournament: {
          name: opts.name.slice(0, 60),
          short: (opts.short || src.config.tournament.short).slice(0, 20),
          subtitle: opts.subtitle.slice(0, 80),
          dates: opts.dates.slice(0, 60),
        },
        awards: emptyAwards(),
        players: [],
        fixtures: [],
        teams: src.config.teams.map((t) => ({
          ...structuredClone(t),
          squad: [],
        })),
        ...workflowDefaults,
        // Prefer source auction rules, but always reopen registration for a new season.
        registration: {
          ...defaultRegistrationSettings(),
          ...(src.config.registration
            ? {
                consentText: src.config.registration.consentText,
                requirePhoto: src.config.registration.requirePhoto,
                minAge: src.config.registration.minAge,
                guardianConsentUnder: src.config.registration.guardianConsentUnder,
                skillLevels: src.config.registration.skillLevels,
                numbering: src.config.registration.numbering,
                columnMap: src.config.registration.columnMap,
              }
            : {}),
          open: true,
          closesAt: undefined,
        },
        auction: structuredClone(src.config.auction ?? defaultAuctionSettings()),
        fixtureGen: undefined,
      };
    }
  } else {
    config = {
      v: 0,
      tournament: {
        name: opts.name.slice(0, 60),
        short: (opts.short || "TNHVPL").slice(0, 20),
        subtitle: opts.subtitle.slice(0, 80),
        dates: opts.dates.slice(0, 60),
      },
      settings: structuredClone(defaultSettings),
      teams: [],
      fixtures: [],
      awards: emptyAwards(),
      players: [],
      ...workflowDefaults,
    };
  }

  await update<Config>(cfgKey(key), () => config, () => ({ ...config, v: 0 }));

  const meta: TournamentMeta = {
    key,
    name: config.tournament.name,
    short: config.tournament.short,
    subtitle: config.tournament.subtitle,
    dates: config.tournament.dates,
    logo: logoSafe,
    createdAt: Date.now(),
    publicCode,
  };

  const next = await updateRegistry((reg) => {
    if (reg.tournaments.some((t) => t.key === key)) return "That tournament key already exists";
    return { ...reg, tournaments: [...reg.tournaments, meta] };
  });
  return { registry: next, key, publicCode };
}
