"use client";

import { useCallback, useEffect, useState } from "react";
import { useLive } from "@/components/LiveProvider";
import { fetchTournamentAccess, type TournamentAccess } from "@/lib/tournamentApi";

/** Per-tournament Access: scorer PIN, fixture lock, invites, share (Phase 4/6). */
export function OrganiserAccess({ season }: { season: string }) {
  const { act, role } = useLive();
  const [access, setAccess] = useState<TournamentAccess | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [pin, setPin] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"scorer" | "organiser" | "auctioneer">("scorer");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccess(await fetchTournamentAccess(season));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load access");
      setAccess(null);
    }
  }, [season]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !access) {
    return (
      <div className="card stack">
        <h3>Access</h3>
        <p className="error">{error}</p>
        <p className="muted">Sign in as organiser to manage venue PIN, fixture lock, and invites.</p>
      </div>
    );
  }
  if (!access) return <p className="muted">Loading access…</p>;
  if (!access.isOrganiser && role !== "admin") {
    return (
      <div className="card stack">
        <h3>Access</h3>
        <p className="muted">
          Fixtures {access.fixturesLocked ? "locked" : "unlocked"}
          {access.hasScorerPin ? " · venue scorer PIN set" : ""}.
        </p>
        <p className="muted">Only organisers can change Access settings.</p>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${season}` : `/s/${season}`;
  const hubUrl = typeof window !== "undefined" ? `${window.location.origin}/tournament/${season}` : `/tournament/${season}`;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card stack">
        <h3>Share</h3>
        <p className="muted">
          Hub: <a href={hubUrl}>{hubUrl}</a>
        </p>
        <p className="muted">
          Short link: <a href={shareUrl}>{shareUrl}</a>
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => void navigator.clipboard?.writeText(hubUrl).then(() => setMsg("Link copied"))}
        >
          Copy hub link
        </button>
      </div>

      <div className="card stack">
        <h3>Venue scorer PIN</h3>
        <p className="muted">One PIN for devices that score without signing in. Rotate anytime.</p>
        <p className="muted">{access.hasScorerPin ? "A PIN is currently set." : "No venue PIN yet."}</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="New PIN (4–12)"
            autoComplete="off"
            style={{ maxWidth: 160 }}
          />
          <button
            type="button"
            className="btn gold"
            disabled={busy || pin.trim().length < 4}
            onClick={async () => {
              setBusy(true);
              setMsg("");
              const r = await act("setTournamentScorerPin", { pin: pin.trim() });
              setBusy(false);
              if (!r.ok) setMsg(r.error || "Failed");
              else {
                setMsg("Scorer PIN saved");
                setPin("");
                void load();
              }
            }}
          >
            {access.hasScorerPin ? "Rotate PIN" : "Set PIN"}
          </button>
          {access.hasScorerPin && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await act("clearTournamentScorerPin");
                setBusy(false);
                if (!r.ok) setMsg(r.error || "Failed");
                else {
                  setMsg("PIN cleared");
                  void load();
                }
              }}
            >
              Clear PIN
            </button>
          )}
        </div>
      </div>

      <div className="card stack">
        <h3>Fixture lock</h3>
        <p className="muted">When locked, scorers cannot edit fixture times or teams.</p>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await act("setFixturesLocked", { locked: !access.fixturesLocked });
            setBusy(false);
            if (!r.ok) setMsg(r.error || "Failed");
            else {
              setMsg(access.fixturesLocked ? "Fixtures unlocked" : "Fixtures locked");
              void load();
            }
          }}
        >
          {access.fixturesLocked ? "Unlock fixtures" : "Lock fixtures"}
        </button>
      </div>

      <div className="card stack">
        <h3>Invite staff</h3>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            style={{ minWidth: 200, flex: 1 }}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
            <option value="scorer">Scorer</option>
            <option value="organiser">Organiser</option>
            <option value="auctioneer">Auctioneer</option>
          </select>
          <button
            type="button"
            className="btn gold"
            disabled={busy || !inviteEmail.trim()}
            onClick={async () => {
              setBusy(true);
              setMsg("");
              const r = await act("inviteMember", { email: inviteEmail.trim(), role: inviteRole });
              setBusy(false);
              if (!r.ok) setMsg(r.error || "Failed");
              else {
                setMsg(`Invited ${inviteEmail.trim()} as ${inviteRole}`);
                setInviteEmail("");
                void load();
              }
            }}
          >
            Invite
          </button>
        </div>
        {access.invites.length > 0 && (
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {access.invites.map((i) => (
              <li key={`${i.emailNorm}-${i.role}`}>
                {i.emailNorm} · {i.role} (pending)
              </li>
            ))}
          </ul>
        )}
        {access.members.length > 0 && (
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {access.members.map((m) => (
              <li key={`${m.userId}-${m.role}-${m.teamId || ""}`}>
                {m.email || m.userId} · {m.role}
              </li>
            ))}
          </ul>
        )}
      </div>

      {access.organiserNotices.length > 0 && (
        <div className="card stack">
          <h3>Organiser notices</h3>
          {access.organiserNotices.slice(0, 8).map((n) => (
            <p key={n.id} className="muted" style={{ margin: 0 }}>
              {new Date(n.at).toLocaleString()} · {n.byEmail}: {n.message}
            </p>
          ))}
        </div>
      )}

      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
