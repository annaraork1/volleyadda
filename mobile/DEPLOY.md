# VolleyAdda mobile — build & deploy

Expo app (`com.volleyadda.app`). Store builds use **EAS** (`eas.json`).

| Artifact | Platform | Typical use |
|----------|----------|-------------|
| **APK** | Android | Sideload / internal testers |
| **AAB** | Android | Google Play Store |
| **IPA** | iOS | App Store / TestFlight |

API URL for cloud builds is set per profile in `eas.json` (`EXPO_PUBLIC_API_URL`, currently `https://volleyadda.vercel.app`).

---

## One-time setup

```bash
cd mobile
npm i -g eas-cli
eas login
eas build:configure
```

Confirm `EXPO_PUBLIC_API_URL` in `eas.json` points at the production API before shipping.

---

## Android

| Goal | Command | Output |
|------|---------|--------|
| Sideload / testers | `eas build -p android --profile preview` | **APK** (`preview` sets `buildType: "apk"`) |
| Play Store | `eas build -p android --profile production` | **AAB** (EAS default) |

1. Open [Google Play Console](https://play.google.com/console).
2. Create or select the app (package `com.volleyadda.app`).
3. Production (or a testing track) → Create release → upload the **AAB**.
4. Complete store listing, content rating, and privacy policy as required.

You need a Play developer account. On first build, EAS can create and manage the Android upload keystore when prompted.

---

## iOS (App Store)

```bash
eas build -p ios --profile production
```

Produces an **IPA**. Submit with:

```bash
eas submit -p ios --profile production
```

Or upload via Transporter / [App Store Connect](https://appstoreconnect.apple.com).

Requirements:

- Apple Developer Program membership
- App in App Store Connect with bundle id `com.volleyadda.app`
- Signing credentials (EAS will guide you on first build)

---

## Build both platforms

```bash
eas build --platform all --profile production
```

---

## Profiles (`eas.json`)

| Profile | Notes |
|---------|--------|
| `development` | Dev client, internal distribution |
| `preview` | Internal; Android **APK** |
| `production` | Store-ready; `autoIncrement: true` for version codes |

`submit.production` is configured for `eas submit`.

---

## After a build

- EAS prints a download URL in the terminal.
- Or open [expo.dev](https://expo.dev) → project → **Builds**.

Local `npx expo start` / Expo Go does **not** produce APK/AAB/IPA; use the EAS commands above for installable store binaries.
