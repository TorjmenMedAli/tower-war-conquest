/* leaderboard.js — global ALL-TIME + MONTHLY-CONTEST leaderboards via Firestore.
   Two backends, one identity model (mirrors cloud.js):
   • NATIVE (Android/iOS, @capacitor-firebase/firestore installed): queries go through the
     native plugin, identity = the native anonymous-auth uid (TDSCloud.uid — the SAME identity
     as the cloud save, so "me" highlighting and reward claims match the save).
   • WEB: the Firebase JS SDK from firebase.js, identity = the web anonymous-auth uid.
   100% defensive: no backend → api.ready stays false and the 🏆 button stays hidden.

   DATA MODEL
   • leaderboard/{uid}                = { uid, name, score, platform, updated }   best single run (monotonic)
   • monthly/{YYYY-MM}/scores/{uid}   = { uid, name, total, month, platform, updated }
     `total` = SUM of every run's score that month. Top 3 of a finished month win 1000 gems,
     ranks 4-10 win 300 (granted client-side in game.js → checkMonthReward on the next launch).

   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  FIRESTORE RULES (add next to saves/{uid}):                                  │
   │    match /leaderboard/{uid} {                                                │
   │      allow read: if request.auth != null;                                    │
   │      allow write: if request.auth != null && request.auth.uid == uid         │
   │                   && request.resource.data.score is int                      │
   │                   && request.resource.data.score >= 0                        │
   │                   && request.resource.data.score <= 100000000;               │
   │    }                                                                         │
   │    match /monthly/{month}/scores/{uid} {                                     │
   │      allow read: if request.auth != null;                                    │
   │      allow write: if request.auth != null && request.auth.uid == uid         │
   │                   && request.resource.data.total is int                      │
   │                   && request.resource.data.total >= 0                        │
   │                   && request.resource.data.total <= 1000000000;              │
   │    }                                                                         │
   │    match /weekly/{week}/scores/{uid} {   // same rule as monthly             │
   │      allow read: if request.auth != null;                                    │
   │      allow write: if request.auth != null && request.auth.uid == uid         │
   │                   && request.resource.data.total is int                      │
   │                   && request.resource.data.total >= 0                        │
   │                   && request.resource.data.total <= 1000000000;              │
   │    }                                                                         │
   └──────────────────────────────────────────────────────────────────────────────┘ */
(function () {
  'use strict';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  function prevMonthKey() { var d = new Date(); return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function weekKey(d) {                                    // ISO week, e.g. "2026-W29"
    d = d ? new Date(d) : new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dn = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dn);                 // shift to the Thursday of this week
    var y = t.getUTCFullYear();
    var w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return y + '-W' + pad2(w);
  }
  function prevWeekKey() { return weekKey(Date.now() - 7 * 86400000); }

  var api = window.TDSLeaderboard = {
    ready: false,
    uid: function () { return null; },
    monthKey: monthKey,
    prevMonthKey: prevMonthKey,
    weekKey: weekKey,
    prevWeekKey: prevWeekKey,
    submit: function () { return Promise.resolve(); },
    top: function () { return Promise.resolve([]); },
    submitMonthly: function () { return Promise.resolve(); },
    submitWeekly: function () { return Promise.resolve(); },
    // top*: resolve null on FAILURE and [] on a genuinely empty board — callers granting
    // rewards must treat null as "retry later", never as "nobody played".
    topMonthly: function () { return Promise.resolve(null); },
    topWeekly: function () { return Promise.resolve(null); },
  };

  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var FStore = cap && cap.Plugins && cap.Plugins.FirebaseFirestore;

  // ── backend: set(path, data) + top(collectionPath, field, n) ────────────────────
  var backend = null;
  if (native && FStore) {
    backend = {
      set: function (path, data) { return FStore.setDocument({ reference: path, data: data, merge: true }); },
      top: function (path, field, n) {
        return FStore.getCollection({
          reference: path,
          queryConstraints: [
            { type: 'orderBy', fieldPath: field, directionStr: 'desc' },
            { type: 'limit', limit: n },
          ],
        }).then(function (r) {
          return (r && r.snapshots ? r.snapshots : []).map(function (s) { return s.data; });
        });
      },
    };
  } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && firebase.firestore) {
    var db;
    try { db = firebase.firestore(); } catch (e) { db = null; }
    if (db) backend = {
      set: function (path, data) {
        var p = path.split('/'), ref = db.collection(p[0]).doc(p[1]);
        for (var i = 2; i < p.length; i += 2) ref = ref.collection(p[i]).doc(p[i + 1]);
        return ref.set(data, { merge: true });
      },
      top: function (path, field, n) {
        var p = path.split('/'), col = db.collection(p[0]);
        for (var i = 1; i < p.length; i += 2) col = col.doc(p[i]).collection(p[i + 1]);
        return col.orderBy(field, 'desc').limit(n).get()
          .then(function (snap) { var out = []; snap.forEach(function (d) { out.push(d.data()); }); return out; });
      },
    };
  }
  if (!backend) return;

  function uid() {
    if (window.TDSCloud && TDSCloud.uid) return TDSCloud.uid;
    try { return firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch (e) { return null; }
  }
  api.uid = uid;
  api.ready = true;

  var platform = (cap && cap.getPlatform && cap.getPlatform()) || 'web';

  // ── ALL-TIME: one row per player, score = best single run (monotonic → merge-set safe) ──
  api.submit = function (name, score) {
    var id = uid();
    if (!id || !(score > 0)) return Promise.resolve();
    return Promise.resolve(backend.set('leaderboard/' + id, {
      uid: id,
      name: String(name || 'Player').slice(0, 16),
      score: Math.round(score),
      platform: platform,
      updated: Date.now(),
    })).catch(function () {});
  };
  api.top = function (n) {
    return Promise.resolve(backend.top('leaderboard', 'score', n || 100)).catch(function () { return []; });
  };

  // ── MONTHLY CONTEST: one row per player per month, total = sum of run scores (monotonic) ──
  api.submitMonthly = function (name, total, month) {
    var id = uid(), m = month || monthKey();
    if (!id || !(total > 0)) return Promise.resolve();
    return Promise.resolve(backend.set('monthly/' + m + '/scores/' + id, {
      uid: id,
      name: String(name || 'Player').slice(0, 16),
      total: Math.round(total),
      month: m,
      platform: platform,
      updated: Date.now(),
    })).catch(function () {});
  };
  api.topMonthly = function (month, n) {
    return Promise.resolve(backend.top('monthly/' + (month || monthKey()) + '/scores', 'total', n || 100))
      .catch(function () { return null; });
  };

  // ── WEEKLY CONTEST: same shape as monthly at weekly/{YYYY-Www}/scores/{uid} ──
  api.submitWeekly = function (name, total, week) {
    var id = uid(), w = week || weekKey();
    if (!id || !(total > 0)) return Promise.resolve();
    return Promise.resolve(backend.set('weekly/' + w + '/scores/' + id, {
      uid: id,
      name: String(name || 'Player').slice(0, 16),
      total: Math.round(total),
      week: w,
      platform: platform,
      updated: Date.now(),
    })).catch(function () {});
  };
  api.topWeekly = function (week, n) {
    return Promise.resolve(backend.top('weekly/' + (week || weekKey()) + '/scores', 'total', n || 100))
      .catch(function () { return null; });
  };
})();
