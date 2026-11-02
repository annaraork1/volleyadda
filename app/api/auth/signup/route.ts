import { NextResponse } from "next/server";
import {
  getUserByEmail,
  hashPassword,
  newSalt,
  newUserId,
  normalizeEmail,
  saveUser,
  saveVerifyToken,
  newOpaqueToken,
} from "@/lib/authStore";
import type { UserRecord } from "@/lib/authTypes";
import { appBaseUrl, sendMail } from "@/lib/mail";
import { hitRateLimit } from "@/lib/rateLimit";
import { issueSessionResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim().slice(0, 80);
  const password = String(body.password || "");
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const rl = await hitRateLimit(`signup:${normalizeEmail(email)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try later." }, { status: 429 });

  if (await getUserByEmail(email)) {
    return NextResponse.json({ ok: false, error: "An account with that email already exists" }, { status: 409 });
  }

  const salt = newSalt();
  const now = Date.now();
  const user: UserRecord = {
    v: 1,
    id: newUserId(),
    email,
    emailNorm: normalizeEmail(email),
    name,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    emailVerified: false,
    disabled: false,
    providers: ["password"],
    createdAt: now,
    updatedAt: now,
  };
  await saveUser(user);

  const token = newOpaqueToken();
  await saveVerifyToken({
    token,
    userId: user.id,
    purpose: "verify",
    expiresAt: now + 48 * 60 * 60 * 1000,
  });
  const base = appBaseUrl(req);
  const link = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: "Verify your VolleyAdda account",
    text: `Hi ${name},\n\nVerify your email: ${link}\n\nVolleyAdda`,
    html: `<p>Hi ${name},</p><p><a href="${link}">Verify your email</a> to create matches and tournaments.</p><p>VolleyAdda</p>`,
  });

  return issueSessionResponse(user, { needsVerify: true });
}
