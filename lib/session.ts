import { NextResponse } from "next/server";
import {
  createSession,
  deleteSession,
  getSession,
  getUser,
  publicUser,
} from "./authStore";
import type { UserRecord } from "./authTypes";

export const SESSION_COOKIE = "va_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function isSuperadminEmail(email: string): boolean {
  const list = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function readBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

export function readCookieToken(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join("=") || "");
  }
  return null;
}

export function readSessionToken(req: Request): string | null {
  return readBearer(req) || readCookieToken(req);
}

export async function requireUser(
  req: Request,
): Promise<{ user: UserRecord; token: string } | { error: string; status: number }> {
  const token = readSessionToken(req);
  const sess = await getSession(token);
  if (!sess) return { error: "Sign in required", status: 401 };
  const user = await getUser(sess.userId);
  if (!user) return { error: "Sign in required", status: 401 };
  if (user.disabled) return { error: "Account disabled", status: 403 };
  return { user, token: sess.token };
}

export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function issueSessionResponse(user: UserRecord, extra: Record<string, unknown> = {}) {
  const token = await createSession(user.id);
  const body = {
    ok: true,
    token,
    user: publicUser(user),
    superadmin: isSuperadminEmail(user.email),
    ...extra,
  };
  const res = NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  return attachSessionCookie(res, token);
}

export async function logoutResponse(req: Request) {
  const token = readSessionToken(req);
  if (token) await deleteSession(token);
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  return clearSessionCookie(res);
}

export { publicUser };
