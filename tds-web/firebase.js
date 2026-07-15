/* firebase.js — Firebase Analytics + Remote Config for "TDS - Zombie Tower Defense".
   ONE integration that runs in BOTH the plain-web build and the Capacitor Android
   WebView (the Firebase Web SDK works inside the WebView), so there is a single codebase.

     • Analytics  → app_open, screen_view (every screen the player visits), and the
                    gameplay / ad / purchase events logged from game.js.
     • RemoteConfig → drives the ADS (enabled toggles, AdMob unit ids, interstitial
                    frequency) so you can change ad behaviour live from the Firebase
                    console WITHOUT shipping an app update.

   This file is loaded AFTER the Firebase compat CDN scripts and BEFORE native.js/game.js
   (see index.html). It is 100% defensive: until you paste a real config below, Firebase
   stays OFF, every analytics call is a no-op, and Remote Config serves the built-in
   defaults — so the game plays exactly as it does today.

   ┌───────────────────────────────────────────────────────────────────────────────┐
   │  1) PASTE YOUR FIREBASE CONFIG BELOW.                                          │
   │     Firebase console → Project settings → General → Your apps →               │
   │     add/select a **Web app** → "SDK setup and configuration" → Config.        │
   │     (measurementId "G-XXXXXXXXXX" is required for Analytics.)                  │
   │  2) In the console, enable **Analytics** and **Remote Config**, and add the   │
   │     ad keys listed in RC_DEFAULTS (same names) as Remote Config parameters.   │
   │  3) For real Android ads, also set your AdMob app id in AndroidManifest.xml    │
   │     and your unit ids as the admob_* Remote Config values.                     │
   └───────────────────────────────────────────────────────────────────────────────┘ */
