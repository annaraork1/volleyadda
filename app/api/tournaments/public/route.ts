import { NextResponse } from "next/server";
import { getTournamentMeta, listPublicTournamentKeys } from "@/lib/authStore";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Public tournaments (visibility=public, not archived). */
export async function GET() {
  const keys = await listPublicTournamentKeys();
  const items = [];
  for (const key of keys) {
    try {
      const meta = await getTournamentMeta(key);
      if (!meta || meta.archived || meta.visibility !== "public") continue;
      const state = await loadState(key);
      items.push({
        key,
        name: state.meta.name,
        short: state.meta.short,
        subtitle: state.meta.subtitle,
        dates: state.meta.dates,
        logo: state.meta.logo,
        stage: state.config.stage || "matches",
      });
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({ ok: true, tournaments: items }, { headers: { "Cache-Control": "no-store" } });
}
