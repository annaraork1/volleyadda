import type { Registry, TournamentMeta } from "./types";

/** Logical registry key; physical Redis key is namespaced via REDIS_KEY_PREFIX (vada:registry). */
export const REGISTRY_KEY = "registry";
export const DEFAULT_TOURNAMENT_KEY = process.env.TOURNAMENT_KEY || "demo";
export const DEFAULT_LOGO = "/logo.png";

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export function isValidTournamentKey(key: string): boolean {
  return KEY_RE.test(key) && key.length >= 2 && key.length <= 40;
}

export function isValidPublicCode(code: string): boolean {
  return CODE_RE.test(code.trim().toUpperCase());
}

export function normalizePublicCode(code: string): string {
  return code.trim().toUpperCase();
}

export function emptyRegistry(seed?: TournamentMeta): Registry {
  const meta =
    seed ??
    ({
      key: DEFAULT_TOURNAMENT_KEY,
      name: "VolleyAdda Demo",
      short: "VolleyAdda",
      subtitle: "Volleyball scoring · Demo",
      dates: "",
      logo: DEFAULT_LOGO,
      createdAt: Date.now(),
    } satisfies TournamentMeta);
  return { v: 0, activeKey: meta.key, tournaments: [meta] };
}

export function normalizeRegistry(raw: Registry | null | undefined, fallbackMeta?: TournamentMeta): Registry {
  if (!raw || !Array.isArray(raw.tournaments) || !raw.tournaments.length) {
    return emptyRegistry(fallbackMeta);
  }
  const tournaments = raw.tournaments
    .filter((t) => t && typeof t.key === "string" && isValidTournamentKey(t.key))
    .map((t) => ({
      key: t.key,
      name: String(t.name || t.key).slice(0, 60),
      short: String(t.short || "VolleyAdda").slice(0, 20),
      subtitle: String(t.subtitle || "").slice(0, 80),
      dates: String(t.dates || "").slice(0, 60),
      logo: String(t.logo || DEFAULT_LOGO).slice(0, 400_000),
      createdAt: Number(t.createdAt) || Date.now(),
      publicCode: typeof t.publicCode === "string" && isValidPublicCode(t.publicCode) ? normalizePublicCode(t.publicCode) : undefined,
    }));
  if (!tournaments.length) return emptyRegistry(fallbackMeta);
  const activeKey = tournaments.some((t) => t.key === raw.activeKey) ? raw.activeKey : tournaments[0].key;
  return { v: Number(raw.v) || 0, activeKey, tournaments };
}

export function metaFor(reg: Registry, key: string): TournamentMeta {
  return reg.tournaments.find((t) => t.key === key) ?? reg.tournaments[0];
}
