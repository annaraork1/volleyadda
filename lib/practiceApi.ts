import type { PracticeMatchPublic, PracticeSummary } from "./practiceTypes";
import type { MatchState } from "./types";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

export type PracticeLiveBoardItem = {
  match: PracticeMatchPublic;
  state: MatchState;
};

async function parse<T>(res: Response): Promise<Ok<T> | Fail> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    return { ok: false, error: String(data.error || res.statusText || "Failed") };
  }
  return { ok: true, ...(data as T) };
}

export async function fetchPracticeBoard() {
  const res = await fetch("/api/practice", { cache: "no-store" });
  return parse<{ matches: PracticeSummary[]; live: PracticeLiveBoardItem[] }>(res);
}

/** @deprecated use fetchPracticeBoard */
export async function fetchPracticeHistory() {
  const r = await fetchPracticeBoard();
  if (!r.ok) return r;
  return { ok: true as const, matches: r.matches };
}

export async function fetchPractice(id: string, hostToken: string | null, scorerToken?: string | null) {
  const q = new URLSearchParams();
  if (hostToken) q.set("hostToken", hostToken);
  if (scorerToken) q.set("scorerToken", scorerToken);
  const qs = q.toString();
  const res = await fetch(`/api/practice/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parse<{ match: PracticeMatchPublic; state: MatchState | null }>(res);
}

export async function practiceAct(
  body: Record<string, unknown>,
  opts?: { pin?: string | null },
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.pin) headers["x-pin"] = opts.pin;
  const res = await fetch("/api/practice", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parse<{
    match?: PracticeMatchPublic;
    hostToken?: string;
    state?: MatchState;
    inviteId?: string;
    scorerToken?: string;
  }>(res);
}

export async function practiceInviteScorer(
  id: string,
  hostToken: string,
  input: { email?: string },
) {
  return practiceAct({ type: "inviteScorer", id, hostToken, ...input });
}

export async function practiceRevokeScorer(id: string, hostToken: string, inviteId: string) {
  return practiceAct({ type: "revokeScorer", id, hostToken, inviteId });
}

export async function practiceClaimScorer(id: string, scorerToken?: string) {
  return practiceAct({ type: "claimScorer", id, scorerToken });
}
