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
    apiKey:            "AIzaSyCAJIdvlSXAO93NEStN0xsdDCClKIL6cVM",
    authDomain:        "tds-1b407.firebaseapp.com",
    projectId:         "tds-1b407",
    storageBucket:     "tds-1b407.firebasestorage.app",
    messagingSenderId: "246209348792",
    appId:             "1:246209348792:web:5292851bb25a57ed4d604d",
    measurementId:     "G-RZ9TRLXNZL"                     // ← enables Analytics (web stream, both platforms)
  };

  /* ===================== 2) REMOTE CONFIG DEFAULTS (the ad setup) ==================== */
  // The app ships with these values; anything you set in the Firebase console overrides
  // them at runtime. Keep the KEY NAMES identical in the console.
  var RC_DEFAULTS = {
    // Ads have NO enable/disable switches — a format runs iff its admob_* unit id below is
    // published in the Remote Config console (blank the id there to kill a format remotely).
    // how often the post-battle interstitial appears: 1 = every battle, 2 = every 2nd, …
    interstitial_frequency: 1,
    // AdMob unit ids — INTENTIONALLY EMPTY in-app. Real ids live ONLY in the Remote Config
    // console (admob_* for Android, admob_*_ios for iOS). Empty → that ad format never loads;
    // the game's ad hooks fall through and rewarded rewards are still granted.
    admob_interstitial_id:  '',
    admob_rewarded_id:      '',
    admob_banner_id:        '',
    admob_interstitial_id_ios: '',
    admob_rewarded_id_ios:     '',
    admob_banner_id_ios:       '',
    // Flip TRUE in the Remote Config console to stream events into Firebase DebugView (and print
    // each one to logcat). The game runs on the Firebase WEB SDK, which — unlike a native app —
    // has no `adb setprop` debug switch, so events only reach DebugView when tagged debug_mode.
    // Turn it OFF again afterwards: debug traffic is excluded from normal reports.
    analytics_debug: false,
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

  // How fresh Remote Config must be. 0 = ALWAYS fetch from Firebase — no local cache window, so a
  // value published in the console takes effect on the next launch (and on the next app resume, see
  // TDSRemoteConfig.refresh below) instead of up to an hour later. Firebase applies its own
  // server-side fetch throttling, so this is safe to leave at 0.
  var RC_MIN_FETCH_MS = 0;
  var RC_FETCH_TIMEOUT_MS = 15000;   // don't let a slow network hang the ready promise
  var RC_REFRESH_GUARD_MS = 10000;   // ignore refresh() calls closer together than this

  /* ================================ internal state ================================= */
  var _analytics = null;   // firebase.analytics() instance, or null when off/unsupported
  var _rc = null;          // firebase.remoteConfig() instance, or null when off
  var _rcResolve;
  var _rcReady = new Promise(function (res) { _rcResolve = res; });
  var _rcDone = false;
  var _rcLastFetch = 0;    // guards refresh() against rapid repeat calls
  function settleRC() { if (!_rcDone) { _rcDone = true; _rcResolve(window.TDSRemoteConfig); } }

  function platform() {
    try {
      if (window.Capacitor && window.Capacitor.getPlatform) return window.Capacitor.getPlatform();
    } catch (e) {}
    return 'web';
  }

  /* ============ Public API — always defined, safe to call before/after init ========= */

  // Analytics: thin, crash-proof wrapper. No-ops entirely when Firebase is off.
  // Debug streaming (Remote Config `analytics_debug`): tags every event with debug_mode so it shows
  // up in Firebase DebugView within seconds, and mirrors it to logcat as ONE string (the Capacitor
  // console bridge drops object arguments).
  function _dbgOn() { try { return !!(_rc && _rc.getValue('analytics_debug').asBoolean()); } catch (e) { return false; } }

  window.TDSAnalytics = {
    log: function (name, params) {
      try {
        var p = params || {};
        if (_dbgOn()) {
          var q = { debug_mode: 1 };
          for (var k in p) q[k] = p[k];
          p = q;
          console.info('[TDS] evt ' + name + ' ' + JSON.stringify(p));
        }
        if (_analytics) _analytics.logEvent(name, p);
      } catch (e) {}
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
    // Where a value actually came from: 'remote' = fetched from the console, 'default'/'static' =
    // the in-app RC_DEFAULTS above. Use this to tell "console value not published / misspelled
    // key / condition not matching" apart from "fetch didn't happen".
    sourceOf: function (k) {
      try { if (_rc && _rc.getValue(k).getSource) return _rc.getValue(k).getSource(); } catch (e) {}
      return _rc ? 'unknown' : 'off';
    },
    // Re-fetch + activate on demand. Called on every app resume so console changes land without a
    // restart; also callable by hand (TDSRemoteConfig.refresh()) from devtools.
    refresh: function () {
      if (!_rc) return Promise.resolve(false);
      var now = +new Date();
      if (now - _rcLastFetch < RC_REFRESH_GUARD_MS) return Promise.resolve(false);
      _rcLastFetch = now;
      return _rc.fetchAndActivate()
        .then(function (activated) { logRC(activated ? 'refresh (new values)' : 'refresh (unchanged)'); return !!activated; })
        .catch(function (e) { console.warn('[TDS] Remote Config refresh failed', e); return false; });
    },
    get on() { return !!_rc; }
  };

  // One compact line per fetch showing the values the DEVICE is actually using and their source,
  // so a "console change didn't apply" is diagnosable from logcat / devtools alone.
  function logRC(tag) {
    try {
      var out = [];
      for (var k in RC_DEFAULTS) {
        if (/^admob_/.test(k)) continue;                       // don't print unit ids
        out.push(k + '=' + window.TDSRemoteConfig.getString(k) + '[' + window.TDSRemoteConfig.sourceOf(k) + ']');
      }
      // ONE string, not an object: Capacitor's console bridge drops object args, so an object here
      // reaches logcat as "Msg: undefined" and the diagnostic is useless on device.
      console.info('[TDS] RemoteConfig ' + tag + ' ' + out.join(' '));
    } catch (e) {}
  }

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
      try {
        _rc.settings.minimumFetchIntervalMillis = RC_MIN_FETCH_MS;   // 0 → always hit the server
        _rc.settings.fetchTimeoutMillis = RC_FETCH_TIMEOUT_MS;
      } catch (e) {}
      _rcLastFetch = +new Date();
      _rc.fetchAndActivate()
        .then(function () { logRC('boot'); settleRC(); })
        .catch(function (e) { console.warn('[TDS] Remote Config fetch failed, using defaults', e); logRC('boot (fetch failed)'); settleRC(); });

      // Re-fetch whenever the app comes back to the foreground, so a value published in the console
      // applies on the next resume — no app restart, no waiting out a cache window.
      var onResume = function () { window.TDSRemoteConfig.refresh(); };
      document.addEventListener('visibilitychange', function () { if (!document.hidden) onResume(); });
      window.addEventListener('focus', onResume);
      try {
        var capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
        if (capApp && capApp.addListener) capApp.addListener('appStateChange', function (s) { if (s && s.isActive) onResume(); });
      } catch (e) {}
    } else {
      settleRC();
    }
  } catch (e) {
    console.warn('[TDS] Firebase init failed, using defaults', e);
    settleRC();
  }
})();
