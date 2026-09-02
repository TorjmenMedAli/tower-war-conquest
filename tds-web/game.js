/* ============================================================================================
   TOWER WAR: TACTICAL CONQUEST — web build
   Swipe-to-conquer tower strategy: every tower breeds troops, swipe from yours to any other to
   send them, capture the map. Campaign = 5 regions × 20 levels, plus Special Ops and PvP.
   One file: config → Meta (save) → analytics → battle engine → rendering → screens → boot.
   ============================================================================================ */
(() => {
'use strict';
const SAVE = 'tds_save_web';

/* ---------------- CAMPAIGN ---------------- */
const REGION_SIZE = 20;
const REGIONS = [
  { id: 1, name: 'GREEN VALLEY',  ground: '#6fbf5a', ground2: '#5aa848', road: '#c9b07a', water: '#3f8fd6', emoji: '🌲' },
  { id: 2, name: 'DUSTY DESERT',  ground: '#e0c27a', ground2: '#cfae62', road: '#b28b4a', water: '#3f8fd6', emoji: '🏜️' },
  { id: 3, name: 'FROZEN FRONT',  ground: '#d9e8f2', ground2: '#c1d6e6', road: '#8fa5b8', water: '#5aa9e6', emoji: '❄️' },
  { id: 4, name: 'VOLCANIC RIDGE',ground: '#7a5a4a', ground2: '#63473a', road: '#3a2a22', water: '#ff6a2a', emoji: '🌋' },
  { id: 5, name: 'STEEL CITY',    ground: '#8a94a3', ground2: '#727c8b', road: '#3d4652', water: '#2f6fb0', emoji: '🏙️' },
];
const LEVEL_COUNT = REGIONS.length * REGION_SIZE;
const regionOf = L => REGIONS[Math.min(REGIONS.length - 1, Math.floor((L - 1) / REGION_SIZE))];
const levelInRegion = L => ((L - 1) % REGION_SIZE) + 1;
// The level at which each mechanic first appears — also drives the one-time intro card.
const UNLOCK_AT = { factory: 4, blockade: 7, sniper: 11, mine: 15, river: 19, rocket: 26, twoEnemies: 9, threeEnemies: 33, fort: 41 };
const INTRO = {
  1:  { name: 'CONQUER THE MAP', emoji: '🏰', text: 'Swipe from your blue tower to any other tower to send troops. Capture every enemy tower to win. Troops that arrive at your own towers level them up.' },
  4:  { name: 'TANK FACTORY', emoji: '🛡️', text: 'Factories build tanks. Every tank is worth 2 soldiers — great for cracking a tough tower.' },
  7:  { name: 'BLOCKADES', emoji: '🪵', text: 'Wooden walls block the road. Your troops chop through them — but it costs time and troops.' },
  9:  { name: 'TWO ENEMIES', emoji: '⚔️', text: 'Two armies fight over this map. Let them bleed each other, then strike.' },
  11: { name: 'SNIPER TOWER', emoji: '🎯', text: 'Sniper towers do not breed troops — they shoot at anything walking in range. Capture them to turn their guns around.' },
  15: { name: 'LAND MINES', emoji: '💥', text: 'Mines destroy the first troop that steps on them. Route around them, or sacrifice a soldier to clear the way.' },
  19: { name: 'RIVERS', emoji: '🌊', text: 'Troops must build a bridge before crossing water. The first few soldiers on a route become the bridge.' },
  26: { name: 'ROCKET LAUNCHER', emoji: '🚀', text: 'Rocket towers lock on a single target and blast the troops around it.' },
  33: { name: 'THREE ENEMIES', emoji: '☠️', text: 'Three rival armies. Only the smartest commander survives.' },
  41: { name: 'FORT', emoji: '🏯', text: 'Forts are huge — reinforcements parachute in twice as fast and they hold up to 99 troops.' },
};

/* ---------------- TROOPS ----------------
   Two slots in battle: ONE soldier type + ONE tank type. Rarity raises base strength; levels add 8%
   each. From Lv 15 an upgrade also needs a spare COPY (from summons). */
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const RARITY_COL = { Common: '#7d8a99', Uncommon: '#5cc46a', Rare: '#3E97D6', Epic: '#9B5DE0', Legendary: '#F4B731' };
const RARITY_MULT = { Common: 1.0, Uncommon: 1.15, Rare: 1.32, Epic: 1.55, Legendary: 1.85 };
const SUMMON_W = { Common: 46, Uncommon: 28, Rare: 16, Epic: 8, Legendary: 2 };
const TROOPS = [
  { id: 'recruit',  kind: 'soldier', name: 'Recruit',     rarity: 'Common',    tier: 0, spd: 1.00, accent: '#c9d2dd', desc: 'Basic infantry. Cheap, loyal, everywhere.' },
  { id: 'marine',   kind: 'soldier', name: 'Marine',      rarity: 'Uncommon',  tier: 1, spd: 1.03, accent: '#8fe388', desc: 'Armoured vest — takes a punch.' },
  { id: 'ranger',   kind: 'soldier', name: 'Ranger',      rarity: 'Rare',      tier: 2, spd: 1.10, accent: '#7fd6ff', desc: 'Fast movers. First to the tower.' },
  { id: 'commando', kind: 'soldier', name: 'Commando',    rarity: 'Epic',      tier: 3, spd: 1.06, accent: '#d9a6ff', desc: 'Elite strike troops with heavy rifles.' },
  { id: 'warlord',  kind: 'soldier', name: 'Warlord',     rarity: 'Legendary', tier: 4, spd: 1.12, accent: '#ffd24a', desc: 'A living legend. Towers tremble.' },
  { id: 'scout',    kind: 'tank',    name: 'Scout Tank',  rarity: 'Common',    tier: 0, spd: 0.80, accent: '#c9d2dd', desc: 'Light tank. Worth 2 soldiers.' },
  { id: 'panzer',   kind: 'tank',    name: 'Panzer',      rarity: 'Uncommon',  tier: 1, spd: 0.80, accent: '#8fe388', desc: 'Thicker plates, same bite.' },
  { id: 'striker',  kind: 'tank',    name: 'Striker',     rarity: 'Rare',      tier: 2, spd: 0.86, accent: '#7fd6ff', desc: 'Faster tracks and a longer gun.' },
  { id: 'titan',    kind: 'tank',    name: 'Titan',       rarity: 'Epic',      tier: 3, spd: 0.82, accent: '#d9a6ff', desc: 'Twin cannons. Walls mean nothing.' },
  { id: 'dread',    kind: 'tank',    name: 'Dreadnought', rarity: 'Legendary', tier: 4, spd: 0.84, accent: '#ffd24a', desc: 'The end of the argument.' },
];
const troopById = id => TROOPS.find(t => t.id === id);
const TROOP_MAX = 30, COPY_FROM = 15, SUMMON_COST = 25;
const troopCost = lv => Math.round(80 * Math.pow(1.30, lv - 1) / 5) * 5;          // gold, lv → lv+1
const troopNeedsCopy = lv => lv >= COPY_FROM;                                       // Lv15+ upgrades consume 1 copy
const troopMult = t => { const s = Meta.troops[t.id] || { lv: 1 }; return RARITY_MULT[t.rarity] * (1 + 0.08 * ((s.lv || 1) - 1)); };

/* ---------------- ECONOMY ---------------- */
// gold for clearing level L (first clear); replays pay 40%. ×3 with the victory ad.
const levelGold = L => Math.round((90 + 22 * L + 0.6 * L * L) / 5) * 5;
const levelCoinMul = L => 1 + 0.25 * ((L || 1) - 1);           // scales the daily/ad faucets with progress
const REPLAY_MULT = 0.4;
const PT_MAX = 10, PT_REGEN_MS = 5 * 60 * 1000;                 // battle tickets (entry)
const BOMB_GEMS = 15;                                           // one Air Strike (gems)
const LP_WIN = 30, LP_LOSE = 15;
const LEAGUES = [ { n: 'Bronze', at: 0, c: '#c9873a' }, { n: 'Silver', at: 200, c: '#b9c2d0' }, { n: 'Gold', at: 500, c: '#ffd24a' }, { n: 'Platinum', at: 900, c: '#7fd6ff' }, { n: 'Diamond', at: 1400, c: '#c44dff' }, { n: 'Champion', at: 2000, c: '#ff5a4d' } ];
const leagueOf = lp => { let l = LEAGUES[0]; for (const L of LEAGUES) if (lp >= L.at) l = L; return l; };
// commander XP → level (menu avatar chip)
const xpForLevel = n => 100 + (n - 1) * 60;
function playerLevel(){ let xp = Meta.xp | 0, n = 1; while (xp >= xpForLevel(n) && n < 99){ xp -= xpForLevel(n); n++; } return { n, xp, need: xpForLevel(n) }; }

/* ---------------- DAILY QUESTS ---------------- */
const MISSION_POOL = [
  { id: 'play3',   icon: '⚔️', text: 'Play 3 battles',          type: 'play',    target: 3,  gems: 4 },
  { id: 'win2',    icon: '🏆', text: 'Win 2 battles',           type: 'win',     target: 2,  gems: 5 },
  { id: 'cap10',   icon: '🏰', text: 'Capture 10 towers',       type: 'capture', target: 10, gems: 5 },
  { id: 'kill60',  icon: '💀', text: 'Destroy 60 enemy troops', type: 'kill',    target: 60, gems: 5 },
  { id: 'send150', icon: '🪖', text: 'Send 150 troops',         type: 'send',    target: 150,gems: 4 },
  { id: 'pvp1',    icon: '🥇', text: 'Win a PvP battle',        type: 'pvpwin',  target: 1,  gems: 6 },
  { id: 'upg2',    icon: '⬆️', text: 'Upgrade a troop twice',   type: 'upgrade', target: 2,  gems: 4 },
];
const MISSIONS_PER_DAY = 3;
const DAY_MS = 86400000;
const dayNum = () => Math.floor(Date.now() / DAY_MS);
function dailyMissions(day){
  let s = (day * 2654435761) >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pool = MISSION_POOL.slice(), out = [];
  while (out.length < MISSIONS_PER_DAY && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
function currentMissions(){ return dailyMissions(dayNum()); }
function missionsToday(){
  const d = dayNum();
  if (!Meta.missions || Meta.missions.day !== d){ Meta.missions = { day: d, prog: [0, 0, 0], claimed: [false, false, false] }; Meta.save(); }
  return Meta.missions;
}
function missionEvent(type, n){
  const m = missionsToday(), list = currentMissions(); let ch = false;
  list.forEach((ms, i) => { if (ms.type === type && !m.claimed[i]){ m.prog[i] = Math.min(ms.target, (m.prog[i] | 0) + (n || 1)); ch = true; } });
  if (ch){ Meta.save(); refreshMissionDot(); }
}
function missionClaimable(){ const m = missionsToday(), list = currentMissions(); return list.some((ms, i) => (m.prog[i] | 0) >= ms.target && !m.claimed[i]); }

const SFX = window.Sfx || { play(){}, setEnabled(){}, enabled: false };
const kfmt = n => n >= 1000000 ? (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm' : n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n | 0);

/* ---------------- META (persistent) ---------------- */
const Meta = {
  coins: 200, gems: 30, level: 1, unlocked: 1, games: 0, wins: 0, xp: 0,
  cleared: {},                                           // level → 1 (campaign clears)
  troops: { recruit: { lv: 1, n: 0 }, scout: { lv: 1, n: 0 } },   // id → { lv, n: spare copies }
  soldier: 'recruit', tank: 'scout',                    // equipped
  bombs: 2,                                              // Air Strike consumables
  lp: 0, pvpWins: 0, pvpLosses: 0, pvpSeed: 0,           // PvP league
  ops: {},                                               // special-ops id → 1 (done)
  introSeen: {},                                         // intro cards shown (level → 1)
  sound: true, ftue: 0, starter: false, rel: 0,
  pticket: PT_MAX, pticketAt: 0,
  noAds: false, boostUntil: 0, tickets: 0, rated: false, ratePicked: false,
  bestScore: 0, name: '', monthScore: null, monthClaimed: '', weekScore: null, weekClaimed: '',
  killsTotal: 0, capturesTotal: 0, adsRew: 0, adsInt: 0, upgrades: 0, iaps: 0,
  starterBought: false, starterSeen: false, sv: 0,
  dailyDay: 0, adDay: 0, adChestUsed: 0, adCoinUsed: 0, adGemUsed: 0,
  streak: 0, streakDay: 0, missions: null,
  load(){ try { const d = JSON.parse(localStorage.getItem(SAVE)); if (d && d.tw) Object.assign(Meta, d); else if (d) Meta._legacy = d; } catch(e){} },
  save(){ try { Meta.sv = (Meta.sv | 0) + 1; const o = { tw: 2 };
    for (const k of ['coins','gems','level','unlocked','games','wins','xp','cleared','troops','soldier','tank','bombs','lp','pvpWins','pvpLosses','pvpSeed','ops','introSeen',
      'sound','ftue','starter','rel','pticket','pticketAt','noAds','boostUntil','tickets','rated','ratePicked','bestScore','name','monthScore','monthClaimed','weekScore','weekClaimed',
      'killsTotal','capturesTotal','adsRew','adsInt','upgrades','iaps','starterBought','starterSeen','sv','dailyDay','adDay','adChestUsed','adCoinUsed','adGemUsed','streak','streakDay','missions']) o[k] = Meta[k];
    localStorage.setItem(SAVE, JSON.stringify(o)); } catch(e){} },
};

/* ---------------- ANALYTICS (Firebase) ---------------- */
function trk(name, p){ try { if (window.TDSAnalytics) TDSAnalytics.log(name, p || {}); } catch (e) {} }
function trkSpend(cur, amount, item){ trk('spend_virtual_currency', { virtual_currency_name: cur, value: Math.round(amount) || 0, item_name: String(item || '').slice(0, 90) }); }
function trkEarn(cur, amount, src){ trk('earn_virtual_currency', { virtual_currency_name: cur, value: Math.round(amount) || 0, source: String(src || '').slice(0, 90) }); }
function trkUpgrade(kind, id, lvl, cost, pay){
  Meta.upgrades = (Meta.upgrades | 0) + 1; try { Meta.save(); } catch (e) {}
  trk('upgrade', { kind: kind, item_id: String(id), level: lvl | 0, cost: Math.round(cost) || 0, pay: pay || 'coins' });
  if (cost > 0 && (pay === 'coins' || pay === 'gems')) trkSpend(pay, cost, kind + ':' + id);
}
let _pw = null;
function trkPaywallOpen(place){ if (_pw && _pw.place === place) return; trkPaywallClose(); _pw = { place: place, t0: Date.now(), buy: 0 }; trk('paywall_view', { place: place, coins: Meta.coins | 0, gems: Meta.gems | 0 }); }
function trkPaywallClose(){ if (!_pw) return; const p = _pw; _pw = null; trk('paywall_dismiss', { place: p.place, dwell_ms: Math.min(600000, Date.now() - p.t0), clicked_buy: p.buy }); }
function trkAdClick(place, outcome){ trk('ad_click', { place: place || 'unknown', outcome: outcome || 'started' }); }
function trkNoFunds(item, cost, cur){
  const have = cur === 'gems' ? (Meta.gems | 0) : (Meta.coins | 0);
  trk('insufficient_funds', { item_name: String(item).slice(0, 90), currency: cur, cost: Math.round(cost) || 0, balance: have, shortfall: Math.max(0, Math.round(cost) - have) });
}
const IAP_ERR = {
  6777006: 'purchase_cancelled',
  6777014: 'purchase_network_error', 6777025: 'purchase_network_error', 6777018: 'purchase_network_error',
  6777001: 'purchase_store_error', 6777002: 'purchase_store_error', 6777003: 'purchase_store_error', 6777013: 'purchase_store_error', 6777033: 'purchase_store_error', 6777005: 'purchase_store_error', 6777028: 'purchase_store_error',
  6777007: 'purchase_declined', 6777008: 'purchase_declined', 6777020: 'purchase_declined', 6777024: 'purchase_declined', 6777027: 'purchase_declined',
  6777012: 'purchase_product_error', 6777023: 'purchase_product_error', 6777029: 'purchase_product_error', 6777030: 'purchase_product_error', 6777032: 'purchase_product_error', 6777015: 'purchase_product_error',
  6777016: 'purchase_verify_error', 6777017: 'purchase_verify_error', 6777031: 'purchase_verify_error', 6777004: 'purchase_verify_error',
};
function trkPurchaseError(err, productId, place){
  let code = 0, msg = '';
  if (err && typeof err === 'object'){ code = err.code | 0; msg = String(err.message || ''); } else { msg = String(err || ''); }
  const name = IAP_ERR[code] || (/iap-unavailable|no-offer|not-ready/.test(msg) ? 'purchase_unavailable' : 'purchase_error');
  trk(name, { product_id: String(productId || ''), place: place || (_pw ? _pw.place : 'unknown'), code: code, message: msg.slice(0, 90) });
}
function bucket(n){ n = n | 0; return n === 0 ? '0' : n < 3 ? '1-2' : n < 6 ? '3-5' : n < 11 ? '6-10' : n < 26 ? '11-25' : n < 51 ? '26-50' : '50+'; }
function trkProfile(){
  const A = window.TDSAnalytics; if (!A || !A.setUserProp) return;
  A.setUserProp('level_reached', String(Meta.unlocked | 0)); A.setUserProp('games_played', bucket(Meta.games));
  A.setUserProp('ads_rewarded', bucket(Meta.adsRew)); A.setUserProp('ads_interstitial', bucket(Meta.adsInt));
  A.setUserProp('upgrades_done', bucket(Meta.upgrades)); A.setUserProp('spender', (Meta.iaps | 0) > 0 ? 'yes' : 'no');
  A.setUserProp('no_ads', Meta.noAds ? 'yes' : 'no'); A.setUserProp('troops_owned', String(Object.keys(Meta.troops || {}).length));
  A.setUserProp('best_score', bucket(Math.round((Meta.bestScore | 0) / 1000)));
}

Meta.load();
// migrate a pre-Tower-War save (Zombie Tower Defense): keep the wallet, ads/IAP flags and social
// identity; everything gameplay-related starts fresh.
if (Meta._legacy){
  const d = Meta._legacy; delete Meta._legacy;
  for (const k of ['coins','gems','sound','noAds','rated','ratePicked','name','adsRew','adsInt','iaps','starterBought','starterSeen','streak','streakDay','dailyDay','adDay','adChestUsed','adCoinUsed','adGemUsed','pticket','pticketAt','monthClaimed','weekClaimed']) if (d[k] != null) Meta[k] = d[k];
  Meta.coins = Math.max(200, Meta.coins | 0); Meta.gems = Math.max(30, Meta.gems | 0);
  Meta.save();
}
if (typeof Meta.troops !== 'object' || !Meta.troops) Meta.troops = {};
if (!Meta.troops.recruit) Meta.troops.recruit = { lv: 1, n: 0 };
if (!Meta.troops.scout) Meta.troops.scout = { lv: 1, n: 0 };
for (const id in Meta.troops){ if (!troopById(id)) delete Meta.troops[id]; else { const s = Meta.troops[id]; s.lv = Math.max(1, Math.min(TROOP_MAX, s.lv | 0)); s.n = Math.max(0, s.n | 0); } }
if (!Meta.troops[Meta.soldier] || troopById(Meta.soldier).kind !== 'soldier') Meta.soldier = 'recruit';
if (!Meta.troops[Meta.tank] || troopById(Meta.tank).kind !== 'tank') Meta.tank = 'scout';
for (const k of ['cleared','ops','introSeen']) if (typeof Meta[k] !== 'object' || !Meta[k]) Meta[k] = {};
Meta.unlocked = Math.max(1, Math.min(LEVEL_COUNT, Meta.unlocked | 0));
Meta.level = Math.max(1, Math.min(Meta.unlocked, Meta.level | 0));
Meta.bombs = Math.max(0, Meta.bombs | 0); Meta.lp = Math.max(0, Meta.lp | 0); Meta.xp = Math.max(0, Meta.xp | 0);
if (typeof Meta.pticket !== 'number' || isNaN(Meta.pticket)) Meta.pticket = PT_MAX;
Meta.pticket = Math.max(0, Math.min(PT_MAX, Meta.pticket | 0)); if (!Meta.pticketAt) Meta.pticketAt = Date.now();
Meta.sv = Meta.sv | 0;
SFX.setEnabled(Meta.sound !== false);

/* ---------------- DOM helpers ---------------- */
const $ = id => document.getElementById(id);
function bump(el){ if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
const screens = { menu: $('menu'), game: $('game'), shop: $('shop'), levels: $('levels'), troops: $('troops'), pvp: $('pvp'), missions: $('missions') };
let _runLive = false;
function trkLevelQuit(){
  if (!_runLive) return; _runLive = false;
  trk('level_quit', { level: state.level, mode: state.mode, progress_pct: Math.round(territory() * 100), games: Meta.games | 0 });
  trkProfile();
}
function show(name){
  if (name !== 'game' && state.screen === 'game') trkLevelQuit();
  if (name !== 'shop') trkPaywallClose();
  for (const k in screens) screens[k].classList.toggle('active', k === name);
  state.screen = name;
  try { if (window.AdBridge && AdBridge.banner) AdBridge.banner.set(name === 'game'); } catch (e) {}
  if (window.TDSAnalytics) TDSAnalytics.screen(name);
  if (name === 'menu') refreshMenu();
  if (name === 'shop') refreshShop();
  if (name === 'levels') refreshLevels();
  if (name === 'troops') refreshTroops();
  if (name === 'pvp') refreshPvp();
  if (name === 'missions') refreshOps();
}

/* ---------------- Canvas ---------------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize(){
  const app = $('app'); DPR = Math.min(2, window.devicePixelRatio || 1);
  W = app.clientWidth; H = app.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layoutMap();
}
window.addEventListener('resize', resize);

/* ============================================================================================
   BATTLE ENGINE
   Map space is 720 × 1000 "map units"; layoutMap() fits it under the HUD. Towers breed troops,
   routes stream them along straight roads, troops fight when they meet and add/subtract from
   the tower they reach. Level 0 → captured.
   ============================================================================================ */
const MW = 720, MH = 1000;
const MAP = { x: 0, y: 0, s: 1 };
function layoutMap(){
  const top = 96, bot = 118;                              // DOM HUD bands (px)
  const aw = W - 8, ah = Math.max(200, H - top - bot);
  MAP.s = Math.min(aw / MW, ah / MH);
  MAP.x = (W - MW * MAP.s) / 2; MAP.y = top + (ah - MH * MAP.s) / 2;
}
const toScr = (x, y) => ({ x: MAP.x + x * MAP.s, y: MAP.y + y * MAP.s });
const toMap = (px, py) => ({ x: (px - MAP.x) / MAP.s, y: (py - MAP.y) / MAP.s });

const OWNER_COL  = ['#9aa3ad', '#3b8bff', '#ff5252', '#ffb03b', '#b565ff'];
const OWNER_DARK = ['#6b7480', '#1f5fc4', '#c62828', '#c77d12', '#7a35c4'];
const OWNER_NAME = ['Neutral', 'You', 'Red', 'Yellow', 'Purple'];
const TOWER_R = { barracks: 34, factory: 36, sniper: 30, rocket: 32, fort: 58 };
const BREEDS = { barracks: true, factory: true, fort: true, sniper: false, rocket: false };
const TOWER_CAP = t => t.type === 'fort' ? 99 : 63;
const maxRoutes = lv => lv >= 20 ? 3 : lv >= 10 ? 2 : 1;
const REACH = 340, SEND_RATE = 2.4, UNIT_SPD = 150, BRIDGE_N = 5, WALL_HP = 8;

function mulberry(seed){ let a = (seed | 0) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---- level generation (deterministic per level, so a retry is the same puzzle) ---- */
function genLevel(L, opts){
  opts = opts || {};
  const rnd = mulberry(opts.seed != null ? opts.seed : (L * 7919 + 13));
  const pvp = !!opts.pvp;
  const n = pvp ? 8 + Math.floor(rnd() * 4) : Math.min(14, 5 + Math.floor((L - 1) / 5) + (L > 2 ? 1 : 0));
  let enemies = pvp ? 1 : 1 + (L >= UNLOCK_AT.twoEnemies && L % 3 !== 0 ? 1 : 0) + (L >= UNLOCK_AT.threeEnemies && L % 2 === 0 ? 1 : 0);
  enemies = Math.min(enemies, 3, n - 2);
  // river first, so towers avoid it
  const river = (!pvp && L >= UNLOCK_AT.river && L % 3 === 1) ? { y: 330 + rnd() * 340, h: 48 } : null;
  // sample towers until every tower can reach every other through REACH-length hops
  let pts = [];
  for (let attempt = 0; attempt < 60; attempt++){
    pts = []; let tries = 0;
    while (pts.length < n && tries++ < 600){
      const x = 72 + rnd() * (MW - 144), y = 90 + rnd() * (MH - 180);
      if (river && Math.abs(y - river.y) < river.h / 2 + 70) continue;
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) > 150)) pts.push({ x, y });
    }
    const seen = new Set([0]), q = [0];
    while (q.length){ const i = q.pop(); pts.forEach((p, j) => { if (!seen.has(j) && Math.hypot(p.x - pts[i].x, p.y - pts[i].y) <= REACH - 10){ seen.add(j); q.push(j); } }); }
    if (seen.size === pts.length && pts.length === n) break;
  }
  pts.sort((a, b) => b.y - a.y);                          // bottom → top
  const towers = pts.map((p, i) => ({ id: i, x: p.x, y: p.y, type: 'barracks', owner: 0, lv: 3 + Math.floor(rnd() * 12), gen: 0, send: 0, routes: [], cd: 0, flash: 0 }));
  // player: bottom-most (+ a second one from L3 on some levels)
  const pTowers = (L >= 3 && L % 4 === 3 && !pvp) ? 2 : 1;
  for (let i = 0; i < pTowers; i++){ towers[i].owner = 1; towers[i].lv = i === 0 ? 20 : 8; }
  // enemies: spread among the top-most towers
  const topIdx = towers.map(t => t.id).slice(-Math.max(enemies, 1) * 2);
  const baseLv = pvp ? 20 : Math.min(60, 12 + Math.round(L * 0.75));
  const picks = [];
  for (let e = 0; e < enemies; e++){
    let id; do { id = topIdx[Math.floor(rnd() * topIdx.length)]; } while (picks.includes(id) || towers[id].owner);
    picks.push(id); towers[id].owner = 2 + e; towers[id].lv = baseLv;
    if (L >= 30 && !pvp){ const extra = towers.filter(t => !t.owner && Math.hypot(t.x - towers[id].x, t.y - towers[id].y) < 260)[0]; if (extra){ extra.owner = 2 + e; extra.lv = Math.round(baseLv * 0.45); } }
  }
  // special tower types on non-player towers
  const free = () => towers.filter(t => t.owner !== 1 && t.type === 'barracks' && t.id !== 0);
  // non-breeding towers can't be hops on the road network — never let one cut the map in two
  const linked = () => { const br = towers.filter(t => BREEDS[t.type]); if (!br.length) return false; const seen = new Set([br[0].id]), q = [br[0]];
    while (q.length){ const a = q.pop(); for (const b of br) if (!seen.has(b.id) && Math.hypot(a.x - b.x, a.y - b.y) <= REACH - 10){ seen.add(b.id); q.push(b); } }
    return seen.size === br.length && towers.every(t => BREEDS[t.type] || br.some(b => Math.hypot(t.x - b.x, t.y - b.y) <= REACH - 10)); };
  const assign = (type, count) => { for (let k = 0; k < count; k++){ const f = free(); if (!f.length) return; const t = f[Math.floor(rnd() * f.length)]; const was = t.type; t.type = type;
    if (!BREEDS[type]){ if (!linked()){ t.type = was; continue; } t.lv = Math.min(t.lv, 12); } } };
  if (pvp || L >= UNLOCK_AT.factory) assign('factory', pvp ? 1 : 1 + Math.floor(L / 18));
  if (!pvp && L >= UNLOCK_AT.sniper) assign('sniper', 1 + Math.floor(L / 35));
  if (!pvp && L >= UNLOCK_AT.rocket) assign('rocket', 1 + Math.floor(L / 60));
  if (!pvp && L >= UNLOCK_AT.fort){ const e = towers.find(t => t.owner >= 2 && t.type === 'barracks'); if (e){ e.type = 'fort'; e.lv = Math.min(99, e.lv + 15); } }
  if (pvp && rnd() < 0.5) { const p = towers.find(t => t.owner === 1); const q = towers.find(t => t.owner === 2); if (p && q){ p.type = 'fort'; q.type = 'fort'; } }
  // obstacles
  const walls = [], mines = [];
  const pairs = [];
  for (const a of towers) for (const b of towers) if (a.id < b.id){ const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 150 && d < 320) pairs.push([a, b]); }
  const midOf = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (!pvp && L >= UNLOCK_AT.blockade){
    for (let k = 0; k < 1 + Math.floor(L / 22) && pairs.length; k++){ const p = pairs.splice(Math.floor(rnd() * pairs.length), 1)[0]; const m = midOf(p); if (!river || Math.abs(m.y - river.y) > 60) walls.push({ x: m.x, y: m.y, hp: WALL_HP, max: WALL_HP }); }
  }
  if (!pvp && L >= UNLOCK_AT.mine){
    let tries2 = 0;
    while (mines.length < 1 + Math.floor(L / 24) && tries2++ < 200){
      const x = 60 + rnd() * (MW - 120), y = 80 + rnd() * (MH - 160);
      if (towers.every(t => Math.hypot(t.x - x, t.y - y) > 95) && walls.every(w => Math.hypot(w.x - x, w.y - y) > 60) && (!river || Math.abs(y - river.y) > 50)) mines.push({ x, y, alive: true });
    }
  }
  // difficulty knobs
  const eStr = pvp ? (opts.botMult || 1) : 1 + 0.038 * (L - 1);
  const eRate = pvp ? 1 : Math.min(1.6, 0.85 + L * 0.008);
  const aiEvery = pvp ? 0.9 : Math.max(0.7, 2.8 - L * 0.03);
  const aiRisk = pvp ? 0.8 : Math.min(0.95, 0.55 + L * 0.006);   // how thin a margin the AI will attack on
  return { towers, walls, mines, river, gates: opts.gates ? genGates(rnd, towers, river) : [], enemies, eStr, eRate, aiEvery, aiRisk, region: regionOf(pvp ? Meta.unlocked : L) };
}
// Special Ops: multiplier gates sitting on the map — a troop walking through one is boosted/cut
function genGates(rnd, towers, river){
  const g = []; let tries = 0;
  const kinds = [['+2', p => p + 2], ['×2', p => p * 2], ['-1', p => p - 1], ['+3', p => p + 3], ['×3', p => p * 3]];
  while (g.length < 3 && tries++ < 200){
    const x = 80 + rnd() * (MW - 160), y = 120 + rnd() * (MH - 240);
    if (towers.every(t => Math.hypot(t.x - x, t.y - y) > 110) && (!river || Math.abs(y - river.y) > 60)){ const k = kinds[Math.floor(rnd() * kinds.length)]; g.push({ x, y, label: k[0], fn: k[1] }); }
  }
  return g;
}

/* ---- live run ---- */
const state = { screen: 'menu', t: 0, level: 1, mode: 'campaign', paused: false, over: false, won: false, speed: 1,
  towers: [], units: [], walls: [], mines: [], river: null, gates: [], bridges: {}, shots: [], fx: [], pops: [],
  drag: null, swipe: null, aim: false, time: 0, kills: 0, sent: 0, caps: 0, score: 0, boost: 1, ai: [], hint: '', hintT: 0 };
const strength = owner => owner === 1 ? state.pStr : owner === 0 ? 1 : state.eStr;
function playerStr(kind){ const t = troopById(kind === 'tank' ? Meta.tank : Meta.soldier); return troopMult(t) * (state.boost || 1); }
function territory(){
  let me = 0, foe = 0;
  for (const t of state.towers){ if (t.owner === 1) me += 1; else if (t.owner >= 2) foe += 1; }
  return (me + foe) ? me / (me + foe) : 0;
}
function startRun(opts){
  opts = opts || {};
  const L = opts.level || Meta.level;
  const g = genLevel(L, opts.gen || {});
  Object.assign(state, { level: L, mode: opts.mode || 'campaign', op: opts.op || null, paused: false, over: false, won: false, speed: 1, t: 0, time: 0,
    towers: g.towers, walls: g.walls, mines: g.mines, river: g.river, gates: g.gates, bridges: {}, units: [], shots: [], fx: [], pops: [],
    drag: null, swipe: null, aim: false, kills: 0, sent: 0, caps: 0, score: 0, region: g.region, eStr: g.eStr, eRate: g.eRate,
    boost: 1, pRate: opts.rate || 1, genOpts: opts.gen || {}, pStrS: 1, pStrT: 1, enemies: g.enemies, ai: [], hint: '', hintT: 0, doubled: false, coinReward: 0, retryBoost: !!opts.boost, timer: opts.timer || 0 });
  state.pStrS = playerStr('soldier'); state.pStrT = playerStr('tank'); state.pStr = state.pStrS;
  for (let e = 0; e < g.enemies; e++) state.ai.push({ owner: 2 + e, t: 1.5 + e * 0.6 + Math.random(), every: g.aiEvery, risk: g.aiRisk });
  _runLive = true;
  $('hudLevel').textContent = state.mode === 'pvp' ? 'PVP' : state.mode === 'ops' ? (state.op ? state.op.name : 'SPECIAL OP') : 'LEVEL ' + L;
  refreshHud(); show('game');
  const fs = $('ftueSwipe'); if (fs) fs.style.display = (Meta.ftue & 2) ? 'none' : '';
  trk('level_start', { level: L, mode: state.mode, games: Meta.games | 0 });
}

/* ---- geometry ---- */
function segDist(px, py, ax, ay, bx, by){ const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t)); return { d: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)), t }; }
function segsCross(a, b, c, d){ const ccw = (p, q, r) => (r.y - p.y) * (q.x - p.x) > (q.y - p.y) * (r.x - p.x); return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d); }
const pairKey = (a, b) => a < b ? a + '_' + b : b + '_' + a;
function routeCrossesRiver(a, b){ const r = state.river; if (!r) return false; const lo = r.y - r.h / 2, hi = r.y + r.h / 2; return (a.y < lo && b.y > hi) || (a.y > hi && b.y < lo); }
function towerAt(mx, my, pad){ let best = null, bd = 1e9; for (const t of state.towers){ const d = Math.hypot(t.x - mx, t.y - my); if (d < TOWER_R[t.type] + (pad || 14) && d < bd){ bd = d; best = t; } } return best; }

