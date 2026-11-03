export interface AppNotice {
  id: string;
  at: number;
  type: string;
  title: string;
  body: string;
  tournamentKey?: string;
  practiceId?: string;
  matchId?: string;
  read?: boolean;
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(String(data.error || data.message || "Request failed"));
  }
  return data as T;
}

export async function listNotices(): Promise<{ notices: AppNotice[]; unread: number }> {
  const r = await parse<{ ok: true; notices: AppNotice[]; unread: number }>(
    await fetch("/api/notices", { cache: "no-store" }),
  );
  return { notices: r.notices || [], unread: r.unread || 0 };
}

export async function markNoticesRead(id?: string): Promise<{ notices: AppNotice[]; unread: number }> {
  const r = await parse<{ ok: true; notices: AppNotice[]; unread: number }>(
    await fetch("/api/notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "markRead", id }),
    }),
  );
  return { notices: r.notices || [], unread: r.unread || 0 };
}
