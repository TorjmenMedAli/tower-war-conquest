/* cloud.js — cross-device CLOUD SAVE via Firebase (anonymous Auth + Firestore).
   Cross-platform by design: ANDROID / iOS use the NATIVE Firebase SDK, the web build
   uses the Firebase JS SDK — same sync logic on top, one codebase.

   ── BACKEND SELECTION ──────────────────────────────────────────────────────────
   • Native (Capacitor) + the @capacitor-firebase plugins present → NATIVE backend
     (uses google-services.json / GoogleService-Info.plist, works well in WKWebView,
     no CDN download). This is the path for the shipped Android/iOS apps.
   • Otherwise, if the Firebase JS SDK is loaded + initialised (firebase.js) → WEB
     backend. This also covers a native build BEFORE the plugins are installed, so
     cloud save keeps working and simply upgrades to native once you add the plugins.
   • Neither available → no-op; the game runs on the LOCAL save only.

   To activate the NATIVE backend:
     cd tds-android && npm i @capacitor-firebase/authentication @capacitor-firebase/firestore && npx cap sync
   Native Firebase is configured from google-services.json (Android) — no JS config needed
   for the native path. See SETUP-cloudsave-and-playgames.md.

   100% DEFENSIVE: any missing piece, or no network, and this silently no-ops. Nothing
   here can break the game.

   MODEL: the whole save is one JSON blob. Sign in ANONYMOUSLY (no login UI), keep the
   Firestore doc `saves/{uid}` in sync with localStorage. On launch PULL the cloud copy
   and restore it if it is MORE ADVANCED — compared by (battles played, levels unlocked,
   coins) — then PUSH local changes every ~5 s and on background/close. */
(function () {
  'use strict';

  var SAVE = 'tds_save_web';
  var PUSH_EVERY_MS = 5000;
  var api = window.TDSCloud = { on: false, uid: null, backend: null, flush: function () {} };

  var cap    = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var FAuth  = cap && cap.Plugins && cap.Plugins.FirebaseAuthentication;
  var FStore = cap && cap.Plugins && cap.Plugins.FirebaseFirestore;

  // ── choose a backend (native preferred on device) ──────────────────────────────
  var backend = null;
  if (native && FAuth && FStore) {
    backend = {
      name: 'native',
      signIn: function () {
        return FAuth.getCurrentUser()
          .then(function (r) { return (r && r.user) ? r.user : FAuth.signInAnonymously().then(function (x) { return x && x.user; }); });
      },
      onUser: function (cb) { try { FAuth.addListener('authStateChange', function (ev) { cb(ev && ev.user); }); } catch (e) {} },
      get: function (uid) {
        return FStore.getDocument({ reference: 'saves/' + uid })
          .then(function (r) { return (r && r.snapshot && r.snapshot.data) ? r.snapshot.data.blob : null; });
      },
      set: function (uid, data) { return FStore.setDocument({ reference: 'saves/' + uid, data: data, merge: true }); },
    };
  } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && firebase.auth && firebase.firestore) {
    var db = firebase.firestore();
    backend = {
      name: 'web',
      signIn: function () { return firebase.auth().signInAnonymously().then(function (c) { return c && c.user; }); },
      onUser: function (cb) { firebase.auth().onAuthStateChanged(function (u) { cb(u); }); },
      get: function (uid) { return db.collection('saves').doc(uid).get().then(function (d) { return d.exists ? d.data().blob : null; }); },
      set: function (uid, data) { return db.collection('saves').doc(uid).set(data, { merge: true }); },
    };
  }
  if (!backend) return;                       // no cloud backend → local save only

  var uid = null, lastPushed = null;

  // Conflict resolution = LAST-WRITE-WINS by a MONOTONIC save counter (Meta.sv), NOT a progress
  // tuple. The blob's `sv` increments on every Meta.save(), so "higher sv" is unambiguously the
  // later write — this covers ALL fields (coins spent, gems, the noAds IAP, weapon/hero levels,
  // hero unlocks…) and never mistakes a coin-spend for a regression. Whole-blob replace is fine
  // because the winner is always the strictly-later write of the same account lineage.
  function saveVer(blob) {
    try { var o = typeof blob === 'string' ? JSON.parse(blob) : blob; return o ? (o.sv | 0) : 0; }
    catch (e) { return 0; }
  }

  function push(force) {
    var v = localStorage.getItem(SAVE);
    if (!v || !uid) return;
    if (!force && v === lastPushed) return;
    lastPushed = v;
    try {
      Promise.resolve(backend.set(uid, {
        blob: v, sv: saveVer(v),
        platform: (cap && cap.getPlatform && cap.getPlatform()) || 'web',
        updated: Date.now()
      })).catch(function () {});
    } catch (e) {}
  }
  api.flush = function () { push(true); };

  function pull() {
    return Promise.resolve(backend.get(uid)).then(function (cloud) {
      var local = localStorage.getItem(SAVE);
      if (cloud && saveVer(cloud) > saveVer(local)) {         // cloud is a strictly later write → adopt it
        // NEVER hard-reload during a live battle (it would discard the run). Skip this session;
        // the next launch (at the menu) will restore the cloud save cleanly.
        if (window.TDS_BUSY && window.TDS_BUSY()) return;
        localStorage.setItem(SAVE, cloud);
        lastPushed = cloud;
        if (!sessionStorage.getItem('tds_cloud_reload')) {   // reload once so Meta.load() reads it
          sessionStorage.setItem('tds_cloud_reload', '1');
          location.reload();
        }
      } else {
        lastPushed = null;
        push(true);                                          // ours is same-or-newer → upload it
      }
    }).catch(function () {});
  }

  function start(user) {
    if (!user || uid) return;                                // run once
    uid = api.uid = user.uid;
    api.on = true;
    api.backend = backend.name;
    if (window.TDSAnalytics && TDSAnalytics.setUserId) TDSAnalytics.setUserId(uid);
    pull().then(function () { setInterval(function () { push(false); }, PUSH_EVERY_MS); });
  }

  try {
    backend.onUser(function (u) { if (u) start(u); });
    Promise.resolve(backend.signIn()).then(function (u) { if (u) start(u); }).catch(function () {});
    document.addEventListener('visibilitychange', function () { if (document.hidden) push(false); });
    window.addEventListener('pagehide', function () { push(false); });
  } catch (e) { /* stay local-only */ }
})();
