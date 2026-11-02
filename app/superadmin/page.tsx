"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Ticket = {
  id: string;
  userEmail: string;
  userName: string;
  message: string;
  tournamentKey?: string;
  matchId?: string;
  practiceId?: string;
  status: "open" | "resolved";
  createdAt: number;
  resolveNote?: string;
};

type Me = { ok: boolean; superadmin?: boolean; user?: { email: string; name: string }; error?: string };

export default function SuperadminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const m = (await fetch("/api/auth/me").then((r) => r.json())) as Me;
    setMe(m);
    if (!m.ok || !m.superadmin) return;
    const t = await fetch("/api/support").then((r) => r.json());
    if (t.ok) setTickets(t.tickets || []);
    else setError(t.error || "Could not load tickets");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string) {
    const r = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "resolve", id, note: note[id] || "" }),
    }).then((x) => x.json());
    if (!r.ok) {
      setError(r.error || "Failed");
      return;
    }
    await load();
  }

  if (!me) return <div className="empty">Loading…</div>;
  if (!me.ok) {
    return (
      <div className="card stack">
        <h1>Superadmin</h1>
        <p>Sign in required.</p>
        <Link href="/auth/login?next=/superadmin">Sign in</Link>
      </div>
    );
  }
  if (!me.superadmin) {
    return (
      <div className="card stack">
        <h1>Superadmin</h1>
        <p>Your account ({me.user?.email}) is not listed in SUPERADMIN_EMAILS.</p>
      </div>
    );
  }

  const open = tickets.filter((t) => t.status === "open");
  const closed = tickets.filter((t) => t.status === "resolved");

  return (
    <div className="stack">
      <div className="card stack">
        <h1>VolleyAdda support</h1>
        <p>
          Signed in as <b>{me.user?.email}</b>
        </p>
        {error && <p className="err">{error}</p>}
      </div>

      <div className="card stack">
        <h2>Open reports ({open.length})</h2>
        {!open.length && <p className="muted">No open reports.</p>}
        {open.map((t) => (
          <div key={t.id} className="card stack" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div>
              <b>{t.userName}</b> · {t.userEmail}
              <div className="muted">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <p>{t.message}</p>
            <p className="muted">
              {t.tournamentKey && (
                <>
                  Tournament: <Link href={`/?season=${t.tournamentKey}`}>{t.tournamentKey}</Link>{" "}
                </>
              )}
              {t.matchId && <>Match: {t.matchId} </>}
              {t.practiceId && <>Practice: {t.practiceId}</>}
            </p>
            {t.tournamentKey && (
              <p>
                <Link className="btn" href={`/admin?season=${t.tournamentKey}`}>
                  Open admin
                </Link>{" "}
                <Link className="btn" href={`/score?season=${t.tournamentKey}`}>
                  Open score
                </Link>
              </p>
            )}
            <label>
              Resolve note
              <input value={note[t.id] || ""} onChange={(e) => setNote({ ...note, [t.id]: e.target.value })} />
            </label>
            <button className="btn primary" type="button" onClick={() => resolve(t.id)}>
              Mark resolved
            </button>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h2>Resolved ({closed.length})</h2>
        {closed.slice(0, 20).map((t) => (
          <div key={t.id} className="muted">
            <b>{t.userEmail}</b> — {t.message.slice(0, 80)}
            {t.resolveNote ? ` · ${t.resolveNote}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
