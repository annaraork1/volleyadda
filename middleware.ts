import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS for the Expo app (web on :8081, or native calling the LAN API).
 * Browser fetch from a different origin fails without these headers — the mobile
 * client surfaces that as "No connection to VolleyAdda".
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    // Private LAN (Expo Go / device testing against this machine's Next server)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // Production Expo web / preview if ever hosted
    if (host.endsWith("volleyadda.vercel.app") || host === "volleyadda.vercel.app") return true;
    return false;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allow = isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (allow && origin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Accept, x-pin, X-Requested-With",
      );
      res.headers.set("Access-Control-Max-Age", "86400");
      res.headers.set("Vary", "Origin");
    }
    return res;
  }

  const res = NextResponse.next();
  if (allow && origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
