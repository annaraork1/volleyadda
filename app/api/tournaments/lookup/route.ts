import { NextResponse } from "next/server";
import { getTournamentMeta } from "@/lib/authStore";
import { loadState } from "@/lib/store";
import { isValidPublicCode, isValidTournamentKey, normalizePublicCode } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

/** Resolve a tournament by public code or opaque key (link-only + public). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const codeRaw = url.searchParams.get("code") || "";
  const keyRaw = (url.searchParams.get("key") || "").trim().toLowerCase();

  try {
    if (codeRaw && isValidPublicCode(codeRaw)) {
      const code = normalizePublicCode(codeRaw);
      const state = await loadState(null);
      const hit = state.registry.tournaments.find((t) => t.publicCode && normalizePublicCode(t.publicCode) === code);
      if (!hit) return NextResponse.json({ ok: false, error: "Code not found" }, { status: 404 });
      const meta = await getTournamentMeta(hit.key);
      if (meta?.archived) return NextResponse.json({ ok: false, error: "Tournament archived" }, { status: 404 });
      return NextResponse.json(
        {
          ok: true,
          key: hit.key,
          publicCode: hit.publicCode,
          name: hit.name,
          short: hit.short,
          subtitle: hit.subtitle,
          dates: hit.dates,
          logo: hit.logo,
          visibility: meta?.visibility || "link",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (keyRaw && isValidTournamentKey(keyRaw)) {
      const state = await loadState(keyRaw);
      if (state.tournamentKey !== keyRaw) {
        return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 });
      }
      const meta = await getTournamentMeta(keyRaw);
      if (meta?.archived) return NextResponse.json({ ok: false, error: "Tournament archived" }, { status: 404 });
      return NextResponse.json(
        {
          ok: true,
          key: keyRaw,
          publicCode: state.meta.publicCode,
          name: state.meta.name,
          short: state.meta.short,
          subtitle: state.meta.subtitle,
          dates: state.meta.dates,
          logo: state.meta.logo,
          visibility: meta?.visibility || "link",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json({ ok: false, error: "Provide code or key" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 });
  }
}
