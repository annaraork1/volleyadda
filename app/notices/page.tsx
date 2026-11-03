"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listNotices, markNoticesRead, type AppNotice } from "@/lib/noticesApi";

export default function NoticesPage() {
  const [me, setMe] = useState<{ ok: boolean } | null>(null);
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const auth = await fetch("/api/auth/me").then((r) => r.json());
      setMe(auth);
      if (!auth?.ok) {
        setNotices([]);
        setUnread(0);
        return;
      }
      const r = await listNotices();
      setNotices(r.notices);
      setUnread(r.unread);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (me === null) return <p className="muted">Loading…</p>;

  if (!me.ok) {
    return (
      <div className="card stack">
        <h1>Notifications</h1>
        <p className="muted">Sign in to see invites and live updates for tournaments you follow.</p>
        <Link className="btn gold" href="/auth/login?next=/notices">
          Sign in
        </Link>
      </div>
    );
  }

  const openNotice = async (n: AppNotice) => {
    if (!n.read) {
      try {
        const r = await markNoticesRead(n.id);
        setNotices(r.notices);
        setUnread(r.unread);
      } catch {
        /* ignore */
      }
    }
    if (n.practiceId) window.location.href = `/practice/${n.practiceId}`;
    else if (n.tournamentKey && n.matchId) window.location.href = `/match/${n.matchId}?season=${encodeURIComponent(n.tournamentKey)}`;
    else if (n.tournamentKey) window.location.href = `/tournament/${n.tournamentKey}`;
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <h1>Notifications</h1>
      <p className="muted">
        {unread > 0 ? `${unread} unread` : "Invites, practice live, and followed match live alerts."}
      </p>
      {unread > 0 && (
        <button
          type="button"
          className="btn"
          onClick={() =>
            void markNoticesRead().then((r) => {
              setNotices(r.notices);
              setUnread(r.unread);
            })
          }
        >
          Mark all read
        </button>
      )}
      {error && <p className="error">{error}</p>}
      {notices.length === 0 ? (
        <p className="muted">No notifications yet. Follow a public tournament or wait for an invite.</p>
      ) : (
        notices.map((n) => (
          <button
            key={n.id}
            type="button"
            className="card"
            onClick={() => void openNotice(n)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              opacity: n.read ? 0.75 : 1,
              borderColor: n.read ? undefined : "var(--accent, #c9a227)",
              width: "100%",
              color: "inherit",
            }}
          >
            <b>{n.title}</b>
            <p className="muted" style={{ margin: "4px 0" }}>
              {n.body}
            </p>
            <span className="muted" style={{ fontSize: 12 }}>
              {n.type.replace(/_/g, " ")} · {new Date(n.at).toLocaleString()}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
