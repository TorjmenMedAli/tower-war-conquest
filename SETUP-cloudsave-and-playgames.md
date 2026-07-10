# Cloud Save (Firebase) + Play Games Services — activation guide

The **code** for both features is already wired into `tds-web/` and mirrored into
`tds-android/www/`. Both are **100% defensive**: until you complete the console setup
below, they silently no-op and the game plays exactly as before (local save only, no
leaderboards). Nothing here can break the game if left half-configured.

- **Cloud save** works on **web + Android** (Firebase Web SDK).
- **Achievements + leaderboards** are **Android-only** (Play Games Services has no web SDK).

---

## ⭐ ANDROID-ONLY STRATEGY (current plan)

Save layers, lowest → highest priority (all kept — anonymous sign-in is NOT removed):

1. `localStorage` (instant) + **Capacitor Preferences** mirror (`native.js`) — local durability.
2. **Anonymous Firebase / Firestore** (`cloud.js`) — per-install cloud backup (kept).
3. **PGS Saved Games (Snapshots)** (`native.js` → `TDSGames`) — the **durable cross-device** layer tied to
   the player's Google account (survives reinstall / new phone). **Highest priority.**

All three reconcile by the same monotonic `sv` save-counter (last-write-wins) and share one reload guard,
so they converge without ping-pong and never reload mid-battle. **Leaderboard + achievements = PGS.**

### Play Console checklist (do these, in order)

1. **Play Console → your app → Play Games Services → Setup and management → Configuration** → create the game. Copy the **numeric App ID**.
2. **Enable _Saved Games_** in the PGS configuration (off by default — required for cloud save).
3. **Create Leaderboards** (Play Console → PGS → Leaderboards → Create). Create two, copy each `CgkI…` id:
   | Create this leaderboard | Order | Paste id into `native.js → GAMES_IDS.boards` |
   |---|---|---|
   | **High Score** | Larger is better | `highscore` |
   | **Highest Level** | Larger is better | `toplevel` |
4. **Create Achievements** (PGS → Achievements → Create). Create four, copy each `CgkI…` id:
   | Create this achievement | Unlocks when | Paste id into `GAMES_IDS.ach` |
   |---|---|---|
   | **First Victory** | win any battle | `first_win` |
   | **City Cleared** | reach level 5 | `level_5` |
   | **Survivor** | reach level 10 | `level_10` |
   | **Veteran** | 25 battles played | `veteran` |
5. **Credentials** (Google Cloud Console → OAuth client, Android): package `com.TDS.zombietowerdefense` + **both SHA-1s** — your upload key (`keytool -list -v -keystore <release> -alias <alias>`, creds in `keystore.properties`) **and** the Play App Signing SHA-1 (Play Console → Setup → App signing). Missing the 2nd is the #1 "works in debug, fails in release" bug.
6. Add **testers** (PGS → Testers) or sign-in fails until the PGS config is published.

### Code side (paste the ids)
- `tds-android/android/app/src/main/res/values/strings.xml` → `game_services_project_id` = the **numeric App ID** (step 1).
- `tds-web/native.js` → fill `GAMES_IDS.boards` + `GAMES_IDS.ach` with the `CgkI…` ids (steps 3–4), then re-copy to `tds-android/www/`.

### Install the plugins
```bash
cd tds-android
# leaderboards + achievements:
npm i capacitor-play-games-services
# Saved Games (Snapshots) — one that exposes save/load; the native.js adapter tries
# loadGame/saveGame and loadSnapshot/saveSnapshot, map to your plugin's names if different:
npm i capacitor-google-game-services      # or a small custom PlayGames.getSnapshotsClient plugin
npx cap sync
```
> The `native.js` Snapshot adapter (`snapLoad`/`snapSave`) is defensive and calls whichever of
> `loadGame/saveGame` or `loadSnapshot/saveSnapshot` your plugin exposes. If your plugin uses other
> method names, map them there.

### ⚠️ Must be device-tested
Snapshots + PGS sign-in **cannot** be verified on web/emulator-without-Play — test on a **real device with a
signed build** and a Play Console **tester** account. Until then, the anonymous Firestore + local save carry
the game (nothing breaks).

---

## 1. Firebase — cloud save (Android / iOS native + web fallback)

Files: `tds-web/cloud.js`. `cloud.js` picks its backend automatically:
- **Native (Android/iOS):** the `@capacitor-firebase/*` plugins (native Firebase SDK,
  configured from `google-services.json` / `GoogleService-Info.plist`). This is the path
  for the shipped apps — no CDN download, robust in WKWebView.
- **Web (or native before the plugins are installed):** the Firebase JS SDK from `firebase.js`.

