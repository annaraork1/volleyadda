import { NextResponse } from "next/server";
import { getUser, saveUser, takeVerifyToken } from "@/lib/authStore";
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
  const rec = await takeVerifyToken(token);
  if (!rec || rec.purpose !== "verify") {
    return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 400 });
  }
  const user = await getUser(rec.userId);
  if (!user) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  user.emailVerified = true;
  await saveUser(user);
  return issueSessionResponse(user);
}
