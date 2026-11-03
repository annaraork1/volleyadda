import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { joinApiUrl } from "./absoluteUrl";
import type {
  AppState,
  AuctionSettings,
  AuctionState,
  Format,
  PracticeMatchPublic,
  PracticeSummary,
  SeasonStage,
  Side,
  MatchState,
} from "../shared";

/* ------------------------------------------------------------------ */
/* Token + PIN storage (SecureStore on native, localStorage on web)    */
/* ------------------------------------------------------------------ */

export const TOKEN_KEY = "va_token";
export const PIN_KEY = "va_pin";

async function kvGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function kvSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}
async function kvDel(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export const storage = { get: kvGet, set: kvSet, del: kvDel };

let tokenCache: string | null | undefined;
let pinCache: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (tokenCache === undefined) tokenCache = await kvGet(TOKEN_KEY);
  return tokenCache;
}
export async function setToken(token: string | null): Promise<void> {
  tokenCache = token;
  if (token) await kvSet(TOKEN_KEY, token);
  else await kvDel(TOKEN_KEY);
}
export async function getPin(): Promise<string | null> {
  if (pinCache === undefined) pinCache = await kvGet(PIN_KEY);
  return pinCache;
}
export async function setPin(pin: string | null): Promise<void> {
  pinCache = pin || null;
  if (pin) await kvSet(PIN_KEY, pin);
  else await kvDel(PIN_KEY);
}

/* ------------------------------------------------------------------ */
/* Core request                                                         */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

interface ReqOpts {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  /** Attach the stored x-pin header (legacy staff PIN). */
  withPin?: boolean;
  /** Skip the global "session expired" handler on 401. */
  quiet401?: boolean;
  timeoutMs?: number;
  rawBody?: FormData;
}

function buildUrl(path: string, query?: ReqOpts["query"]): string {
  let url = joinApiUrl(path);
  if (query) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (v === true) parts.push(encodeURIComponent(k));
      else if (v === false) continue;
      else parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    if (parts.length) url += (url.includes("?") ? "&" : "?") + parts.join("&");
  }
  return url;
}

export async function request<T = any>(path: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers || {}) };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.withPin) {
    const pin = await getPin();
    if (pin) headers["x-pin"] = pin;
  }
  let body: any;
  if (opts.rawBody) {
    body = opts.rawBody; // let fetch set the multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000) : null;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method || (body ? "POST" : "GET"),
      headers,
      body,
      signal: ctrl?.signal,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    throw new ApiError(aborted ? "Request timed out" : "No connection to VolleyAdda", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok || (json && json.ok === false)) {
    const msg = (json && (json.error || json.message)) || `Request failed (${res.status})`;
    if (res.status === 401 && !opts.quiet401 && token) unauthorizedHandler?.();
    throw new ApiError(String(msg), res.status);
  }
  return (json ?? {}) as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                  */
/* ------------------------------------------------------------------ */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  disabled?: boolean;
  providers?: string[];
}
export interface AuthResult {
  ok: true;
  token: string;
  user: PublicUser;
  superadmin: boolean;
  needsVerify?: boolean;
}
export interface MeResult {
  ok: true;
  user: PublicUser;
  superadmin: boolean;
}

export async function authSignup(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  const r = await request<AuthResult>("/api/auth/signup", { method: "POST", body: input, quiet401: true });
  if (r.token) await setToken(r.token);
  return r;
}
export async function authLogin(input: { email: string; password: string }): Promise<AuthResult> {
  const r = await request<AuthResult>("/api/auth/login", { method: "POST", body: input, quiet401: true });
  if (r.token) await setToken(r.token);
  return r;
}
export async function authLogout(): Promise<void> {
  try {
    await request("/api/auth/logout", { method: "POST", body: {}, quiet401: true });
  } catch {
    /* clear local token regardless */
  }
  await setToken(null);
}
export async function authMe(): Promise<MeResult> {
  return request<MeResult>("/api/auth/me", { quiet401: true });
}
export async function authDeleteAccount(): Promise<void> {
  await request("/api/auth/delete", { method: "POST", body: {} });
  await setToken(null);
}
export async function authForgot(email: string): Promise<void> {
  await request("/api/auth/forgot", { method: "POST", body: { email }, quiet401: true });
}
/** Exchange an email-verify token (from the link in the email) for a session. */
export async function authVerify(token: string): Promise<AuthResult> {
  const r = await request<AuthResult>("/api/auth/verify", { method: "POST", body: { token }, quiet401: true });
  if (r.token) await setToken(r.token);
  return r;
}

