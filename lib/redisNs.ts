/**
 * VolleyAdda Redis namespace — keeps keys off the shared TNH Upstash keyspace.
 * Default `vada:` so isolation cannot be forgotten when env is missing.
 */
function normalizePrefix(raw: string | undefined): string {
  const p = (raw ?? "vada:").trim();
  if (!p) return "vada:";
  return p.endsWith(":") ? p : `${p}:`;
}

export const REDIS_KEY_PREFIX = normalizePrefix(process.env.REDIS_KEY_PREFIX);

/** Apply the VolleyAdda namespace to a logical Redis key. */
export function nsKey(key: string): string {
  if (!key) return key;
  if (key.startsWith(REDIS_KEY_PREFIX)) return key;
  return `${REDIS_KEY_PREFIX}${key}`;
}

export function nsKeys(keys: string[]): string[] {
  return keys.map(nsKey);
}

/** Shared Upstash credential resolution (KV_* preferred; tnhvpl_* only as legacy alias). */
export function redisCredentials(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.tnhvpl_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.tnhvpl_KV_REST_API_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return { url: url.trim(), token: token.trim() };
}
