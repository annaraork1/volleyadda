const DEFAULT_API = "https://volleyadda.vercel.app";

/** API origin without trailing slash. Configure with EXPO_PUBLIC_API_URL. */
export const API_BASE: string = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API).replace(/\/+$/, "");

/** Join the API base with a relative path (e.g. "/api/state" or "api/state"). */
export function joinApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Turn a logo / photo reference from the API into something <Image> can load.
 * - relative paths ("/logo.png", "/api/photo/..") are joined with the API base
 * - data: and file: URIs, and absolute http(s) URLs, are returned as-is
 */
export function absoluteUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  const s = src.trim();
  if (!s) return undefined;
  if (/^(data:|file:|content:|blob:)/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return joinApiUrl(s);
}
