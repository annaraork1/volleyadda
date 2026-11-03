import { NextResponse } from "next/server";
import { getTournamentMeta } from "@/lib/authStore";
import { canOrganise, canScore } from "@/lib/membership";
import { isSuperadminEmail, requireUser } from "@/lib/session";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Organiser/scorer view of Access settings for the selected tournament. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const season = new URL(req.url).searchParams.get("season");
  if (!season) return NextResponse.json({ ok: false, error: "season required" }, { status: 400 });

  try {
    const state = await loadState(season);
    const key = state.tournamentKey;
    const meta = await getTournamentMeta(key);
    if (!meta) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const organiser =
      isSuperadminEmail(auth.user.email) || canOrganise(meta, auth.user);
    const scorer = organiser || canScore(meta, auth.user);
    if (!scorer) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });

    return NextResponse.json(
      {
        ok: true,
        key,
        fixturesLocked: !!meta.fixturesLocked,
        hasScorerPin: !!(meta.scorerPinHash && meta.scorerPinSalt),
        invites: organiser ? meta.invites || [] : [],
        members: organiser
          ? meta.members.map((m) => ({ userId: m.userId, role: m.role, teamId: m.teamId, email: m.email }))
          : [],
        organiserNotices: organiser ? meta.organiserNotices || [] : [],
        isOrganiser: organiser,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 });
  }
}
