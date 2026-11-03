import { NextResponse } from "next/server";
import {
  googleClientId,
  googleClientSecret,
  googleOAuthRedirectUri,
  isAllowedMobileReturn,
  saveGoogleOAuthState,
} from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/** Start Google OAuth for the mobile app (browser → deep link back with session token). */
export async function GET(req: Request) {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { ok: false, error: "Google sign-in is not configured (need client id + secret)" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const returnTo = String(url.searchParams.get("return") || "");
  if (!returnTo || !isAllowedMobileReturn(returnTo)) {
    return NextResponse.json({ ok: false, error: "Invalid return URL" }, { status: 400 });
  }

  const state = await saveGoogleOAuthState(returnTo);
  const redirectUri = googleOAuthRedirectUri(req);
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(auth.toString());
}
