# VolleyAdda

VolleyAdda is a public volleyball scoring and tournament app. Anyone can create an account, score a single match, or run a full season — registration, auction, fixtures, live scoring, points table, gallery, and share links.

**Live site:** https://volleyadda.vercel.app  
**Repo:** https://github.com/annaraork1/volleyadda  
**Mobile app:** Expo project in `mobile/` (VolleyAdda on the home screen and store listing)

This codebase is separate from the original TNH club site at https://tnhvpl.vercel.app. That deployment keeps its own repo, database, and PIN scoring. VolleyAdda does not share that data.

## What VolleyAdda includes

| Area | What |
|---|---|
| Accounts | Email signup/login, verify, password reset; Google and Apple when configured |
| One match | Practice-style live scoring or quick result, owned by the signed-in user |
| Tournament | Registration → auction → fixtures → matches → awards |
| Live | Fixtures, points table, race, teams, match pages, venue display |
| Score | Organiser / invited scorer keypad |
| Auction | Board, owner bidding, console, projector |
| Gallery | Upload, HEIC→JPEG on phone, organiser moderation |
| Support | Report a problem; superadmin console at `/superadmin` |

## Stack

- Next.js website + API on Vercel
- Upstash Redis for VolleyAdda data
- Vercel Blob for gallery photos
- Expo app in `mobile/` (iOS / Android)

## Local web

```bash
npm install
cp .env.example .env.local   # SESSION_SECRET, SUPERADMIN_EMAILS; optional Redis/Blob/Resend
npm run dev                  # http://localhost:3000
npm test
```

Create a VolleyAdda account at `/auth/signup`. Put your email in `SUPERADMIN_EMAILS` to use `/superadmin`.

See [SETUP.md](SETUP.md) for production Redis, Blob, and email setup.

## Mobile (VolleyAdda)

```bash
cd mobile
cp .env.example .env         # EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000  (or https://volleyadda.vercel.app)
npm install
npx expo start
```

Preview builds: `eas build -p android --profile preview` (see `mobile/eas.json`).

## Deploy VolleyAdda

1. Vercel project `volleyadda` from this GitHub repo.
2. Upstash Redis + Blob; set `SESSION_SECRET`, `SUPERADMIN_EMAILS`, `APP_URL=https://volleyadda.vercel.app`.
3. Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`.
4. Point the Expo app at https://volleyadda.vercel.app.

## Accounts and roles

VolleyAdda uses accounts, not a shared site PIN.

- **Organiser** — owns the tournament
- **Scorer** — match actions only
- **Auctioneer** — console / projector
- **Team owner** — bid (invite by email; optional per-team bidder code)
- **Spectator** — share link, no login

Sessions: bearer token in the app (`expo-secure-store`), httpOnly cookie on the website.
