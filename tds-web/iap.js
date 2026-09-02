/* iap.js — In-app purchases via CdvPurchase (cordova-plugin-purchase).
   ANDROID: real Google Play Billing. WEB build: simulates the grant so the shop stays testable.
   100% defensive: until the plugin is installed AND product IDs are filled in (game.js IAP catalog),
   it stays dormant — on native an unconfigured purchase simply does nothing (never grants for free).

   The GRANT LOGIC lives in game.js (it owns Meta); this file only drives the store and calls back
   via the onGrant callback passed to configure(). To activate:
     1) cd tds-android && npm i cordova-plugin-purchase && npx cap sync   (done)
     2) create the products in Play Console, then paste their IDs into the IAP catalog in game.js. */
(function () {
  'use strict';

  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());

  var CATALOG = [], GRANT = null, priceMap = {}, store = null, booted = false;

  var api = window.TDSIAP = {
    ready: false,
    native: native,
    configure: function (catalog, onGrant) { CATALOG = catalog || []; GRANT = onGrant; boot(); },
    price: function (id) { return priceMap[id] || null; },
    priceInfo: function (id) { return infoMap[id] || null; },     // { price, value, currency } for GA4 purchase
    buy: function (idOrKey) { return doBuy(idOrKey); },
    restore: function () { try { return (native && store) ? store.restorePurchases() : Promise.resolve(); } catch (e) { return Promise.resolve(); } },
  };

  var infoMap = {};
  // Errors arrive on the store's global channel, so attach the product/context we know about.
  function emitError(e) {
    try {
      var detail = { code: (e && e.code) | 0, message: String((e && e.message) || e || ''), productId: (e && e.productId) || lastOrdered };
      document.dispatchEvent(new CustomEvent('tds-iap-error', { detail: detail }));
    } catch (err) {}
  }
  function byId(id) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i]; return null; }
  function byKey(k) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].key === k) return CATALOG[i]; return null; }
  function configured(id) { return id && id.indexOf('PASTE') === -1; }
  function grant(pr, tx) { try { if (pr && GRANT) GRANT(pr, tx); } catch (e) {} }

  function boot() {
    if (!native || booted) return;                               // web: buy() simulates the grant
    var C = window.CdvPurchase;
    if (!C || !C.store) {                                        // cordova plugin not ready yet → wait for deviceready
      // Wait exactly ONCE. Capacitor replays 'deviceready' immediately to late listeners, so
      // re-subscribing every attempt spins an infinite microtask loop when the plugin simply
      // isn't installed (e.g. the iOS build ships without cordova-plugin-purchase).
      if (boot.waited) return;
      boot.waited = true;
      document.addEventListener('deviceready', boot, { once: true });
      return;
    }
    store = C.store;
    var isIOS = !!(cap && cap.getPlatform && cap.getPlatform() === 'ios');
    var PT = C.ProductType, PLAT = isIOS ? C.Platform.APPLE_APPSTORE : C.Platform.GOOGLE_PLAY, any = false;
    CATALOG.forEach(function (pr) {
      if (!configured(pr.id)) return; any = true;
      store.register([{ id: pr.id, type: pr.type === 'non-consumable' ? PT.NON_CONSUMABLE : PT.CONSUMABLE, platform: PLAT }]);
    });
    if (!any) return;                                            // no product IDs filled in yet → stay dormant
    booted = true;
    store.when()
      .productUpdated(function (p) {
        if (!p || !p.pricing) return;
        priceMap[p.id] = p.pricing.price;
        // priceMicros + currency are what GA4's `purchase` event needs for real revenue/LTV.
        infoMap[p.id] = { price: p.pricing.price, value: (p.pricing.priceMicros || 0) / 1000000, currency: p.pricing.currency || '' };
      })
      .approved(function (t) { (t.products || []).forEach(function (p) { grant(byId(p.id), t); }); t.finish(); });
    // Purchase errors were never surfaced: a declined card, a cancelled sheet and a wrong product id
    // all looked the same (invisible). Re-broadcast them so game.js can log one event per class.
    if (store.error) store.error(emitError);
    store.initialize([PLAT]).then(function () {
      api.ready = true;
      // restore owned non-consumables (e.g. No-Ads) on every launch
      CATALOG.forEach(function (pr) {
        if (pr.type === 'non-consumable' && configured(pr.id)) { var prod = store.get(pr.id); if (prod && prod.owned) grant(pr); }
      });
      document.dispatchEvent(new Event('tds-iap-ready'));
    }).catch(function () {});
  }

  var lastOrdered = '';
  function doBuy(idOrKey) {
    var pr = byId(idOrKey) || byKey(idOrKey);
    if (!pr) return Promise.resolve(false);
    lastOrdered = pr.id;
    if (!native) { grant(pr); return Promise.resolve('dev'); }   // browser build: simulate the grant for testing
    if (!api.ready || !store) return Promise.reject('iap-unavailable');
    try {
      var prod = store.get(pr.id), offer = prod && prod.getOffer();
      if (!offer) return Promise.reject('no-offer');
      return store.order(offer);                                 // grant fires in the approved handler above
    } catch (e) { return Promise.reject(e); }
  }
})();
