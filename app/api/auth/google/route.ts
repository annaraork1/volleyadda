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

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  sub?: string;
  aud?: string;
};

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) return null;
  const info = (await res.json()) as GoogleTokenInfo;
  if (info.aud !== clientId) return null;
  return info;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    return NextResponse.json({ ok: false, error: "Google sign-in is not configured" }, { status: 503 });
  }
  const idToken = String(body.idToken || "");
  const info = await verifyGoogleIdToken(idToken);
  if (!info?.email || !info.sub) {
    return NextResponse.json({ ok: false, error: "Invalid Google token" }, { status: 401 });
  }
  const verified = info.email_verified === true || info.email_verified === "true";
  if (!verified) {
    return NextResponse.json({ ok: false, error: "Google email is not verified" }, { status: 401 });
  }

  let user = await getUserByEmail(info.email);
  const now = Date.now();
  if (!user) {
    user = {
      v: 1,
      id: newUserId(),
      email: info.email,
      emailNorm: normalizeEmail(info.email),
      name: String(info.name || info.email.split("@")[0]).slice(0, 80),
      emailVerified: true,
      disabled: false,
      providers: ["google"],
      googleSub: info.sub,
      createdAt: now,
      updatedAt: now,
    };
    await saveUser(user);
  } else {
    if (user.disabled) {
      return NextResponse.json({ ok: false, error: "Account disabled" }, { status: 403 });
    }
    if (!user.providers.includes("google")) user.providers.push("google");
    user.googleSub = info.sub;
    user.emailVerified = true;
    await saveUser(user);
  }
  return issueSessionResponse(user);
}
