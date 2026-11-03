import { NextResponse } from "next/server";
import { followTournament, isFollowing, listFollowedTournamentKeys, unfollowTournament } from "@/lib/followStore";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const season = new URL(req.url).searchParams.get("season");
  if (season) {
    const { getTournamentMeta } = await import("@/lib/authStore");
    const meta = await getTournamentMeta(season);
    return NextResponse.json(
      {
        ok: true,
        following: await isFollowing(auth.user.id, season),
        canFollow: !!meta && !meta.archived && meta.visibility === "public",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, keys: await listFollowedTournamentKeys(auth.user.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const season = String(body.season || body.key || "").trim();
  if (!season) return NextResponse.json({ ok: false, error: "season required" }, { status: 400 });
  const follow = body.follow !== false && body.unfollow !== true;

  if (follow) {
    const r = await followTournament(auth.user.id, season);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, following: true });
  }
  await unfollowTournament(auth.user.id, season);
  return NextResponse.json({ ok: true, following: false });
}
