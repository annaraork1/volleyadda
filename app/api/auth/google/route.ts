import { NextResponse } from "next/server";
import { googleClientId, upsertGoogleUser, verifyGoogleIdToken } from "@/lib/googleAuth";
import { issueSessionResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!googleClientId()) {
    return NextResponse.json({ ok: false, error: "Google sign-in is not configured" }, { status: 503 });
  }
  const idToken = String(body.idToken || "");
  const profile = await verifyGoogleIdToken(idToken);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Invalid Google token" }, { status: 401 });
  }
  const result = await upsertGoogleUser(profile);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return issueSessionResponse(result.user);
}
