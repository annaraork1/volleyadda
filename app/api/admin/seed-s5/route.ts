import { NextResponse } from "next/server";
import { seedTnhvplS5 } from "@/lib/seedTnhvplS5";
import { isSuperadminEmail, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST — idempotent seed of tnhvpl-s5 for Phase 8 E2E.
 * Superadmin session only (cookie or Bearer).
 */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  if (!isSuperadminEmail(auth.user.email)) {
    return NextResponse.json({ ok: false, error: "Superadmin required" }, { status: 403 });
  }
  try {
    const result = await seedTnhvplS5();
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
