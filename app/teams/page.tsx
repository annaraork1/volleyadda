"use client";

import Link from "next/link";
import { useLive } from "@/components/LiveProvider";
import { LiveGate } from "@/components/ui";

export default function Teams() {
  return (
    <LiveGate>
      <TeamsInner />
    </LiveGate>
  );
}

function TeamsInner() {
  const { state, seasonHref } = useLive();
  if (!state) return null;
  return (
    <>
      <h1>Teams</h1>
      <div className="teamgrid">
        {state.config.teams.map((t) => (
          <Link key={t.id} href={seasonHref(`/teams/${t.id}`)} className="card teamcard" style={{ ["--tc" as string]: t.color }}>
            <img className="logo" src={t.logo} alt="" width={120} height={120} />
            <h3>{t.name}</h3>
            <span className="muted">Owner: {t.owner}</span>
            <span className="muted">{t.squad.length} players + owner</span>
          </Link>
        ))}
      </div>
    </>
  );
}
