import { NextResponse } from "next/server";
import { isSuperadminEmail, publicUser, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  return NextResponse.json(
    {
      ok: true,
      user: publicUser(auth.user),
      superadmin: isSuperadminEmail(auth.user.email),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
