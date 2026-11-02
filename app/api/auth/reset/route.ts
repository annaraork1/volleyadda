import { NextResponse } from "next/server";
import { getUser, hashPassword, newSalt, saveUser, takeVerifyToken } from "@/lib/authStore";
import { issueSessionResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }
  const rec = await takeVerifyToken(token);
  if (!rec || rec.purpose !== "reset") {
    return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 400 });
  }
  const user = await getUser(rec.userId);
  if (!user || user.disabled) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }
  const salt = newSalt();
  user.passwordSalt = salt;
  user.passwordHash = hashPassword(password, salt);
  if (!user.providers.includes("password")) user.providers.push("password");
  await saveUser(user);
  return issueSessionResponse(user);
}