/* ---- routes ---- */
function addRoute(from, to, silent){
  if (!from || !to || from === to || !BREEDS[from.type]) return false;
  if (from.routes.some(r => r.to === to.id)) return false;
  if (Math.hypot(from.x - to.x, from.y - to.y) > REACH){ if (!silent) hint('Too far — pick a closer tower'); return false; }
  if (from.routes.length >= maxRoutes(from.lv)){ if (!silent) hint(`Tower Lv ${from.lv < 10 ? 10 : 20} unlocks another route`); return false; }
  from.routes.push({ to: to.id, acc: 0 });
  if (from.owner === 1){ SFX.play('deploy'); if (!(Meta.ftue & 2)){ Meta.ftue |= 2; Meta.save(); const fs = $('ftueSwipe'); if (fs) fs.style.display = 'none'; } }
  return true;
}
function cutRoute(from, idx){ from.routes.splice(idx, 1); if (from.owner === 1) SFX.play('click'); }
function hint(txt){ state.hint = txt; state.hintT = 2.2; const h = $('hudHint'); if (h){ h.textContent = txt; h.classList.add('warn'); } }

/* ---- units ---- */
function spawnUnit(from, to){
  const tank = from.type === 'factory';
  const cost = tank ? 2 : 1;
  if (from.lv < cost) return false;
  from.lv -= cost;
  const own = from.owner;
  const kindId = own === 1 ? (tank ? Meta.tank : Meta.soldier) : null;
  const tr = kindId ? troopById(kindId) : null;
  const pw = cost * (own === 1 ? (tank ? state.pStrT : state.pStrS) : strength(own));
  const off = (Math.random() - 0.5) * 22;
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  state.units.push({ owner: own, tank, val: cost, pw, from: from.id, to: to.id, t: (TOWER_R[from.type] - 6) / len, len, off, spd: UNIT_SPD * (tr ? tr.spd : (tank ? 0.82 : 1)), x: from.x, y: from.y, dead: false, gated: {} });
  if (own === 1) state.sent++;
  return true;
}
function unitPos(u){ const a = state.towers[u.from], b = state.towers[u.to]; const dx = b.x - a.x, dy = b.y - a.y; const nx = -dy / (u.len || 1), ny = dx / (u.len || 1); return { x: a.x + dx * u.t + nx * u.off, y: a.y + dy * u.t + ny * u.off }; }
function boom(x, y, col, n, big){ for (let k = 0; k < (n || 8); k++){ const a = Math.random() * 6.283, v = (40 + Math.random() * 120) * (big ? 1.8 : 1); state.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.3, col: col || '#ffd24a', r: (big ? 6 : 3) + Math.random() * 3 }); } }
function pop(x, y, txt, col){ state.pops.push({ x, y, vy: -60, life: 0.8, txt, col: col || '#fff' }); }
function killUnit(u, byPlayer){ if (u.dead) return; u.dead = true; const p = unitPos(u); boom(p.x, p.y, OWNER_COL[u.owner], 5); if (byPlayer && u.owner !== 1){ state.kills++; state.score += u.tank ? 4 : 2; } }

/* ---- capture ---- */
function capture(t, by){
  const old = t.owner;
  t.owner = by; t.routes = []; t.flash = 0.6;
  boom(t.x, t.y, OWNER_COL[by], 18, true);
  if (by === 1){ state.caps++; state.score += 25; SFX.play('chest'); buzz('medium'); pop(t.x, t.y - 40, 'CAPTURED!', '#8fe388'); }
  else if (old === 1){ SFX.play('hurt'); buzz('heavy'); pop(t.x, t.y - 40, 'LOST!', '#ff8a78'); }
  else SFX.play('hit');
}

