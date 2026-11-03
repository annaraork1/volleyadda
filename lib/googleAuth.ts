import {
  getUserByEmail,
  newOpaqueToken,
  newUserId,
  normalizeEmail,
  saveUser,
} from "@/lib/authStore";
import type { UserRecord } from "@/lib/authTypes";
import { delRaw, readRaw, writeRaw } from "@/lib/store";

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  name: string;
  sub: string;
};

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  sub?: string;
  aud?: string;
};

type OAuthStateRecord = {
  returnTo: string;
  expiresAt: number;
};

const OAUTH_STATE_PREFIX = "va:oauth:google:";

export function googleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
}

/** OAuth redirect must match the host the app actually called (local or Vercel). */
export function googleOAuthRedirectUri(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = (req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https").split(",")[0].trim();
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  const clientId = googleClientId();
  if (!clientId) return null;
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) return null;
  const info = (await res.json()) as GoogleTokenInfo;
  if (info.aud !== clientId || !info.email || !info.sub) return null;
  const emailVerified = info.email_verified === true || info.email_verified === "true";
  return {
    email: info.email,
    emailVerified,
    name: String(info.name || info.email.split("@")[0]).slice(0, 80),
    sub: info.sub,
  };
}

/** Create or link a Google account. Returns an error string on failure. */
export async function upsertGoogleUser(
  profile: GoogleProfile,
): Promise<{ user: UserRecord } | { error: string; status: number }> {
  if (!profile.emailVerified) {
    return { error: "Google email is not verified", status: 401 };
  }
  let user = await getUserByEmail(profile.email);
  const now = Date.now();
  if (!user) {
    user = {
      v: 1,
      id: newUserId(),
      email: profile.email,
      emailNorm: normalizeEmail(profile.email),
      name: profile.name,
      emailVerified: true,
      disabled: false,
      providers: ["google"],
      googleSub: profile.sub,
      createdAt: now,
      updatedAt: now,
    };
    await saveUser(user);
    return { user };
  }
  if (user.disabled) {
    return { error: "Account disabled", status: 403 };
  }
  if (!user.providers.includes("google")) user.providers.push("google");
  user.googleSub = profile.sub;
  user.emailVerified = true;
  if (!user.name && profile.name) user.name = profile.name;
  await saveUser(user);
  return { user };
}

export function isAllowedMobileReturn(url: string): boolean {
  try {
    const u = new URL(url);
    // Native / Expo Go deep links
    if (u.protocol === "volleyadda:" || u.protocol === "exp:" || u.protocol === "exps:") return true;
    // Expo web / Metro local: Linking.createURL → http://localhost:8081/auth/google
    if (u.protocol === "http:" || u.protocol === "https:") {
      const host = u.hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1";
    }
    return false;
  } catch {
    return false;
  }
}

export async function saveGoogleOAuthState(returnTo: string): Promise<string> {
  const state = newOpaqueToken();
  const rec: OAuthStateRecord = {
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  await writeRaw(`${OAUTH_STATE_PREFIX}${state}`, rec);
  return state;
}

export async function takeGoogleOAuthState(state: string): Promise<OAuthStateRecord | null> {
  const key = `${OAUTH_STATE_PREFIX}${state}`;
  const [rec] = await readRaw<OAuthStateRecord>([key]);
  await delRaw(key);
  if (!rec || rec.expiresAt < Date.now()) return null;
  return rec;
}

export function appendQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}
