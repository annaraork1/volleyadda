import { NextResponse } from "next/server";
import { derive } from "@/lib/engine";
import { ensureLiveTracked, getPractice, toPublic } from "@/lib/practiceStore";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const hostToken = url.searchParams.get("hostToken");
  const scorerToken = url.searchParams.get("scorerToken");
  const match = await getPractice(id);
  if (!match) {
    return NextResponse.json({ ok: false, error: "Practice not found" }, { status: 404 });
  }
  if (match.mode === "live" && match.status !== "done") {
    void ensureLiveTracked(match);
  }

  let userId: string | null = null;
  let emailNorm: string | null = null;
  const auth = await requireUser(req);
  if (!("error" in auth)) {
    userId = auth.user.id;
    emailNorm = auth.user.emailNorm;
  }

  const pub = toPublic(match, { hostToken, scorerToken, userId, emailNorm });
  const state = match.mode === "live" ? derive(match.ev, match.format, match.timeoutSeconds) : null;
  return NextResponse.json(
    { ok: true, match: pub, state },
    { headers: { "Cache-Control": "no-store" } },
  );
}