/* ---- update ---- */
function update(dt){
  const towers = state.towers;
  state.time += dt;
  if (state.hintT > 0){ state.hintT -= dt; if (state.hintT <= 0){ const h = $('hudHint'); if (h){ h.classList.remove('warn'); h.textContent = 'Swipe between towers · swipe across a line to cut it'; } } }
  // 1. breeding + sending + tower guns
  for (const t of towers){
    if (t.flash > 0) t.flash -= dt;
    if (t.cd > 0) t.cd -= dt;
    if (t.owner && BREEDS[t.type]){
      const rate = (t.type === 'fort' ? 2 : 1) * (t.owner === 1 ? (state.pRate || 1) : state.eRate);
      t.gen += rate * dt;
      while (t.gen >= 1){ t.gen -= 1; if (t.lv < TOWER_CAP(t)) t.lv += 1; }
      for (const r of t.routes){
        r.acc += SEND_RATE * dt;
        while (r.acc >= 1){ r.acc -= 1; if (!spawnUnit(t, towers[r.to])) { r.acc = 0; break; } }
      }
    }
    if (t.owner && t.type === 'sniper' && t.cd <= 0){
      const range = Math.min(280, 130 + t.lv * 4);
      let best = null, bd = 1e9;
      for (const u of state.units){ if (u.dead || u.owner === t.owner) continue; const p = unitPos(u); const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < range && d < bd){ bd = d; best = u; } }
      if (best){ const p = unitPos(best); best.pw -= 1.15 * strength(t.owner); state.shots.push({ x1: t.x, y1: t.y - 30, x2: p.x, y2: p.y, life: 0.12, col: OWNER_COL[t.owner] }); if (best.pw <= 0.05) killUnit(best, t.owner === 1); t.cd = 0.9; SFX.play('shoot'); }
      else t.cd = 0.2;
    }
    if (t.owner && t.type === 'rocket' && t.cd <= 0){
      let best = null, bd = 1e9;
      for (const u of state.units){ if (u.dead || u.owner === t.owner) continue; const p = unitPos(u); const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < 320 && d < bd){ bd = d; best = u; } }
      if (best){ const p = unitPos(best); state.shots.push({ rocket: true, x: t.x, y: t.y - 20, tx: p.x, ty: p.y, x1: t.x, y1: t.y, t: 0, dur: 0.55, owner: t.owner, col: OWNER_COL[t.owner] }); t.cd = 1.7; SFX.play('tank'); }
      else t.cd = 0.25;
    }
  }
  // 2. units move
  const river = state.river;
  for (const u of state.units){
    if (u.dead) continue;
    const a = towers[u.from], b = towers[u.to];
    const step = (u.spd * dt) / (u.len || 1);
    const before = unitPos(u);
    // walls on the road
    let blocked = false;
    for (const w of state.walls){ if (w.hp <= 0) continue; const sd = segDist(w.x, w.y, a.x, a.y, b.x, b.y); if (sd.d < 30 && u.t < sd.t && u.t + step >= sd.t - 0.01){ w.hp -= u.pw; boom(w.x, w.y, '#c9a062', 6); pop(w.x, w.y - 26, 'CHOP', '#ffd24a'); killUnit(u, false); blocked = true; if (w.hp <= 0){ boom(w.x, w.y, '#a8651f', 14, true); SFX.play('wagon'); } break; } }
    if (blocked) continue;
    // river → bridge building
    if (river && routeCrossesRiver(a, b)){
      const key = pairKey(u.from, u.to);
      const built = (state.bridges[key] | 0) >= BRIDGE_N;
      if (!built){
        const lo = river.y - river.h / 2, hi = river.y + river.h / 2;
        const bankY = a.y < river.y ? lo : hi;
        const tBank = (bankY - a.y) / (b.y - a.y);
        if (u.t + step >= tBank - 0.01){ state.bridges[key] = (state.bridges[key] | 0) + 1; pop(before.x, before.y - 20, 'BUILD ' + state.bridges[key] + '/' + BRIDGE_N, '#7fd6ff'); u.dead = true; if (state.bridges[key] >= BRIDGE_N) SFX.play('chest'); continue; }
      }
    }
    u.t += step;
    const p = unitPos(u); u.x = p.x; u.y = p.y;
    // mines
    for (const m of state.mines){ if (!m.alive) continue; if (Math.hypot(m.x - p.x, m.y - p.y) < 20){ m.alive = false; boom(m.x, m.y, '#ff7a45', 22, true); SFX.play('strike'); buzz('heavy'); for (const v of state.units){ if (v.dead) continue; const q = unitPos(v); if (Math.hypot(q.x - m.x, q.y - m.y) < 55) killUnit(v, v.owner !== 1); } break; } }
    if (u.dead) continue;
    // gates (special ops)
    for (let gi = 0; gi < state.gates.length; gi++){ const g = state.gates[gi]; if (u.gated[gi]) continue; if (Math.hypot(g.x - p.x, g.y - p.y) < 30){ u.gated[gi] = 1; const np = Math.max(0, g.fn(u.pw)); pop(g.x, g.y - 30, g.label, '#ffd24a'); if (np <= 0){ killUnit(u, false); } else u.pw = np; } }
    if (u.dead) continue;
    // arrival
    if (u.t >= 1 - (TOWER_R[b.type] - 8) / (u.len || 1)){
      u.dead = true;
      if (b.owner === u.owner){ b.lv = Math.min(TOWER_CAP(b), b.lv + u.val); }
      else {
        const dmg = u.pw / strength(b.owner);
        b.lv -= dmg; b.flash = 0.15;
        if (u.owner === 1) state.score += 1;
        if (b.lv < 0){ const left = -b.lv * strength(b.owner) / strength(u.owner); b.lv = Math.min(TOWER_CAP(b), left); capture(b, u.owner); }
      }
    }
  }
  // 3. melee: opposing troops on the field
  const live = state.units.filter(u => !u.dead);
  for (let i = 0; i < live.length; i++){
    const u = live[i]; if (u.dead) continue;
    for (let j = i + 1; j < live.length; j++){
      const v = live[j]; if (v.dead || v.owner === u.owner) continue;
      if (Math.abs(u.x - v.x) > 16 || Math.abs(u.y - v.y) > 16) continue;
      const m = Math.min(u.pw, v.pw); u.pw -= m; v.pw -= m;
      state.fx.push({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2, vx: 0, vy: -30, life: 0.2, col: '#fff', r: 5 });
      if (u.pw <= 0.05) killUnit(u, v.owner === 1);
      if (v.pw <= 0.05) killUnit(v, u.owner === 1);
      if (u.dead) break;
    }
  }
  // 4. shots / fx
  for (const s of state.shots){
    if (s.rocket){ s.t += dt / s.dur; s.x = s.x1 + (s.tx - s.x1) * s.t; s.y = s.y1 + (s.ty - s.y1) * s.t - Math.sin(s.t * Math.PI) * 60;
      if (s.t >= 1){ s.life = 0; boom(s.tx, s.ty, '#ff7a45', 16, true); for (const v of state.units){ if (v.dead || v.owner === s.owner) continue; if (Math.hypot(v.x - s.tx, v.y - s.ty) < 48){ v.pw -= 2.2 * strength(s.owner); if (v.pw <= 0.05) killUnit(v, s.owner === 1); } } } }
    else s.life -= dt;
  }
  state.shots = state.shots.filter(s => s.rocket ? s.t < 1 : s.life > 0);
  for (const f of state.fx){ f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; f.life -= dt; }
  state.fx = state.fx.filter(f => f.life > 0);
  for (const p of state.pops){ p.y += p.vy * dt; p.life -= dt; }
  state.pops = state.pops.filter(p => p.life > 0);
  if (state.units.length > 400 || state.units.filter(u => u.dead).length > 60) state.units = state.units.filter(u => !u.dead);
  // 5. AI
  for (const ai of state.ai){ ai.t -= dt; if (ai.t <= 0){ ai.t = ai.every * (0.7 + Math.random() * 0.6); aiThink(ai); } }
  // 6. end conditions
  const pT = towers.some(t => t.owner === 1), pU = state.units.some(u => !u.dead && u.owner === 1);
  const eT = towers.some(t => t.owner >= 2), eU = state.units.some(u => !u.dead && u.owner >= 2);
  if (!pT && !pU) gameOver();
  else if (!eT && !eU) levelComplete();
  else if (state.timer && state.time >= state.timer) gameOver('Time is up!');
  refreshHud();
}

/* ---- enemy AI: greedy but cautious; more reckless (and faster) at higher levels ---- */
function aiThink(ai){
  const towers = state.towers, mine = towers.filter(t => t.owner === ai.owner);
  if (!mine.length) return;
  const pressure = t => state.units.filter(u => !u.dead && u.owner !== t.owner && u.to === t.id).reduce((s, u) => s + u.pw, 0);
  // prune hopeless / pointless routes
  for (const src of mine) for (let i = src.routes.length - 1; i >= 0; i--){ const to = towers[src.routes[i].to];
    if (to.owner !== ai.owner && src.lv < 2 && to.lv > 6 && pressure(to) < to.lv) src.routes.splice(i, 1);
    else if (to.owner === ai.owner && to.lv >= TOWER_CAP(to) - 2) src.routes.splice(i, 1); }
  const senders = mine.filter(t => BREEDS[t.type] && t.lv >= 6);
  if (!senders.length) return;
  const anyCapped = senders.some(t => t.lv >= TOWER_CAP(t) - 1 && !t.routes.length);
  // evaluate every non-own target with the COMBINED strength of all senders in reach
  const opts = [];
  for (const t of towers){
    if (t.owner === ai.owner) continue;
    const sup = senders.filter(s => Math.hypot(t.x - s.x, t.y - s.y) <= REACH && (s.routes.length < maxRoutes(s.lv) || s.routes.some(r => r.to === t.id)));
    if (!sup.length) continue;
    const wallOn = sup.some(s => state.walls.some(w => w.hp > 0 && segDist(w.x, w.y, s.x, s.y, t.x, t.y).d < 30));
    const river = sup.some(s => routeCrossesRiver(s, t));
    const need = t.lv * strength(t.owner) / strength(ai.owner) + (wallOn ? WALL_HP * 0.6 : 0) + (river ? BRIDGE_N : 0) + Math.max(0, pressure(t) * -1);
    const pool = sup.reduce((a, s) => a + s.lv, 0);
    const margin = pool * ai.risk - need;
    if (margin <= 0 && !anyCapped) continue;
    let score = margin + (t.owner === 1 ? 20 : t.owner === 0 ? 10 : 6) + (BREEDS[t.type] ? 0 : 6) + (t.type === 'factory' ? 8 : 0) + (t.type === 'fort' ? 10 : 0) - (wallOn ? 8 : 0) - (river ? 8 : 0) - t.lv * 0.3;
    opts.push({ t, sup, score });
  }
  if (opts.length){
    opts.sort((a, b) => b.score - a.score);
    const best = opts[0];
    for (const s of best.sup) addRoute(s, best.t, true);
  }
  // reinforce: a frontline tower under pressure gets help from an idle neighbour
  for (const t of mine){ if (t.lv < 8 && pressure(t) > 0){ const helper = senders.find(s => s !== t && s.lv > 15 && !s.routes.length && Math.hypot(t.x - s.x, t.y - s.y) <= REACH); if (helper) addRoute(helper, t, true); } }
}

/* ---- Air Strike (consumable): tap an enemy tower → level 0 ---- */
function airStrike(t){
  if (Meta.bombs <= 0) return;
  Meta.bombs--; Meta.save();
  t.lv = 0; t.flash = 0.8; boom(t.x, t.y, '#ff7a45', 30, true); SFX.play('strike'); buzz('heavy'); pop(t.x, t.y - 50, 'AIR STRIKE!', '#ffd24a');
  state.aim = false; refreshHud();
  trk('air_strike', { level: state.level, mode: state.mode });
}

