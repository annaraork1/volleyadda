"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FollowButton } from "@/components/FollowButton";
import { useLive } from "@/components/LiveProvider";
import { LiveScore } from "@/components/LiveScore";
import { OrganiserAccess } from "@/components/OrganiserAccess";
import { Loading, MatchRow, StandingsTable, TeamName } from "@/components/ui";

type Tab = "live" | "fixtures" | "table" | "teams" | "gallery" | "organiser";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "fixtures", label: "Fixtures" },
  { id: "table", label: "Table" },
  { id: "teams", label: "Teams" },
  { id: "gallery", label: "Gallery" },
  { id: "organiser", label: "Organiser" },
];

export default function TournamentHubPage() {
  const { key: keyParam } = useParams<{ key: string }>();
  const key = String(keyParam || "");
  const { state, calc, season, setSeason, loading, seasonReady, seasonHref, role } = useLive();
  const [tab, setTab] = useState<Tab>("live");

  useEffect(() => {
    if (key && season !== key) setSeason(key);
  }, [key, season, setSeason]);

  const webUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${key}` : `/s/${key}`;
  const publicCode = state?.meta.publicCode;
  const qrUrl = useMemo(() => {
    const data = encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/s/${key}` : `/s/${key}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [key]);

  if (!seasonReady || (loading && !state)) return <Loading label="Loading tournament…" />;
  if (!state || !calc) {
    return (
      <div className="card stack">
        <h1>Tournament</h1>
        <p className="muted">Could not load this tournament.</p>
        <Link className="btn" href="/">
          Home
        </Link>
      </div>
    );
  }

  const t = state.config.tournament;
  const fixtures = [...state.config.fixtures].sort((a, b) => a.no - b.no);
  const live = fixtures.filter((f) => calc.ms[f.id]?.status === "live");
  const upcoming = fixtures.filter((f) => calc.ms[f.id]?.status === "scheduled").slice(0, 6);
  const recent = fixtures.filter((f) => calc.ms[f.id]?.status === "done").slice(-4).reverse();
  const isOrganiser = role === "admin";

  return (
    <div className="stack" style={{ gap: 16 }}>
      {isOrganiser && (
        <div className="card" style={{ borderColor: "var(--accent, #c9a227)" }}>
          <span className="kicker">You&apos;re the organiser</span>
          <p className="muted" style={{ marginBottom: 0 }}>
            Manage Access, stages and invites under Organiser. Share the link or code anytime.
          </p>
        </div>
      )}

      <section className="stack" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {state.meta.logo ? <img src={state.meta.logo} alt="" width={64} height={64} className="logo" /> : null}
          <div style={{ flex: 1, minWidth: 180 }}>
            <h1 style={{ margin: 0 }}>{t.name}</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {[t.subtitle, t.dates].filter(Boolean).join(" · ")}
            </p>
          </div>
          <FollowButton season={key} />
        </div>
      </section>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={tab === x.id ? "btn gold" : "btn"}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <section className="stack">
          <h2>Live</h2>
          {live.length === 0 && upcoming.length === 0 && recent.length === 0 && (
            <p className="muted">No matches yet. Generate fixtures from Organiser when rosters are ready.</p>
          )}
          {live.map((f) => (
            <LiveScore key={f.id} fx={f} />
          ))}
          {upcoming.length > 0 && (
            <>
              <h2>Up next</h2>
              {upcoming.map((f) => (
                <MatchRow key={f.id} fx={f} />
              ))}
            </>
          )}
          {recent.length > 0 && live.length === 0 && (
            <>
              <h2>Recent</h2>
              {recent.map((f) => (
                <MatchRow key={f.id} fx={f} />
              ))}
            </>
          )}
          <div className="card stack">
            <h2>Share</h2>
            {publicCode ? (
              <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3, margin: 0 }}>{publicCode}</p>
            ) : null}
            <p className="muted" style={{ wordBreak: "break-all" }}>
              {webUrl}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR code" width={140} height={140} style={{ alignSelf: "center" }} />
            <button
              type="button"
              className="btn gold"
              onClick={() => {
                const lines = [t.name, webUrl, publicCode ? `Code: ${publicCode}` : null].filter(Boolean).join("\n");
                void navigator.clipboard?.writeText(lines);
              }}
            >
              Copy link & code
            </button>
          </div>
        </section>
      )}

      {tab === "fixtures" && (
        <section className="stack">
          <h2>Fixtures</h2>
          {fixtures.length === 0 ? (
            <p className="muted">Generate fixtures first (teams + rosters required).</p>
          ) : (
            <div className="mlist">
              {fixtures.map((f) => (
                <MatchRow key={f.id} fx={f} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "table" && (
        <section className="stack">
          <h2>Table</h2>
          <div className="card">
            <StandingsTable />
          </div>
          <Link href={seasonHref("/standings")}>Full standings →</Link>
        </section>
      )}

      {tab === "teams" && (
        <section className="stack">
          <h2>Teams</h2>
          <div className="grid2">
            {state.config.teams.map((team) => (
              <Link key={team.id} href={seasonHref(`/teams/${team.id}`)} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <TeamName id={team.id} label={team.name} size={40} />
              </Link>
            ))}
          </div>
          {state.config.teams.length === 0 && <p className="muted">No teams yet.</p>}
        </section>
      )}

      {tab === "gallery" && (
        <section className="stack">
          <h2>Gallery</h2>
          <p className="muted">Photos can be uploaded before the first match.</p>
          <Link className="btn gold" href={seasonHref("/gallery")}>
            Open gallery
          </Link>
        </section>
      )}

      {tab === "organiser" && (
        <section className="stack">
          <h2>Organiser</h2>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Link className="btn gold" href={seasonHref("/admin")}>
              Full organiser tools
            </Link>
            <Link className="btn" href={seasonHref("/score")}>
              Score
            </Link>
          </div>
          <OrganiserAccess season={key} />
        </section>
      )}
    </div>
  );
}
