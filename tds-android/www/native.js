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
   │   • remove `initializeForTesting: true` below                              │
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
      signIn() {
        if (!PG.login) return Promise.resolve();
        return safe(PG.login()).then(() => {
          signedIn = true;
          document.dispatchEvent(new Event('tds-games-ready'));
          const g = (GGS && GGS.signIn) ? safe(GGS.signIn()) : Promise.resolve();  // snapshot plugin has its own auth handle
          g.then(() => {
            reconcileSnapshot();                               // pull the cross-device Google-account save
            startSnapMirror();                                 // keep the snapshot mirrored to local
          });
        });
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

    window.TDSGames.signIn();                                  // silent sign-in on launch (PGS v2)
  }

  /* ---------- AdMob bridge ---------- */
  if (!AdMob) return;                                         // plugin missing → simulated ads remain

  // Remote Config (firebase.js) supplies the unit ids + toggles; fall back to test ids if absent.
  const RC = window.TDSRemoteConfig;
  const rcReady = (RC && RC.ready) ? RC.ready : Promise.resolve();

  // Google's public TEST unit ids — used until Remote Config provides real ones.
  const AD_UNITS = {
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded:     'ca-app-pub-3940256099942544/5224354917',
  };

  let interReady = false, rewReady = false;
  const prepInter = () => AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial })
    .then(() => { interReady = true; }).catch(() => { interReady = false; });
  const prepRew = () => AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded })
    .then(() => { rewReady = true; }).catch(() => { rewReady = false; });

  // one-shot dismissal listeners per show (event names from @capacitor-community/admob v6)
  function once(events, cb) {
    const handles = [];
    let fired = false;
    events.forEach(ev => Promise.resolve(AdMob.addListener(ev, () => {
      if (fired) return; fired = true;
      handles.forEach(h => Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}));
      cb(ev);
    })).then(h => handles.push(h)).catch(() => {}));
  }

  // GDPR/EEA consent via the AdMob plugin's built-in User Messaging Platform (UMP). Must run
  // BEFORE requesting ads. Defensive: older plugin versions, non-EEA users, or an unavailable
  // form all fall through to ads. To TEST the EEA form on a device, temporarily pass
  //   { debugGeography: 'EEA', testDeviceIdentifiers: ['<your-device-hash>'] } to requestConsentInfo.
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
    if (RC && !RC.getBool('ads_enabled')) return;             // ads switched off remotely → keep sim/no ads
    if (RC) {
      AD_UNITS.interstitial = RC.getString('admob_interstitial_id') || AD_UNITS.interstitial;
      AD_UNITS.rewarded     = RC.getString('admob_rewarded_id')     || AD_UNITS.rewarded;
    }
    const wantInter = !RC || RC.getBool('interstitial_enabled');
    const wantRew   = !RC || RC.getBool('rewarded_enabled');

    // UMP consent first, THEN initialise AdMob and preload the ads. Cap the consent step with a
    // timeout so a plugin/OS version whose consent promise never settles can't block ads forever.
    Promise.race([
      requestConsent(),
      new Promise(res => setTimeout(res, 6000))
    ]).then(() => {
      AdMob.initialize({ initializeForTesting: true })        // TODO: remove initializeForTesting for production
        .then(() => { if (wantInter) prepInter(); if (wantRew) prepRew(); })
        .catch(() => {});
    });

    window.AdBridge = {
      // post-battle interstitial: done() continues to the result card (never blocks the game)
      interstitial(done) {
        try {
          if (!interReady) { done(); prepInter(); return; }
          interReady = false;
          once(['interstitialAdDismissed', 'interstitialAdFailedToShow'], () => { done(); prepInter(); });
          AdMob.showInterstitial().catch(() => { done(); prepInter(); });
        } catch (e) { done(); }
      },
      // rewarded: done() fires ONLY if the user earned the reward (closed early = no grant)
      rewarded(done) {
        try {
          if (!rewReady) { done(); prepRew(); return; }        // no fill → grant anyway, don't punish the player
          rewReady = false;
          let earned = false;
          once(['onRewardedVideoAdReward'], () => { earned = true; });
          once(['onRewardedVideoAdDismissed', 'onRewardedVideoAdFailedToShow'], () => { if (earned) done(); prepRew(); });
          AdMob.showRewardVideoAd().catch(() => { done(); prepRew(); });
        } catch (e) { done(); }
      },
    };
  });
})();