/* ---- input (pointer): drag from own tower → route · swipe across a line → cut ---- */
function bindInput(){
  const el = cv;
  const pos = e => { const r = el.getBoundingClientRect(); return toMap(e.clientX - r.left, e.clientY - r.top); };
  el.addEventListener('pointerdown', e => {
    if (state.screen !== 'game' || state.paused || state.over) return;
    const p = pos(e); const t = towerAt(p.x, p.y, 16);
    if (state.aim){ if (t && t.owner >= 2) airStrike(t); else hint('Tap an ENEMY tower to strike'); return; }
    if (t && t.owner === 1 && BREEDS[t.type]) state.drag = { from: t, x: p.x, y: p.y };
    else state.swipe = [p];
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  });
  el.addEventListener('pointermove', e => {
    if (state.screen !== 'game') return;
    const p = pos(e);
    if (state.drag){ state.drag.x = p.x; state.drag.y = p.y; return; }
    if (state.swipe){
      const last = state.swipe[state.swipe.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 6) return;
      state.swipe.push(p); if (state.swipe.length > 40) state.swipe.shift();
      // cut player routes crossed by this swipe segment
      for (const src of state.towers){ if (src.owner !== 1) continue;
        for (let i = src.routes.length - 1; i >= 0; i--){ const to = state.towers[src.routes[i].to];
          const ra = TOWER_R[src.type] + 6, rb = TOWER_R[to.type] + 6, L = Math.hypot(to.x - src.x, to.y - src.y) || 1;
          const a = { x: src.x + (to.x - src.x) * ra / L, y: src.y + (to.y - src.y) * ra / L }, b = { x: to.x - (to.x - src.x) * rb / L, y: to.y - (to.y - src.y) * rb / L };
          if (segsCross(last, p, a, b)){ cutRoute(src, i); boom((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff', 6); }
        } }
    }
  });
  const up = e => {
    if (state.drag){ const p = pos(e); const t = towerAt(p.x, p.y, 22); if (t && t !== state.drag.from) addRoute(state.drag.from, t); state.drag = null; }
    state.swipe = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

/* ============================================================================================
   RENDERING
   ============================================================================================ */
function rr(x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
let menuStars = null;
function drawMenuBg(){
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b3a6b'); g.addColorStop(0.6, '#0f2547'); g.addColorStop(1, '#0a1730');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!menuStars){ menuStars = []; for (let i = 0; i < 70; i++) menuStars.push({ x: Math.random(), y: Math.random() * 0.6, r: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28 }); }
  for (const s of menuStars){ ctx.globalAlpha = 0.45 + 0.45 * Math.sin(state.t * 1.6 + s.p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  // rolling hills silhouette
  ctx.fillStyle = '#14305a'; ctx.beginPath(); ctx.moveTo(0, H * 0.62);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H * 0.62 + Math.sin(x / 70 + 1) * 14 + Math.sin(x / 31) * 6);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0f2648'; ctx.beginPath(); ctx.moveTo(0, H * 0.7);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H * 0.7 + Math.sin(x / 50 + 3) * 12);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}
function drawGround(){
  const R = state.region || REGIONS[0];
  const s = MAP.s;
  ctx.fillStyle = R.ground; ctx.fillRect(0, 0, W, H);
  // soft patches
  ctx.fillStyle = R.ground2;
  const rnd = mulberry(state.level * 31 + 7);
  for (let i = 0; i < 26; i++){ const p = toScr(rnd() * MW, rnd() * MH); ctx.beginPath(); ctx.ellipse(p.x, p.y, (30 + rnd() * 70) * s, (18 + rnd() * 40) * s, rnd() * 3, 0, 6.283); ctx.fill(); }
  // map frame
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3; rr(MAP.x, MAP.y, MW * s, MH * s, 22 * s); ctx.stroke();
  // river
  if (state.river){ const r = state.river; const a = toScr(0, r.y - r.h / 2), b = toScr(MW, r.y + r.h / 2);
    ctx.fillStyle = R.water; ctx.fillRect(MAP.x, a.y, MW * s, b.y - a.y);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2 * s;
    for (let k = 0; k < 6; k++){ const yy = a.y + (b.y - a.y) * (0.2 + k * 0.13); ctx.beginPath(); for (let x = 0; x <= MW; x += 24){ const p = toScr(x, 0); ctx.lineTo(p.x, yy + Math.sin(x / 40 + state.t * 2 + k) * 2 * s); } ctx.stroke(); }
  }
}
function drawRoutes(){
  const s = MAP.s;
  for (const src of state.towers){
    for (const r of src.routes){
      const to = state.towers[r.to];
      const a = toScr(src.x, src.y), b = toScr(to.x, to.y);
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 12 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y + 3 * s); ctx.lineTo(b.x, b.y + 3 * s); ctx.stroke();
      ctx.strokeStyle = OWNER_COL[src.owner]; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5 * s; ctx.setLineDash([10 * s, 12 * s]); ctx.lineDashOffset = -state.t * 60 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      // arrow head
      const ang = Math.atan2(b.y - a.y, b.x - a.x), hx = b.x - Math.cos(ang) * (TOWER_R[to.type] + 10) * s, hy = b.y - Math.sin(ang) * (TOWER_R[to.type] + 10) * s;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(hx + Math.cos(ang) * 8 * s, hy + Math.sin(ang) * 8 * s); ctx.lineTo(hx + Math.cos(ang + 2.4) * 8 * s, hy + Math.sin(ang + 2.4) * 8 * s); ctx.lineTo(hx + Math.cos(ang - 2.4) * 8 * s, hy + Math.sin(ang - 2.4) * 8 * s); ctx.closePath(); ctx.fill();
    }
  }
  // bridges
  for (const key in state.bridges){ const [i, j] = key.split('_').map(Number); const a = state.towers[i], b = state.towers[j]; if (!a || !b || !state.river) continue;
    const n = state.bridges[key], done = n >= BRIDGE_N; const r = state.river; const lo = r.y - r.h / 2 - 6, hi = r.y + r.h / 2 + 6;
    const tA = (lo - a.y) / (b.y - a.y), tB = (hi - a.y) / (b.y - a.y);
    const pA = toScr(a.x + (b.x - a.x) * tA, lo), pB = toScr(a.x + (b.x - a.x) * tB, hi);
    ctx.strokeStyle = done ? '#a8651f' : 'rgba(168,101,31,.45)'; ctx.lineWidth = 16 * s; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
    ctx.strokeStyle = done ? '#e0a83f' : 'rgba(224,168,63,.5)'; ctx.lineWidth = 2 * s; ctx.setLineDash([4 * s, 5 * s]); ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke(); ctx.setLineDash([]);
    if (!done){ const m = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 }; ctx.fillStyle = '#fff'; ctx.font = `700 ${13 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`🔨 ${n}/${BRIDGE_N}`, m.x, m.y + 5 * s); }
  }
  // drag preview
  if (state.drag){ const f = state.drag.from; const a = toScr(f.x, f.y), b = toScr(state.drag.x, state.drag.y);
    const tgt = towerAt(state.drag.x, state.drag.y, 22); const ok = tgt && tgt !== f && Math.hypot(tgt.x - f.x, tgt.y - f.y) <= REACH;
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = 6 * s; ctx.setLineDash([12 * s, 10 * s]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    // reach ring
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(a.x, a.y, REACH * s, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  }
  if (state.swipe && state.swipe.length > 1){ ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.beginPath(); state.swipe.forEach((p, i) => { const q = toScr(p.x, p.y); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); }
}
function drawObstacles(){
  const s = MAP.s;
  for (const w of state.walls){ if (w.hp <= 0) continue; const p = toScr(w.x, w.y);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 14 * s, 30 * s, 8 * s, 0, 0, 6.283); ctx.fill();
    for (let k = 0; k < 3; k++){ ctx.fillStyle = k % 2 ? '#a8651f' : '#c98a2f'; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2 * s; rr(-30 * s, (-4 - k * 9) * s, 60 * s, 9 * s, 4 * s); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = `700 ${12 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 3 * s; ctx.strokeText(Math.ceil(w.hp), 0, -30 * s); ctx.fillText(Math.ceil(w.hp), 0, -30 * s);
    ctx.restore(); }
  for (const m of state.mines){ if (!m.alive) continue; const p = toScr(m.x, m.y);
    ctx.fillStyle = '#2c333d'; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(p.x, p.y, 12 * s, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = (Math.sin(state.t * 8) > 0) ? '#ff3b3b' : '#7a1a1a'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * s, 0, 6.283); ctx.fill();
    for (let k = 0; k < 6; k++){ const a = k * 1.047; ctx.strokeStyle = '#2c333d'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 12 * s, p.y + Math.sin(a) * 12 * s); ctx.lineTo(p.x + Math.cos(a) * 17 * s, p.y + Math.sin(a) * 17 * s); ctx.stroke(); } }
  for (const g of state.gates){ const p = toScr(g.x, g.y);
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4 * s; ctx.setLineDash([]); rr(p.x - 30 * s, p.y - 30 * s, 60 * s, 60 * s, 12 * s); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,74,.18)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${22 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 4 * s; ctx.strokeText(g.label, p.x, p.y + 8 * s); ctx.fillText(g.label, p.x, p.y + 8 * s); }
}
function drawTowerArt(t, p, s){
  const col = OWNER_COL[t.owner], dark = OWNER_DARK[t.owner], R = TOWER_R[t.type] * s;
  ctx.save(); ctx.translate(p.x, p.y);
  // shadow + base disc
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, R * 0.55, R * 1.05, R * 0.5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = t.owner ? col : '#b8c0c8'; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(0, -R * 0.25, R * 0.75, 0, 6.283); ctx.fill();
  if (t.flash > 0){ ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, t.flash)})`; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); }
  const k = R / 34;
  ctx.lineWidth = 2.4 * s;
  if (t.type === 'barracks'){                             // tent-style barracks
    ctx.fillStyle = dark; ctx.strokeStyle = '#0a1a38'; ctx.beginPath(); ctx.moveTo(-18 * k, 6 * k); ctx.lineTo(0, -20 * k); ctx.lineTo(18 * k, 6 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd7b0'; ctx.beginPath(); ctx.moveTo(-6 * k, 6 * k); ctx.lineTo(0, -6 * k); ctx.lineTo(6 * k, 6 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -20 * k); ctx.lineTo(0, -30 * k); ctx.lineTo(10 * k, -26 * k); ctx.lineTo(0, -22 * k); ctx.closePath(); ctx.fill();
  } else if (t.type === 'factory'){                         // hangar + chimney + gear
    ctx.fillStyle = dark; ctx.strokeStyle = '#0a1a38'; rr(-20 * k, -8 * k, 40 * k, 20 * k, 4 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a6473'; rr(8 * k, -26 * k, 8 * k, 20 * k, 2 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(12 * k + Math.sin(state.t * 3) * 3 * k, -32 * k - (state.t * 20 % 12) * k, 5 * k, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); for (let i = 0; i < 8; i++){ const a = i * 0.785, r1 = 7 * k, r2 = 10 * k; ctx.lineTo(-8 * k + Math.cos(a) * r2, 2 * k + Math.sin(a) * r2); ctx.lineTo(-8 * k + Math.cos(a + 0.39) * r1, 2 * k + Math.sin(a + 0.39) * r1); } ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (t.type === 'sniper'){                          // tall watchtower + scope
    ctx.fillStyle = '#5a4a30'; ctx.strokeStyle = '#0a1a38'; rr(-8 * k, -30 * k, 16 * k, 38 * k, 3 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; rr(-15 * k, -36 * k, 30 * k, 12 * k, 3 * k); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2c333d'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(4 * k, -30 * k); ctx.lineTo(26 * k, -40 * k); ctx.stroke();
    if (t.owner){ ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(0, 0, Math.min(280, 130 + t.lv * 4) * s, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
  } else if (t.type === 'rocket'){                          // launcher pods
    ctx.fillStyle = dark; ctx.strokeStyle = '#0a1a38'; rr(-18 * k, -4 * k, 36 * k, 16 * k, 4 * k); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.rotate(-0.5); for (let i = -1; i <= 1; i++){ ctx.fillStyle = '#2c333d'; rr(-6 * k + i * 9 * k, -30 * k, 7 * k, 30 * k, 3 * k); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff5a4d'; ctx.beginPath(); ctx.arc(-2.5 * k + i * 9 * k, -30 * k, 3.5 * k, 0, 6.283); ctx.fill(); } ctx.restore();
  } else if (t.type === 'fort'){                            // big castle with flags
    ctx.fillStyle = dark; ctx.strokeStyle = '#0a1a38'; rr(-34 * k, -14 * k, 68 * k, 30 * k, 5 * k); ctx.fill(); ctx.stroke();
    for (const x of [-30, -12, 6, 24]){ ctx.fillStyle = dark; rr(x * k, -22 * k, 8 * k, 10 * k, 1.5 * k); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#5a6473'; rr(-10 * k, -34 * k, 20 * k, 26 * k, 3 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -34 * k); ctx.lineTo(0, -46 * k); ctx.lineTo(12 * k, -41 * k); ctx.lineTo(0, -36 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a1a38'; rr(-5 * k, -2 * k, 10 * k, 16 * k, 4 * k); ctx.fill();
    if (t.owner && Math.floor(state.t * 2) % 3 === 0){ ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(20 * k, -52 * k + (state.t * 40 % 30) * k, 8 * k, Math.PI, 0); ctx.fill(); }
  }
  // level number
  const lv = Math.max(0, Math.floor(t.lv + 1e-6));
  ctx.font = `800 ${(t.type === 'fort' ? 26 : 20) * s}px "Baloo 2", Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5 * s; ctx.strokeStyle = '#0a1a38'; ctx.strokeText(lv, 0, R * 0.62); ctx.fillStyle = '#fff'; ctx.fillText(lv, 0, R * 0.62);
  ctx.textBaseline = 'alphabetic';
  // route slot dots (white = free, hollow = in use)
  if (t.owner && BREEDS[t.type]){ const n = maxRoutes(t.lv), used = t.routes.length; for (let i = 0; i < n; i++){ const x = (i - (n - 1) / 2) * 11 * s; ctx.beginPath(); ctx.arc(x, R + 10 * s, 4 * s, 0, 6.283); ctx.fillStyle = i < n - used ? '#fff' : 'rgba(255,255,255,.3)'; ctx.fill(); ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 1.5 * s; ctx.stroke(); } }
  ctx.restore();
}
function drawUnit(u, s){
  const p = toScr(u.x, u.y), col = OWNER_COL[u.owner], dark = OWNER_DARK[u.owner];
  const a = state.towers[u.from], b = state.towers[u.to]; const dirx = Math.sign(b.x - a.x) || 1;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 7 * s, 8 * s, 3 * s, 0, 0, 6.283); ctx.fill();
  if (u.tank){
    ctx.fillStyle = '#2c333d'; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 1.5 * s; rr(-11 * s, -2 * s, 22 * s, 9 * s, 3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; rr(-9 * s, -8 * s, 18 * s, 8 * s, 3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; rr(-4 * s, -13 * s, 9 * s, 7 * s, 2 * s); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(dirx * 3 * s, -10 * s); ctx.lineTo(dirx * 14 * s, -11 * s); ctx.stroke();
  } else {
    const bob = Math.sin(state.t * 14 + u.off) * 1.2 * s;
    ctx.fillStyle = col; ctx.strokeStyle = '#0a1a38'; ctx.lineWidth = 1.5 * s; rr(-5 * s, -6 * s + bob, 10 * s, 11 * s, 4 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd7b0'; ctx.beginPath(); ctx.arc(0, -10 * s + bob, 5 * s, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, -11.5 * s + bob, 5.2 * s, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2c333d'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(dirx * 2 * s, -2 * s + bob); ctx.lineTo(dirx * 10 * s, -4 * s + bob); ctx.stroke();
  }
  ctx.restore();
}
function drawFx(s){
  for (const sh of state.shots){
    if (sh.rocket){ const p = toScr(sh.x, sh.y); ctx.fillStyle = '#ff5a4d'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * s, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y + 4 * s, 3 * s, 0, 6.283); ctx.fill(); }
    else { const a = toScr(sh.x1, sh.y1), b = toScr(sh.x2, sh.y2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  for (const f of state.fx){ const p = toScr(f.x, f.y); ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2.5)); ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(p.x, p.y, f.r * s, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const p of state.pops){ const q = toScr(p.x, p.y); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.font = `800 ${15 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3 * s; ctx.strokeStyle = '#0a1a38'; ctx.strokeText(p.txt, q.x, q.y); ctx.fillStyle = p.col; ctx.fillText(p.txt, q.x, q.y); }
  ctx.globalAlpha = 1;
}
function render(){
  if (state.screen !== 'game'){ drawMenuBg(); return; }
  const s = MAP.s;
  drawGround(); drawRoutes(); drawObstacles();
  const sorted = state.towers.slice().sort((a, b) => a.y - b.y);
  for (const t of sorted) drawTowerArt(t, toScr(t.x, t.y), s);
  for (const u of state.units) if (!u.dead) drawUnit(u, s);
  drawFx(s);
  if (state.aim){ ctx.fillStyle = 'rgba(255,90,77,.12)'; ctx.fillRect(0, 0, W, H); for (const t of state.towers) if (t.owner >= 2){ const p = toScr(t.x, t.y); ctx.strokeStyle = '#ff5a4d'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -state.t * 40; ctx.beginPath(); ctx.arc(p.x, p.y, (TOWER_R[t.type] + 12) * s, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); } }
}
// tiny map preview for the menu card
function drawMini(c2, L, w, h, opts){
  const g = genLevel(L, opts || {}); const sx = w / MW, sy = h / MH, sc = Math.min(sx, sy); const ox = (w - MW * sc) / 2, oy = (h - MH * sc) / 2;
  const R = g.region; c2.fillStyle = R.ground; c2.fillRect(0, 0, w, h);
  if (g.river){ c2.fillStyle = R.water; c2.fillRect(ox, oy + (g.river.y - g.river.h / 2) * sc, MW * sc, g.river.h * sc); }
  for (const wl of g.walls){ c2.fillStyle = '#a8651f'; c2.fillRect(ox + (wl.x - 14) * sc, oy + (wl.y - 6) * sc, 28 * sc, 12 * sc); }
  for (const m of g.mines){ c2.fillStyle = '#2c333d'; c2.beginPath(); c2.arc(ox + m.x * sc, oy + m.y * sc, 5 * sc, 0, 6.283); c2.fill(); }
  for (const t of g.towers){ c2.fillStyle = t.owner ? OWNER_COL[t.owner] : '#b8c0c8'; c2.strokeStyle = '#0a1a38'; c2.lineWidth = 1.5; c2.beginPath(); c2.arc(ox + t.x * sc, oy + t.y * sc, TOWER_R[t.type] * sc, 0, 6.283); c2.fill(); c2.stroke();
    if (t.type !== 'barracks'){ c2.fillStyle = '#fff'; c2.font = `700 ${Math.max(8, 20 * sc)}px Fredoka, sans-serif`; c2.textAlign = 'center'; c2.fillText({ factory: '⚙', sniper: '🎯', rocket: '🚀', fort: '🏯' }[t.type], ox + t.x * sc, oy + t.y * sc + 4); } }
}

/* ============================================================================================
   HUD · RESULTS · REWARDS · ADS
   ============================================================================================ */
const ICON_COIN = '<svg class="ic" width="20" height="20" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#e0982a" stroke="#0a1a38" stroke-width="2.5"/><circle cx="16" cy="16" r="9" fill="#ffd24a" stroke="#b07d22" stroke-width="2"/></svg>';
const ICON_GEM  = '<svg class="ic" width="18" height="18" viewBox="0 0 30 30"><polygon points="15,2 27,11 15,28 3,11" fill="#c44dff" stroke="#0a1a38" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const ICON_PLAY = '<svg class="ic" width="24" height="20" viewBox="0 0 24 20"><rect x="1" y="3" width="22" height="14" rx="3" fill="#0a1a38"/><polygon points="9,6 18,10 9,14" fill="#fff"/></svg>';
const AD_BTN_HTML = ICON_PLAY + 'COLLECT ×3';
const ICON_CHEST = '<svg width="78" height="64" viewBox="0 0 48 40"><rect x="6" y="16" width="36" height="21" rx="3" fill="#a8651f" stroke="#0a1a38" stroke-width="3"/><path d="M4 17 q20 -13 40 0 l0 4 -40 0z" fill="#c98a2f" stroke="#0a1a38" stroke-width="3"/><rect x="3" y="13" width="42" height="8" rx="3" fill="#e0a83f" stroke="#0a1a38" stroke-width="3"/><rect x="21" y="18" width="6" height="11" rx="2" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5"/></svg>';
const ICON_GIFT  = '<svg width="72" height="72" viewBox="0 0 48 48"><rect x="9" y="21" width="30" height="21" rx="3" fill="#3a7bd5" stroke="#0a1a38" stroke-width="3"/><rect x="6" y="14" width="36" height="9" rx="3" fill="#4a90e2" stroke="#0a1a38" stroke-width="3"/><rect x="21" y="14" width="6" height="28" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5"/><path d="M24 14 C18 6 12 12 24 14 C30 6 36 12 24 14Z" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const STAR = (lit, big, i) => { const sz = big ? 40 : 33, fill = lit ? '#ffd24a' : '#2c3e5e', stroke = lit ? '#0a1a38' : '#5a6e8e';
  return `<svg class="${lit ? 'lit s' + i : ''}" width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="M12 2.5 L14.4 8.8 L21 9.1 L15.8 13.2 L17.6 19.7 L12 16 L6.4 19.7 L8.2 13.2 L3 9.1 L9.6 8.8 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/></svg>`; };
function coinBoost(){ return (Meta.boostUntil && Date.now() < Meta.boostUntil) ? 1.5 : 1; }
let pendingRewards = [];
const Haptic = (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins) ? Capacitor.Plugins.Haptics : null;
let lastBuzz = 0;
function buzz(kind){
  if (!Haptic || Meta.sound === false) return;
  const now = performance.now(); if (now - lastBuzz < 90) return; lastBuzz = now;
  try { if (kind === 'success') Haptic.notification({ type: 'SUCCESS' }).catch(() => {}); else Haptic.impact({ style: kind === 'heavy' ? 'HEAVY' : (kind === 'medium' ? 'MEDIUM' : 'LIGHT') }).catch(() => {}); } catch (e) {}
}
function closeResultModals(){ ['victoryModal','defeatModal','rewardModal'].forEach(id => { const m = $(id); if (m) m.classList.remove('active'); }); }
function resetDoubleBtn(btn){ if (!btn) return; btn.disabled = false; btn.classList.remove('done'); btn.innerHTML = AD_BTN_HTML; }
function paintStars(n){ const box = $('vicStars'); if (!box) return; box.innerHTML = ''; for (let i = 0; i < 3; i++) box.insertAdjacentHTML('beforeend', STAR(i < n, i === 1, i)); }
function fmtTime(s){ s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function refreshHud(){
  if (state.screen !== 'game') return;
  const tr = territory();
  const me = $('terrMe'), foe = $('terrFoe'), mk = $('terrMark');
  if (me){ me.style.width = (tr * 100) + '%'; foe.style.width = ((1 - tr) * 100) + '%'; mk.style.left = (tr * 100) + '%'; }
  const tm = $('hudTime'); if (tm) tm.textContent = state.timer ? '⏱ ' + fmtTime(state.timer - state.time) : fmtTime(state.time);
  const bn = $('bombN'); if (bn) bn.textContent = '×' + Meta.bombs;
  const bb = $('bombBtn'); if (bb){ bb.classList.toggle('aim', state.aim); bb.classList.toggle('empty', Meta.bombs <= 0); }
  const sp = $('speedBtn'); if (sp) sp.textContent = state.speed + '×';
}
window.TDSAdOverlay = {
  show(txt){ const m = $('adModal'), c = $('adCount'), tx = $('adTxt'); if (!m) return; if (tx) tx.textContent = txt || 'Loading ad…'; if (c) c.textContent = ''; m.classList.add('active'); },
  hide(){ const m = $('adModal'); if (m) m.classList.remove('active'); },
};
let _rewBusy = false;
function playRewardedAd(done, settled, place){
  trkAdClick(place, _rewBusy ? 'busy' : (Meta.noAds ? 'noads_bundle' : 'started'));
  if (_rewBusy){ trk('ad_blocked', { ad_type: 'rewarded', place: place || 'unknown' }); return; }
  _rewBusy = true; place = place || 'unknown';
  const native = !!(window.AdBridge && AdBridge.rewarded);
  const grant = (() => { let paid = false; return () => { if (paid) return; paid = true; done(); }; })();
  const free  = (() => { let out = false; return () => { if (out) return; out = true; _rewBusy = false; if (settled) settled(); }; })();
  const report = (() => { let sent = false; return o => { if (sent) return; sent = true; o = o || {}; if (o.shown) { Meta.adsRew = (Meta.adsRew | 0) + 1; Meta.save(); }
    trk('ad_rewarded', { place: place, result: o.reason || 'unknown', shown: o.shown ? 1 : 0, earned: o.earned ? 1 : 0, ad_platform: native ? 'admob' : 'sim' }); trkProfile(); }; })();
  if (Meta.noAds){ report({ shown: 0, earned: 1, reason: 'noads_bundle' }); free(); grant(); return; }
  trk('ad_attempt', { ad_type: 'rewarded', place: place, ad_platform: native ? 'admob' : 'sim' });
  if (native){ AdBridge.rewarded(grant, o => { report(o); free(); }, place); return; }
  const m = $('adModal'), c = $('adCount'), tx = $('adTxt');
  if (!m){ report({ shown: 0, earned: 1, reason: 'no_overlay' }); free(); grant(); return; }
  if (tx) tx.textContent = 'Rewarded video…';
  let t = 3; if (c) c.textContent = t; m.classList.add('active');
  const iv = setInterval(() => { t--; if (t > 0){ if (c) c.textContent = t; } else { clearInterval(iv); m.classList.remove('active'); report({ shown: 1, earned: 1, reason: 'sim' }); free(); grant(); } }, 700);
}
let _interstitialTick = 0;
function playInterstitial(done){
  const native = !!(window.AdBridge && AdBridge.interstitial);
  const report = (() => { let sent = false; return (shown, reason) => { if (sent) return; sent = true; if (shown){ Meta.adsInt = (Meta.adsInt | 0) + 1; Meta.save(); }
    trk('ad_interstitial', { result: reason, shown: shown ? 1 : 0, ad_platform: native ? 'admob' : 'sim', battle: _interstitialTick, level: state.level | 0 }); }; })();
  if (Meta.noAds || window.__sim){ report(0, Meta.noAds ? 'noads_bundle' : 'sim_run'); done(); return; }
  const RC = window.TDSRemoteConfig; const freq = RC ? Math.max(1, Math.round(RC.getNumber('interstitial_frequency'))) : 2;
  if ((++_interstitialTick) % freq !== 0){ report(0, 'frequency_gate'); done(); return; }
  trk('ad_attempt', { ad_type: 'interstitial', place: 'post_battle', ad_platform: native ? 'admob' : 'sim' });
  if (native){ AdBridge.interstitial(shown => { report(shown ? 1 : 0, shown ? 'shown' : 'no_fill'); done(); }); return; }
  const m = $('adModal'), c = $('adCount'), tx = $('adTxt'); if (!m){ report(0, 'no_overlay'); done(); return; }
  if (tx) tx.textContent = 'Advertisement…';
  let t = 3; if (c) c.textContent = t; m.classList.add('active');
  const iv = setInterval(() => { t--; if (t > 0){ if (c) c.textContent = t; } else { clearInterval(iv); m.classList.remove('active'); report(1, 'sim'); done(); } }, 700);
}
// victory "COLLECT ×3": watch an ad, get the purse two more times
function doubleReward(){
  if (state.doubled){ trkAdClick('victory_double', 'already_done'); return; }
  playRewardedAd(() => { state.doubled = true; Meta.coins += (state.coinReward || 0) * 2; Meta.save();
    const lbl = $('vicCoins'); if (lbl) lbl.textContent = (state.coinReward || 0) * 3;
    const btn = $('vicDouble'); if (btn){ btn.disabled = true; btn.classList.add('done'); btn.innerHTML = '✓ TRIPLED'; }
    trkEarn('coins', (state.coinReward || 0) * 2, 'ad_double_vic'); refreshMenu(); }, null, 'victory_double');
}
function tallyGame(){
  Meta.games = (Meta.games || 0) + 1;
  if (!window.__sim){
    missionEvent('play', 1); if (state.won) missionEvent('win', 1);
    missionEvent('kill', state.kills | 0); missionEvent('capture', state.caps | 0); missionEvent('send', state.sent | 0);
    const sc = state.score | 0; if (sc > (Meta.bestScore | 0)) Meta.bestScore = sc;
    if (Meta.name && window.TDSLeaderboard && TDSLeaderboard.ready) TDSLeaderboard.submit(Meta.name, Meta.bestScore);
    if (sc > 0 && window.TDSLeaderboard && TDSLeaderboard.monthKey){
      const mk = TDSLeaderboard.monthKey(); if (!Meta.monthScore || Meta.monthScore.m !== mk) Meta.monthScore = { m: mk, total: 0 }; Meta.monthScore.total += sc;
      if (Meta.name && TDSLeaderboard.ready) TDSLeaderboard.submitMonthly(Meta.name, Meta.monthScore.total, mk);
      const wk = TDSLeaderboard.weekKey(); if (!Meta.weekScore || Meta.weekScore.w !== wk) Meta.weekScore = { w: wk, total: 0 }; Meta.weekScore.total += sc;
      if (Meta.name && TDSLeaderboard.ready) TDSLeaderboard.submitWeekly(Meta.name, Meta.weekScore.total, wk);
    }
    Meta.killsTotal = (Meta.killsTotal | 0) + (state.kills | 0); Meta.capturesTotal = (Meta.capturesTotal | 0) + (state.caps | 0);
  }
  if (!window.__sim && window.TDSGames && window.TDSGames.ready){
    TDSGames.submitScore('highscore', state.score | 0); TDSGames.submitScore('toplevel', Meta.unlocked | 0);
    if (state.won) TDSGames.unlock('first_win'); if (Meta.unlocked >= 5) TDSGames.unlock('level_5'); if (Meta.unlocked >= 10) TDSGames.unlock('level_10'); if ((Meta.games | 0) >= 25) TDSGames.unlock('veteran');
    checkAchievements();
  }
  if (Meta.games % rateEvery() === 0) queueRating();
  if (Meta.games % 4 === 0) pendingRewards.push({ icon: ICON_GIFT, accent: '#4a90e2', title: 'BATTLE STREAK', tag: 'MILESTONE', desc: `${Meta.games} battles fought — here's a bonus!`, coins: Math.round(60 * levelCoinMul(Meta.level)), gems: 2 });
}
function showRewardModal(r, onClaim){
  SFX.play('chest');
  $('rwTitle').textContent = r.title; $('rwTag').textContent = r.tag || ''; $('rwDesc').textContent = r.desc || '';
  const ico = $('rwIcon'); ico.innerHTML = r.icon || ICON_GIFT; ico.style.setProperty('--acc', r.accent || '#4a90e2');
  const g = $('rwGoodies'); g.innerHTML = '';
  if (r.coins) g.insertAdjacentHTML('beforeend', `<span class="rpill coin">${ICON_COIN}+${r.coins}</span>`);
  if (r.gems)  g.insertAdjacentHTML('beforeend', `<span class="rpill gem">${ICON_GEM}+${r.gems}</span>`);
  if (r.bombs) g.insertAdjacentHTML('beforeend', `<span class="rpill bomb">💣+${r.bombs}</span>`);
  const grant = (mult) => { SFX.play('coin'); buzz('light'); Meta.coins += (r.coins || 0) * mult; Meta.gems += (r.gems || 0) * mult; Meta.bombs += (r.bombs || 0) * mult; Meta.save(); onClaim(); };
  $('rwClaim').onclick = () => grant(1);
  const dbl = $('rwDouble');
  if (dbl){ const can = r.adDouble !== false && (r.coins || r.gems || r.bombs); dbl.style.display = can ? '' : 'none'; dbl.disabled = false;
    dbl.onclick = () => { dbl.disabled = true; let paid = false; playRewardedAd(() => { paid = true; grant(2); }, () => { if (!paid) dbl.disabled = false; }, 'reward_double'); }; }
  $('rewardModal').classList.add('active');
}
function drainRewards(done){ if (!pendingRewards.length){ done(); return; } const r = pendingRewards.shift(); showRewardModal(r, () => { $('rewardModal').classList.remove('active'); drainRewards(done); }); }
/* ---- rating popups (remote-config gated) ---- */
let ratingPending = false;
const STORE_URL = 'https://play.google.com/store/apps/details?id=com.TDS.zombietowerdefense';
const RATE_REWARD = 500;
const RC = () => window.TDSRemoteConfig;
function rateEvery(){ const n = RC() ? RC().getNumber('rate_popup_every') : 5; return n > 0 ? n : 5; }
function ratePopup1On(){ return RC() ? RC().getBool('rate_popup_enabled') : true; }
function ratePopup2On(){ return RC() ? RC().getBool('rate_reward_popup_enabled') : true; }
function queueRating(){ if (!Meta.rated || !Meta.ratePicked) ratingPending = true; }
function showRateStars(done){
  const modal = $('rateStarsModal'); if (!modal){ done(false); return; }
  const stars = Array.from(modal.querySelectorAll('.rate-stars button')); const title = $('rsTitle'), sub = $('rsSub'), ok = $('rsOk'), close = $('rsClose'), row = $('rsStars');
  title.textContent = 'ENJOYING THE GAME?'; sub.textContent = 'How many stars would you give us?'; row.style.display = ''; ok.style.display = 'none'; close.style.display = '';
  stars.forEach(b => b.classList.remove('lit')); let picked = false;
  trk('rate_popup_shown', { popup: 'stars', games: Meta.games | 0 });
  const finish = (low) => { if (!picked) trk('rate_popup_dismissed', { popup: 'stars' }); modal.classList.remove('active'); done(!!low); };
  stars.forEach(b => b.onclick = () => { if (picked) return; picked = true; const n = +b.dataset.star; stars.forEach(s => s.classList.toggle('lit', +s.dataset.star <= n));
    trk('rate_stars', { stars: n }); Meta.ratePicked = true; Meta.save();
    setTimeout(() => { if (n >= 4){ try { window.open(STORE_URL, '_blank'); } catch (e) {} finish(false); } else { row.style.display = 'none'; close.style.display = 'none'; title.textContent = 'THANK YOU! ❤️'; sub.textContent = 'Thanks for your feedback — we keep improving the game!'; ok.style.display = ''; ok.onclick = () => finish(true); } }, 420); });
  close.onclick = () => finish(false); SFX.play('chest'); modal.classList.add('active');
}
function showRatingFlow(done){ const p2 = () => { if (ratePopup2On() && !Meta.rated) showRatingModal(done); else done(); }; if (ratePopup1On() && !Meta.ratePicked) showRateStars(low => { if (low) done(); else p2(); }); else p2(); }
function showRatingModal(done){
  const modal = $('rateModal'); if (!modal){ done && done(); return; }
  const goodies = $('rateGoodies'); if (goodies) goodies.innerHTML = `<span class="rpill coin">${ICON_COIN}+${RATE_REWARD}</span>`;
  trk('rate_popup_shown', { popup: 'reward', games: Meta.games | 0, reward: RATE_REWARD }); let went = false;
  const finish = () => { if (!went) trk('rate_popup_dismissed', { popup: 'reward' }); modal.classList.remove('active'); done && done(); };
  $('rateGo').onclick = () => { went = true; trk('rate_popup_action', { popup: 'reward', action: 'store_opened' }); try { window.open(STORE_URL, '_blank'); } catch (e) {}
    if (!Meta.rated){ Meta.rated = true; Meta.coins += RATE_REWARD; SFX.play('coin'); Meta.save(); trkEarn('coins', RATE_REWARD, 'rate_reward'); refreshMenu(); } finish(); };
  $('rateLater').onclick = finish; SFX.play('chest'); modal.classList.add('active');
}
function proceed(action){
  closeResultModals();
  drainRewards(() => { const go = () => { if (action === 'retry') retryRun(); else show(state.mode === 'pvp' ? 'pvp' : state.mode === 'ops' ? 'missions' : 'menu'); };
    if (ratingPending){ ratingPending = false; showRatingFlow(go); } else go(); });
}
function retryRun(rate){ startRun({ level: state.level, mode: state.mode, op: state.op, gen: state.genOpts, rate: rate || 1, timer: state.timer }); }

function gameOver(reason){
  if (state.over) return;
  if (window.__sim) document.title = `RESULT lost L${state.level} t=${Math.round(state.time)} terr=${Math.round(territory()*100)}`;
  state.over = true; _runLive = false; state.drag = null; state.swipe = null; state.aim = false;
  buzz('heavy'); SFX.play('lose');
  state.coinReward = Math.round((state.score | 0) * 0.4); state.doubled = false;
  if (state.mode === 'pvp'){ Meta.lp = Math.max(0, Meta.lp - LP_LOSE); Meta.pvpLosses = (Meta.pvpLosses | 0) + 1; }
  trk('level_fail', { level: state.level, mode: state.mode, progress_pct: Math.round(territory() * 100), games: Meta.games | 0, time: Math.round(state.time) });
  trkProfile();
  $('defCoins').textContent = state.coinReward;
  $('defSub').textContent = reason || (state.mode === 'pvp' ? `Lost the duel · −${LP_LOSE} 🏆` : 'Your towers fell. Boost your troops and try again!');
  const rb = $('defBoost'); if (rb){ rb.style.display = state.retryBoost ? 'none' : ''; rb.disabled = false; rb.innerHTML = ICON_PLAY + 'RETRY WITH ×3 TROOPS'; }
  refreshSkipBtn();
  setTimeout(() => { if (state.screen !== 'game') return; playInterstitial(() => $('defeatModal').classList.add('active')); }, 900);
}
function defeatBoost(){
  if (state.retryBoost){ trkAdClick('defeat_boost', 'already_done'); return; }
  playRewardedAd(() => { finalizeDefeat(); closeResultModals(); drainRewards(() => retryRun(3)); }, null, 'defeat_boost');
}
function finalizeDefeat(){ Meta.coins += (state.coinReward || 0); tallyGame(); Meta.save(); }
function canSkip(){ return state.mode === 'campaign' && (Meta.tickets || 0) > 0 && state.level >= Meta.unlocked && Meta.unlocked < LEVEL_COUNT; }
function refreshSkipBtn(){ const b = $('defSkip'); if (!b) return; b.style.display = canSkip() ? '' : 'none'; if (canSkip()) b.innerHTML = `🎟️ SKIP LEVEL · ${Meta.tickets} left`; }
function skipLevel(){ if (!canSkip()) return; Meta.tickets--; Meta.cleared[state.level] = 1; Meta.unlocked++; Meta.level = Meta.unlocked; finalizeDefeat(); closeResultModals(); drainRewards(() => show('menu')); }

function levelComplete(){
  if (state.over) return;
  if (window.__sim) document.title = `RESULT won L${state.level} t=${Math.round(state.time)}`;
  state.over = true; state.won = true; _runLive = false; state.drag = null; state.swipe = null; state.aim = false;
  buzz('success'); SFX.play('win');
  const L = state.level; let reward = 0, sub = '';
  state.winStars = state.time < 70 ? 3 : state.time < 150 ? 2 : 1;
  if (state.mode === 'campaign'){
    const first = !Meta.cleared[L];
    reward = Math.round(levelGold(L) * coinBoost() * (first ? 1 : REPLAY_MULT));
    Meta.cleared[L] = 1;
    const advanced = (L >= Meta.unlocked && Meta.unlocked < LEVEL_COUNT);
    if (advanced){ Meta.unlocked++; Meta.level = Meta.unlocked; }
    if (first){
      if (L % 5 === 0) pendingRewards.push({ icon: ICON_GEM, accent: '#c44dff', title: 'MILESTONE', tag: `LEVEL ${L}`, desc: 'Five more levels conquered!', gems: 10 + Math.floor(L / 10) });
      if (L % REGION_SIZE === 0) pendingRewards.push({ icon: ICON_CHEST, accent: '#F4B731', title: regionOf(L).name + ' LIBERATED', tag: 'REGION CLEARED', desc: 'A whole region under your flag!', coins: 500 + L * 10, gems: 25, bombs: 2 });
      if (L === 3) pendingRewards.push({ icon: '💣', accent: '#ff7a45', title: 'AIR STRIKE UNLOCKED', tag: 'NEW ITEM', desc: 'Tap 💣 in battle, then an enemy tower, to wipe its troops.', bombs: 2, adDouble: false });
    }
    sub = `Cleared in ${fmtTime(state.time)}`;
  } else if (state.mode === 'pvp'){
    reward = Math.round((120 + Meta.lp * 0.2) * coinBoost()); Meta.lp += LP_WIN; Meta.pvpWins = (Meta.pvpWins | 0) + 1; missionEvent('pvpwin', 1);
    sub = `+${LP_WIN} 🏆 league points`;
    Meta.pvpSeed = (Meta.pvpSeed | 0) + 1;
  } else if (state.mode === 'ops' && state.op){
    const first = !Meta.ops[state.op.id]; reward = Math.round(state.op.gold * (first ? 1 : 0.2) * coinBoost());
    if (first){ Meta.ops[state.op.id] = 1; pendingRewards.push({ icon: '🎖️', accent: '#ffd24a', title: state.op.name, tag: 'SPECIAL OP COMPLETE', desc: 'Mission accomplished, Commander!', gems: state.op.gems, bombs: 1 }); }
    sub = `Mission complete in ${fmtTime(state.time)}`;
  }
  Meta.coins += reward; state.coinReward = reward; state.doubled = false;
  Meta.xp = (Meta.xp | 0) + 30 + Math.round(L * 0.8); Meta.wins = (Meta.wins | 0) + 1;
  trk('level_complete', { level: L, mode: state.mode, stars: state.winStars, coins: reward, time: Math.round(state.time), games: Meta.games | 0 });
  trkEarn('coins', reward, 'level_complete'); trkProfile();
  tallyGame(); Meta.save();
  $('vicCoins').textContent = reward; $('vicSub').textContent = sub; paintStars(state.winStars); resetDoubleBtn($('vicDouble'));
  setTimeout(() => { if (state.screen !== 'game') return; playInterstitial(() => $('victoryModal').classList.add('active')); }, 800);
}

/* ============================================================================================
   MENU · TICKETS · SOUND · STREAK
   ============================================================================================ */
let _coinsShown = null, _gemsShown = null, _pvShown = '';
function refreshMenu(){
  if (_coinsShown !== null && Meta.coins !== _coinsShown) bump($('m_coins').parentElement);
  if (_gemsShown !== null && Meta.gems !== _gemsShown) bump($('m_gems').parentElement);
  _coinsShown = Meta.coins; _gemsShown = Meta.gems;
  $('m_coins').textContent = kfmt(Meta.coins); $('m_gems').textContent = Meta.gems;
  const R = regionOf(Meta.level), lir = levelInRegion(Meta.level);
  $('m_region').textContent = R.emoji + ' ' + R.name; $('m_levelno').textContent = Meta.level;
  let done = 0; for (let i = 1; i <= REGION_SIZE; i++) if (Meta.cleared[(R.id - 1) * REGION_SIZE + i]) done++;
  $('m_regionFill').style.width = (done / REGION_SIZE * 100) + '%'; $('m_regionSub').textContent = `${done} / ${REGION_SIZE} captured`;
  $('m_plv').textContent = 'Lv ' + playerLevel().n;
  const key = 'L' + Meta.level; if (_pvShown !== key){ _pvShown = key; const pv = $('pv'); if (pv) drawMini(pv.getContext('2d'), Meta.level, pv.width, pv.height); }
  refreshLoadout(); refreshSndUi(); refreshMissionDot(); regenTickets(); refreshTikUi();
  const sn = $('streakN'); if (sn) sn.textContent = streakNext();
  const sb = $('toStreak'); if (sb) sb.classList.toggle('ready', streakClaimable());
  const fp = $('ftuePlay'); if (fp) fp.style.display = (Meta.ftue & 1) ? 'none' : '';
}
function refreshLoadout(){
  for (const [kind, ids] of [['soldier', ['lc_solArt','lc_solName','lc_solLv','lc_solUpg']], ['tank', ['lc_tnkArt','lc_tnkName','lc_tnkLv','lc_tnkUpg']]]){
    const t = troopById(Meta[kind]), s = Meta.troops[t.id] || { lv: 1 };
    const art = $(ids[0]); if (art && art.dataset.k !== t.id + s.lv){ art.dataset.k = t.id + s.lv; art.innerHTML = TroopArt.svg(t, '#3b8bff'); }
    $(ids[1]).textContent = t.name.toUpperCase(); const lvEl = $(ids[2]); lvEl.textContent = `${t.rarity} · Lv ${s.lv}`; lvEl.style.color = RARITY_COL[t.rarity];
    const up = $(ids[3]); const cost = troopCost(s.lv), maxed = s.lv >= TROOP_MAX, needCopy = troopNeedsCopy(s.lv) && (s.n | 0) < 1;
    if (maxed){ up.classList.add('maxed'); up.disabled = true; up.innerHTML = '<span class="up-ar">MAX</span>'; }
    else { up.classList.remove('maxed'); up.disabled = Meta.coins < cost || needCopy; up.innerHTML = needCopy ? '<span class="up-ar">🎲</span>copy' : `<span class="up-ar">⬆</span><span class="ico ic-coin"></span>${kfmt(cost)}`; }
  }
}
function regenTickets(){ const now = Date.now(); if (Meta.pticket >= PT_MAX){ Meta.pticketAt = now; return; } const gained = Math.floor((now - Meta.pticketAt) / PT_REGEN_MS); if (gained > 0){ Meta.pticket = Math.min(PT_MAX, Meta.pticket + gained); Meta.pticketAt = Meta.pticket >= PT_MAX ? now : Meta.pticketAt + gained * PT_REGEN_MS; Meta.save(); } }
function spendTicket(){ regenTickets(); if (Meta.pticket <= 0) return false; if (Meta.pticket >= PT_MAX) Meta.pticketAt = Date.now(); Meta.pticket--; Meta.save(); return true; }
function grantTicket(n){ regenTickets(); Meta.pticket = Math.min(PT_MAX, Meta.pticket + (n || 1)); Meta.save(); refreshTikUi(); }
function tikCountdownText(){ if (Meta.pticket >= PT_MAX) return 'FULL'; const ms = Math.max(0, Meta.pticketAt + PT_REGEN_MS - Date.now()); const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `+1 in ${m}:${String(s).padStart(2, '0')}`; }
function refreshTikUi(){ const n = $('tikN'); if (n) n.textContent = Meta.pticket; const t = $('tikT'); if (t) t.textContent = tikCountdownText(); const mn = $('tkModalN'); if (mn) mn.textContent = 'Next ticket: ' + tikCountdownText(); }
function openTicketModal(){ regenTickets(); refreshTikUi(); $('ticketModal').classList.add('active'); trkPaywallOpen('ticket_gate'); }
function closeTicketModal(){ $('ticketModal').classList.remove('active'); trkPaywallClose(); }
function adTicket(){ playRewardedAd(() => { grantTicket(1); trk('claim', { what: 'ticket', pay: 'ad' }); SFX.play('coin'); closeTicketModal(); refreshMenu(); }, null, 'ticket_modal'); }
function refreshSndUi(){ const on = Meta.sound !== false; const b1 = $('sndBtn'); if (b1){ const i = b1.querySelector('.ico'); if (i) i.textContent = on ? '🔊' : '🔇'; } const b2 = $('sndBtn2'); if (b2) b2.textContent = on ? '🔊 SOUND: ON' : '🔇 SOUND: OFF'; }
function toggleSound(){ Meta.sound = Meta.sound === false; SFX.setEnabled(Meta.sound); Meta.save(); refreshSndUi(); }
// entering a battle: ticket gate + one-time mechanic intro card
function launchLevel(){
  const id = Meta.level;
  if (!(Meta.ftue & 1)){ Meta.ftue |= 1; Meta.save(); }
  const go = () => { if (!spendTicket()){ openTicketModal(); return; } startRun({ level: id, mode: 'campaign' }); };
  if (!Meta.introSeen[id] && INTRO[id]) showIntro(id, () => { Meta.introSeen[id] = 1; Meta.save(); go() }); else go();
}
function showIntro(id, onBegin){
  const modal = $('storyModal'); if (!modal){ onBegin(); return; } const I = INTRO[id];
  $('stLevel').textContent = 'LEVEL ' + id; $('stName').textContent = I.name; $('stText').textContent = I.text; $('stBoss').textContent = I.emoji;
  $('stBegin').onclick = () => { modal.classList.remove('active'); onBegin(); }; modal.classList.add('active');
}
/* streak */
function streakNext(){ if (Meta.streakDay === dayNum()) return Meta.streak || 1; if (Meta.streakDay === dayNum() - 1) return (Meta.streak || 0) + 1; return 1; }
function streakClaimable(){ return (Meta.streakDay || 0) < dayNum(); }
let streakBonus = 0;
const STREAK_REWARDS = [60, 90, 130, 170, 220, 280, 700];
const streakReward = day => Math.round(STREAK_REWARDS[(((day - 1) % 7) + 7) % 7] * levelCoinMul(Meta.level));
function claimStreak(){
  if (!streakClaimable()) return;
  Meta.streak = (Meta.streakDay === dayNum() - 1) ? (Meta.streak || 0) + 1 : 1; Meta.streakDay = dayNum();
  const base = streakReward(Meta.streak); Meta.coins += base; streakBonus = base; if (Meta.streak % 7 === 0) Meta.gems += 20; Meta.save();
  trk('claim', { what: 'streak', pay: 'free', day: Meta.streak | 0 }); trkEarn('coins', base, 'streak_day' + (Meta.streak | 0)); openStreak(); refreshMenu();
}
function streakDoubleAd(){ if (streakBonus <= 0){ trkAdClick('streak_double', 'unavailable'); return; } const b = streakBonus; playRewardedAd(() => { Meta.coins += b; streakBonus = 0; Meta.save(); trkEarn('coins', b, 'ad_streak_double'); openStreak(); refreshMenu(); }, null, 'streak_double'); }
function closeStreak(){ streakBonus = 0; const m = $('streakModal'); if (m) m.classList.remove('active'); }
function fmtCountdown(ms){ const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`; }
function openStreak(){
  const claimable = streakClaimable(), cur = streakNext(), base = Math.floor((cur - 1) / 7) * 7; const row = $('streakRow');
  if (row){ row.innerHTML = ''; for (let i = 1; i <= 7; i++){ const day = base + i, done = day < cur || (day === cur && !claimable), next = day === cur && claimable, bonus = i === 7;
    const t = document.createElement('div'); t.className = 'st-tile' + (done ? ' done' : '') + (next ? ' next' : '') + (bonus ? ' bonus' : '');
    t.innerHTML = `<span class="st-day">${bonus ? 'Day 7 · BONUS' : 'Day ' + i}</span><span class="st-coin">${ICON_COIN}</span><span class="st-amt">${streakReward(day)}${bonus ? ' +20💎' : ''}</span>` + (done ? '<span class="st-chk">✓</span>' : ''); row.appendChild(t); } }
  const sub = $('streakSub'); if (sub) sub.textContent = streakBonus > 0 ? `Claimed +${streakBonus}! Double it with a quick ad 👇` : (claimable ? `Day ${((cur - 1) % 7) + 1} ready — claim ${streakReward(cur)} gold!` : `Claimed — come back tomorrow to keep your streak`);
  const btn = $('streakClaim'); if (btn){ if (claimable){ btn.disabled = false; btn.style.display = ''; btn.innerHTML = `CLAIM ${ICON_COIN}${streakReward(cur)}`; } else { btn.disabled = true; btn.style.display = streakBonus > 0 ? 'none' : ''; btn.textContent = '⏳ ' + fmtCountdown((dayNum() + 1) * DAY_MS - Date.now()); } }
  const db = $('streakDouble'); if (db) db.style.display = streakBonus > 0 ? '' : 'none';
  const m = $('streakModal'); if (m) m.classList.add('active');
}

/* ============================================================================================
   SHOP
   ============================================================================================ */
const CHESTS = {
  legendary: { name: 'LEGENDARY CHEST', short: 'LEGENDARY', rarity: 'Legendary', accent: '#F4B731', priceGems: 120, coins: [4500, 10000], gems: [22, 48], bombs: [2, 4] },
  rare:      { name: 'RARE CHEST',      short: 'RARE',      rarity: 'Rare',      accent: '#3E97D6', priceGems: 40,  coins: [1500, 3500],  gems: [6, 14],  bombs: [0, 2] },
  common:    { name: 'COMMON CHEST',    short: 'COMMON',    rarity: 'Common',    accent: '#7d8a99', priceCoins: 250, coins: [120, 400],   gems: [0, 1],   bombs: [0, 0] },
};
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function boostLeftText(){ const m = Math.max(0, Math.ceil(((Meta.boostUntil || 0) - Date.now()) / 60000)); return `Active · ${m} min left`; }
const AD_CHEST_MAX = 4, AD_COIN_MAX = 6, AD_GEM_MAX = 3, AD_GEM_REWARD = 2;
const adCoinReward = () => Math.max(30, Math.round(60 * levelCoinMul(Meta.level) / 5) * 5);
function rollShopDay(){ const d = dayNum(); if (Meta.adDay !== d){ Meta.adDay = d; Meta.adChestUsed = 0; Meta.adCoinUsed = 0; Meta.adGemUsed = 0; Meta.save(); } }
function shopHead(txt){ const d = document.createElement('div'); d.className = 'shop-head'; d.textContent = txt; return d; }
let shopTab = 'free';
function wallTap(card, btn, item, cost, cur){ if (!btn) return; btn.style.pointerEvents = 'none'; card.style.cursor = 'default'; card.addEventListener('click', () => trkNoFunds(item, cost, cur)); }
function shopCard(o){
  const card = document.createElement('div'); card.className = 'shop-card' + (o.badge ? ' hot' : ''); if (o.accent) card.style.setProperty('--acc', o.accent);
  const label = o.owned ? (o.ownedLabel || 'OWNED') : o.priceHtml;
  card.innerHTML = (o.badge ? `<span class="sc-badge">${o.badge}</span>` : '') + `<div class="sc-ico">${o.icon}</div><div class="sc-txt"><b>${o.name}</b><span>${o.desc}</span></div><button class="sc-buy${o.owned ? ' owned' : ''}"${o.owned ? ' disabled' : ''}>${label}</button>`;
  const btn = card.querySelector('.sc-buy');
  if (btn && !o.owned){ if (o.afford === false){ btn.disabled = true; wallTap(card, btn, o.wallItem || o.name, o.wallCost || 0, o.wallCur || 'gems'); } else if (o.onBuy) btn.addEventListener('click', o.onBuy); }
  return card;
}
function chestTile(kind){
  const c = CHESTS[kind]; const tile = document.createElement('div'); tile.className = 'chest-tile'; tile.style.setProperty('--acc', c.accent);
  const price = c.priceGems ? `${ICON_GEM}${c.priceGems}` : `${ICON_COIN}${c.priceCoins}`; const afford = c.priceGems ? Meta.gems >= c.priceGems : Meta.coins >= c.priceCoins;
  tile.innerHTML = `<div class="ct-ico">${ICON_CHEST}</div><b class="ct-name">${c.short}</b><span class="ct-tag">${c.rarity}</span><button class="sc-buy"${afford ? '' : ' disabled'}>${price}</button>`;
  if (afford) tile.querySelector('.sc-buy').addEventListener('click', () => buyChest(kind)); else wallTap(tile, tile.querySelector('.sc-buy'), 'chest:' + kind, c.priceGems || c.priceCoins, c.priceGems ? 'gems' : 'coins');
  return tile;
}
let _lastTxId = '';
function buyChest(kind){
  const c = CHESTS[kind];
  if (c.priceGems && Meta.gems < c.priceGems){ trkNoFunds('chest:' + kind, c.priceGems, 'gems'); return; }
  if (c.priceCoins && Meta.coins < c.priceCoins){ trkNoFunds('chest:' + kind, c.priceCoins, 'coins'); return; }
  if (c.priceGems) Meta.gems -= c.priceGems; else Meta.coins -= c.priceCoins; Meta.save();
  trkSpend(c.priceGems ? 'gems' : 'coins', c.priceGems || c.priceCoins, 'chest:' + kind); trk('chest_open', { kind: kind, rarity: String(c.rarity || ''), pay: c.priceGems ? 'gems' : 'coins' });
  showRewardModal({ icon: ICON_CHEST, accent: c.accent, title: c.name, tag: c.rarity.toUpperCase(), desc: 'You cracked it open!', coins: randInt(c.coins[0], c.coins[1]), gems: randInt(c.gems[0], c.gems[1]), bombs: randInt(c.bombs[0], c.bombs[1]) },
    () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); });
}
function claimDaily(){ if (Meta.dailyDay >= dayNum()) return; Meta.dailyDay = dayNum(); Meta.save(); trk('claim', { what: 'daily_chest', pay: 'free' });
  showRewardModal({ icon: ICON_GIFT, accent: '#ffd24a', title: 'DAILY REWARD', tag: 'COME BACK TOMORROW', desc: 'Your free daily chest!', coins: Math.round(randInt(80, 140) * levelCoinMul(Meta.level)), gems: randInt(2, 4) }, () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); }); }
function openAdChest(){ rollShopDay(); if (Meta.adChestUsed >= AD_CHEST_MAX) return;
  playRewardedAd(() => { Meta.adChestUsed = (Meta.adChestUsed || 0) + 1; Meta.save(); trk('claim', { what: 'ad_chest', pay: 'ad', used_today: Meta.adChestUsed | 0 });
    showRewardModal({ icon: ICON_CHEST, accent: '#7cd84e', title: 'AD CHEST', tag: 'FREE LOOT', desc: 'Thanks for watching!', coins: Math.round(randInt(50, 110) * levelCoinMul(Meta.level)), gems: randInt(0, 1) }, () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); }); }, null, 'shop_chest'); }
function claimAdCoins(){ rollShopDay(); if (Meta.adCoinUsed >= AD_COIN_MAX){ trkAdClick('shop_coins', 'cap_reached'); return; }
  playRewardedAd(() => { const r = adCoinReward(); Meta.adCoinUsed = (Meta.adCoinUsed || 0) + 1; Meta.coins += r; Meta.save(); trkEarn('coins', r, 'ad_shop_coins'); trk('claim', { what: 'ad_coins', pay: 'ad', used_today: Meta.adCoinUsed | 0 }); refreshShop(); refreshMenu(); }, null, 'shop_coins'); }
function claimAdGems(){ rollShopDay(); if (Meta.adGemUsed >= AD_GEM_MAX){ trkAdClick('shop_gems', 'cap_reached'); return; }
  playRewardedAd(() => { Meta.adGemUsed = (Meta.adGemUsed || 0) + 1; Meta.gems += AD_GEM_REWARD; Meta.save(); trkEarn('gems', AD_GEM_REWARD, 'ad_shop_gems'); trk('claim', { what: 'ad_gems', pay: 'ad', used_today: Meta.adGemUsed | 0 }); refreshShop(); refreshMenu(); }, null, 'shop_gems'); }
function buildFreeTab(body){
  body.appendChild(shopHead('Daily reward'));
  const claimable = Meta.dailyDay < dayNum(), msLeft = (dayNum() + 1) * DAY_MS - Date.now();
  body.appendChild(shopCard({ icon: ICON_GIFT, name: 'DAILY CHEST', desc: claimable ? 'Free gold + gems, every day' : 'Come back tomorrow', badge: claimable ? 'FREE' : '', accent: '#ffd24a', owned: !claimable, ownedLabel: '⏳ ' + fmtCountdown(msLeft), priceHtml: 'CLAIM', onBuy: claimDaily }));
  body.appendChild(shopHead('Watch & earn'));
  const chestLeft = Math.max(0, AD_CHEST_MAX - (Meta.adChestUsed || 0));
  body.appendChild(shopCard({ icon: ICON_CHEST, name: 'AD CHEST', desc: 'Open a free box — watch a short ad', accent: '#7cd84e', owned: chestLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ ${chestLeft} LEFT`, onBuy: openAdChest }));
  const coinLeft = Math.max(0, AD_COIN_MAX - (Meta.adCoinUsed || 0));
  body.appendChild(shopCard({ icon: ICON_COIN, name: 'FREE GOLD', desc: `Watch an ad for +${adCoinReward()} gold`, accent: '#7cd84e', owned: coinLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ +${adCoinReward()}`, onBuy: claimAdCoins }));
  const gemLeft = Math.max(0, AD_GEM_MAX - (Meta.adGemUsed || 0));
  body.appendChild(shopCard({ icon: ICON_GEM, name: 'FREE GEMS', desc: `Watch an ad for +${AD_GEM_REWARD} gems`, accent: '#b15ce8', owned: gemLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ +${AD_GEM_REWARD}`, onBuy: claimAdGems }));
  regenTickets();
  body.appendChild(shopCard({ icon: '🎫', name: 'FREE TICKET', desc: `Watch an ad for +1 battle ticket (${Meta.pticket}/${PT_MAX})`, accent: '#7cd84e', owned: Meta.pticket >= PT_MAX, ownedLabel: 'FULL', priceHtml: '▶ +1', onBuy: () => playRewardedAd(() => { grantTicket(1); trk('claim', { what: 'ticket', pay: 'ad' }); refreshShop(); }, null, 'shop_ticket') }));
}
function buildItemsTab(body){
  body.appendChild(shopHead('Air Strikes · 💣'));
  const packs = [ { n: 1, gems: BOMB_GEMS }, { n: 5, gems: 60, badge: '-20%' }, { n: 12, gems: 120, badge: 'BEST' } ];
  for (const p of packs) body.appendChild(shopCard({ icon: '💣', name: `AIR STRIKE ×${p.n}`, desc: `Drop an enemy tower to 0 · you have ${Meta.bombs}`, badge: p.badge, accent: '#ff7a45', priceHtml: `${ICON_GEM}${p.gems}`, afford: Meta.gems >= p.gems, wallItem: 'bombs' + p.n, wallCost: p.gems, wallCur: 'gems',
    onBuy: () => { if (Meta.gems < p.gems){ trkNoFunds('bombs' + p.n, p.gems, 'gems'); return; } Meta.gems -= p.gems; Meta.bombs += p.n; Meta.save(); trkSpend('gems', p.gems, 'bombs' + p.n); SFX.play('coin'); refreshShop(); refreshMenu(); } }));
  body.appendChild(shopHead('Boosts'));
  const active = Meta.boostUntil && Date.now() < Meta.boostUntil;
  body.appendChild(shopCard({ icon: '⚡', name: 'GOLD RUSH', desc: active ? boostLeftText() : '1.5× gold from battles · 30 min', accent: '#7cd84e', owned: !!active, ownedLabel: 'ACTIVE', priceHtml: `${ICON_GEM}20`, wallItem: 'gold_rush', wallCost: 20, wallCur: 'gems', afford: Meta.gems >= 20,
    onBuy: () => { if (Meta.gems < 20){ trkNoFunds('gold_rush', 20, 'gems'); return; } Meta.gems -= 20; Meta.boostUntil = Date.now() + 30 * 60 * 1000; Meta.save(); trkSpend('gems', 20, 'gold_rush'); refreshShop(); refreshMenu(); } }));
  body.appendChild(shopCard({ icon: '🎟️', name: 'SKIP TICKETS ×3', desc: `Skip a level you’re stuck on (defeat card)${Meta.tickets ? ` · you have ${Meta.tickets}` : ''}`, accent: '#b15ce8', priceHtml: `${ICON_GEM}60`, wallItem: 'skip_tickets3', wallCost: 60, wallCur: 'gems', afford: Meta.gems >= 60,
    onBuy: () => { if (Meta.gems < 60){ trkNoFunds('skip_tickets3', 60, 'gems'); return; } Meta.gems -= 60; Meta.tickets = (Meta.tickets || 0) + 3; Meta.save(); trkSpend('gems', 60, 'skip_tickets3'); refreshShop(); refreshMenu(); } }));
}
const IAP = [
  { key: 'gems1', id: '100gems',   type: 'consumable',     gems: 100 },
  { key: 'gems2', id: '700gems',   type: 'consumable',     gems: 700 },
  { key: 'gems3', id: '1600gems',  type: 'consumable',     gems: 1600 },
  { key: 'mega',  id: 'megachest', type: 'consumable',     special: 'mega' },
  { key: 'noads', id: 'roads',     type: 'non-consumable', special: 'noads' },
  { key: 'starter', id: 'starterpack', type: 'non-consumable', special: 'starter' },
];
function grantIap(pr, tx){
  if (!pr) return; Meta.iaps = (Meta.iaps | 0) + 1;
  trk('iap', { product_id: String(pr.id || pr.key || ''), item_name: String(pr.key || ''), special: String(pr.special || 'currency'), gems: pr.gems | 0, coins: pr.coins | 0 });
  const info = (window.TDSIAP && TDSIAP.priceInfo) ? TDSIAP.priceInfo(pr.id) : null;
  if (info && info.value > 0){ const txid = String((tx && (tx.transactionId || tx.id)) || (pr.id + '_' + Meta.iaps)); if (txid !== _lastTxId){ _lastTxId = txid; trk('purchase', { transaction_id: txid, value: info.value, currency: info.currency || 'USD', items: [{ item_id: String(pr.id || ''), item_name: String(pr.key || ''), price: info.value, quantity: 1 }] }); } }
  trkPaywallClose(); trkProfile();
  if (pr.special === 'mega'){ showRewardModal({ icon: ICON_CHEST, accent: '#F4B731', title: 'MEGA CHEST', tag: 'JACKPOT', desc: 'Huge haul!', coins: randInt(6000, 11000), gems: randInt(40, 80), bombs: 5, adDouble: false }, () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); }); return; }
  if (pr.special === 'noads'){ Meta.noAds = true; Meta.gems += 300; try { if (window.AdBridge && AdBridge.banner) AdBridge.banner.refresh(); } catch (e) {} }
  else if (pr.special === 'starter'){ Meta.starterBought = true; Meta.gems += 500; Meta.coins += 5000; const sm = $('starterModal'); if (sm) sm.classList.remove('active'); }
  else { Meta.gems += (pr.gems || 0); Meta.coins += (pr.coins || 0); }
  buzz('success'); SFX.play('coin'); Meta.save(); refreshShop(); refreshMenu();
}
function buyIap(key, place){
  const pr = IAP.find(p => p.key === key) || {}; const info = (window.TDSIAP && TDSIAP.priceInfo) ? TDSIAP.priceInfo(pr.id) : null;
  if (_pw) _pw.buy = 1;
  trk('purchase_start', { product_id: String(pr.id || key), item_name: String(key), place: place || (_pw ? _pw.place : 'unknown'), price: (info && info.price) || '', value: info ? info.value : 0, currency: (info && info.currency) || '' });
  if (!window.TDSIAP){ trkPurchaseError('iap-unavailable', pr.id || key, place); return; }
  TDSIAP.buy(key).catch(e => trkPurchaseError(e, pr.id || key, place));
}
function iapPrice(key, fallback){ const pr = IAP.find(p => p.key === key); const live = pr && window.TDSIAP && TDSIAP.price(pr.id); return live || fallback; }
if (window.TDSIAP) TDSIAP.configure(IAP, grantIap);
document.addEventListener('tds-iap-error', e => { const d = (e && e.detail) || {}; trkPurchaseError({ code: d.code, message: d.message }, d.productId); });
function buildBoxesTab(body){
  body.appendChild(shopHead('Loot chests'));
  const grid = document.createElement('div'); grid.className = 'chest-grid'; grid.appendChild(chestTile('legendary')); grid.appendChild(chestTile('rare')); grid.appendChild(chestTile('common')); body.appendChild(grid);
  body.appendChild(shopHead('Mega deal'));
  body.appendChild(shopCard({ icon: ICON_CHEST, name: 'MEGA CHEST', desc: '6000–11000 gold + 40–80 gems + 5 💣', badge: 'BEST', accent: '#F4B731', priceHtml: iapPrice('mega', '$2.99'), onBuy: () => buyIap('mega', 'shop_boxes') }));
}
function buildCoinsTab(body){
  body.appendChild(shopHead('Buy gold with 💎'));
  const packs = [ { name: 'POUCH OF GOLD', coins: 1000, gems: 12 }, { name: 'BAG OF GOLD', coins: 4000, gems: 40, badge: '+10%' }, { name: 'VAULT OF GOLD', coins: 12000, gems: 100, badge: 'BEST' } ];
  for (const p of packs) body.appendChild(shopCard({ icon: ICON_COIN, name: p.name, desc: `${p.coins.toLocaleString()} gold`, badge: p.badge, accent: '#ffd24a', priceHtml: `${ICON_GEM}${p.gems}`, wallItem: 'coinpack:' + p.coins, wallCost: p.gems, wallCur: 'gems', afford: Meta.gems >= p.gems,
    onBuy: () => { if (Meta.gems < p.gems){ trkNoFunds('coinpack:' + p.coins, p.gems, 'gems'); return; } Meta.gems -= p.gems; Meta.coins += p.coins; Meta.save(); trkSpend('gems', p.gems, 'coinpack:' + p.coins); trkEarn('coins', p.coins, 'gem_coinpack'); refreshShop(); refreshMenu(); } }));
}
function buildGemsTab(body){
  if (!Meta.starterBought){ body.appendChild(shopHead('One-time offer')); body.appendChild(shopCard({ icon: '🎁', name: 'STARTER PACK', desc: '500 💎 + 5,000 gold · one time only', badge: '-80%', accent: '#ff7a45', priceHtml: iapPrice('starter', '$2.99'), onBuy: () => buyIap('starter', 'shop_gems') })); }
  body.appendChild(shopHead('Get gems'));
  const packs = [ { name: 'PILE OF GEMS', gems: 100, price: '$1.99', key: 'gems1' }, { name: 'SACK OF GEMS', gems: 700, price: '$4.99', badge: '+100 BONUS', key: 'gems2' }, { name: 'CHEST OF GEMS', gems: 1600, price: '$9.99', badge: 'BEST VALUE', key: 'gems3' } ];
  for (const p of packs) body.appendChild(shopCard({ icon: '💎', name: p.name, desc: `${p.gems} gems`, badge: p.badge, accent: '#b15ce8', priceHtml: iapPrice(p.key, p.price), onBuy: () => buyIap(p.key, 'shop_gems') }));
  body.appendChild(shopHead('Specials'));
  body.appendChild(shopCard({ icon: '🚫', name: 'NO-ADS BUNDLE', desc: 'Remove forced ads + 300 💎', badge: 'VALUE', accent: '#ffd24a', owned: Meta.noAds, ownedLabel: 'OWNED', priceHtml: iapPrice('noads', '$4.99'), onBuy: () => buyIap('noads', 'shop_gems') }));
  if (window.TDSIAP && TDSIAP.native){ const rb = document.createElement('button'); rb.textContent = '↻ Restore Purchases'; rb.style.cssText = 'display:block;margin:14px auto 6px;padding:8px 18px;background:none;border:none;color:#9fb7d8;font:inherit;font-size:14px;font-weight:700;text-decoration:underline;cursor:pointer;'; rb.onclick = () => { rb.textContent = 'Restoring…'; TDSIAP.restore().then(() => refreshShop()).catch(() => refreshShop()); }; body.appendChild(rb); }
}
function refreshShop(){
  rollShopDay(); $('sh_coins').textContent = kfmt(Meta.coins); $('sh_gems').textContent = Meta.gems;
  document.querySelectorAll('.shtab[data-tab]').forEach(t => t.classList.toggle('cur', t.dataset.tab === shopTab));
  const body = $('shopBody'); if (!body) return; body.innerHTML = '';
  if (shopTab === 'free'){ trkPaywallClose(); buildFreeTab(body); }
  else { trkPaywallOpen('shop_' + shopTab); if (shopTab === 'boxes') buildBoxesTab(body); else if (shopTab === 'coins') buildCoinsTab(body); else if (shopTab === 'power') buildItemsTab(body); else buildGemsTab(body); }
}

/* ============================================================================================
   LEVELS (region map) · TROOPS · PVP · SPECIAL OPS
   ============================================================================================ */
let regionShown = 0;
function refreshLevels(){
  $('lv_coins').textContent = kfmt(Meta.coins);
  if (!regionShown) regionShown = regionOf(Meta.level).id;
  const tabs = $('regionTabs'); tabs.innerHTML = '';
  for (const R of REGIONS){ const unlocked = Meta.unlocked > (R.id - 1) * REGION_SIZE; const b = document.createElement('button'); b.className = 'rtab' + (R.id === regionShown ? ' cur' : '') + (unlocked ? '' : ' lock'); b.textContent = R.emoji; b.title = R.name; b.disabled = !unlocked; b.addEventListener('click', () => { regionShown = R.id; refreshLevels(); }); tabs.appendChild(b); }
  const R = REGIONS[regionShown - 1]; $('lv_title').textContent = R.name;
  const wrap = $('levelMap'); wrap.innerHTML = ''; wrap.style.setProperty('--rg', R.ground);
  for (let i = 1; i <= REGION_SIZE; i++){
    const id = (R.id - 1) * REGION_SIZE + i, locked = id > Meta.unlocked, cur = id === Meta.unlocked, done = !!Meta.cleared[id];
    const b = document.createElement('button'); b.className = 'lnode' + (locked ? ' locked' : '') + (cur ? ' current' : '') + (done ? ' done' : '');
    b.innerHTML = `<b>${locked ? '🔒' : i}</b>` + (done ? '<i>✓</i>' : '') + (INTRO[id] && !locked ? `<em>${INTRO[id].emoji}</em>` : '');
    b.disabled = locked; b.addEventListener('click', () => { Meta.level = id; Meta.save(); launchLevel(); }); wrap.appendChild(b);
  }
}
/* troops */
let troopTab = 'soldier';
function refreshTroops(){
  $('tr_gems').textContent = Meta.gems;
  document.querySelectorAll('.shtab[data-ttab]').forEach(t => t.classList.toggle('cur', t.dataset.ttab === troopTab));
  const body = $('troopBody'); body.innerHTML = '';
  for (const t of TROOPS.filter(x => x.kind === troopTab)){
    const s = Meta.troops[t.id], owned = !!s, eq = Meta[troopTab] === t.id;
    const card = document.createElement('div'); card.className = 'troop-card' + (eq ? ' equipped' : '') + (owned ? '' : ' locked'); card.style.setProperty('--rc', RARITY_COL[t.rarity]);
    const lv = owned ? s.lv : 1, cost = troopCost(lv), needCopy = owned && troopNeedsCopy(lv), copies = owned ? (s.n | 0) : 0;
    const str = Math.round(RARITY_MULT[t.rarity] * (1 + 0.08 * (lv - 1)) * 100);
    card.innerHTML = `<div class="tc-art">${TroopArt.svg(t, owned ? '#3b8bff' : '#6b7480')}</div>
      <div class="tc-info"><span class="tc-rar">${t.rarity}</span><b class="tc-name">${t.name}</b><span class="tc-desc">${t.desc}</span>
        <span class="tc-stats">💪 ${str}% · 🏃 ${Math.round(t.spd * 100)}%${owned ? ` · Lv ${lv}` : ''}${owned && copies ? ` · 📇 ${copies}` : ''}</span></div>
      <div class="tc-acts">${owned ? `<button class="tc-btn eq${eq ? ' on' : ''}">${eq ? '✓ EQUIPPED' : 'EQUIP'}</button>
        ${lv >= TROOP_MAX ? '<button class="tc-btn up" disabled>MAX</button>' : `<button class="tc-btn up"${(Meta.coins < cost || (needCopy && copies < 1)) ? ' disabled' : ''}>⬆ ${ICON_COIN}${kfmt(cost)}${needCopy ? ' + 📇1' : ''}</button>`}`
        : '<button class="tc-btn eq" disabled>🎲 SUMMON TO UNLOCK</button>'}</div>`;
    if (owned){ card.querySelector('.eq').addEventListener('click', () => { Meta[troopTab] = t.id; Meta.save(); SFX.play('deploy'); refreshTroops(); }); const up = card.querySelector('.up'); if (up && !up.disabled) up.addEventListener('click', () => upgradeTroop(t.id)); }
    body.appendChild(card);
  }
  const sb = $('summonBtn'); if (sb) sb.disabled = Meta.gems < SUMMON_COST;
}
function upgradeTroop(id){
  const s = Meta.troops[id]; if (!s || s.lv >= TROOP_MAX) return; const cost = troopCost(s.lv);
  if (Meta.coins < cost){ trkNoFunds('troop:' + id, cost, 'coins'); return; }
  if (troopNeedsCopy(s.lv)){ if ((s.n | 0) < 1){ hint('Need a copy — summon more!'); return; } s.n--; }
  Meta.coins -= cost; s.lv++; Meta.save(); SFX.play('coin'); buzz('light'); missionEvent('upgrade', 1);
  trkUpgrade('troop', id, s.lv, cost, 'coins'); refreshTroops(); refreshMenu();
}
function summon(){
  if (Meta.gems < SUMMON_COST){ trkNoFunds('summon', SUMMON_COST, 'gems'); shopTab = 'gems'; show('shop'); return; }
  Meta.gems -= SUMMON_COST; trkSpend('gems', SUMMON_COST, 'summon');
  let r = Math.random() * 100, rarity = 'Common'; for (const k of RARITIES){ r -= SUMMON_W[k]; if (r <= 0){ rarity = k; break; } }
  const pool = TROOPS.filter(t => t.rarity === rarity); const t = pool[Math.floor(Math.random() * pool.length)];
  const had = !!Meta.troops[t.id];
  if (had) Meta.troops[t.id].n = (Meta.troops[t.id].n | 0) + 1; else Meta.troops[t.id] = { lv: 1, n: 0 };
  Meta.save(); trk('summon', { troop: t.id, rarity: rarity, dup: had ? 1 : 0 }); SFX.play(had ? 'coin' : 'win'); buzz('success');
  $('smHead').textContent = had ? 'COPY FOUND!' : 'NEW TROOP!'; $('smTitle').textContent = t.name.toUpperCase(); $('smTag').textContent = rarity.toUpperCase(); $('smTag').style.background = RARITY_COL[rarity];
  $('smDesc').textContent = had ? `Another ${t.name} — copies are used for upgrades past Lv ${COPY_FROM}. (You have ${Meta.troops[t.id].n})` : t.desc;
  const ic = $('smIcon'); ic.innerHTML = TroopArt.svg(t, '#3b8bff'); ic.style.setProperty('--acc', RARITY_COL[rarity]);
  $('smAgain').disabled = Meta.gems < SUMMON_COST; $('summonModal').classList.add('active'); refreshTroops(); refreshMenu();
}
/* pvp */
const BOT_NAMES = ['Ivan', 'Mei', 'Carlos', 'Aisha', 'Lukas', 'Sofia', 'Kenji', 'Amara', 'Diego', 'Zara', 'Noah', 'Priya', 'Omar', 'Elena', 'Jonas', 'Yuki', 'Leo', 'Nadia', 'Tariq', 'Mila'];
let botCache = null;
function currentBot(){
  const seed = (Meta.pvpSeed | 0) * 1000 + (Meta.lp | 0); if (botCache && botCache.seed === seed) return botCache;
  const rnd = mulberry(seed + 77);
  const mySol = Meta.troops[Meta.soldier].lv, myTnk = Meta.troops[Meta.tank].lv;
  const sol = TROOPS.filter(t => t.kind === 'soldier')[Math.min(4, Math.floor(rnd() * (1 + Meta.lp / 350)))], tnk = TROOPS.filter(t => t.kind === 'tank')[Math.min(4, Math.floor(rnd() * (1 + Meta.lp / 350)))];
  const solLv = Math.max(1, mySol + Math.floor(rnd() * 7) - 3), tnkLv = Math.max(1, myTnk + Math.floor(rnd() * 7) - 3);
  const mult = (RARITY_MULT[sol.rarity] * (1 + 0.08 * (solLv - 1)) + RARITY_MULT[tnk.rarity] * (1 + 0.08 * (tnkLv - 1))) / 2;
  botCache = { seed, name: BOT_NAMES[Math.floor(rnd() * BOT_NAMES.length)] + Math.floor(100 + rnd() * 900), lp: Math.max(0, (Meta.lp | 0) + Math.floor(rnd() * 80) - 40), sol, tnk, solLv, tnkLv, mult, mapSeed: Math.floor(rnd() * 1e9) };
  return botCache;
}
function refreshPvp(){
  const b = currentBot(), me = leagueOf(Meta.lp), next = LEAGUES.find(L => L.at > Meta.lp);
  $('pv_lp').textContent = Meta.lp;
  $('leagueCard').innerHTML = `<span class="lg-badge" style="--lc:${me.c}">🏆</span><div class="lg-txt"><b>${me.n.toUpperCase()} LEAGUE</b><span>${Meta.lp} points · ${Meta.pvpWins | 0}W / ${Meta.pvpLosses | 0}L</span>${next ? `<span class="lg-next">${next.at - Meta.lp} pts to ${next.n}</span>` : '<span class="lg-next">Top league!</span>'}</div>`;
  const mySol = troopById(Meta.soldier), myTnk = troopById(Meta.tank);
  const side = (name, lp, s, sl, t, tl, blue) => `<div class="vs-side"><b>${name}</b><span>🏆 ${lp}</span><div class="vs-troops"><span class="vs-t" style="--rc:${RARITY_COL[s.rarity]}">${TroopArt.svg(s, blue ? '#3b8bff' : '#ff5252')}<i>Lv ${sl}</i></span><span class="vs-t" style="--rc:${RARITY_COL[t.rarity]}">${TroopArt.svg(t, blue ? '#3b8bff' : '#ff5252')}<i>Lv ${tl}</i></span></div></div>`;
  $('vsRow').innerHTML = side(Meta.name || 'YOU', Meta.lp, mySol, Meta.troops[mySol.id].lv, myTnk, Meta.troops[myTnk.id].lv, true) + '<div class="vs-x">VS</div>' + side(b.name, b.lp, b.sol, b.solLv, b.tnk, b.tnkLv, false);
}
function pvpFight(){
  const b = currentBot();
  if (!spendTicket()){ openTicketModal(); return; }
  startRun({ level: Math.max(5, Meta.unlocked), mode: 'pvp', gen: { pvp: true, seed: b.mapSeed, botMult: b.mult } });
  state.genOpts = { pvp: true, seed: b.mapSeed, botMult: b.mult };
}
/* special ops */
const OPS = [
  { id: 'op1', name: 'GATE RUNNER',   L: 6,  gates: true,  gold: 300,  gems: 8,  unlock: 5,  desc: 'Multiplier gates on the field — route your troops through the good ones.' },
  { id: 'op2', name: 'BLITZ',         L: 10, timer: 60,    gold: 400,  gems: 10, unlock: 8,  desc: 'Win in 60 seconds or lose the map.' },
  { id: 'op3', name: 'MINEFIELD',     L: 24, gold: 600,    gems: 12, unlock: 15, desc: 'A field sown with mines. Watch your step.' },
  { id: 'op4', name: 'DOUBLE TROUBLE',L: 30, gold: 800,    gems: 14, unlock: 20, desc: 'Two rival armies. Let them fight, then strike.' },
  { id: 'op5', name: 'GATE STORM',    L: 38, gates: true, timer: 90, gold: 1000, gems: 16, unlock: 28, desc: 'Gates AND a clock. Think fast.' },
  { id: 'op6', name: 'FORTRESS',      L: 45, gold: 1400,   gems: 20, unlock: 36, desc: 'A fort with a rocket battery behind it.' },
  { id: 'op7', name: 'IRON RUSH',     L: 58, timer: 75,    gold: 1800, gems: 24, unlock: 45, desc: 'Factories everywhere and no time to waste.' },
  { id: 'op8', name: 'LAST STAND',    L: 75, gates: true,  gold: 2500, gems: 30, unlock: 60, desc: 'Three armies, gates, and a fort. The final exam.' },
];
function refreshOps(){
  $('ms_coins').textContent = kfmt(Meta.coins);
  const w = $('opsWrap'); w.innerHTML = '';
  OPS.forEach((op, i) => {
    const locked = Meta.unlocked < op.unlock, done = !!Meta.ops[op.id];
    const c = document.createElement('div'); c.className = 'op-card' + (locked ? ' locked' : '') + (done ? ' done' : '');
    c.innerHTML = `<div class="op-ico">${locked ? '🔒' : done ? '🎖️' : ['🚪', '⏱️', '💥', '⚔️', '🌪️', '🏯', '⚙️', '☠️'][i]}</div><div class="op-txt"><b>${op.name}</b><span>${locked ? `Reach level ${op.unlock} to unlock` : op.desc}</span>
      <span class="op-rew">${done ? 'Replay · ' + ICON_COIN + Math.round(op.gold * 0.2) : ICON_COIN + op.gold + ' &nbsp;' + ICON_GEM + op.gems + ' &nbsp;💣1'}${op.timer ? ' · ⏱ ' + op.timer + 's' : ''}</span></div><button class="tc-btn eq"${locked ? ' disabled' : ''}>${done ? 'REPLAY' : 'DEPLOY'}</button>`;
    if (!locked) c.querySelector('button').addEventListener('click', () => { if (!spendTicket()){ openTicketModal(); return; } const gen = { seed: 5000 + i * 97, gates: !!op.gates }; startRun({ level: op.L, mode: 'ops', op, gen, timer: op.timer || 0 }); state.genOpts = gen; });
    w.appendChild(c);
  });
}
/* profile */
function openProfile(){
  const p = playerLevel(); $('pfTitle').textContent = `${Meta.name ? Meta.name.toUpperCase() : 'COMMANDER'} · Lv ${p.n}`; $('pfXp').style.width = (p.xp / p.need * 100) + '%';
  $('pfStats').innerHTML = [['⚔️ Battles', Meta.games | 0], ['🏆 Wins', Meta.wins | 0], ['🏰 Towers captured', Meta.capturesTotal | 0], ['💀 Troops destroyed', Meta.killsTotal | 0], ['🗺️ Levels cleared', Object.keys(Meta.cleared).length], ['🥇 League', leagueOf(Meta.lp).n + ' · ' + Meta.lp]].map(([k, v]) => `<div class="pf-row"><span>${k}</span><b>${v}</b></div>`).join('');
  $('profileModal').classList.add('active');
}

/* ---- daily quests UI ---- */
function refreshMissionDot(){ const d = $('missionDot'); if (d) d.style.display = missionClaimable() ? '' : 'none'; }
function openMissions(){
  const modal = $('missionModal'), listEl = $('missionList'); if (!modal || !listEl) return; const m = missionsToday(), list = currentMissions(); listEl.innerHTML = '';
  list.forEach((ms, i) => { const prog = Math.min(ms.target, m.prog[i] | 0), done = prog >= ms.target, claimed = m.claimed[i]; const pct = Math.round(prog / ms.target * 100);
    const row = document.createElement('div'); row.className = 'mission-row' + (claimed ? ' claimed' : '');
    row.innerHTML = `<span class="mi-ico">${ms.icon}</span><span class="mi-mid"><b>${ms.text}</b><span class="mi-bar"><i style="width:${pct}%"></i></span><em>${prog} / ${ms.target}</em></span>` + (claimed ? `<span class="mi-claim done">✓</span>` : `<button class="mi-claim${done ? '' : ' locked'}"${done ? '' : ' disabled'}>${ICON_GEM}${ms.gems}</button>`);
    if (done && !claimed){ const b = row.querySelector('button'); if (b) b.addEventListener('click', () => claimMission(i)); } listEl.appendChild(row); });
  modal.classList.add('active');
}
function claimMission(i){ const m = missionsToday(), ms = currentMissions()[i]; if (!ms || (m.prog[i] | 0) < ms.target || m.claimed[i]) return; m.claimed[i] = true; Meta.gems += ms.gems; SFX.play('coin'); Meta.save(); trk('claim', { what: 'mission', pay: 'free', slot: i, gems: ms.gems | 0 }); trkEarn('gems', ms.gems, 'mission'); openMissions(); refreshMenu(); refreshMissionDot(); }
/* ---- leaderboard (Firestore) ---- */
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function ensureName(cb){ const modal = $('nameModal'), inp = $('nameInput'); if (!modal || !inp){ cb && cb(); return; } inp.value = Meta.name || '';
  $('nameSave').onclick = () => { Meta.name = (inp.value || '').trim().slice(0, 16) || 'Player'; Meta.save(); modal.classList.remove('active'); if (window.TDSLeaderboard && TDSLeaderboard.ready) TDSLeaderboard.submit(Meta.name, Meta.bestScore); cb && cb(); }; modal.classList.add('active'); try { inp.focus(); } catch (e) {} }
function rcNum(key, dflt){ try { if (window.TDSRemoteConfig && TDSRemoteConfig.on){ const v = TDSRemoteConfig.getNumber(key); if (v > 0) return v; } } catch(e){} return dflt; }
function monthPrize(rank){ return rank >= 1 && rank <= 3 ? rcNum('month_prize_top3', 1000) : (rank >= 4 && rank <= 10 ? rcNum('month_prize_top10', 300) : 0); }
function weekPrize(rank){ return rank >= 1 && rank <= 3 ? rcNum('week_prize_top3', 300) : (rank >= 4 && rank <= 10 ? rcNum('week_prize_top10', 100) : 0); }
function settleContest(prevKey, claimedField, topFn, prizeFn, label){
  const LB = window.TDSLeaderboard; if (!LB || !LB.ready) return; if (Meta[claimedField] === prevKey) return; const me = LB.uid(); if (!me) return;
  topFn(prevKey, 10).then(rows => { if (!rows) return; Meta[claimedField] = prevKey; let rank = 0; rows.forEach((r, i) => { if (r.uid === me) rank = i + 1; }); const gems = prizeFn(rank);
    if (gems){ Meta.gems += gems; SFX.play('coin'); const sub = $('monthSub'), g = $('monthGems'), m = $('monthModal'); if (sub) sub.textContent = `You finished #${rank} in last ${label}'s contest!`; if (g) g.textContent = `+${gems} 💎`; if (m) m.classList.add('active'); refreshMenu(); } Meta.save(); });
}
function checkMonthReward(){ const LB = window.TDSLeaderboard; if (!LB || !LB.ready) return; settleContest(LB.prevMonthKey(), 'monthClaimed', (k, n) => LB.topMonthly(k, n), monthPrize, 'month'); settleContest(LB.prevWeekKey(), 'weekClaimed', (k, n) => LB.topWeekly(k, n), weekPrize, 'week'); }
let lbTab = 'month';
function daysLeftInMonth(){ const d = new Date(); return Math.max(1, Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 1) - d) / 86400000)); }
function daysLeftInWeek(){ const dn = new Date().getDay() || 7; return Math.max(1, 8 - dn); }
function openLeaderboard(){ if (!window.TDSLeaderboard || !TDSLeaderboard.ready) return; if (!Meta.name){ ensureName(openLeaderboard); return; } const modal = $('lbModal'); if (!modal) return; modal.classList.add('active'); checkMonthReward(); renderLb(); }
function renderLb(){
  const list = $('lbList'), you = $('lbYou'), foot = $('lbFoot'), prizes = $('lbPrizes'); const tw = $('lbTabWeek'), tm = $('lbTabMonth'), ta = $('lbTabAll'); if (!list || !you) return;
  if (tw) tw.classList.toggle('active', lbTab === 'week'); if (tm) tm.classList.toggle('active', lbTab === 'month'); if (ta) ta.classList.toggle('active', lbTab === 'all');
  if (prizes){ prizes.style.display = lbTab === 'all' ? 'none' : ''; const top3 = lbTab === 'week' ? weekPrize(1) : monthPrize(1), top10 = lbTab === 'week' ? weekPrize(4) : monthPrize(4); prizes.innerHTML = `🥇🥈🥉 <b>${top3}</b> 💎 &nbsp;•&nbsp; #4–10 <b>${top10}</b> 💎`; }
  list.innerHTML = '<div class="lb-empty">Loading…</div>'; you.textContent = ''; you.className = 'lb-you'; const me = TDSLeaderboard.uid();
  if (lbTab === 'week'){ const wk = TDSLeaderboard.weekKey(); const mine = (Meta.weekScore && Meta.weekScore.w === wk) ? (Meta.weekScore.total | 0) : 0; if (mine > 0) TDSLeaderboard.submitWeekly(Meta.name, mine, wk); if (foot) foot.textContent = `Total score this week · ends in ${daysLeftInWeek()}d · prizes paid Monday`; TDSLeaderboard.topWeekly(wk, 100).then(rows => fillLbRows(list, you, rows || [], me, 'total', mine, weekPrize)); }
  else if (lbTab === 'month'){ const mk = TDSLeaderboard.monthKey(); const mine = (Meta.monthScore && Meta.monthScore.m === mk) ? (Meta.monthScore.total | 0) : 0; if (mine > 0) TDSLeaderboard.submitMonthly(Meta.name, mine, mk); if (foot) foot.textContent = `Total score this month · ends in ${daysLeftInMonth()}d · prizes paid on the 1st`; TDSLeaderboard.topMonthly(mk, 100).then(rows => fillLbRows(list, you, rows || [], me, 'total', mine, monthPrize)); }
  else { if (foot) foot.textContent = 'Best battle score · updates after each battle'; TDSLeaderboard.submit(Meta.name, Meta.bestScore); TDSLeaderboard.top(100).then(rows => fillLbRows(list, you, rows || [], me, 'score', Meta.bestScore | 0, null)); }
}
function fillLbRows(list, you, rows, me, field, mineVal, prizeFn){
  list.innerHTML = ''; if (!rows.length){ list.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>'; } let myRank = 0;
  rows.forEach((r, i) => { const isMe = me && r.uid === me; if (isMe) myRank = i + 1; const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1); const row = document.createElement('div'); row.className = 'lb-row' + (isMe ? ' me' : ''); row.innerHTML = `<span class="lb-rank${i < 3 ? ' top' : ''}">${medal}</span><span class="lb-name">${escapeHtml(r.name || 'Player')}</span><span class="lb-score">${(r[field] || 0).toLocaleString()}</span>`; list.appendChild(row); });
  const prize = prizeFn ? prizeFn(myRank) : 0; you.className = 'lb-you' + (myRank ? '' : ' out'); you.innerHTML = `<span>${myRank ? ('YOU · #' + myRank) : 'YOU · unranked'}${prize ? ` · wins ${prize} 💎` : ''}</span><span>${(mineVal || 0).toLocaleString()}</span>`;
}
function checkAchievements(){ const G = window.TDSGames; if (!G || !G.ready) return; if ((Meta.games | 0) >= 100) G.unlock('veteran100'); if ((Meta.killsTotal | 0) >= 1000) G.unlock('kills_1k'); if ((Meta.killsTotal | 0) >= 10000) G.unlock('kills_10k'); if (Object.keys(Meta.troops).length >= 5) G.unlock('heroes_5'); if ((Meta.streak | 0) >= 7) G.unlock('streak_7'); if ((Meta.coins | 0) >= 10000) G.unlock('rich_10k'); }

/* ============================================================================================
   WIRING
   ============================================================================================ */
$('playBtn').addEventListener('click', launchLevel);
$('toShop').addEventListener('click', () => show('shop')); $('toBattle').addEventListener('click', () => show('menu'));
$('toLevels').addEventListener('click', () => { regionShown = regionOf(Meta.level).id; show('levels'); }); $('levelsBack').addEventListener('click', () => show('menu'));
$('toTroops').addEventListener('click', () => show('troops')); $('troopsBack').addEventListener('click', () => show('menu'));
$('toPvp').addEventListener('click', () => show('pvp')); $('pvpBack').addEventListener('click', () => show('menu'));
$('toMissions').addEventListener('click', () => show('missions')); $('missionsBack').addEventListener('click', () => show('menu'));
$('toProfile').addEventListener('click', openProfile); $('pfClose').addEventListener('click', () => $('profileModal').classList.remove('active'));
$('toStreak').addEventListener('click', openStreak); $('streakClaim').addEventListener('click', claimStreak); $('streakDouble').addEventListener('click', streakDoubleAd); $('streakClose').addEventListener('click', closeStreak);
$('loadSoldier').addEventListener('click', () => { troopTab = 'soldier'; show('troops'); }); $('loadTank').addEventListener('click', () => { troopTab = 'tank'; show('troops'); });
$('lc_solUpg').addEventListener('click', e => { e.stopPropagation(); upgradeTroop(Meta.soldier); refreshMenu(); });
$('lc_tnkUpg').addEventListener('click', e => { e.stopPropagation(); upgradeTroop(Meta.tank); refreshMenu(); });
document.querySelectorAll('.shtab[data-ttab]').forEach(t => t.addEventListener('click', () => { troopTab = t.dataset.ttab; refreshTroops(); }));
$('summonBtn').addEventListener('click', summon); $('smOk').addEventListener('click', () => $('summonModal').classList.remove('active')); $('smAgain').addEventListener('click', () => { $('summonModal').classList.remove('active'); summon(); });
$('pvpFight').addEventListener('click', pvpFight); $('pvpReroll').addEventListener('click', () => { Meta.pvpSeed = (Meta.pvpSeed | 0) + 1; Meta.save(); refreshPvp(); });
$('sndBtn').addEventListener('click', toggleSound); $('sndBtn2').addEventListener('click', toggleSound);
{ const mb = $('missionBtn'); if (mb) mb.addEventListener('click', openMissions); const mc = $('missionClose'); if (mc) mc.addEventListener('click', () => $('missionModal').classList.remove('active')); }
{ const lb = $('btnLeaderboard'), ac = $('btnAchievements'), gb = $('gamesBtns');
  if (lb) lb.addEventListener('click', openLeaderboard);
  if (ac){ ac.addEventListener('click', () => { const G = window.TDSGames; if (!G) return; if (G.ready) return G.showAchievements(); if (G.signIn) G.signIn().then(ok => { if (ok) G.showAchievements(); }); }); ac.style.display = (window.TDSGames && TDSGames.available) ? '' : 'none'; }
  const showGames = () => { if (gb) gb.style.display = ''; };
  if (window.TDSLeaderboard && TDSLeaderboard.ready) showGames();
  document.addEventListener('tds-games-ready', () => { showGames(); if (ac) ac.style.display = ''; });
  const lbc = $('lbClose'); if (lbc) lbc.addEventListener('click', () => $('lbModal').classList.remove('active'));
  const twb = $('lbTabWeek'); if (twb) twb.addEventListener('click', () => { lbTab = 'week'; renderLb(); }); const tmb = $('lbTabMonth'); if (tmb) tmb.addEventListener('click', () => { lbTab = 'month'; renderLb(); }); const tab = $('lbTabAll'); if (tab) tab.addEventListener('click', () => { lbTab = 'all'; renderLb(); });
  const mcl = $('monthClaim'); if (mcl) mcl.addEventListener('click', () => $('monthModal').classList.remove('active'));
  const spb = $('starterBuy'); if (spb) spb.addEventListener('click', () => { $('starterModal').classList.remove('active'); buyIap('starter', 'starter_popup'); });
  const spl = $('starterLater'); if (spl) spl.addEventListener('click', () => { $('starterModal').classList.remove('active'); trkPaywallClose(); }); }
setTimeout(checkMonthReward, 6000); setTimeout(checkMonthReward, 30000);
function maybeOfferStarter(){ if (Meta.starterBought || Meta.starterSeen || (Meta.unlocked | 0) < 4) return; if (state.screen !== 'menu' || document.querySelector('.modal.active')) return; Meta.starterSeen = true; Meta.save(); const m = $('starterModal'); if (m){ m.classList.add('active'); trkPaywallOpen('starter_popup'); } }
const LNotif = (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins) ? Capacitor.Plugins.LocalNotifications : null;
if (LNotif){
  setTimeout(() => { try { LNotif.requestPermissions().catch(() => {}); } catch(e){} }, 8000);
  const clearNotifs = () => { try { LNotif.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] }).catch(() => {}); } catch(e){} };
  const scheduleNotifs = () => { try { const list = []; regenTickets();
    if (Meta.pticket < PT_MAX){ const at = new Date(Meta.pticketAt + (PT_MAX - Meta.pticket) * PT_REGEN_MS); if (at.getTime() > Date.now() + 60000) list.push({ id: 1, title: '🎫 Tickets refilled!', body: 'Your battle tickets are full — the enemy is waiting!', schedule: { at } }); }
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(19, 0, 0, 0); list.push({ id: 2, title: '🔥 Daily reward ready', body: `Day ${streakNext()} login reward is waiting — don't break the streak!`, schedule: { at: t } });
    const c = new Date(Date.now() + 3 * 86400000); c.setHours(18, 0, 0, 0); list.push({ id: 3, title: '🏰 Your towers need you', body: 'The enemy is regrouping, Commander. Come reclaim the map!', schedule: { at: c } });
    LNotif.schedule({ notifications: list }).catch(() => {}); } catch(e){} };
  document.addEventListener('visibilitychange', () => { if (document.hidden) scheduleNotifs(); else clearNotifs(); }); window.addEventListener('pagehide', scheduleNotifs); clearNotifs();
}
const AWAY_KEY = 'tds_last_seen', AWAY_MIN_MS = 10 * 60 * 1000, AWAY_CAP_H = 8;
function awayHeartbeat(){ try { localStorage.setItem(AWAY_KEY, String(Date.now())); } catch(e){} }
function offlineEarnings(){
  let last = 0; try { last = parseInt(localStorage.getItem(AWAY_KEY), 10) || 0; } catch(e){} awayHeartbeat(); if (!last) return;
  const away = Date.now() - last; if (away < AWAY_MIN_MS) return; const hours = Math.min(away / 3600000, AWAY_CAP_H);
  const coins = Math.round(hours * 60 * levelCoinMul(Meta.level)); if (coins < 10) return;
  const hTxt = hours >= 1 ? `${Math.floor(hours)}H ${Math.round((hours % 1) * 60)}M` : `${Math.round(hours * 60)} MIN`;
  showRewardModal({ icon: '🌙', accent: '#4a90e2', title: 'WHILE YOU WERE AWAY', tag: hTxt + ' OFFLINE', desc: 'Your towers kept breeding troops — and taxing the land!', coins }, () => { $('rewardModal').classList.remove('active'); refreshMenu(); });
}
setInterval(awayHeartbeat, 30000); window.addEventListener('pagehide', awayHeartbeat);
setTimeout(() => { if (state.screen === 'menu' && !document.querySelector('.modal.active')) offlineEarnings(); else awayHeartbeat(); }, 2500);
$('tkAd').addEventListener('click', adTicket); $('tkClose').addEventListener('click', closeTicketModal);
setInterval(() => { if (state.screen === 'menu'){ regenTickets(); refreshTikUi(); maybeOfferStarter(); } }, 1000);
$('pauseBtn').addEventListener('click', () => { state.paused = true; refreshSndUi(); $('pauseModal').classList.add('active'); });
$('resumeBtn').addEventListener('click', () => { state.paused = false; $('pauseModal').classList.remove('active'); });
$('restartBtn').addEventListener('click', () => { state.paused = false; $('pauseModal').classList.remove('active'); trkLevelQuit(); retryRun(); });
$('pauseMenuBtn').addEventListener('click', () => { state.paused = false; $('pauseModal').classList.remove('active'); show(state.mode === 'pvp' ? 'pvp' : state.mode === 'ops' ? 'missions' : 'menu'); });
$('speedBtn').addEventListener('click', () => { state.speed = state.speed === 1 ? 2 : 1; refreshHud(); });
$('bombBtn').addEventListener('click', () => { if (state.over) return; if (Meta.bombs <= 0){ hint('No Air Strikes — get more in the SHOP'); return; } state.aim = !state.aim; if (state.aim) hint('Tap an ENEMY tower to strike!'); refreshHud(); });
$('vicDouble').addEventListener('click', doubleReward); $('vicContinue').addEventListener('click', () => proceed('menu'));
$('defBoost').addEventListener('click', defeatBoost); $('defRetry').addEventListener('click', () => { finalizeDefeat(); proceed('retry'); }); $('defSkip').addEventListener('click', skipLevel); $('defMenu').addEventListener('click', () => { finalizeDefeat(); proceed('menu'); });
document.querySelectorAll('.shtab[data-tab]').forEach(t => t.addEventListener('click', () => { shopTab = t.dataset.tab; refreshShop(); }));
window.TDS_BACK = function(){
  const open = document.querySelector('.modal.active');
  if (open){ const pm = $('pauseModal'); if (pm && pm.classList.contains('active')){ state.paused = false; pm.classList.remove('active'); } return; }
  if (state.screen === 'game'){ if (!state.paused){ state.paused = true; refreshSndUi(); $('pauseModal').classList.add('active'); } return; }
  if (state.screen && state.screen !== 'menu'){ show('menu'); return; }
};

