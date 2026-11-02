/** User accounts and sessions for VolleyAdda. */

export type AuthProvider = "password" | "google" | "apple";

export interface UserRecord {
  v: number;
  id: string;
  email: string;
  /** Lowercase email for lookup. */
  emailNorm: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  emailVerified: boolean;
  disabled: boolean;
  providers: AuthProvider[];
  googleSub?: string;
  appleSub?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  v: number;
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface VerifyTokenRecord {
  token: string;
  userId: string;
  purpose: "verify" | "reset";
  expiresAt: number;
}

export type TournamentRole = "organiser" | "scorer" | "auctioneer" | "owner";

export interface MembershipEntry {
  userId: string;
  role: TournamentRole;
  /** Set when role === "owner". */
  teamId?: string;
  email?: string;
  addedAt: number;
}

export interface TournamentMetaExt {
  ownerUserId: string;
  visibility: "link" | "public";
  archived?: boolean;
  members: MembershipEntry[];
  /** Pending invites by emailNorm → role (+ optional teamId). */
  invites?: { emailNorm: string; role: TournamentRole; teamId?: string; at: number }[];
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  message: string;
  tournamentKey?: string;
  matchId?: string;
  practiceId?: string;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt?: number;
  resolveNote?: string;
  resolvedBy?: string;
}

export interface AuditEntry {
  id: string;
  at: number;
  byUserId: string;
  byEmail: string;
  action: string;
  tournamentKey?: string;
  reason: string;
  detail?: string;
}
