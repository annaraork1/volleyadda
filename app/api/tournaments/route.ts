import { NextResponse } from "next/server";
import { getTournamentMeta, listUserTournamentKeys } from "@/lib/authStore";
import { roleOnTournament } from "@/lib/membership";
import { requireUser } from "@/lib/session";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Tournaments the signed-in user owns or is a member of. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const keys = await listUserTournamentKeys(auth.user.id);
  const items = [];
  for (const key of keys) {
    try {
      const state = await loadState(key);
      const meta = await getTournamentMeta(key);
      if (meta?.archived) continue;
      items.push({
        key,
        name: state.meta.name,
        short: state.meta.short,
        subtitle: state.meta.subtitle,
        dates: state.meta.dates,
        logo: state.meta.logo,
        publicCode: state.meta.publicCode,
        stage: state.config.stage || "matches",
        visibility: meta?.visibility || "link",
        role: roleOnTournament(meta, auth.user.id),
      });
    } catch {
      /* skip broken */
    }
  }
  return NextResponse.json({ ok: true, tournaments: items }, { headers: { "Cache-Control": "no-store" } });
}