(function () {
  'use strict';

  /* ============================ 1) YOUR FIREBASE CONFIG ============================ */
  // Replace every "PASTE_..." value. While apiKey still contains "PASTE", Firebase is OFF.
  var FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCaiOXsfkECRdu7lAsLV2BcjXIFMgvrzhE",
    authDomain:        "tds-1b407.firebaseapp.com",
    projectId:         "tds-1b407",
    storageBucket:     "tds-1b407.firebasestorage.app",
    messagingSenderId: "246209348792",
    appId:             "1:246209348792:android:1a4f8c3b9b534f684d604d"
  };

  /* ===================== 2) REMOTE CONFIG DEFAULTS (the ad setup) ==================== */
  // The app ships with these values; anything you set in the Firebase console overrides
  // them at runtime. Keep the KEY NAMES identical in the console.
  var RC_DEFAULTS = {
    // master + per-format ad switches
    ads_enabled:            true,   // false → no ads at all (rewarded rewards still granted)
    interstitial_enabled:   true,   // post-battle full-screen ad
    rewarded_enabled:       true,   // the "watch ad ×2 / +1" opt-in ads
    banner_enabled:         false,  // reserved (no banner slot in the UI yet)
    // how often the post-battle interstitial appears: 1 = every battle, 2 = every 2nd, …
    interstitial_frequency: 1,
    // AdMob unit ids (Android). These are Google's PUBLIC TEST ids — replace in the console.
    admob_interstitial_id:  'ca-app-pub-3940256099942544/1033173712',
    admob_rewarded_id:      'ca-app-pub-3940256099942544/5224354917',
    admob_banner_id:        'ca-app-pub-3940256099942544/6300978111',
    // rating popups — shown every `rate_popup_every` games; flip each OFF/ON from the console any time
    rate_popup_enabled:        true,   // popup 1: star picker (4-5★ → store page, 1-3★ → thank you)
    rate_reward_popup_enabled: true,   // popup 2: "give us 5 stars and get 1000 coins"
    rate_popup_every:          5,      // cadence, in games played
    // weekly / monthly contest prizes (gems) — tune live from the console, no app update needed
    month_prize_top3:  1000,           // monthly contest: ranks 1-3
    month_prize_top10: 300,            // monthly contest: ranks 4-10
    week_prize_top3:   300,            // weekly contest: ranks 1-3
    week_prize_top10:  100             // weekly contest: ranks 4-10
  };

  // How fresh Remote Config must be. 1h is a sane production value; while wiring things up
  // set this to 0 so console changes appear on the next launch instead of up to an hour later.
  var RC_MIN_FETCH_MS = 3600000;

  /* ================================ internal state ================================= */
  var _analytics = null;   // firebase.analytics() instance, or null when off/unsupported
  var _rc = null;          // firebase.remoteConfig() instance, or null when off
  var _rcResolve;
  var _rcReady = new Promise(function (res) { _rcResolve = res; });
  var _rcDone = false;
  function settleRC() { if (!_rcDone) { _rcDone = true; _rcResolve(window.TDSRemoteConfig); } }

  function platform() {
    try {
      if (window.Capacitor && window.Capacitor.getPlatform) return window.Capacitor.getPlatform();
    } catch (e) {}
    return 'web';
  }

  /* ============ Public API — always defined, safe to call before/after init ========= */

  // Analytics: thin, crash-proof wrapper. No-ops entirely when Firebase is off.
  window.TDSAnalytics = {
    log: function (name, params) {
      try { if (_analytics) _analytics.logEvent(name, params || {}); } catch (e) {}
    },
    // SPA screen tracking: our 7 screens live on one page, so log a screen_view per switch.
    screen: function (name, params) {
      var p = { firebase_screen: name, screen_name: name, screen_class: name };
      if (params) for (var k in params) p[k] = params[k];
      this.log('screen_view', p);
    },
    setUserId: function (id) { try { if (_analytics) _analytics.setUserId(String(id)); } catch (e) {} },
    setUserProp: function (k, v) {
      try { if (_analytics) { var o = {}; o[k] = v; _analytics.setUserProperties(o); } } catch (e) {}
    },
    // Crash/error reporting. The game runs inside a WebView, so native Crashlytics only sees
    // NATIVE crashes — these forward uncaught + handled JS exceptions to Analytics (event
    // "js_error") so gameplay crashes are visible too. (Analytics caps string params at 100 chars.)
    recordError: function (err, fatal) {
      try {
        var msg = ((err && (err.message || err.reason)) || err || 'error') + '';
        var loc = '';
        if (err && err.stack) { loc = String(err.stack).split('\n')[1] || String(err.stack).split('\n')[0] || ''; }
        msg = msg.slice(0, 100); loc = loc.trim().slice(0, 100);
        // Throttle: dedup identical errors and cap the session total, so a per-frame exception in the
        // render loop can't flood Analytics (burning event quota and drowning out real signal).
        var key = msg + '|' + loc;
        this._errSeen = this._errSeen || {};
        if (this._errSeen[key]) return;                       // this exact error already reported this session
        if ((this._errN = (this._errN || 0) + 1) > 10) return; // hard per-session cap
        this._errSeen[key] = 1;
        this.log('js_error', {
          error_message: msg,
          error_at: loc,
          fatal: fatal ? 1 : 0,
          platform: platform()
        });
      } catch (e) {}
    },
    get on() { return !!_analytics; }
  };

  // Global JS crash capture → Analytics (best-effort; no-ops until Firebase is configured).
  window.addEventListener('error', function (e) {
    window.TDSAnalytics.recordError((e && (e.error || e.message)) || e, true);
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.TDSAnalytics.recordError((e && e.reason) || e, true);
  });

  // Remote Config: reads live values when available, otherwise the RC_DEFAULTS above.
  window.TDSRemoteConfig = {
    ready: _rcReady,   // Promise resolved once fetch settles (or immediately when RC is off)
    getBool: function (k) {
      try { if (_rc) return _rc.getValue(k).asBoolean(); } catch (e) {}
      return !!RC_DEFAULTS[k];
    },
    getNumber: function (k) {
      try { if (_rc) { var n = _rc.getValue(k).asNumber(); if (!isNaN(n)) return n; } } catch (e) {}
      return Number(RC_DEFAULTS[k]) || 0;
    },
    getString: function (k) {
      try { if (_rc) { var s = _rc.getValue(k).asString(); if (s) return s; } } catch (e) {}
      return RC_DEFAULTS[k] != null ? String(RC_DEFAULTS[k]) : '';
    },
    get on() { return !!_rc; }
  };

  /* ================================== bootstrap ==================================== */
  var CONFIGURED = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('PASTE') === -1;

  if (!CONFIGURED) {
    // Not set up yet → defaults only, analytics no-op. Game is unaffected.
    console.info('[TDS] Firebase not configured yet — paste your config in firebase.js. ' +
                 'Ads use built-in defaults; analytics is off.');
    settleRC();
    return;
  }

  if (typeof firebase === 'undefined') {
    // CDN blocked/offline → behave as "not configured" so nothing breaks.
    console.warn('[TDS] Firebase SDK failed to load (offline?). Using ad defaults, analytics off.');
    settleRC();
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);

    // ---- Analytics (guard: not every WebView/browser supports it) ----
    var startAnalytics = function () {
      try {
        _analytics = firebase.analytics();
        window.TDSAnalytics.setUserProp('platform', platform());
        window.TDSAnalytics.log('app_open', { platform: platform() });
      } catch (e) { console.warn('[TDS] Analytics unavailable', e); }
    };
    if (firebase.analytics && firebase.analytics.isSupported) {
      firebase.analytics.isSupported()
        .then(function (ok) { if (ok) startAnalytics(); })
        .catch(function () {});
    } else if (firebase.analytics) {
      startAnalytics();
    }

    // ---- Remote Config (drives the ads) ----
    if (firebase.remoteConfig) {
      _rc = firebase.remoteConfig();
      _rc.defaultConfig = RC_DEFAULTS;
      try { _rc.settings.minimumFetchIntervalMillis = RC_MIN_FETCH_MS; } catch (e) {}
      _rc.fetchAndActivate()
        .then(function () { settleRC(); })
        .catch(function (e) { console.warn('[TDS] Remote Config fetch failed, using defaults', e); settleRC(); });
    } else {
      settleRC();
    }
  } catch (e) {
    console.warn('[TDS] Firebase init failed, using defaults', e);
    settleRC();
  }
})();
