import { randomBytes } from "node:crypto";

/** Opaque auto key (PRODUCT option D) — not a user-picked vanity slug. */
export function newTournamentKey(): string {
  return `t-${randomBytes(8).toString("hex")}`;
}

/** Short verbal share code (no ambiguous 0/O/1/I). */
export function newPublicCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}
