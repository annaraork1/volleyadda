import {
  addUserTournament,
  getTournamentMeta,
  getUserByEmail,
  normalizeEmail,
  saveTournamentMeta,
} from "./authStore";
import type { MembershipEntry, TournamentMetaExt, TournamentRole, UserRecord } from "./authTypes";
import { isSuperadminEmail } from "./session";

export function emptyTournamentMeta(ownerUserId: string): TournamentMetaExt {
  return {
    ownerUserId,
    visibility: "link",
    members: [
      {
        userId: ownerUserId,
        role: "organiser",
        addedAt: Date.now(),
      },
    ],
    invites: [],
    createdAt: Date.now(),
  };
}

export function roleOnTournament(
  meta: TournamentMetaExt | null | undefined,
  userId: string,
): TournamentRole | null {
  if (!meta) return null;
  if (meta.ownerUserId === userId) return "organiser";
  const m = meta.members.find((x) => x.userId === userId);
  return m?.role ?? null;
}

export function canOrganise(meta: TournamentMetaExt | null | undefined, user: UserRecord): boolean {
  if (isSuperadminEmail(user.email)) return true;
  const r = roleOnTournament(meta, user.id);
  return r === "organiser";
}

export function canScore(meta: TournamentMetaExt | null | undefined, user: UserRecord): boolean {
  if (canOrganise(meta, user)) return true;
  const r = roleOnTournament(meta, user.id);
  return r === "scorer" || r === "organiser";
}

export function canAuctioneer(meta: TournamentMetaExt | null | undefined, user: UserRecord): boolean {
  if (canOrganise(meta, user)) return true;
  return roleOnTournament(meta, user.id) === "auctioneer";
}

export function ownerTeamId(
  meta: TournamentMetaExt | null | undefined,
  userId: string,
): string | undefined {
  return meta?.members.find((m) => m.userId === userId && m.role === "owner")?.teamId;
}

export async function ensureTournamentOwned(
  key: string,
  owner: UserRecord,
  opts?: { visibility?: "link" | "public" },
): Promise<TournamentMetaExt> {
  let meta = await getTournamentMeta(key);
  if (!meta) {
    meta = emptyTournamentMeta(owner.id);
    if (opts?.visibility) meta.visibility = opts.visibility;
    await saveTournamentMeta(key, meta);
    await addUserTournament(owner.id, key);
  }
  return meta;
}

export async function inviteMember(
  key: string,
  email: string,
  role: TournamentRole,
  teamId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const meta = await getTournamentMeta(key);
  if (!meta) return { ok: false, error: "Tournament not found" };
  const emailNorm = normalizeEmail(email);
  const existing = await getUserByEmail(emailNorm);
  if (existing) {
    const entry: MembershipEntry = {
      userId: existing.id,
      role,
      teamId: role === "owner" ? teamId : undefined,
      email: existing.email,
      addedAt: Date.now(),
    };
    meta.members = [
      ...meta.members.filter(
        (m) => !(m.userId === existing.id && m.role === role && (role !== "owner" || m.teamId === teamId)),
      ),
      entry,
    ];
    await saveTournamentMeta(key, meta);
    await addUserTournament(existing.id, key);
    try {
      const { pushNotice } = await import("./notifyStore");
      await pushNotice(existing.id, {
        type: "invite",
        title: "Tournament invite",
        body: `You were added as ${role} on ${key}.`,
        tournamentKey: key,
      });
    } catch {
      /* non-fatal */
    }
    return { ok: true };
  }
  meta.invites = [
    ...(meta.invites || []).filter((i) => !(i.emailNorm === emailNorm && i.role === role)),
    { emailNorm, role, teamId, at: Date.now() },
  ];
  await saveTournamentMeta(key, meta);
  return { ok: true };
}

/** Attach pending invites when a user verifies / signs up. */
export async function claimInvitesForUser(user: UserRecord): Promise<void> {
  // Invites are stored per-tournament; we scan user list is not feasible without index.
  // Callers pass tournament keys when known; also check after login via re-invite.
  void user;
}

export async function acceptInvitesOnTournament(key: string, user: UserRecord): Promise<void> {
  const meta = await getTournamentMeta(key);
  if (!meta?.invites?.length) return;
  const mine = meta.invites.filter((i) => i.emailNorm === user.emailNorm);
  if (!mine.length) return;
  for (const inv of mine) {
    meta.members.push({
      userId: user.id,
      role: inv.role,
      teamId: inv.teamId,
      email: user.email,
      addedAt: Date.now(),
    });
  }
  meta.invites = meta.invites.filter((i) => i.emailNorm !== user.emailNorm);
  await saveTournamentMeta(key, meta);
  await addUserTournament(user.id, key);
  try {
    const { pushNotice } = await import("./notifyStore");
    await pushNotice(user.id, {
      type: "invite",
      title: "Tournament invite accepted",
      body: `Your pending invite for ${key} is now active.`,
      tournamentKey: key,
    });
  } catch {
    /* non-fatal */
  }
}
