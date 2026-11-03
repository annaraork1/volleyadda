"use client";

import { useCallback, useEffect, useState } from "react";
import { getFollowing, setFollowing } from "@/lib/followApi";

export function FollowButton({ season }: { season: string }) {
  const [following, setFollowingState] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me?.ok || !me.user) {
        setSignedIn(false);
        setCanFollow(false);
        setFollowingState(false);
        return;
      }
      setSignedIn(true);
      const r = await getFollowing(season);
      setFollowingState(!!r.following);
      setCanFollow(!!r.canFollow || !!r.following);
    } catch {
      setCanFollow(false);
    }
  }, [season]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!signedIn) {
    return (
      <a className="btn" href={`/auth/login?next=/tournament/${encodeURIComponent(season)}`}>
        Sign in to follow
      </a>
    );
  }
  if (!canFollow && !following) return null;

  return (
    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className={following ? "btn" : "btn gold"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            const next = await setFollowing(season, !following);
            setFollowingState(next);
            setCanFollow(true);
            setMsg(next ? "Following — you'll get live match alerts." : "Unfollowed.");
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Could not update follow");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "…" : following ? "Following · unfollow" : "Follow"}
      </button>
      {msg && <span className="muted">{msg}</span>}
    </div>
  );
}
