async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(String(data.error || data.message || "Request failed"));
  }
  return data as T;
}

export async function getFollowing(season?: string): Promise<{
  following?: boolean;
  canFollow?: boolean;
  keys?: string[];
}> {
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  const r = await parse<{ ok: true; following?: boolean; canFollow?: boolean; keys?: string[] }>(
    await fetch(`/api/follow${q}`, { cache: "no-store" }),
  );
  return { following: r.following, canFollow: r.canFollow, keys: r.keys || [] };
}

export async function setFollowing(season: string, follow: boolean): Promise<boolean> {
  const r = await parse<{ ok: true; following: boolean }>(
    await fetch("/api/follow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ season, follow }),
    }),
  );
  return !!r.following;
}
