import { NextResponse } from "next/server";
import {
  appendQuery,
  googleClientId,
  googleClientSecret,
  googleOAuthRedirectUri,
  takeGoogleOAuthState,
  upsertGoogleUser,
  verifyGoogleIdToken,
} from "@/lib/googleAuth";
import { createSession } from "@/lib/authStore";

export const dynamic = "force-dynamic";

type TokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

function failRedirect(returnTo: string | null, error: string) {
  if (returnTo) {
    return NextResponse.redirect(appendQuery(returnTo, { error }));
  }
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

/** Google redirects here; we exchange the code and deep-link back into the mobile app. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  const oauthError = String(url.searchParams.get("error") || "");

  const stored = state ? await takeGoogleOAuthState(state) : null;
  const returnTo = stored?.returnTo || null;

  if (oauthError) {
    return failRedirect(returnTo, oauthError === "access_denied" ? "Google sign-in cancelled" : oauthError);
  }
  if (!stored || !code) {
    return failRedirect(returnTo, "Google sign-in expired — try again");
  }

  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) {
    return failRedirect(returnTo, "Google sign-in is not configured");
  }

  const redirectUri = googleOAuthRedirectUri(req);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenRes.json()) as TokenResponse;
  if (!tokenRes.ok || !tokens.id_token) {
    return failRedirect(returnTo, tokens.error_description || tokens.error || "Could not verify Google login");
  }

  const profile = await verifyGoogleIdToken(tokens.id_token);
  if (!profile) {
    return failRedirect(returnTo, "Invalid Google token");
  }

  const result = await upsertGoogleUser(profile);
  if ("error" in result) {
    return failRedirect(returnTo, result.error);
  }

  const sessionToken = await createSession(result.user.id);
  if (!returnTo) {
    return NextResponse.json({ ok: true, token: sessionToken }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(appendQuery(returnTo, { token: sessionToken }));
}
