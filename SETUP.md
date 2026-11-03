# VolleyAdda hosting checklist

## Done in this repo

- GitHub: https://github.com/annaraork1/volleyadda
- Vercel project: `anna-1b99/volleyadda` (linked)
- Blob store: `volleyadda-gallery` (private, connected)
- Env: `SESSION_SECRET`, `SUPERADMIN_EMAILS`, `APP_URL`
- Redis namespace: all keys use `REDIS_KEY_PREFIX` (default / recommended `vada:`) so a shared Upstash with TNH does not mix data

## You still need in the Vercel dashboard

1. **Upstash Redis** — may be the same instance as TNH. Set on the **volleyadda** project:
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN` (preferred names; do not rely on `tnhvpl_KV_*` in production)
   - `REDIS_KEY_PREFIX=vada:` (recommended even though code defaults to `vada:` if unset)
   - Redeploy after changing env so production and the mobile app stop seeing TNH seasons  
   Optional dedicated DB: https://vercel.com/anna-1b99/~/integrations/checkout/upstash?productSlug=upstash-kv&planId=paid&defaultResourceName=volleyadda-kv&source=cli&projectSlug=volleyadda  
   Without Redis the app runs in memory mode (fine for a quick smoke test, not for production).

2. Optional: `RESEND_API_KEY` + `EMAIL_FROM` for verify/reset emails.

3. Optional Google sign-in:
   - `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value), `GOOGLE_CLIENT_SECRET`
   - Google Cloud → Web client → Authorized redirect URIs must include
     `https://volleyadda.vercel.app/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local)
   - Web uses the GIS button; mobile opens `/api/auth/google/start` then deep-links back with a session

4. Optional: `APPLE_CLIENT_ID` for Apple sign-in.

5. Confirm production URL and set `APP_URL` to match (e.g. `https://volleyadda.vercel.app`).

## After Redis namespace change

- VolleyAdda starts with an empty `vada:` keyspace (no TNH seasons).
- Sign in again (Google/email); old bare `va:*` keys are unused.
- TNH at https://tnhvpl.vercel.app is unchanged (still uses its own unprefixed / `tnhvpl:*` keys).

## Mobile

```bash
cd mobile
cp .env.example .env
# set EXPO_PUBLIC_API_URL to the production URL
npx expo start
# later: eas build -p android --profile preview
```

## TNH site

https://tnhvpl.vercel.app and the `tnhvpl` repo are unchanged.
