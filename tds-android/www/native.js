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
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // web build → keep simulated ads

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

  // Wait for Remote Config so we boot AdMob with the console's unit ids + toggles.
  rcReady.then(() => {
    if (RC && !RC.getBool('ads_enabled')) return;             // ads switched off remotely → keep sim/no ads
    if (RC) {
      AD_UNITS.interstitial = RC.getString('admob_interstitial_id') || AD_UNITS.interstitial;
      AD_UNITS.rewarded     = RC.getString('admob_rewarded_id')     || AD_UNITS.rewarded;
    }
    const wantInter = !RC || RC.getBool('interstitial_enabled');
    const wantRew   = !RC || RC.getBool('rewarded_enabled');

    AdMob.initialize({ initializeForTesting: true })          // TODO: remove for production
      .then(() => { if (wantInter) prepInter(); if (wantRew) prepRew(); })
      .catch(() => {});

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
