import { NextResponse } from "next/server";
import { listNotices, markNoticesRead } from "@/lib/notifyStore";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const notices = await listNotices(auth.user.id);
  const unread = notices.filter((n) => !n.read).length;
  return NextResponse.json(
    { ok: true, notices, unread },
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
  const type = String(body.type || "markRead");
  if (type === "markRead") {
    const id = typeof body.id === "string" ? body.id : undefined;
    const notices = await markNoticesRead(auth.user.id, id);
    return NextResponse.json({ ok: true, notices, unread: notices.filter((n) => !n.read).length });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