/** Reset password with token from email; stores session on success. */
export async function authReset(token: string, password: string): Promise<AuthResult> {
  const r = await request<AuthResult>("/api/auth/reset", {
    method: "POST",
    body: { token, password },
    quiet401: true,
  });
  if (r.token) await setToken(r.token);
  return r;
}

/* ------------------------------------------------------------------ */
/* Live state + actions                                                 */
/* ------------------------------------------------------------------ */

export async function fetchState(opts: { season?: string | null; fresh?: boolean } = {}): Promise<AppState> {
  return request<AppState>("/api/state", {
    query: { season: opts.season || undefined, fresh: opts.fresh ? Date.now() : undefined },
    quiet401: true,
  });
}

export type ActionBody = { type: string; season?: string | null } & Record<string, unknown>;
export interface ActionResult {
  ok: true;
  state?: AppState;
  [k: string]: unknown;
}

/** POST /api/action. Sends the Bearer token (and the legacy staff PIN if one is saved). */
export async function postAction(body: ActionBody, opts: { pin?: string } = {}): Promise<ActionResult> {
  return request<ActionResult>("/api/action", {
    method: "POST",
    body,
    withPin: !opts.pin,
    headers: opts.pin ? { "x-pin": opts.pin } : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Tournaments                                                           */
/* ------------------------------------------------------------------ */

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

export async function listMyTournaments(): Promise<TournamentListItem[]> {
  const r = await request<{ tournaments: TournamentListItem[] }>("/api/tournaments");
  return r.tournaments || [];
}
export async function listPublicTournaments(): Promise<TournamentListItem[]> {
  const r = await request<{ tournaments: TournamentListItem[] }>("/api/tournaments/public", { quiet401: true });
  return r.tournaments || [];
}

export async function lookupTournament(opts: { code?: string; key?: string }): Promise<{
  key: string;
  publicCode?: string;
  name: string;
  logo: string;
  visibility?: string;
}> {
  const r = await request<{
    ok: true;
    key: string;
    publicCode?: string;
    name: string;
    logo: string;
    visibility?: string;
  }>("/api/tournaments/lookup", {
    query: { code: opts.code || undefined, key: opts.key || undefined },
    quiet401: true,
  });
  return r;
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

export async function fetchTournamentAccess(season: string): Promise<TournamentAccess> {
  return request<TournamentAccess>("/api/tournaments/access", { query: { season } });
}

/* ------------------------------------------------------------------ */
/* Follow + in-app notices                                              */
/* ------------------------------------------------------------------ */

export async function getFollowing(season?: string): Promise<{
  following?: boolean;
  canFollow?: boolean;
  keys?: string[];
}> {
  if (season) {
    const r = await request<{ ok: true; following: boolean; canFollow?: boolean }>("/api/follow", {
      query: { season },
      quiet401: true,
    });
    return { following: r.following, canFollow: r.canFollow };
  }
  const r = await request<{ ok: true; keys: string[] }>("/api/follow", { quiet401: true });
  return { keys: r.keys || [] };
}

export async function setFollowing(season: string, follow: boolean): Promise<boolean> {
  const r = await request<{ ok: true; following: boolean }>("/api/follow", {
    method: "POST",
    body: { season, follow },
  });
  return !!r.following;
}

export interface AppNotice {
  id: string;
  at: number;
  type: string;
  title: string;
  body: string;
  tournamentKey?: string;
  practiceId?: string;
  matchId?: string;
  read?: boolean;
}

export async function listNotices(): Promise<{ notices: AppNotice[]; unread: number }> {
  const r = await request<{ ok: true; notices: AppNotice[]; unread: number }>("/api/notices");
  return { notices: r.notices || [], unread: r.unread || 0 };
}

export async function markNoticesRead(id?: string): Promise<{ notices: AppNotice[]; unread: number }> {
  const r = await request<{ ok: true; notices: AppNotice[]; unread: number }>("/api/notices", {
    method: "POST",
    body: { type: "markRead", id },
  });
  return { notices: r.notices || [], unread: r.unread || 0 };
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
  const r = await postAction({
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
    registrationOpen: input.registrationOpen,
    season: undefined,
  });
  const key = typeof r.key === "string" ? r.key : "";
  const publicCode = typeof r.publicCode === "string" ? r.publicCode : "";
  if (!key) throw new Error("Create succeeded but no tournament key returned");
  return { key, publicCode };
}

/* ------------------------------------------------------------------ */
/* Practice                                                              */
/* ------------------------------------------------------------------ */

/** Live board row from GET /api/practice (same shape as web PracticeLiveBoardItem). */
export interface PracticeLiveBoardItem {
  match: PracticeMatchPublic;
  state: MatchState;
}
export interface PracticeListResult {
  ok: true;
  matches: PracticeSummary[];
  live: PracticeLiveBoardItem[];
}
export interface PracticeDetail {
  ok: true;
  match: PracticeMatchPublic;
  state: MatchState | null;
}

export const practiceList = () => request<PracticeListResult>("/api/practice", { quiet401: true });

export const practiceGet = (
  id: string,
  opts?: { hostToken?: string | null; scorerToken?: string | null },
) =>
  request<PracticeDetail>(`/api/practice/${encodeURIComponent(id)}`, {
    query: {
      hostToken: opts?.hostToken || undefined,
      scorerToken: opts?.scorerToken || undefined,
    },
    quiet401: true,
  });

export async function fetchCatalog(): Promise<import("../shared").MasterCatalog> {
  try {
    return await request<import("../shared").MasterCatalog>("/api/catalog", { quiet401: true });
  } catch {
    return { teams: [], players: [] };
  }
}

export interface PracticeCreateInput {
  mode: "live" | "quick";
  labelA?: string;
  labelB?: string;
  sideA?: unknown[];
  sideB?: unknown[];
  format?: Format;
  timeoutSeconds?: number;
  allowPublicScore?: boolean;
}
export const practiceCreate = (input: PracticeCreateInput) =>
  request<{ ok: true; hostToken: string; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: { type: "create", ...input },
  });

export const practiceScore = (
  id: string,
  tokens: { hostToken?: string | null; scorerToken?: string | null },
  action: "start" | "point" | "timeout" | "adjust" | "resume" | "nextSet" | "undo",
  extra: { side?: Side; serve?: Side; delta?: 1 | -1 } = {},
) =>
  request<{ ok: true; match: PracticeMatchPublic; state: MatchState }>("/api/practice", {
    method: "POST",
    body: {
      type: "score",
      id,
      hostToken: tokens.hostToken || undefined,
      scorerToken: tokens.scorerToken || undefined,
      action,
      ...extra,
    },
  });

export const practiceQuickResult = (
  id: string,
  hostToken: string | null,
  setsWon: { a: number; b: number },
  setScores?: { a: number; b: number }[],
) =>
  request<{ ok: true; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: { type: "quickResult", id, hostToken, setsWon, setScores },
  });

export const practiceComplete = (
  id: string,
  tokens: { hostToken?: string | null; scorerToken?: string | null },
) =>
  request<{ ok: true; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: {
      type: "complete",
      id,
      hostToken: tokens.hostToken || undefined,
      scorerToken: tokens.scorerToken || undefined,
    },
  });

export const practiceAbandon = (id: string, hostToken: string | null) =>
  request<{ ok: true }>("/api/practice", { method: "POST", body: { type: "abandon", id, hostToken } });

export const practiceDelete = (id: string, hostToken: string | null) =>
  request<{ ok: true }>("/api/practice", { method: "POST", body: { type: "delete", id, hostToken } });

/* ------------------------------------------------------------------ */
/* Presence                                                              */
/* ------------------------------------------------------------------ */

export async function presenceBeat(opts: {
  kind: "t" | "p";
  id: string;
  viewerId: string;
  season?: string | null;
}): Promise<number> {
  const r = await request<{ count: number }>("/api/presence", {
    method: "POST",
    body: {
      kind: opts.kind,
      id: opts.id,
      viewerId: opts.viewerId,
      ...(opts.kind === "t" && opts.season ? { season: opts.season } : {}),
    },
    quiet401: true,
  });
  return r.count ?? 0;
}

export async function presenceCount(opts: {
  kind: "t" | "p";
  id: string;
  season?: string | null;
}): Promise<number> {
  const r = await request<{ count: number }>("/api/presence", {
    query: {
      kind: opts.kind,
      id: opts.id,
      ...(opts.kind === "t" && opts.season ? { season: opts.season } : {}),
    },
    quiet401: true,
  });
  return r.count ?? 0;
}

export const practiceInviteScorer = (
  id: string,
  hostToken: string,
  input: { email?: string; label?: string } = {},
) =>
  request<{ ok: true; inviteId: string; scorerToken: string; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: { type: "inviteScorer", id, hostToken, ...input },
  });

