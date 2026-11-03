"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AwardsGrid } from "@/components/AwardsGrid";
import { FollowButton } from "@/components/FollowButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useLive } from "@/components/LiveProvider";
import { LiveScore } from "@/components/LiveScore";
import { StageHomeCta } from "@/components/StageHomeCta";
import { Loading, MatchRow, StandingsTable } from "@/components/ui";
import { emptyAwards, filledAwards } from "@/lib/awards";
import { fetchPracticeBoard, type PracticeLiveBoardItem } from "@/lib/practiceApi";
import {
  listMyTournaments,
  listPublicTournaments,
  type TournamentListItem,
} from "@/lib/tournamentApi";
import { getFollowing, setFollowing } from "@/lib/followApi";

export default function Home() {
  const { state, calc, team, season, setSeason, seasonReady, loading, seasonHref } = useLive();
  const [me, setMe] = useState<{ ok: boolean; user?: { name: string } } | null>(null);
  const [mine, setMine] = useState<TournamentListItem[]>([]);
  const [pub, setPub] = useState<TournamentListItem[]>([]);
  const [followingKeys, setFollowingKeys] = useState<string[]>([]);
  const [practiceLive, setPracticeLive] = useState<PracticeLiveBoardItem[]>([]);
  const [listErr, setListErr] = useState("");

  const signedIn = !!me?.ok && !!me.user;

  const loadLists = useCallback(async () => {
    setListErr("");
    try {
      const [publicList, practice] = await Promise.all([listPublicTournaments(), fetchPracticeBoard()]);
      setPub(publicList);
      setPracticeLive(practice.ok ? practice.live || [] : []);
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "Could not load lists");
    }
    try {
      const auth = await fetch("/api/auth/me").then((r) => r.json());
      setMe(auth);
      if (auth?.ok && auth.user) {
        const [myList, follow] = await Promise.all([listMyTournaments(), getFollowing().catch(() => ({ keys: [] }))]);
        setMine(myList);
        setFollowingKeys(follow.keys || []);
      } else {
        setMine([]);
        setFollowingKeys([]);
      }
    } catch {
      setMe({ ok: false });
      setMine([]);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const created = useMemo(() => mine.filter((t) => t.role === "organiser"), [mine]);
  const hasTournaments = mine.length > 0;

  const openTournament = (key: string) => {
    setSeason(key);
    window.location.href = `/tournament/${encodeURIComponent(key)}`;
  };

  if (!seasonReady) return <Loading />;

  /* —— Chooser / empty home when no tournament selected —— */
  if (!season) {
    return (
      <div className="stack" style={{ gap: 20 }}>
        <section className="stack">
          <span className="kicker">VolleyAdda</span>
          <div className="sechead home-title">
            <h1>Play or watch volleyball</h1>
            <InstallAppButton />
          </div>
          <p className="muted">
            {signedIn
              ? hasTournaments
                ? "Pick a tournament below, start practice, or create another."
                : "Create a tournament or join practice — nothing selected yet."
              : "Browse public tournaments and live practice. Sign in to create or follow."}
          </p>
        </section>

        <div className="grid2">
          <Link href="/practice" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h2 style={{ marginTop: 0 }}>Practice</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Host or watch casual matches — no tournament needed.
            </p>
          </Link>
          <Link
            href={signedIn ? "/tournament/create" : "/auth/login?next=/tournament/create"}
            className="card"
            style={{ textDecoration: "none", color: "inherit", borderColor: "var(--accent, #c9a227)" }}
          >
            <h2 style={{ marginTop: 0 }}>Create tournament</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {signedIn ? "Logo, share link, and organiser tools." : "Sign in to create and organise."}
            </p>
          </Link>
        </div>

        {practiceLive.length > 0 && (
          <section className="stack">
            <div className="sechead">
              <h2>Live practice</h2>
              <Link href="/practice">All practice →</Link>
            </div>
            {practiceLive.slice(0, 4).map((item) => (
              <Link key={item.match.id} href={`/practice/${item.match.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <b>
                  {item.match.labelA} vs {item.match.labelB}
                </b>
                <span className="muted"> · live</span>
              </Link>
            ))}
          </section>
        )}

        {signedIn && created.length > 0 && (
          <section className="stack">
            <h2>Your tournaments</h2>
            {created.map((t) => (
              <TournamentRow key={t.key} t={t} onOpen={openTournament} />
            ))}
          </section>
        )}

        {signedIn && (
          <section className="stack">
            <h2>My tournaments</h2>
            {mine.length === 0 ? (
              <p className="muted">No tournaments yet. Create one or accept an invite.</p>
            ) : (
              mine.map((t) => <TournamentRow key={`m-${t.key}`} t={t} onOpen={openTournament} />)
            )}
          </section>
        )}

        <section className="stack">
          <h2>Public tournaments</h2>
          {listErr && <p className="error">{listErr}</p>}
          {pub.length === 0 ? (
            <p className="muted">No public tournaments right now.</p>
          ) : (
            pub.map((t) => (
              <TournamentRow
                key={`p-${t.key}`}
                t={t}
                onOpen={openTournament}
                following={followingKeys.includes(t.key)}
                onToggleFollow={
                  signedIn
                    ? async () => {
                        try {
                          const next = await setFollowing(t.key, !followingKeys.includes(t.key));
                          setFollowingKeys((prev) =>
                            next ? [...new Set([...prev, t.key])] : prev.filter((k) => k !== t.key),
                          );
                        } catch {
                          /* ignore */
                        }
                      }
                    : undefined
                }
              />
            ))
          )}
        </section>
      </div>
    );
  }

  if (loading && !state) return <Loading />;
  if (!state || !calc) return <Loading />;

  const fx = [...state.config.fixtures].sort((a, b) => a.no - b.no);
  const live = fx.filter((f) => calc.ms[f.id].status === "live");
  const upcoming = fx.filter((f) => calc.ms[f.id].status === "scheduled").slice(0, live.length ? 2 : 3);
  const recent = fx.filter((f) => calc.ms[f.id].status === "done").slice(-3).reverse();
  const champ = team(calc.champion);
  const runner = team(calc.runnerUp);
  const final = state.config.fixtures.find((f) => f.stage === "Final");
  const finalDone = !!final && calc.ms[final.id]?.status === "done";
  const awards = state.config.awards ?? emptyAwards();
  const hasAwards = filledAwards(awards).length > 0;

  return (
    <>
      <section className="stack">
        <span className="kicker">
          {state.config.tournament.subtitle} · {state.config.tournament.dates}
        </span>
        <div className="sechead home-title">
          <h1>{state.config.tournament.name}</h1>
          <InstallAppButton />
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href={`/tournament/${encodeURIComponent(season)}`}>
            Tournament hub
          </Link>
          <button type="button" className="btn" onClick={() => setSeason(null)}>
            Clear selection
          </button>
          <FollowButton season={season} />
        </div>
      </section>

      {practiceLive.length > 0 && (
        <section className="stack">
          <div className="sechead">
            <h2>Live practice</h2>
            <Link href="/practice">Practice →</Link>
          </div>
          {practiceLive.slice(0, 2).map((item) => (
            <Link key={item.match.id} href={`/practice/${item.match.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <b>
                {item.match.labelA} vs {item.match.labelB}
              </b>
            </Link>
          ))}
        </section>
      )}

      {live.length > 0 ? (
        <section className="stack">
          <h2>Live now</h2>
          {live.map((f) => (
            <LiveScore key={f.id} fx={f} />
          ))}
        </section>
      ) : (
        upcoming[0] && (
          <section className="stack">
            <h2>Next match</h2>
            <LiveScore fx={upcoming[0]} />
          </section>
        )
      )}

      <StageHomeCta />

      {champ && (
        <div className="podium">
          <div className="card podium-card champ" style={{ ["--tc" as string]: champ.color }}>
            <span className="kicker">Champions</span>
            <img className="logo" src={champ.logo} alt="" width={72} height={72} />
            <h2>{champ.name}</h2>
          </div>
          {runner && (
            <div className="card podium-card runner" style={{ ["--tc" as string]: runner.color }}>
              <span className="kicker">Runner-up</span>
              <img className="logo" src={runner.logo} alt="" width={56} height={56} />
              <h3>{runner.name}</h3>
            </div>
          )}
        </div>
      )}

      {finalDone && (
        <section className="stack">
          <div className="sechead">
            <h2>Awards</h2>
            <Link href={seasonHref("/awards")}>{hasAwards ? "All awards →" : "Set awards →"}</Link>
          </div>
          <AwardsGrid awards={awards} emptyNote="Awards will appear here once announced." />
        </section>
      )}

      <div className="grid2">
        <section className="stack">
          <div className="sechead">
            <h2>Points table</h2>
            <Link href={seasonHref("/standings")}>Full table →</Link>
          </div>
          <div className="card">
            <StandingsTable compact />
          </div>
        </section>
        <section className="stack">
          <div className="sechead">
            <h2>{recent.length ? "Results & next up" : "Coming up"}</h2>
            <Link href={seasonHref("/fixtures")}>All fixtures →</Link>
          </div>
          <div className="mlist">
            {recent.map((f) => (
              <MatchRow key={f.id} fx={f} />
            ))}
            {upcoming.slice(live.length ? 0 : 1).map((f) => (
              <MatchRow key={f.id} fx={f} />
            ))}
          </div>
        </section>
      </div>

      <p className="note" style={{ textAlign: "center" }}>
        Scores update by themselves. Share a match link so others can watch live.
      </p>
    </>
  );
}

function TournamentRow({
  t,
  onOpen,
  following,
  onToggleFollow,
}: {
  t: TournamentListItem;
  onOpen: (key: string) => void;
  following?: boolean;
  onToggleFollow?: () => void;
}) {
  return (
    <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => onOpen(t.key)}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flex: 1,
          background: "none",
          border: 0,
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          minWidth: 200,
        }}
      >
        {t.logo ? <img src={t.logo} alt="" width={40} height={40} className="logo" /> : null}
        <span>
          <b>{t.name}</b>
          <br />
          <span className="muted">{[t.subtitle, t.dates, t.stage].filter(Boolean).join(" · ")}</span>
        </span>
      </button>
      {onToggleFollow && (
        <button type="button" className="btn" onClick={() => void onToggleFollow()}>
          {following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
