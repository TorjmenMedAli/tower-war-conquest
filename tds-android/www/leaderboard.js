/* leaderboard.js — global high-score leaderboard via Firestore (works in the Android WebView + web).
   Reuses the same Firebase app + anonymous auth as cloud.js (identity = TDSCloud.uid). One doc per
   player at leaderboard/{uid} = { uid, name, score, updated }. 100% defensive: until Firebase is
   configured (firebase.js) it no-ops and the 🏆 button stays hidden.

   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  FIRESTORE RULES (add to the same rules as saves/{uid}):                       │
   │    match /leaderboard/{uid} {                                                   │
   │      allow read: if request.auth != null;                    // anyone signed-in reads the board
   │      allow write: if request.auth != null                                       │
   │                   && request.auth.uid == uid                 // only your own row │
   │                   && request.resource.data.score is int                          │
   │                   && request.resource.data.score >= 0                            │
   │                   && request.resource.data.score <= 100000000;  // sanity cap (anti-cheat)│
   │    }                                                                            │
   │  INDEX: Firestore auto-prompts for a single-field DESC index on `score` the     │
   │  first time top() runs — click the link it logs, or create it under Indexes.    │
   └──────────────────────────────────────────────────────────────────────────────┘ */
(function () {
  'use strict';

  var api = window.TDSLeaderboard = {
    ready: false,
    submit: function () { return Promise.resolve(); },
    top: function () { return Promise.resolve([]); },
  };

  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length || !firebase.firestore) return;

  var db;
  try { db = firebase.firestore(); } catch (e) { return; }

  function uid() {
    if (window.TDSCloud && TDSCloud.uid) return TDSCloud.uid;
    try { return firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch (e) { return null; }
  }

  api.ready = true;

  // Write/refresh this player's row. `score` should be the player's BEST score (monotonic), so a
  // plain merge-set is safe — it never lowers a stored score in practice.
  api.submit = function (name, score) {
    var id = uid();
    if (!id || !(score > 0)) return Promise.resolve();
    return db.collection('leaderboard').doc(id).set({
      uid: id,
      name: String(name || 'Player').slice(0, 16),
      score: Math.round(score),
      platform: (window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform()) || 'web',
      updated: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(function () {});
  };

  // Top N rows, highest first: [{ uid, name, score }, ...]
  api.top = function (n) {
    return db.collection('leaderboard').orderBy('score', 'desc').limit(n || 100).get()
      .then(function (snap) { var out = []; snap.forEach(function (d) { out.push(d.data()); }); return out; })
      .catch(function () { return []; });
  };
})();
