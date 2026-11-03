import { getTournamentMeta, saveTournamentMeta } from "./authStore";
import { readRaw, writeRaw } from "./store";

const USER_FOLLOW = "va:ufollow:";

function userFollowKey(userId: string) {
  return `${USER_FOLLOW}${userId}`;
}

export async function listFollowedTournamentKeys(userId: string): Promise<string[]> {
  const [cur] = await readRaw<{ keys: string[] }>([userFollowKey(userId)]);
  return cur?.keys ?? [];
}

export async function isFollowing(userId: string, tournamentKey: string): Promise<boolean> {
  const keys = await listFollowedTournamentKeys(userId);
  return keys.includes(tournamentKey);
}

export async function followTournament(
  userId: string,
  tournamentKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const meta = await getTournamentMeta(tournamentKey);
  if (!meta) return { ok: false, error: "Tournament not found" };
  if (meta.archived) return { ok: false, error: "Tournament archived" };
  if (meta.visibility !== "public") return { ok: false, error: "Only public tournaments can be followed" };

  const uk = userFollowKey(userId);
  const [cur] = await readRaw<{ keys: string[] }>([uk]);
  const keys = new Set(cur?.keys ?? []);
  keys.add(tournamentKey);
  await writeRaw(uk, { keys: [...keys] });

  const followers = new Set(meta.followerIds ?? []);
  followers.add(userId);
  meta.followerIds = [...followers];
  await saveTournamentMeta(tournamentKey, meta);
  return { ok: true };
}

export async function unfollowTournament(userId: string, tournamentKey: string): Promise<void> {
  const uk = userFollowKey(userId);
  const [cur] = await readRaw<{ keys: string[] }>([uk]);
  const keys = (cur?.keys ?? []).filter((k) => k !== tournamentKey);
  await writeRaw(uk, { keys });

  const meta = await getTournamentMeta(tournamentKey);
  if (meta?.followerIds?.length) {
    meta.followerIds = meta.followerIds.filter((id) => id !== userId);
    await saveTournamentMeta(tournamentKey, meta);
  }
}

export async function listFollowerIds(tournamentKey: string): Promise<string[]> {
  const meta = await getTournamentMeta(tournamentKey);
  return meta?.followerIds ?? [];
}
