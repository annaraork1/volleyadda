import { NextResponse } from "next/server";
import { saveUser } from "@/lib/authStore";
import { appendAudit } from "@/lib/authStore";
import { logoutResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Soft-delete: disable login. Tournaments remain for other members. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  auth.user.disabled = true;
  auth.user.passwordHash = undefined;
  auth.user.passwordSalt = undefined;
  await saveUser(auth.user);
  await appendAudit({
    at: Date.now(),
    byUserId: auth.user.id,
    byEmail: auth.user.email,
    action: "account.delete",
    reason: "user requested deletion",
  });
  return logoutResponse(req);
}
