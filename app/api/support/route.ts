import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getSupportTicket,
  listSupportTickets,
  saveSupportTicket,
} from "@/lib/authStore";
import type { SupportTicket } from "@/lib/authTypes";
import { isSuperadminEmail, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  if (!isSuperadminEmail(auth.user.email)) {
    return NextResponse.json({ ok: false, error: "Superadmin only" }, { status: 403 });
  }
  const tickets = await listSupportTickets();
  return NextResponse.json({ ok: true, tickets }, { headers: { "Cache-Control": "no-store" } });
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

  // Superadmin resolve
  if (body.action === "resolve") {
    if (!isSuperadminEmail(auth.user.email)) {
      return NextResponse.json({ ok: false, error: "Superadmin only" }, { status: 403 });
    }
    const id = String(body.id || "");
    const ticket = await getSupportTicket(id);
    if (!ticket) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    ticket.status = "resolved";
    ticket.resolvedAt = Date.now();
    ticket.resolveNote = String(body.note || "").slice(0, 500);
    ticket.resolvedBy = auth.user.email;
    await saveSupportTicket(ticket);
    return NextResponse.json({ ok: true, ticket }, { headers: { "Cache-Control": "no-store" } });
  }

  const message = String(body.message || "").trim();
  if (message.length < 5) {
    return NextResponse.json({ ok: false, error: "Describe the problem" }, { status: 400 });
  }
  const ticket: SupportTicket = {
    id: `sup_${randomBytes(8).toString("base64url")}`,
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    message: message.slice(0, 2000),
    tournamentKey: typeof body.tournamentKey === "string" ? body.tournamentKey : undefined,
    matchId: typeof body.matchId === "string" ? body.matchId : undefined,
    practiceId: typeof body.practiceId === "string" ? body.practiceId : undefined,
    status: "open",
    createdAt: Date.now(),
  };
  await saveSupportTicket(ticket);
  return NextResponse.json({ ok: true, ticket }, { headers: { "Cache-Control": "no-store" } });
}
