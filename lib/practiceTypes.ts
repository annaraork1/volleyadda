import type { Format, MatchEvent, Side } from "./types";

/** Default practice format (safe for client + server). */
export function defaultPracticeFormat(): Format {
  return {
    bestOf: 3,
    targets: [21, 21, 15],
    winBy: 2,
    cap: 0,
    timeouts: 2,
    switchInDecider: true,
  };
}

export type PracticePlayerSource = "catalog" | "adhoc";

export interface PracticePlayer {
  name: string;
  skill?: string;
  photo?: string | null;
  source: PracticePlayerSource;
}

/** Extra scorer invited by the practice host (email and/or shareable token). */
export interface PracticeScorerInvite {
  id: string;
  tokenHash: string;
  emailNorm?: string;
  label?: string;
  createdAt: number;
  revokedAt?: number;
  claimedUserId?: string;
}

/** Host-visible / public list item (no token hash). */
export type PracticeScorerPublic = Omit<PracticeScorerInvite, "tokenHash">;

export interface PracticeMatch {
  v: number;
  id: string;
  status: "draft" | "live" | "done";
  mode: "live" | "quick";
  createdAt: number;
  completedAt?: number;
  /** SHA-256 hex of host token (plain token returned once on create). */
  hostTokenHash: string;
  /** Signed-in user who created the match (optional; enables host delete without PIN). */
  hostUserId?: string;
  /**
   * Legacy: anyone with the link may score.
   * Product default is host-only; prefer `scorers` invites.
   */
  allowPublicScore: boolean;
  /** Invited scorers (active + revoked kept for audit). */
  scorers?: PracticeScorerInvite[];
  labelA: string;
  labelB: string;
  sideA: PracticePlayer[];
  sideB: PracticePlayer[];
  format: Format;
  timeoutSeconds: number;
  ev: MatchEvent[];
  setsWon?: { a: number; b: number };
  setScores?: { a: number; b: number }[];
  winner?: Side | null;
}

/** Public-safe view (no hostTokenHash / scorer token hashes). */
export type PracticeMatchPublic = Omit<PracticeMatch, "hostTokenHash" | "scorers"> & {
  isHost?: boolean;
  isScorer?: boolean;
  scorers?: PracticeScorerPublic[];
};

export interface PracticeSummary {
  id: string;
  mode: "live" | "quick";
  completedAt: number;
  labelA: string;
  labelB: string;
  setsWon: { a: number; b: number };
  setScores?: { a: number; b: number }[];
  winner: Side | null;
  sideACount: number;
  sideBCount: number;
}

/** Open live-mode practice (draft or in progress) for the public live board. */
export interface PracticeLiveRef {
  id: string;
  createdAt: number;
}

export interface PracticeIndex {
  v: number;
  matches: PracticeSummary[];
  /** IDs of open live-scored practices (not yet completed / abandoned). */
  live?: PracticeLiveRef[];
}
