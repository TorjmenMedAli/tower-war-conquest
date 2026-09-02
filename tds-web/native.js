/* native.js — Android-only glue (Capacitor build). On the plain-web build it detects there is
   no Capacitor and returns immediately, so the simulated ad overlays keep working untouched.

   1) AdBridge — real AdMob interstitial + rewarded ads via @capacitor-community/admob.
      game.js routes playInterstitial()/playRewardedAd() through window.AdBridge when it exists.
      The AdMob UNIT IDS and the on/off toggles come from Firebase REMOTE CONFIG (firebase.js →
      window.TDSRemoteConfig), so you can change ads from the Firebase console with no rebuild.
   2) Durable save — mirrors localStorage['tds_save_web'] into Capacitor Preferences and
      restores it if the WebView storage ever comes back empty.

   ┌─────────────────────────────────────────────────────────────────────────────┐
   │  FOR PRODUCTION:                                                            │
   │   • set the admob_* unit ids in Firebase Remote Config (firebase.js has     │
   │     Google TEST ids as defaults)                                            │
   │   • set the AdMob APPLICATION_ID meta-data in                               │
   │     android/app/src/main/AndroidManifest.xml                               │
   └─────────────────────────────────────────────────────────────────────────────┘ */
(() => {
  // TDSGames — Play Games Services facade. Always defined so game.js can call it blindly.
  // On the web build (or before sign-in) every method is a harmless no-op; the Android
  // block below replaces it with the real plugin-backed implementation.
  window.TDSGames = window.TDSGames || {
    ready: false,
    submitScore() {}, unlock() {}, showLeaderboards() {}, showAchievements() {},
    signIn() { return Promise.resolve(); }
  };

  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // web build → keep simulated ads + games stub

  /* ---------- hardware BACK button never exits the app ---------- */
  const App = cap.Plugins && cap.Plugins.App;
  if (App && App.addListener) {
    // registering a listener overrides Capacitor's default (history-back / exit); we step back in-app instead
    App.addListener('backButton', () => {
      try { if (typeof window.TDS_BACK === 'function') window.TDS_BACK(); } catch (e) {}
      // deliberately never call App.exitApp() → back can't close the game
    });
  }

  const AdMob = cap.Plugins && cap.Plugins.AdMob;
  const Prefs = cap.Plugins && cap.Plugins.Preferences;

  /* ---------- durable save: Preferences mirror of localStorage ---------- */
  const SAVE_KEY = 'tds_save_web';
  if (Prefs) {
    Prefs.get({ key: SAVE_KEY }).then(r => {
      if (r && r.value && !localStorage.getItem(SAVE_KEY)) {
        localStorage.setItem(SAVE_KEY, r.value);              // WebView storage was wiped → restore
        if (!sessionStorage.getItem('tds_restored')) { sessionStorage.setItem('tds_restored', '1'); location.reload(); }
      }
    }).catch(() => {});
    setInterval(() => {                                       // cheap mirror (~1 KB every 4 s)
      const v = localStorage.getItem(SAVE_KEY);
      if (v) Prefs.set({ key: SAVE_KEY, value: v }).catch(() => {});
    }, 4000);
  }

  /* ---------- Play Games Services: sign-in + LEADERBOARDS + achievements + CLOUD SAVE (Snapshots) ----------
     ANDROID durable-save + social layer, LAYERED ON TOP of the anonymous Firestore save (cloud.js) and
     the local Preferences mirror above — none of those are removed; PGS is an extra, higher-priority
     cross-device layer tied to the player's Google account (survives reinstall / new device).

     To activate:
       1) in tds-android/:  npm i <play-games plugin>  &&  npx cap sync
          • LEADERBOARDS + ACHIEVEMENTS work with `capacitor-play-games-services`.
          • SAVED GAMES (Snapshots) need a snapshot-capable plugin (e.g. capacitor-google-game-services)
            or a small custom plugin wrapping PlayGames.getSnapshotsClient — see snapLoad/snapSave below.
       2) Play Console → Play Games Services → create the game, the LEADERBOARDS + ACHIEVEMENTS, and enable
          SAVED GAMES; paste the ids into GAMES_IDS.
       3) PGS numeric App ID → strings.xml (game_services_project_id) + AndroidManifest (already scaffolded).
     Fully defensive: until the plugin + ids are in place everything here no-ops and the game + anonymous
     Firestore save are unaffected. ANDROID-ONLY (PGS has no web SDK). */
  const SAVE_KEY_G = 'tds_save_web', SNAP = 'tds_main';
  function saveVer(blob) { try { var o = JSON.parse(blob); return o ? (o.sv | 0) : 0; } catch (e) { return 0; } }
  const PG  = cap.Plugins && (cap.Plugins.PlayGamesServices || cap.Plugins.PlayGames);
  const GGS = cap.Plugins && cap.Plugins.GoogleGameServices;   // capacitor-google-game-services — Saved Games (Snapshots)
  if (PG) {
    // ⇩⇩ PASTE the ids you create in the Play Console (they look like "CgkI...") ⇩⇩
    const GAMES_IDS = {
      boards: {
        highscore: 'CgkIuInimZUHEAIQAA',               // "High Score" — best single-run score
        toplevel:  'CgkIuInimZUHEAIQAQ',               // "Highest Level" — highest level reached
      },
      ach: {
        first_win: 'CgkIuInimZUHEAIQAg',               // "First Victory" — win any battle
        level_5:   'CgkIuInimZUHEAIQAw',               // "City Cleared" — reach level 5
        level_10:  'CgkIuInimZUHEAIQBA',               // "Survivor" — reach level 10
        veteran:   'CgkIuInimZUHEAIQBQ',               // "Veteran" — 25 battles played
        // second wave
        veteran100:  'CgkIuInimZUHEAIQCA',             // "War Hero" — 100 battles played
        kills_1k:    'CgkIuInimZUHEAIQCQ',             // "Exterminator" — 1,000 zombies destroyed
        kills_10k:   'CgkIuInimZUHEAIQCg',             // "Apocalypse Proof" — 10,000 zombies destroyed
        weapon_max:  'CgkIuInimZUHEAIQCw',             // "Fully Loaded" — max out any weapon
        all_weapons: 'CgkIuInimZUHEAIQDA',             // "Collector" — own every weapon
        heroes_5:    'CgkIuInimZUHEAIQDQ',             // "Squad Goals" — own 5 heroes
        castle_max:  'CgkIuInimZUHEAIQDg',             // "Fortress" — max castle stage
        streak_7:    'CgkIuInimZUHEAIQDw',             // "Devoted" — 7-day login streak
        endless_5k:  'CgkIuInimZUHEAIQEA',             // "Unstoppable" — 5,000 pts in Endless
        rich_10k:    'CgkIuInimZUHEAIQEQ',             // "Zombillionaire" — hold 10,000 coins
      },
    };
    const configured = id => id && id.indexOf('PASTE') === -1;
    const safe = p => { try { return (p && p.catch) ? p.catch(() => {}) : Promise.resolve(); } catch (e) { return Promise.resolve(); } };
    let signedIn = false;

    /* AUTH POLICY — never nag.
       PG.status() → GamesSignInClient.isAuthenticated(): SILENT, shows no UI.
       PG.login()  → GamesSignInClient.signIn():          INTERACTIVE, shows the Play Games dialog.
       Launch used to call login() unconditionally, so on every device where the automatic PGS
       sign-in does NOT succeed (player declined PGS, no PGS profile, some OEM/region builds) the
       "Google Play Games" popup came back on EVERY app open. Now: launch only ever checks
       silently; the interactive dialog is offered AT MOST ONCE per install, and after that only
       when the player taps the achievements button themselves. */
    const ASKED = 'tds_pgs_asked';
    const wasAsked = () => { try { return localStorage.getItem(ASKED) === '1'; } catch (e) { return true; } };
    const markAsked = () => { try { localStorage.setItem(ASKED, '1'); } catch (e) {} };

    function onAuthed() {                                      // only on CONFIRMED authentication
      if (signedIn) return;
      signedIn = true;
      markAsked();
      document.dispatchEvent(new Event('tds-games-ready'));
      // Snapshot work only after CONFIRMED auth, and via the SILENT check: GGS.signIn() would
      // pop its own dialog, and saveGame while unauthenticated crashes natively (ApiException 4
      // → "keeps stopping").
      const g = (GGS && GGS.isAuthenticated) ? Promise.resolve(GGS.isAuthenticated()).catch(() => null) : Promise.resolve(null);
      g.then(res => {
        if (!res || res.isAuthenticated !== true) return;
        reconcileSnapshot();                                   // pull the cross-device Google-account save
        startSnapMirror();                                     // keep the snapshot mirrored to local
      });
    }

    window.TDSGames = {
      get ready() { return signedIn; },
      submitScore(board, value) {
        const id = GAMES_IDS.boards[board];
        if (signedIn && configured(id) && value > 0 && PG.submitScore) safe(PG.submitScore({ id, score: Math.round(value) }));
      },
      unlock(key) {
        const id = GAMES_IDS.ach[key];
        const un = PG.unlockAchievement || PG.unLockAchievement;   // capacitor-play-games-services spells it unLockAchievement
        if (signedIn && configured(id) && un) safe(un({ id }));
      },
      showLeaderboards() { if (signedIn) safe(PG.showAllLeaderboard ? PG.showAllLeaderboard() : (PG.showLeaderboard && PG.showLeaderboard({ id: GAMES_IDS.boards.highscore }))); },
      showAchievements() { if (signedIn && PG.showAchievements) safe(PG.showAchievements()); },
      get available() { return !!PG.login; },                   // a sign-in path exists on this device
      resume() {                                               // SILENT — safe to call on every launch
        if (!PG.status) return Promise.resolve(false);
        return Promise.resolve(PG.status())
          .then(r => { if (r && r.isLogin) onAuthed(); return signedIn; })
          .catch(() => false);
      },
      signIn() {                                               // INTERACTIVE — user gesture only
        if (!PG.login) return Promise.resolve(false);
        markAsked();                                           // asked once = never auto-asked again
        return Promise.resolve(PG.login())
          .then(r => { if (r && r.isLogin) onAuthed(); return signedIn; })
          .catch(() => false);
      },
      saveSnapshot: v => snapSave(v),                          // exposed for manual/forced sync if ever needed
      loadSnapshot: () => snapLoad(),
    };

    // ---- Saved Games (Snapshots): defensive adapter over whichever snapshot plugin is installed ----
    // Map these to your chosen plugin's exact method names if they differ. Returns/accepts the raw blob.
    function snapExtract(r) {                                   // plugin return shapes vary
      if (!r) return null;
      if (typeof r === 'string') return r;
      return r.data || r.value || (r.snapshot && r.snapshot.data) || null;
    }
    function snapLoad() {
      try {
        if (GGS && GGS.loadGame) return Promise.resolve(GGS.loadGame()).then(snapExtract).catch(() => null);
        if (PG.loadGame)     return Promise.resolve(PG.loadGame({ name: SNAP })).then(snapExtract).catch(() => null);
        if (PG.loadSnapshot) return Promise.resolve(PG.loadSnapshot({ name: SNAP })).then(snapExtract).catch(() => null);
      } catch (e) {}
      return Promise.resolve(null);
    }
    function snapSave(data) {
      if (!data) return Promise.resolve();
      try {
        if (GGS && GGS.saveGame) return safe(GGS.saveGame({ title: SNAP, data: data }));
        if (PG.saveGame)     return safe(PG.saveGame({ name: SNAP, data: data }));
        if (PG.saveSnapshot) return safe(PG.saveSnapshot({ name: SNAP, data: data }));
      } catch (e) {}
      return Promise.resolve();
    }
    // On sign-in: adopt the snapshot only if it is a strictly LATER write than local (same monotonic
    // `sv` rule as cloud.js). Otherwise seed the snapshot from local. Reuses the shared reload guard so
    // PGS + anonymous Firestore never double-reload, and never reloads mid-battle.
    function reconcileSnapshot() {
      snapLoad().then(function (cloud) {
        var local = localStorage.getItem(SAVE_KEY_G);
        if (cloud && saveVer(cloud) > saveVer(local)) {
          if (window.TDS_BUSY && window.TDS_BUSY()) return;
          localStorage.setItem(SAVE_KEY_G, cloud);
          if (!sessionStorage.getItem('tds_cloud_reload')) { sessionStorage.setItem('tds_cloud_reload', '1'); location.reload(); }
        } else {
          snapSave(local || '');
        }
      });
    }
    var lastSnap = null;
    function startSnapMirror() {
      setInterval(function () {
        if (!signedIn) return;
        var v = localStorage.getItem(SAVE_KEY_G);
        if (v && v !== lastSnap) { lastSnap = v; snapSave(v); }
      }, 8000);
    }

    // Launch: silent status check. Only if PGS has never been offered on this install do we show
    // the interactive dialog once — accept or decline, it never comes back by itself.
    window.TDSGames.resume().then(ok => {
      if (ok || wasAsked()) return;
      // Re-check once after a beat so a slow automatic sign-in isn't mistaken for "not signed in"
      // (that would pop a dialog at a player PGS would have signed in silently anyway).
      setTimeout(() => { window.TDSGames.resume().then(ok2 => { if (!ok2 && !wasAsked()) window.TDSGames.signIn(); }); }, 2500);
    });
  }

  /* ---------- iOS: GAME CENTER — the same TDSGames facade (leaderboards + achievements) ----------
     Backed by the local TDSGameCenter Swift plugin (tds-android/local-plugins/tds-gamecenter).
     IDs: create the leaderboards + achievements in App Store Connect with EXACTLY these ids
     (Game Center ids are dev-chosen strings, so we reuse the logical keys 1:1).
     Cross-device save on iOS stays on the anonymous Firestore layer (cloud.js) — GC has no
     snapshot equivalent wired here. Fully defensive: not signed in → everything no-ops. */
  const GC = cap.Plugins && cap.Plugins.TDSGameCenter;
  if (!PG && GC && cap.getPlatform && cap.getPlatform() === 'ios') {
    const GC_IDS = {
      boards: { highscore: 'highscore', toplevel: 'toplevel' },
      ach: {
        first_win: 'first_win', level_5: 'level_5', level_10: 'level_10', veteran: 'veteran',
        veteran100: 'veteran100', kills_1k: 'kills_1k', kills_10k: 'kills_10k',
        weapon_max: 'weapon_max', all_weapons: 'all_weapons', heroes_5: 'heroes_5',
        castle_max: 'castle_max', streak_7: 'streak_7', endless_5k: 'endless_5k', rich_10k: 'rich_10k',
      },
    };
    const safeGC = p => { try { return (p && p.catch) ? p.catch(() => {}) : Promise.resolve(); } catch (e) { return Promise.resolve(); } };
    let gcSignedIn = false;

    window.TDSGames = {
      get ready() { return gcSignedIn; },
      submitScore(board, value) {
        const id = GC_IDS.boards[board];
        if (gcSignedIn && id && value > 0) safeGC(GC.submitScore({ id, score: Math.round(value) }));
      },
      unlock(key) {
        const id = GC_IDS.ach[key];
        if (gcSignedIn && id) safeGC(GC.unlockAchievement({ id }));
      },
      showLeaderboards() { if (gcSignedIn) safeGC(GC.showLeaderboards()); },
      showAchievements() { if (gcSignedIn) safeGC(GC.showAchievements()); },
      get available() { return true; },
      // Game Center auth is system-managed (iOS itself stops re-prompting after a few declines),
      // so resume() == signIn() here; only Android needed the never-nag split above.
      resume() { return this.signIn(); },
      signIn() {
        return Promise.resolve(GC.signIn())
          .then(() => { gcSignedIn = true; document.dispatchEvent(new Event('tds-games-ready')); return true; })
          .catch(() => false);
      },
      saveSnapshot() { return Promise.resolve(); },             // Firestore (cloud.js) covers cross-device save on iOS
      loadSnapshot() { return Promise.resolve(null); },
    };

    window.TDSGames.resume();                                  // Game Center sign-in on launch
  }

  /* ---------- Crashlytics bridge (native shell provides TDSCrash; no-op otherwise) ----------
     Records uncaught JS errors + promise rejections into Crashlytics as non-fatals, so WebView
     game errors show up next to native crashes in the Firebase console. */
  const Crash = cap.Plugins && cap.Plugins.TDSCrash;
  if (Crash && Crash.recordError) {
    const report = (message, stack) => {
      try { Crash.recordError({ message: String(message || 'js-error').slice(0, 500), stack: String(stack || '').slice(0, 2000) }).catch(() => {}); } catch (e) {}
    };
    addEventListener('error', e => report(e.message, (e.error && e.error.stack) || ((e.filename || '') + ':' + (e.lineno || ''))));
    addEventListener('unhandledrejection', e => { const r = e.reason || {}; report(r.message || r, r.stack); });
  }

  /* ---------- AdMob bridge ---------- */
  if (!AdMob) return;                                         // plugin missing → simulated ads remain

  // Remote Config (firebase.js) supplies the unit ids + toggles; fall back to test ids if absent.
  const RC = window.TDSRemoteConfig;
  const rcReady = (RC && RC.ready) ? RC.ready : Promise.resolve();

  // Unit ids come EXCLUSIVELY from Remote Config (admob_interstitial_id[_ios] /
  // admob_rewarded_id[_ios]). No published id → that format never loads or shows; the game's
  // ad hooks fall through instantly (rewards still granted). No test-id fallbacks in the app.
  const AD_UNITS = { interstitial: '', rewarded: '', banner: '' };

  let interReady = false, rewReady = false;

  /* ---- load timing ----------------------------------------------------------------
     A failed prepare used to be retried instantly on the next show attempt, which hammers AdMob
     and makes a "no fill" state sticky. Retry on a growing delay instead, and when the player is
     actually waiting on a rewarded ad, give the load a real window to land (REW_WAIT_MS) instead
     of paying the reward out on the spot. */
  const RETRY_MS  = [30000, 60000, 120000, 300000];   // backoff ladder after a failed load
  const REW_WAIT_MS   = 8000;                         // how long a tap waits for a rewarded ad
  const RELOAD_IDLE_MS = 3000;                        // settle time before preloading the next ad
  const SHOW_MAX_MS   = 300000;                       // watchdog: a show that never reports back
  const backoffMs = n => RETRY_MS[Math.min(n, RETRY_MS.length - 1)];

  let interFails = 0, rewFails = 0, interTimer = 0, rewTimer = 0, rewLoad = null;

  function prepInter() {
    if (!AD_UNITS.interstitial) return Promise.resolve(false);
    return AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial })
      .then(() => { interReady = true; interFails = 0; return true; })
      .catch(() => {
        interReady = false;
        clearTimeout(interTimer); interTimer = setTimeout(prepInter, backoffMs(interFails++));
        return false;
      });
  }
  function prepRew() {
    if (!AD_UNITS.rewarded) return Promise.resolve(false);
    if (rewLoad) return rewLoad;                        // a load is already in flight — don't stack
    rewLoad = AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded })
      .then(() => { rewReady = true; rewFails = 0; rewLoad = null; return true; })
      .catch(() => {
        rewReady = false; rewLoad = null;
        clearTimeout(rewTimer); rewTimer = setTimeout(prepRew, backoffMs(rewFails++));
        return false;
      });
    return rewLoad;
  }
  // Kick a load now (player is waiting, so skip the backoff timer) and resolve true as soon as an
  // ad is in hand, or false when the window runs out.
  function waitForRew(ms) {
    if (rewReady) return Promise.resolve(true);
    if (!AD_UNITS.rewarded) return Promise.resolve(false);
    clearTimeout(rewTimer);
    prepRew();
    return new Promise(res => {
      let settled = false;
      const finish = ok => { if (settled) return; settled = true; clearTimeout(cap); res(ok); };
      const cap = setTimeout(() => finish(rewReady), ms);
      (function poll() { if (settled) return; if (rewReady) return finish(true); setTimeout(poll, 250); })();
    });
  }

  /* ---- ad events: registered ONCE, routed to the in-flight show by token ----------
     The previous per-show once() removed its listeners through handles pushed AFTER the
     addListener promise resolved; when an ad event beat that promise the listener was never
     removed, and a later ad re-fired a PREVIOUS show's callback — one tap paying out twice.
     One permanent listener set plus a token makes stale events impossible: an event that doesn't
     belong to the current show is dropped. */
  let live = null;      // { token, kind:'rew'|'inter', earned, finish } for the show in progress
  let waiting = false;  // a rewarded tap is waiting for a load (no show on screen yet)
  let token = 0;
  const on = (ev, fn) => { try { Promise.resolve(AdMob.addListener(ev, fn)).catch(() => {}); } catch (e) {} };
  const hit = (kind, fn) => () => { if (live && live.kind === kind) fn(live); };

  on('onRewardedVideoAdLoaded',      () => { rewReady = true; rewFails = 0; });
  on('onRewardedVideoAdFailedToLoad',() => { rewReady = false; });
  on('onRewardedVideoAdReward',    hit('rew', l => { l.earned = true; }));
  on('onRewardedVideoAdDismissed', hit('rew', l => l.finish(l.earned)));   // closed early → no grant
  on('onRewardedVideoAdFailedToShow', hit('rew', l => l.finish(false)));
  on('interstitialAdLoaded',       () => { interReady = true; interFails = 0; });
  on('interstitialAdDismissed',    hit('inter', l => l.finish(true)));
  on('interstitialAdFailedToShow', hit('inter', l => l.finish(true)));

  /* ---- banner ---------------------------------------------------------------------
     An adaptive banner pinned to the bottom of the BATTLE SCENE only — it goes up on every
     level when the #game screen opens and comes down again on the way back to the menu, so
     the menu/shop/levels/weapons/heroes/forces screens stay ad-free. game.js drives it from
     its one screen-switch choke point (show()) via AdBridge.banner.set().

     The plugin draws it as a NATIVE OVERLAY on top of the WebView; it does NOT resize the
     WebView. Left alone it would sit over the battle HUD's bottom row, so the page gives
     the space back itself: every size report publishes the height into the --ad-h CSS
     variable, which shrinks .app (style.css) so the HUD, the buttons and the canvas all
     re-lay out above the banner. game.js measures the canvas off #app, so firing a plain
     'resize' event is all the re-measure it needs.

     No banner unit id in Remote Config, a failed load, or the NO-ADS bundle → --ad-h stays
     0px and the layout is exactly what it was before banners existed. */
  let bannerOn = false;        // the native banner VIEW is attached (loaded or not)
  let bannerWant = false;      // the game wants one here (i.e. we're in a battle)
  let bannerLive = false;      // AdMob has initialised — before that, requests are just parked
  const setAdH = px => {
    const v = Math.max(0, Math.round(px || 0));
    document.documentElement.style.setProperty('--ad-h', v + 'px');
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  };
  // NO-ADS bundle removes forced ads; `Meta` is a top-level const in game.js (global lexical
  // scope, not window), and game.js loads after this file — so read it defensively.
  const noAds = () => { try { return typeof Meta !== 'undefined' && !!Meta.noAds; } catch (e) { return false; } };

  on('bannerAdSizeChanged', info => { if (bannerOn) setAdH(info && info.height); });
  // No fill / network error: give the reserved space straight back so the battle HUD uses the
  // full screen. `bannerOn` deliberately STAYS true — the native view is still attached, just
  // empty. Clearing it here would let the next battle stack a second banner on top of this one;
  // leaving it set means the normal set(false) on the way out removes the view, and the next
  // battle issues a fresh request.
  on('bannerAdFailedToLoad', () => setAdH(0));

  function showBanner() {
    if (!AD_UNITS.banner || bannerOn || noAds()) return Promise.resolve(false);
    bannerOn = true;
    return AdMob.showBanner({
      adId: AD_UNITS.banner,
      adSize: 'ADAPTIVE_BANNER',      // full-width, height picked by the SDK for the device
      position: 'BOTTOM_CENTER',
      margin: 0,
    }).then(() => true)
      .catch(() => { bannerOn = false; setAdH(0); return false; });
  }
  function hideBanner() {
    if (!bannerOn) return Promise.resolve();
    bannerOn = false; setAdH(0);
    return AdMob.removeBanner().catch(() => {});
  }
  // Single reconciler: put the banner in whatever state the game currently wants. Safe to call
  // at any time — before AdMob is up it just parks the intent, and both helpers no-op when the
  // banner is already in the right state.
  function syncBanner() {
    if (!bannerLive) return Promise.resolve(false);
    return (bannerWant && !noAds()) ? showBanner() : hideBanner();
  }

  // Wraps a callback so it can never run twice, whatever order the events/promises arrive in.
  // Arguments are forwarded — the rewarded/interstitial outcome rides along for analytics.
  const oneShot = fn => { let used = false; return function () { if (used) return; used = true; try { fn.apply(null, arguments); } catch (e) {} }; };
  // If a show never reports back (no dismiss/failed event on some devices), release the bridge so
  // the player isn't locked out of every later ad. Cleared as soon as the show finishes normally.
  let showGuard = 0;
  const armGuard = t => {
    clearTimeout(showGuard);
    showGuard = setTimeout(() => { if (live && live.token === t) live.finish(live.kind === 'rew' ? live.earned : true); }, SHOW_MAX_MS);
  };
  // Loading overlay (game.js owns the DOM; absent on other builds → silent no-op).
  const ui = {
    show: t => { try { if (window.TDSAdOverlay) TDSAdOverlay.show(t); } catch (e) {} },
    hide: () => { try { if (window.TDSAdOverlay) TDSAdOverlay.hide(); } catch (e) {} },
  };

  // GDPR/EEA consent via the AdMob plugin's built-in User Messaging Platform (UMP). Must run
  // BEFORE requesting ads. Defensive: older plugin versions, non-EEA users, or an unavailable
  // form all fall through to ads. To TEST the EEA form on a device, temporarily pass
  //   { debugGeography: 'EEA', testDeviceIdentifiers: ['<your-device-hash>'] } to requestConsentInfo.
  // iOS App Tracking Transparency — Apple requires the ATT prompt before personalised ads.
  // Runs only on iOS and only if the plugin exposes it; declined/unavailable simply means
  // non-personalised ads, never an error. (Info.plist carries NSUserTrackingUsageDescription.)
  function requestATT() {
    if (!(cap.getPlatform && cap.getPlatform() === 'ios')) return Promise.resolve();
    if (!AdMob.requestTrackingAuthorization) return Promise.resolve();
    return AdMob.requestTrackingAuthorization().catch(() => {});
  }

  function requestConsent() {
    if (!AdMob.requestConsentInfo) return Promise.resolve();      // plugin predates UMP → skip
    return AdMob.requestConsentInfo()
      .then(info => {                                             // { status, isConsentFormAvailable }
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') {
          return AdMob.showConsentForm().catch(() => {});
        }
      })
      .catch(() => {});                                           // consent unavailable → proceed without personalised ads
  }

  // Wait for Remote Config so we boot AdMob with the console's unit ids + toggles.
  rcReady.then(() => {
    // No enable/disable switches: each format runs iff Remote Config publishes its unit id.
    // To kill a format remotely, blank its admob_* id in the console.
    if (RC) {
      // Ad units are per-platform in AdMob: iOS reads the *_ios keys first, then the shared
      // (Android) keys, then Google's test ids. Set admob_interstitial_id_ios /
      // admob_rewarded_id_ios in Remote Config once the iOS AdMob app exists.
      const ios = cap.getPlatform && cap.getPlatform() === 'ios';
      const pick = base => (ios && RC.getString(base + '_ios')) || RC.getString(base) || '';
      AD_UNITS.interstitial = pick('admob_interstitial_id') || AD_UNITS.interstitial;
      AD_UNITS.rewarded     = pick('admob_rewarded_id')     || AD_UNITS.rewarded;
      AD_UNITS.banner       = pick('admob_banner_id')       || AD_UNITS.banner;
    }
    // UMP consent first, THEN initialise AdMob and preload the ads. Cap the consent step with a
    // timeout so a plugin/OS version whose consent promise never settles can't block ads forever.
    Promise.race([
      requestATT().then(requestConsent),
      new Promise(res => setTimeout(res, 9000))
    ]).then(() => {
      // Production init on BOTH platforms. Ads are still harmless test creatives wherever the
      // unit-id fallbacks below are in effect; real ads serve once Remote Config supplies real ids.
      AdMob.initialize()
        .then(() => {
          prepInter(); prepRew();                               // each prep no-ops if its unit id is empty
          // AdMob usually finishes booting after the game has already picked a screen (and
          // index.html#play boots straight into a battle), so adopt whatever is on screen NOW
          // rather than waiting for the next show() call.
          bannerLive = true;
          const g = document.getElementById('game');
          bannerWant = !!(g && g.classList.contains('active'));
          syncBanner();
        })
        .catch(() => {});
    });

    window.AdBridge = {
      // Battle-scene bottom banner. game.js calls set(true) when the #game screen opens and
      // set(false) on every other screen; refresh() re-evaluates in place (used after the
      // NO-ADS bundle is bought, which takes the banner down for good).
      banner: {
        set(on) { bannerWant = !!on; return syncBanner(); },
        refresh: syncBanner,
      },
      // post-battle interstitial: done() continues to the result card (never blocks the game)
      interstitial(done) {
        const go = oneShot(done);
        try {
          // done(shown): the flag tells game.js whether an ad really reached the screen, so it can
          // log a true impression instead of counting attempts. Behaviour is unchanged either way.
          if (!interReady || live) { go(false); prepInter(); return; }   // nothing loaded, or a show is up
          interReady = false;
          const t = ++token;
          live = { token: t, kind: 'inter', earned: false, finish: () => {
            if (!live || live.token !== t) return;
            live = null; clearTimeout(showGuard); go(true); setTimeout(prepInter, RELOAD_IDLE_MS);
          } };
          armGuard(t);
          AdMob.showInterstitial().catch(() => { const f = live && live.token === t && live.finish; if (f) f(); else go(false); });
        } catch (e) { go(false); }
      },
      // Rewarded. `done` grants the reward and fires AT MOST ONCE per call; `settled` always fires
      // when the flow ends (grant or not) so the caller can re-enable its button.
      //
      // No ad in hand no longer pays out immediately — that instant grant is what let a double-tap
      // hand out the reward twice with no ad shown. Instead we show a loading overlay, give the
      // load REW_WAIT_MS to arrive, and only fall back to a single grant if it truly never comes.
      // `settled` receives the outcome { shown, earned, reason } — game.js turns that into the
      // ad_rewarded event. `shown` is only true when an ad genuinely appeared on screen.
      rewarded(done, settled) {
        // Busy = a show is up OR a tap is still waiting for a load. The wait window has to count:
        // `live` alone is only set once a show starts, so two taps could both sit in the 8s wait
        // and each pay out when it expired. Bail WITHOUT touching `waiting` — that flag belongs to
        // the flow that set it.
        if (live || waiting) { if (settled) settled({ shown: 0, earned: 0, reason: 'busy' }); return; }
        const go = oneShot(done);
        const end = oneShot(o => { waiting = false; ui.hide(); if (settled) settled(o || { shown: 0, earned: 0, reason: 'unknown' }); });
        const play = () => {
          const t = ++token;
          rewReady = false;
          live = { token: t, kind: 'rew', earned: false, finish: ok => {
            if (!live || live.token !== t) return;
            // grant BEFORE settled: callers re-enable their button in settled, and doing that first
            // would open a window for a second flow to claim the same reward again.
            live = null; clearTimeout(showGuard); if (ok) go();
            end({ shown: 1, earned: ok ? 1 : 0, reason: ok ? 'earned' : 'closed_early' });
            setTimeout(prepRew, RELOAD_IDLE_MS);
          } };
          armGuard(t);
          ui.hide();
          try {
            AdMob.showRewardVideoAd().catch(() => {
              // Only pay out if NO event resolved this show yet: a rejection arriving after the
              // player closed the ad early must not turn that no-grant into a grant.
              if (!live || live.token !== t) return;
              live = null; clearTimeout(showGuard); setTimeout(prepRew, RELOAD_IDLE_MS);
              end({ shown: 0, earned: 1, reason: 'show_failed' }); go();   // never appeared → honour the tap, once
            });
          } catch (e) {
            if (!live || live.token !== t) return;
            live = null; clearTimeout(showGuard); end({ shown: 0, earned: 1, reason: 'show_threw' }); go();
          }
        };
        if (rewReady) { play(); return; }
        waiting = true;
        ui.show('Loading ad…');
        waitForRew(REW_WAIT_MS).then(ok => {
          if (ok) { waiting = false; play(); }
          else { end({ shown: 0, earned: 1, reason: 'no_fill' }); go(); }   // waited, nothing came → single grant
        });
      },
    };
  });
})();
