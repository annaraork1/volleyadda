# VolleyAdda hosting checklist

## Done in this repo

- GitHub: https://github.com/annaraork1/volleyadda
- Vercel project: `anna-1b99/volleyadda` (linked)
- Blob store: `volleyadda-gallery` (private, connected)
- Env: `SESSION_SECRET`, `SUPERADMIN_EMAILS`, `APP_URL`

## You still need in the Vercel dashboard

1. **Upstash Redis** — CLI install needs a one-time browser checkout:
   https://vercel.com/anna-1b99/~/integrations/checkout/upstash?productSlug=upstash-kv&planId=paid&defaultResourceName=volleyadda-kv&source=cli&projectSlug=volleyadda  
   Connect it so `KV_REST_API_URL` / `KV_REST_API_TOKEN` appear. Without Redis the app runs in memory mode (fine for a quick smoke test, not for production).

2. Optional: `RESEND_API_KEY` + `EMAIL_FROM` for verify/reset emails.

3. Optional: `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` for social sign-in.

4. Confirm production URL and set `APP_URL` to match (e.g. `https://volleyadda.vercel.app`).

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
