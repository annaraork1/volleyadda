"use client";

import { useState } from "react";
import { practiceInviteScorer, practiceRevokeScorer } from "@/lib/practiceApi";
import type { PracticeMatchPublic } from "@/lib/practiceTypes";

export function PracticeInvitePanel({
  match,
  hostToken,
  onUpdated,
}: {
  match: PracticeMatchPublic;
  hostToken: string;
  onUpdated: (m: PracticeMatchPublic) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastLink, setLastLink] = useState("");

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Invite scorers</h3>
      <p className="muted" style={{ margin: 0 }}>
        Host-only by default. Share an invite link so someone else can score.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional email"
          style={{ flex: 1, minWidth: 160 }}
        />
        <button
          type="button"
          className="btn gold"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg("");
            const r = await practiceInviteScorer(match.id, hostToken, {
              email: email.trim() || undefined,
            });
            setBusy(false);
            if (!r.ok) {
              setMsg(r.error);
              return;
            }
            if (r.match) onUpdated(r.match);
            const token = r.scorerToken;
            if (token) {
              const link = `${window.location.origin}/practice/${match.id}?scorerToken=${encodeURIComponent(token)}`;
              setLastLink(link);
              void navigator.clipboard?.writeText(link);
              setMsg("Invite link copied");
            } else setMsg("Invite created");
            setEmail("");
          }}
        >
          Create invite
        </button>
      </div>
      {lastLink && (
        <p className="muted" style={{ wordBreak: "break-all", fontSize: 12 }}>
          {lastLink}
        </p>
      )}
      {(match.scorers || []).length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(match.scorers || []).map((s) => (
            <li key={s.id} className="muted">
              {s.emailNorm || "Link invite"}
              {s.revokedAt ? " · revoked" : s.claimedUserId ? " · claimed" : " · pending"}
              {!s.revokedAt && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const r = await practiceRevokeScorer(match.id, hostToken, s.id);
                      setBusy(false);
                      if (!r.ok) setMsg(r.error);
                      else if (r.match) onUpdated(r.match);
                    }}
                  >
                    Revoke
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
