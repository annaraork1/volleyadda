# VolleyAdda

Public volleyball scoring and tournament platform. Create an account, score a single match, or run a full season (registration → auction → fixtures → matches), with live scores, gallery, and share links.

This repository is separate from [TNHVPL](https://tnhvpl.vercel.app). That site keeps its own code, database, and PIN scoring.

## Stack

- Next.js website + API (Vercel)
- Upstash Redis for data
- Vercel Blob for gallery photos
- Expo app in `mobile/` (iOS / Android)

## Local web

```bash
npm install
cp .env.example .env.local   # add SESSION_SECRET, optional Redis/Blob
npm run dev                  # http://localhost:3000
npm test
```

Sign up at `/auth/signup`. Set `SUPERADMIN_EMAILS` to your email for `/superadmin`.

## Mobile

```bash
cd mobile
cp .env.example .env         # EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
npm install
npx expo start
```

## Deploy

1. Connect this GitHub repo to a Vercel project (`volleyadda`).
2. Add Upstash Redis (Storage) and Blob store; set `SESSION_SECRET`, `SUPERADMIN_EMAILS`, `APP_URL`.
3. Optional: `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`.
4. Deploy. Point the Expo app at the production URL.

## Accounts

Email/password, Google, and Apple sign-in. Sessions are bearer tokens (app) or httpOnly cookies (web). Organisers own tournaments; scorers, auctioneers, and team owners are invited by email.
