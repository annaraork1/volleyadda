import { createHash, randomBytes } from "node:crypto";
import { hashOwnerPin, newSalt, verifyOwnerPin } from "./ownerAuth";
import { delRaw, readRaw, writeRaw } from "./store";
import type {
  AuditEntry,
  SessionRecord,
  SupportTicket,
  TournamentMetaExt,
  UserRecord,
  VerifyTokenRecord,
} from "./authTypes";

const USER_PREFIX = "va:user:";
const EMAIL_PREFIX = "va:email:";
const SESSION_PREFIX = "va:sess:";
const TOKEN_PREFIX = "va:tok:";
const TOURNAMENT_META = "va:tmeta:";
const USER_TOURNS = "va:ut:";
const SUPPORT_INDEX = "va:support:index";
const SUPPORT_ITEM = "va:support:";
const AUDIT_INDEX = "va:audit:index";
const AUDIT_ITEM = "va:audit:";
const PUBLIC_INDEX = "va:public:tournaments";

export function newUserId(): string {
  return `u_${randomBytes(10).toString("base64url")}`;
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newOpaqueToken(): string {
  return randomBytes(24).toString("base64url");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string, salt: string): string {
  return hashOwnerPin(password, salt);
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  return verifyOwnerPin(password, salt, hash);
}

export { newSalt };

function sessionKey(token: string): string {
  const h = createHash("sha256").update(token).digest("base64url");
  return `${SESSION_PREFIX}${h}`;
}

export async function saveUser(user: UserRecord): Promise<void> {
  user.updatedAt = Date.now();
  await writeRaw(`${USER_PREFIX}${user.id}`, user);
  await writeRaw(`${EMAIL_PREFIX}${user.emailNorm}`, { userId: user.id });
}

export async function getUser(id: string): Promise<UserRecord | null> {
  const [u] = await readRaw<UserRecord>([`${USER_PREFIX}${id}`]);
  return u;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const norm = normalizeEmail(email);
  const [ref] = await readRaw<{ userId: string }>([`${EMAIL_PREFIX}${norm}`]);
  if (!ref?.userId) return null;
  return getUser(ref.userId);
}

export async function createSession(userId: string, days = 30): Promise<string> {
  const token = newSessionToken();
  const now = Date.now();
  const rec: SessionRecord = {
    v: 1,
    token,
    userId,
    createdAt: now,
    expiresAt: now + days * 24 * 60 * 60 * 1000,
  };
  await writeRaw(sessionKey(token), rec);
  return token;
}

export async function getSession(token: string | null | undefined): Promise<SessionRecord | null> {
  if (!token) return null;
  const [s] = await readRaw<SessionRecord>([sessionKey(token)]);
  if (!s || s.expiresAt < Date.now()) {
    if (s) await delRaw(sessionKey(token));
    return null;
  }
  return s;
}

export async function deleteSession(token: string): Promise<void> {
  await delRaw(sessionKey(token));
}

export async function saveVerifyToken(rec: VerifyTokenRecord): Promise<void> {
  await writeRaw(`${TOKEN_PREFIX}${rec.token}`, rec);
}

export async function takeVerifyToken(token: string): Promise<VerifyTokenRecord | null> {
  const key = `${TOKEN_PREFIX}${token}`;
  const [rec] = await readRaw<VerifyTokenRecord>([key]);
  if (!rec) return null;
  await delRaw(key);
  if (rec.expiresAt < Date.now()) return null;
  return rec;
}

export async function getTournamentMeta(key: string): Promise<TournamentMetaExt | null> {
  const [m] = await readRaw<TournamentMetaExt>([`${TOURNAMENT_META}${key}`]);
  return m;
}

export async function saveTournamentMeta(key: string, meta: TournamentMetaExt): Promise<void> {
  await writeRaw(`${TOURNAMENT_META}${key}`, meta);
  const [pub] = await readRaw<{ keys: string[] }>([PUBLIC_INDEX]);
  const keys = new Set(pub?.keys ?? []);
  if (meta.visibility === "public" && !meta.archived) keys.add(key);
  else keys.delete(key);
  await writeRaw(PUBLIC_INDEX, { keys: [...keys] });
}

export async function listPublicTournamentKeys(): Promise<string[]> {
  const [pub] = await readRaw<{ keys: string[] }>([PUBLIC_INDEX]);
  return pub?.keys ?? [];
}

export async function addUserTournament(userId: string, tournamentKey: string): Promise<void> {
  const k = `${USER_TOURNS}${userId}`;
  const [cur] = await readRaw<{ keys: string[] }>([k]);
  const keys = new Set(cur?.keys ?? []);
  keys.add(tournamentKey);
  await writeRaw(k, { keys: [...keys] });
}

export async function listUserTournamentKeys(userId: string): Promise<string[]> {
  const [cur] = await readRaw<{ keys: string[] }>([`${USER_TOURNS}${userId}`]);
  return cur?.keys ?? [];
}

export async function saveSupportTicket(t: SupportTicket): Promise<void> {
  await writeRaw(`${SUPPORT_ITEM}${t.id}`, t);
  const [idx] = await readRaw<{ ids: string[] }>([SUPPORT_INDEX]);
  const ids = [t.id, ...(idx?.ids ?? []).filter((id) => id !== t.id)].slice(0, 500);
  await writeRaw(SUPPORT_INDEX, { ids });
}

export async function getSupportTicket(id: string): Promise<SupportTicket | null> {
  const [t] = await readRaw<SupportTicket>([`${SUPPORT_ITEM}${id}`]);
  return t;
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  const [idx] = await readRaw<{ ids: string[] }>([SUPPORT_INDEX]);
  if (!idx?.ids?.length) return [];
  const rows = await readRaw<SupportTicket>(idx.ids.map((id) => `${SUPPORT_ITEM}${id}`));
  return rows.filter((r): r is SupportTicket => !!r);
}

export async function appendAudit(entry: Omit<AuditEntry, "id">): Promise<void> {
  const id = `a_${randomBytes(8).toString("base64url")}`;
  const full: AuditEntry = { ...entry, id };
  await writeRaw(`${AUDIT_ITEM}${id}`, full);
  const [idx] = await readRaw<{ ids: string[] }>([AUDIT_INDEX]);
  const ids = [id, ...(idx?.ids ?? [])].slice(0, 1000);
  await writeRaw(AUDIT_INDEX, { ids });
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const [idx] = await readRaw<{ ids: string[] }>([AUDIT_INDEX]);
  if (!idx?.ids?.length) return [];
  const ids = idx.ids.slice(0, limit);
  const rows = await readRaw<AuditEntry>(ids.map((id) => `${AUDIT_ITEM}${id}`));
  return rows.filter((r): r is AuditEntry => !!r);
}

export function publicUser(u: UserRecord) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    disabled: u.disabled,
    providers: u.providers,
  };
}
