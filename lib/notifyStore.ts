import { randomBytes } from "node:crypto";
import { readRaw, writeRaw } from "./store";

export type NoticeType = "invite" | "practice_live" | "match_live" | "fixture_edit";

export interface AppNotice {
  id: string;
  at: number;
  type: NoticeType;
  title: string;
  body: string;
  tournamentKey?: string;
  practiceId?: string;
  matchId?: string;
  read?: boolean;
}

const NOTICE_PREFIX = "va:notice:";

function keyFor(userId: string) {
  return `${NOTICE_PREFIX}${userId}`;
}

export async function listNotices(userId: string): Promise<AppNotice[]> {
  const [cur] = await readRaw<{ notices: AppNotice[] }>([keyFor(userId)]);
  return [...(cur?.notices ?? [])].sort((a, b) => b.at - a.at);
}

export async function pushNotice(
  userId: string,
  input: Omit<AppNotice, "id" | "at" | "read"> & { at?: number },
): Promise<AppNotice> {
  const notice: AppNotice = {
    id: `n_${randomBytes(6).toString("hex")}`,
    at: input.at ?? Date.now(),
    type: input.type,
    title: input.title.slice(0, 80),
    body: input.body.slice(0, 240),
    tournamentKey: input.tournamentKey,
    practiceId: input.practiceId,
    matchId: input.matchId,
    read: false,
  };
  const k = keyFor(userId);
  const [cur] = await readRaw<{ notices: AppNotice[] }>([k]);
  const notices = [notice, ...(cur?.notices ?? [])].slice(0, 100);
  await writeRaw(k, { notices });
  return notice;
}

export async function pushNoticeMany(
  userIds: string[],
  input: Omit<AppNotice, "id" | "at" | "read">,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((id) => pushNotice(id, input)));
}

export async function markNoticesRead(userId: string, noticeId?: string): Promise<AppNotice[]> {
  const k = keyFor(userId);
  const [cur] = await readRaw<{ notices: AppNotice[] }>([k]);
  const notices = (cur?.notices ?? []).map((n) => {
    if (!noticeId || n.id === noticeId) return { ...n, read: true };
    return n;
  });
  await writeRaw(k, { notices });
  return notices.sort((a, b) => b.at - a.at);
}