export const practiceRevokeScorer = (id: string, hostToken: string, inviteId: string) =>
  request<{ ok: true; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: { type: "revokeScorer", id, hostToken, inviteId },
  });

export const practiceClaimScorer = (id: string, scorerToken?: string | null) =>
  request<{ ok: true; match: PracticeMatchPublic }>("/api/practice", {
    method: "POST",
    body: { type: "claimScorer", id, scorerToken: scorerToken || undefined },
  });

/* ------------------------------------------------------------------ */
/* Auction                                                               */
/* ------------------------------------------------------------------ */

export interface AuctionPublicTeam {
  id: string;
  name: string;
  short: string;
  color: string;
  logo: string;
  owner: string;
}
export interface AuctionPublicPlayer {
  no: number;
  id: string;
  name: string;
  skill: string;
  photo: string | null;
  team?: string;
}
export interface AuctionPayload {
  ok: true;
  season: string;
  auction: AuctionState & { v: number; startedAt?: number; completedAt?: number };
  teams: AuctionPublicTeam[];
  players: AuctionPublicPlayer[];
  settings: Pick<
    AuctionSettings,
    "purse" | "minPlayers" | "timerSeconds" | "antiSnipeSeconds" | "showPricesPublic" | "increments" | "basePriceBySkill"
  > & Record<string, unknown>;
}

