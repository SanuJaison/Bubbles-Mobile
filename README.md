# Bubbles for Android

The Android client for Bubbles, built with Expo SDK 58 and Expo Router. It talks to the same production backend as the web and desktop apps.

## What is included

- Email or username plus password sign-in
- Registration with email verification before the first sign-in
- Forgot-password flow
- Direct chats and groups
- Text, photo, file, and voice messages
- Emoji picker in the composer
- Read receipts, typing indicators, replies, edits, forwarding, and deletion
- Message actions from long press or the visible menu button
- Emoji reactions on messages
- Tap the chat header for a user or group profile panel
- Bubbles AI with local history, plain-text replies, clickable links, read-aloud, reply, forward, and delete actions
- Bubbles AI appears in the chat list after the first AI conversation
- Dark, light, and system themes
- Profile editing, feedback, privacy, and terms links
- A visible Calls tab and disabled call buttons that show exactly: `Calls are coming soon on Android.`

Google sign-in is intentionally not shown on Android yet. It needs an Android OAuth client before it can work.

## Requirements

- Node.js 22+
- npm
- Expo Go for quick UI checks, or an EAS development build for native modules
- An Expo account for EAS builds

## Run locally

```bash
npm install
npx expo start
```

The app defaults to the production backend:

- API: `https://bubbles-backend-bx2c.onrender.com/api`
- Socket: `https://bubbles-backend-bx2c.onrender.com`

Override them with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` when needed.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform android
```

## Build an APK

EAS Build creates and signs the APK in the cloud. No local Android SDK is required.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile production
```

The `production` profile in `eas.json` builds an APK. EAS manages the Android signing key, so keep the Expo account secure and do not delete the keystore.

## Publish to GitHub Releases

The workflow at `.github/workflows/android.yml` builds an APK with EAS and uploads it to a GitHub release.

1. Create a GitHub repository for this folder and push it.
2. Run `npx eas-cli@latest init` once so `app.json` contains the EAS project ID.
3. Add an `EXPO_TOKEN` repository secret from the Expo dashboard.
4. Push a tag, for example:

```bash
git tag android-v1.0.0
git push origin android-v1.0.0
```

The release contains `Bubbles.apk`. After the first release, set `VITE_ANDROID_DOWNLOAD_URL` in Vercel to the APK asset URL so the landing page's Android download button goes live.

## Known gaps

- Group administration (renaming, adding or removing members, admin permissions) is not implemented yet.
- Android voice and video calls are intentionally disabled.
- Registration email verification cannot send from a free Render web service because Render blocks outbound SMTP ports 25, 465, and 587. The backend supports Brevo's HTTPS API through `BREVO_API_KEY` plus a verified `SMTP_FROM` sender, which works on the free Render tier. Gmail SMTP still works locally and on paid hosts.
