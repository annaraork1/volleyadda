import { NextResponse } from "next/server";
import { getUserByEmail, normalizeEmail, verifyPassword } from "@/lib/authStore";
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
  const password = String(body.password || "");
  const rl = await hitRateLimit(`login:${normalizeEmail(email) || "x"}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try later." }, { status: 429 });

  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return NextResponse.json({ ok: false, error: "Wrong email or password" }, { status: 401 });
  }
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Wrong email or password" }, { status: 401 });
  }
  if (user.disabled) {
    return NextResponse.json({ ok: false, error: "Account disabled" }, { status: 403 });
  }
  return issueSessionResponse(user);
}