export const fetchAuction = (season?: string | null) =>
  request<AuctionPayload>("/api/auction", { query: { season: season || undefined }, quiet401: true });

/* ------------------------------------------------------------------ */
/* Gallery                                                               */
/* ------------------------------------------------------------------ */

export interface GalleryItem {
  id: string;
  createdAt: number;
  status: string;
  matchId: string | null;
  tags: string[];
  caption: string;
  blobUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export const fetchGallery = (season?: string | null, matchId?: string | null) =>
  request<{ ok: true; season: string; photos: GalleryItem[] }>("/api/gallery", {
    query: { season: season || undefined, matchId: matchId || undefined },
    withPin: false,
    quiet401: true,
  });

async function toFormFile(uri: string, name: string, type: string): Promise<any> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return new File([blob], name, { type });
  }
  return { uri, name, type };
}

export async function uploadGalleryPhoto(input: {
  uri: string;
  width: number;
  height: number;
  thumbUri?: string;
  season?: string | null;
  matchId?: string | null;
  caption?: string;
  tags?: string;
}): Promise<{ ok: true; message: string; photo: GalleryItem }> {
  const form = new FormData();
  form.append("file", await toFormFile(input.uri, "photo.jpg", "image/jpeg"));
  if (input.thumbUri) form.append("thumb", await toFormFile(input.thumbUri, "thumb.jpg", "image/jpeg"));
  form.append("width", String(Math.round(input.width)));
  form.append("height", String(Math.round(input.height)));
  if (input.season) form.append("season", input.season);
  if (input.matchId) form.append("matchId", input.matchId);
  if (input.caption) form.append("caption", input.caption);
  if (input.tags) form.append("tags", input.tags);
  return request("/api/gallery/upload", { method: "POST", rawBody: form, withPin: true, timeoutMs: 60000 });
}

export async function moderateGallery(input: {
  action: "approve" | "reject" | "delete";
  id: string;
  season?: string | null;
}): Promise<{ ok: true }> {
  return request("/api/gallery/moderate", {
    method: "POST",
    body: { action: input.action, id: input.id, season: input.season || undefined },
    withPin: true,
  });
}

/* ------------------------------------------------------------------ */
/* Support + registration                                               */
/* ------------------------------------------------------------------ */

export const sendSupport = (input: {
  message: string;
  tournamentKey?: string;
  matchId?: string;
  practiceId?: string;
}) => request<{ ok: true }>("/api/support", { method: "POST", body: input });

export const registerPlayer = (input: Record<string, unknown>) =>
  request<{ ok: true; message?: string }>("/api/register", { method: "POST", body: input, quiet401: true });

/** SecureStore key holding the host token for a practice match this device created. */
export const practiceHostKey = (id: string) => `va_host_${id}`;
export const practiceScorerKey = (id: string) => `va_scorer_${id}`;