/* ============================================================================================
   BOOT
   ============================================================================================ */
let last = 0;
function loop(ts){
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; state.t += dt;
  if (state.screen === 'game' && !state.paused && !state.over){ const n = state.speed | 0 || 1; for (let i = 0; i < n; i++){ update(dt); if (state.over) break; } }
  render(); requestAnimationFrame(loop);
}
function boot(){
  resize(); bindInput();
  const ld = $('loading'), lf = $('ldFill'), lt = $('ldTxt'); let p = 0;
  const msgs = ['Deploying troops…', 'Building barracks…', 'Scouting the map…', 'Ready, Commander!'];
  const iv = setInterval(() => { p = Math.min(100, p + 9 + Math.random() * 14); if (lf) lf.style.width = p + '%'; if (lt) lt.textContent = msgs[Math.min(3, Math.floor(p / 26))];
    if (p >= 100){ clearInterval(iv); setTimeout(() => { if (ld) ld.classList.add('gone'); start(); }, 250); } }, 110);
}
function start(){
  show('menu'); trkProfile();
  const h = location.hash;
  if (!h && !(Meta.games | 0) && !Meta.cleared[1]) launchLevel();
  else if (h === '#play') launchLevel();
  else if (h === '#menu') show('menu');
  else if (h.startsWith('#demo')){                             // #demo<L> → a battle a few seconds in, with routes open (screenshots)
    const L = parseInt(h.slice(5), 10) || 5; Meta.unlocked = Math.max(Meta.unlocked, L); startRun({ level: L });
    state.ai.push({ owner: 1, t: 0.2, every: 1.0, risk: 0.8 }); for (let i = 0; i < 160; i++) update(0.05); state.ai.pop(); }
  else if (h.startsWith('#sim')){                              // #sim → synchronous autoplay of every 5th level; title = results
    window.__sim = true; const out = []; const [lvPart, mulPart] = h.slice(4).split('@'); const simMul = parseFloat(mulPart) || 0; const lvls = lvPart ? lvPart.split(',').map(Number) : [1,2,3,5,8,12,16,20,25,30,40,50,65,80,100];
    for (const L of lvls){ Meta.unlocked = Math.max(Meta.unlocked, L); startRun({ level: L }); if (simMul){ state.pStrS = state.pStrT = state.pStr = simMul; } state.ai.push({ owner: 1, t: 0.5, every: 1.0, risk: 0.8 });
      let n = 0; while (!state.over && n++ < 8000) update(0.05); pendingRewards.length = 0; const cnt = [0,0,0,0,0]; for (const t of state.towers) cnt[t.owner]++; const lvs = state.towers.map(t => t.owner + ':' + Math.floor(t.lv) + (t.routes.length ? '>' + t.routes.map(r => r.to).join('/') : '')).join(' '); out.push(`L${L}:${state.won ? 'W' : 'L'}${Math.round(state.time)}s n${cnt.join('.')} [${lvs}]`); }
    document.title = 'SIM ' + out.join(' '); }
  else if (h.startsWith('#auto')){ const L = parseInt(h.slice(5), 10) || 1; Meta.unlocked = Math.max(Meta.unlocked, L); window.__sim = true; startRun({ level: L }); state.ai.push({ owner: 1, t: 0.5, every: 1.0, risk: 0.8 }); state.speed = 4; }
  else if (h === '#shop') show('shop'); else if (h === '#levels') show('levels'); else if (h === '#troops') show('troops'); else if (h === '#pvp') show('pvp'); else if (h === '#ops') show('missions');
  else if (h.startsWith('#lv')){ const L = parseInt(h.slice(3), 10) || 1; Meta.unlocked = Math.max(Meta.unlocked, L); Meta.level = L; startRun({ level: L }); }
  else if (h === '#dbgwin'){ show('game'); state.level = Meta.level; state.time = 40; levelComplete(); }
  else if (h === '#dbglose'){ show('game'); state.score = 60; gameOver(); }
  else if (h === '#dbgrich'){ Meta.coins += 100000; Meta.gems += 2000; Meta.bombs += 10; Meta.save(); refreshMenu(); }
  requestAnimationFrame(loop);
}
boot();

