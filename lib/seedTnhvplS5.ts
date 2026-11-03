import { addUserTournament, getTournamentMeta, getUserByEmail, saveTournamentMeta } from "./authStore";
import { emptyTournamentMeta } from "./membership";
import { createTournamentSeason, loadRegistry, loadState, updateRegistry } from "./store";
import { DEFAULT_LOGO } from "./tournaments";

export const S5_OWNER_EMAIL = "annaraork1@gmail.com";
export const S5_KEY = "tnhvpl-s5";
export const S5_NAME = "TNHVPL Season 5";
export const S5_SHORT = "TNHVPL";
export const S5_SUBTITLE = "Season 5";
export const S5_DATES = "2026";

const FALLBACK_LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function pickCloneFrom(keys: string[], activeKey: string): string | null {
  const prefer = ["tnhvpl-s4", "tnhvpl-s3", "tnhvpl-s2", "tnhvpl-s1"];
  for (const k of prefer) {
    if (keys.includes(k) && k !== S5_KEY) return k;
  }
  if (activeKey && activeKey !== S5_KEY && keys.includes(activeKey)) return activeKey;
  return keys.find((k) => k !== S5_KEY) || null;
}

export type SeedS5Result = {
  key: string;
  publicCode?: string;
  created: boolean;
  stage: string;
  teams: number;
  players: number;
  ownerEmail: string;
  cloneFrom: string | null;
};

/** Idempotent: create tnhvpl-s5 (workflow clone) and attach organiser ownership. */
export async function seedTnhvplS5(ownerEmail = S5_OWNER_EMAIL): Promise<SeedS5Result> {
  const user = await getUserByEmail(ownerEmail);
  if (!user) {
    throw new Error(`No account for ${ownerEmail}. Sign up once, then seed again.`);
  }
  if (user.disabled) throw new Error(`Account ${ownerEmail} is disabled`);

  const registry = await loadRegistry();
  const keys = registry.tournaments.map((t) => t.key);
  const existing = registry.tournaments.find((t) => t.key === S5_KEY);
  const cloneFrom = pickCloneFrom(keys, registry.activeKey);

  let created = false;
  let publicCode = existing?.publicCode;

  if (!existing) {
    let logo = FALLBACK_LOGO;
    if (cloneFrom) {
      try {
        const src = await loadState(cloneFrom);
        const srcLogo = src.meta?.logo || "";
        if (srcLogo && srcLogo !== DEFAULT_LOGO) logo = srcLogo;
      } catch {
        /* fallback logo */
      }
    }
    const result = await createTournamentSeason({
      key: S5_KEY,
      name: S5_NAME,
      short: S5_SHORT,
      subtitle: S5_SUBTITLE,
      dates: S5_DATES,
      logo,
      mode: cloneFrom ? "clone" : "blank",
      cloneFrom: cloneFrom || undefined,
      cloneStyle: "workflow",
    });
    publicCode = result.publicCode;
    created = true;
  }

  let meta = await getTournamentMeta(S5_KEY);
  if (!meta) {
    meta = emptyTournamentMeta(user.id);
  } else {
    meta.ownerUserId = user.id;
    meta.members = [
      ...meta.members.filter((m) => !(m.userId === user.id && m.role === "organiser")),
      { userId: user.id, role: "organiser", email: user.email, addedAt: Date.now() },
    ];
  }
  meta.visibility = "public";
  meta.archived = false;
  await saveTournamentMeta(S5_KEY, meta);
  await addUserTournament(user.id, S5_KEY);

  await updateRegistry((reg) => ({
    ...reg,
    activeKey: S5_KEY,
    tournaments: reg.tournaments.map((t) =>
      t.key === S5_KEY
        ? { ...t, name: S5_NAME, short: S5_SHORT, subtitle: S5_SUBTITLE, dates: S5_DATES }
        : t,
    ),
  }));

  const state = await loadState(S5_KEY);
  return {
    key: S5_KEY,
    publicCode: state.meta.publicCode || publicCode,
    created,
    stage: String(state.config.stage || ""),
    teams: state.config.teams.length,
    players: state.players.length,
    ownerEmail,
    cloneFrom,
  };
}
