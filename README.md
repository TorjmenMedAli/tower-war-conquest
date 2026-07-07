# TDS — Zombie Tower Defense

A 2D side-scrolling tower-defense / advance hybrid. Defend a scrolling castle-on-wheels
against waves of undead, deploy special forces, and grind upgrades across a 10-level campaign.

This repo holds two builds of the same game:

| Folder | What it is |
| --- | --- |
| [`tds-web/`](tds-web/) | The **playable game** — standalone HTML/CSS/JS, no build step, no server. Source of truth for gameplay and balance. |
| [`tds-android/`](tds-android/) | The same game **wrapped as an Android app** with [Capacitor](https://capacitorjs.com) (a native WebView running the `tds-web` build), plus native AdMob ads. |

## Play the web build

Open `tds-web/index.html` in any modern browser. `index.html#play` boots straight into a run.
There's no bundler or package manager — just static files.

See [`tds-web/README.md`](tds-web/README.md) for gameplay rules and per-asset notes.

## Build the Android app

The web game lives in `tds-android/www/` (a copy of `tds-web`). After editing the game:

```bash
cd tds-android
npm install
# refresh www from tds-web, then:
npx cap sync android
cd android
./gradlew assembleDebug        # debug APK
# ./gradlew bundleRelease      # release AAB (needs a signing keystore)
```

Full details and the build environment are in [`tds-android/README.md`](tds-android/README.md).

## Firebase (Analytics + Remote Config) & Ads

The game integrates the **Firebase Web SDK** (one integration for both the browser build and
the Android WebView):

- **Analytics** — `app_open`, `screen_view` per screen, and gameplay / ad events.
- **Remote Config** — drives the **ads** (enable toggles, AdMob unit IDs, interstitial
  frequency), so ad behaviour is controlled from the Firebase console with no rebuild.

Setup lives in [`tds-web/firebase.js`](tds-web/firebase.js): paste your Firebase Web config
into `FIREBASE_CONFIG` and set the ad keys in the Firebase console. Until then Firebase stays
off, analytics no-ops, and the game plays with built-in ad defaults (Google test ad units).
Real Android ads run through `@capacitor-community/admob` (see `tds-web/native.js`).