/* ---------------- Connectivity gate ---------------- */
(function(){
  const gate = $('netGate'), retry = $('netRetry'); if (!gate) return;
  const PROBE_URL = 'https://www.google.com/favicon.ico'; let shown = false, misses = 0, probing = false;
  function probe(){ return new Promise(res => { if (!navigator.onLine){ res(false); return; } const img = new Image(); let done = false; const finish = ok => { if (done) return; done = true; clearTimeout(to); img.onload = img.onerror = null; res(ok); }; const to = setTimeout(() => finish(false), 5000); img.onload = () => finish(img.naturalWidth > 0); img.onerror = () => finish(false); img.src = PROBE_URL + '?_=' + Date.now(); }); }
  function setGate(offline){ if (offline === shown) return; shown = offline; gate.classList.toggle('show', offline);
    if (offline){ if (state.screen === 'game' && !state.paused){ state.paused = true; state.netPaused = true; } } else if (state.netPaused){ state.netPaused = false; const pm = $('pauseModal'); if (!(pm && pm.classList.contains('active'))) state.paused = false; } }
  function evaluate(force){ if (!navigator.onLine){ misses = 0; setGate(true); return; } if (probing) return; probing = true; probe().then(ok => { probing = false; if (ok){ misses = 0; setGate(false); } else if (force) setGate(true); else if (++misses >= 2) setGate(true); }); }
  addEventListener('online', () => evaluate()); addEventListener('offline', () => { misses = 0; setGate(true); });
  retry && retry.addEventListener('click', () => evaluate(true)); document.addEventListener('visibilitychange', () => { if (!document.hidden) evaluate(); });
  setInterval(() => { if (!document.hidden) evaluate(); }, 15000); if (!navigator.onLine) setGate(true); else evaluate();
})();
})();
