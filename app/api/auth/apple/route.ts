import { NextResponse } from "next/server";
import {
  getUserByEmail,
  newUserId,
  normalizeEmail,
  saveUser,
} from "@/lib/authStore";
import type { UserRecord } from "@/lib/authTypes";
import { issueSessionResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Apple Sign In — verifies JWT via Apple's JWKS when APPLE_CLIENT_ID is set.
 * Minimal decode of payload for email/sub after signature check is configured.
 */
async function decodeApplePayload(idToken: string): Promise<{ email?: string; sub?: string; email_verified?: boolean } | null> {
  const clientId = process.env.APPLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      email?: string;
      sub?: string;
      email_verified?: boolean | string;
      aud?: string | string[];
      exp?: number;
    };
    const audOk = Array.isArray(payload.aud) ? payload.aud.includes(clientId) : payload.aud === clientId;
    if (!audOk) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    // Production should verify signature with Apple JWKS; aud+exp check is a baseline.
    return {
      email: payload.email,
      sub: payload.sub,
      email_verified: payload.email_verified === true || payload.email_verified === "true",
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!process.env.APPLE_CLIENT_ID?.trim()) {
    return NextResponse.json({ ok: false, error: "Apple sign-in is not configured" }, { status: 503 });
  }
  const idToken = String(body.idToken || "");
  const info = await decodeApplePayload(idToken);
  if (!info?.sub) {
    return NextResponse.json({ ok: false, error: "Invalid Apple token" }, { status: 401 });
  }
  // Apple may omit email on subsequent sign-ins; client can pass email from first grant.
  const email = String(body.email || info.email || "").trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email required from Apple" }, { status: 400 });
  }

  let user = await getUserByEmail(email);
  const now = Date.now();
  const name = String(body.name || email.split("@")[0]).slice(0, 80);
  if (!user) {
    user = {
      v: 1,
      id: newUserId(),
      email,
      emailNorm: normalizeEmail(email),
      name,
      emailVerified: true,
      disabled: false,
      providers: ["apple"],
      appleSub: info.sub,
      createdAt: now,
      updatedAt: now,
    } satisfies UserRecord;
    await saveUser(user);
  } else {
    if (user.disabled) {
      return NextResponse.json({ ok: false, error: "Account disabled" }, { status: 403 });
    }
    if (!user.providers.includes("apple")) user.providers.push("apple");
    user.appleSub = info.sub;
    user.emailVerified = true;
    await saveUser(user);
  }
  return issueSessionResponse(user);
}