### Firebase console (once, for every backend)
1. **Authentication → Sign-in method → enable _Anonymous_**.
2. **Firestore Database → Create database** (production mode).
3. Firestore → **Rules** → lock each player to their own document:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /saves/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

### Native plugins (Android now, iOS later)
```bash
cd tds-android
npm i @capacitor-firebase/authentication @capacitor-firebase/firestore
npx cap sync
```
- **Android** reads Firebase config from `android/app/google-services.json` (already present).
  The native `firebase-auth` + `firebase-firestore` Gradle deps are already wired into
  `app/build.gradle` (via the Firebase BoM).
- **iOS (later):** add the iOS project (`npx cap add ios`), drop `GoogleService-Info.plist`
  into it, `npx cap sync ios`. The same `cloud.js` native path then works unchanged.

### Web fallback
Paste your Firebase **Web** config into `tds-web/firebase.js` (`FIREBASE_CONFIG`). Only needed
for the browser build; the native apps don't use it for cloud save.

On launch the game signs in anonymously, pulls `saves/{uid}`, restores it if it's more advanced
than the local save, then mirrors local → cloud every ~5 s and on background/close.
`window.TDSCloud.backend` reports which path is live (`'native'` or `'web'`).

**Conflict rule:** the *more-advanced* save wins, compared by `(battles played, levels
unlocked, coins)`. Reinstalls / new devices restore progress instead of clobbering it.

> Note: the anonymous account is per-install. To make saves follow a *person* across devices,
> later upgrade to Google sign-in and `linkWithCredential` — the Firestore layer stays the same.

---

## 2. Play Games Services — achievements + leaderboards (Android only)

Files: `tds-web/native.js` (the `TDSGames` bridge + `GAMES_IDS` map), `game.js`
(submits scores / unlocks in `tallyGameAndStreak`), `index.html` (the 🏆/🎖️ menu buttons),
`tds-android/android/app/.../strings.xml` + `AndroidManifest.xml` (app-id scaffolding).

### a) Install the plugin
```bash
cd tds-android
npm i capacitor-play-games-services
npx cap sync
```
(Capacitor 6 auto-registers the plugin — no `MainActivity` edit needed. If sign-in never
fires, confirm the plugin's registered JS name matches `PlayGamesServices` in `native.js`.)

### b) Play Console setup
1. **Play Console → your app → Play Games Services → Setup and management → Configuration.**
   Create/link the game. Copy the **numeric App ID**.
2. Create your **Leaderboards** and **Achievements** (see the set below). Each gets an id
   like `CgkI...`.
3. **Credentials:** add an **Android OAuth client** with package `com.TDS.zombietowerdefense`
   and **both** SHA-1s — your upload key (`keytool -list -v -keystore <release> -alias <alias>`,
   creds in `keystore.properties`) **and** the Play App Signing SHA-1 (Play Console → Setup →
   App signing). Missing the second one is the #1 cause of "works in debug, fails in release".
4. Add **testers** under PGS → Testers, or sign-in fails until the PGS config is published.

### c) Paste your ids
- **`tds-android/android/app/src/main/res/values/strings.xml`** →
  `game_services_project_id` = your numeric App ID.
- **`tds-web/native.js`** → fill in `GAMES_IDS` with the `CgkI...` ids, then re-copy to
  `tds-android/www/` (see *Keeping web + Android in sync* below).

### d) The starter set the code already references
| Type | Key in code | Suggested Play Console item | Trigger |
|------|-------------|-----------------------------|---------|
| Leaderboard | `highscore` | "High Score" | best single-run `state.score` |
| Leaderboard | `toplevel` | "Highest Level" | `Meta.unlocked` |
| Achievement | `first_win` | "First Victory" | win any battle |
| Achievement | `level_5` | "City Cleared" | reach level 5 |
| Achievement | `level_10` | "Survivor" | reach level 10 |
| Achievement | `veteran` | "Veteran" | 25 battles played |

Add/rename freely: edit `GAMES_IDS` (native.js) and the `unlock(...)` / `submitScore(...)`
calls in `game.js → tallyGameAndStreak`.

---

## Keeping web + Android in sync (important)

`tds-android/www/` is a **copy** of `tds-web/`. After editing any shared file
(`game.js`, `native.js`, `cloud.js`, `firebase.js`, `index.html`, `style.css`), re-copy:
```bash
cp tds-web/{game.js,native.js,cloud.js,firebase.js,index.html,style.css} tds-android/www/
```
And bump the `?v=` query string of any edited JS/CSS in **both** `index.html` files, or the
WebView serves stale cached code.

## What I did NOT change
- **`minSdk`** stays at 23 (required by the Firebase BoM already in `build.gradle`).
- **`package.json`** — the PGS plugin version is intentionally left for `npm i` to resolve
  (avoids a guessed version breaking the lockfile).
