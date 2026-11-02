import { useCallback, useEffect, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { fetchAuction, type AuctionPayload } from "../api/client";
import { useLive } from "../context/LiveContext";

/** Polls /api/auction for the selected tournament (every ~1.5 s while mounted). */
export function useAuction(intervalMs = 1500) {
  const { season } = useLive();
  const [data, setData] = useState<AuctionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const n = ++seq.current;
    try {
      const r = await fetchAuction(season);
      if (n >= seq.current) {
        setData(r);
        setError(null);
      }
      return r;
    } catch (e: any) {
      setError(e?.message || "Could not load auction");
      return null;
    }
  }, [season]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      if (RNAppState.currentState === "active") await refresh();
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh, intervalMs]);

  return { data, error, refresh, season };
}
