/* Zombie Tower Defense — Castle Defense build
   The CASTLE is the hero: it stands fixed on the left, enemies siege it from the
   right. Two mounted weapons + your chosen hero auto-fire. You earn POINTS in the
   battle and spend them to summon SPECIAL FORCES (allied units / airstrike).
   Castle, hero, weapons and special forces are all upgraded in the menu, pre-battle. */
(() => {
'use strict';

/* ---------------- Meta progression (localStorage) ---------------- */
const SAVE = 'tds_save_web';
const LEVELS = [
  { id: 1,  name: 'ZOMBIE CITY' },
  { id: 2,  name: 'GRAVEYARD' },
  { id: 3,  name: 'HAUNTED FOREST' },
  { id: 4,  name: 'TOXIC SWAMP' },
  { id: 5,  name: 'SEWER' },
  { id: 6,  name: 'ASYLUM' },
  { id: 7,  name: 'CARNIVAL' },
  { id: 8,  name: 'CORNFIELD' },
  { id: 9,  name: 'SUBWAY' },
  { id: 10, name: 'QUARANTINE LAB' },
];
// Per-level battle backgrounds — rasterised from the Claude Design "Cartoon game backgrounds"
// set (assets/bg/<name>.png). Level 1 keeps the original city sunset (assets/bg.png).
const LEVEL_BG = {
  2: 'graveyard', 3: 'forest', 4: 'swamp', 5: 'sewer', 6: 'asylum',
  7: 'carnival', 8: 'cornfield', 9: 'subway', 10: 'lab',
};
// One-line story beat per level (shown once, on first entry) + the level's END BOSS (glyph shown
// on the campaign map as a silhouette until unlocked). Boss order matches spawnBoss: (lv-1)%roster.
const LEVEL_STORY = [
  'The dead have overrun the city. Roll the convoy out and carve a path through the horde.',
  'The road to safety cuts through an old graveyard — and its residents are not resting.',
  'Ancient woods swallow the highway. Something older than the plague stirs in the dark.',
  'A toxic swamp bubbles with mutated horrors. Keep the wheels turning — do not stop.',
  'Descend into the flooded sewers. The walls are moving. Push through to the light.',
  'The abandoned asylum still echoes with screams. Its keeper wants you to stay.',
  'A ghost carnival lit by dead neon. The ringmaster has one last show planned for you.',
  'Endless cornfields hide the swarm. Harvest season has come for the living.',
  'The subway tunnels run deep. Ride the rails past the things that nest below.',
  'The quarantine lab — ground zero. End it here, and end it for good.',
];
const LEVEL_BOSS = [
  { name: 'Gloomtoad',   emoji: '🐸' }, { name: 'Cindermaw',  emoji: '🔥' },
  { name: 'Rimewraith',  emoji: '❄️' }, { name: 'Oozecrawler', emoji: '🟢' },
  { name: 'Dreadshade',  emoji: '👻' }, { name: 'Voltfang',    emoji: '⚡' },
  { name: 'Stonejaw',    emoji: '🪨' }, { name: 'Thornstalker', emoji: '🌿' },
  { name: 'Galewing',    emoji: '🦅' }, { name: 'Voidcrawler', emoji: '🌌' },
];

// Weapons mount on the castle wall. You can OWN several but EQUIP at most 2.
// Each has a combat profile; `dir` selects the per-level PNG art, `key` the SVG fallback.
// Weapon mount count grows with the wagon étage (0=Battle Cart→2, 1=Fortified→4, 2=Siege Tower→6).
const WEAPON_SLOTS_BY_ETAGE = [2, 4, 6];
function wagonEtage(){ return Math.max(0, Math.min(2, Meta.wagon | 0)); }
function weaponSlots(){ return WEAPON_SLOTS_BY_ETAGE[wagonEtage()]; }
const WEAPON_MAX = 40;                                   // each weapon upgrades 1 → 40 (keeps late-game growth alive once tank/castle/wagon cap out)
// ── GRIND DIAL ───────────────────────────────────────────────────────────────
// Enemies get tougher every level, so the player must upgrade gear (more damage +
// more HP) to clear it. PLAY_GRIND scales EVERY upgrade cost — higher means more
// coins needed, which means more replays per level to afford the gear that wins.
// This is the single dial for "plays per level": raise → more grind, lower → less.
// Target ≈ 20–30 plays/level; calibrate by playtesting a couple of levels.
const PLAY_GRIND = 3;
// ── DIFFICULTY DIAL ──────────────────────────────────────────────────────────
// How tanky + threatening enemies are. Higher = enemies survive longer, so more of
// them slip past your guns and batter the castle → a single run ends much sooner,
// forcing the player to upgrade across many plays before one run reaches the finish.
// This is the main "make it harder / more plays per level" knob (pair with PLAY_GRIND).
const DIFF = 2.2;
const weaponCost = lvl => Math.round((30 + (lvl - 1) * 20) * PLAY_GRIND);   // coins lvl→lvl+1
// The Arsenal — 10 cartoon weapons (art in arsenal-art.js, key = wN). Own several, equip up to 2.
const WEAPONS = [
  { id: 1,  key: 'w1',  name: 'PISTOL',           icon: '🔫', buy: 0,    rate: 3.0,  dmg: 7,  range: 0.85, spd: 900,  splash: 0  },
  { id: 2,  key: 'w2',  name: 'REVOLVER',         icon: '🔫', buy: 180,  rate: 1.6,  dmg: 22, range: 1.00, spd: 1100, splash: 0  },
  { id: 3,  key: 'w3',  name: 'MACHINE PISTOL',   icon: '🔫', buy: 320,  rate: 6.5,  dmg: 6,  range: 0.80, spd: 850,  splash: 0  },
  { id: 4,  key: 'w4',  name: 'SUBMACHINE GUN',   icon: '🔫', buy: 500,  rate: 8.0,  dmg: 7,  range: 0.90, spd: 900,  splash: 0  },
  { id: 5,  key: 'w5',  name: 'PUMP SHOTGUN',     icon: '💥', buy: 750,  rate: 1.1,  dmg: 16, range: 0.55, spd: 760,  splash: 60 },
  { id: 6,  key: 'w6',  name: 'ASSAULT RIFLE',    icon: '🔫', buy: 1000, rate: 5.0,  dmg: 14, range: 1.00, spd: 1050, splash: 0  },
  { id: 7,  key: 'w7',  name: 'SNIPER RIFLE',     icon: '🎯', buy: 1400, rate: 0.85, dmg: 95, range: 1.35, spd: 1600, splash: 0  },
  { id: 8,  key: 'w8',  name: 'MINIGUN',          icon: '🔫', buy: 1900, rate: 12,   dmg: 7,  range: 0.95, spd: 900,  splash: 0  },
  { id: 9,  key: 'w9',  name: 'ROCKET LAUNCHER',  icon: '🚀', buy: 2500, rate: 0.7,  dmg: 70, range: 1.10, spd: 720,  splash: 95 },
  { id: 10, key: 'w10', name: 'GRENADE LAUNCHER', icon: '💣', buy: 3200, rate: 0.9,  dmg: 48, range: 0.85, spd: 700,  splash: 80 },
];
const WEAPON_COL = (window.Arsenal)
  ? WEAPONS.reduce((m, w) => { m[w.key] = Arsenal.accent(w.key); return m; }, {})
  : {};
function weaponArt(w, lvl){
  const n = Math.max(1, Math.min(WEAPON_MAX, lvl | 0));
  if (w && w.key && window.Arsenal && Arsenal.has(w.key)) return Arsenal.svgRaw(w.key);
  if (w && w.dir){
    const pad = String(n).padStart(2, '0');
    return `<img class="wpn-img" src="assets/weapons/${w.dir}/lv${pad}.png" alt="${w.name}" draggable="false" onerror="this.outerHTML='${w.icon || '🔫'}'">`;
  }
  return (window.WeaponArt && w.key && WeaponArt.svg) ? WeaponArt.svg(w.key, n) : (w.icon || '🔫');
}

// Heroes — one is chosen to defend the castle. Each has a combat profile + an upgrade level.
const HERO_LVL_MAX = 15;
const heroUpCost = lvl => Math.round((120 + (lvl - 1) * 110) * PLAY_GRIND);
const TANK_MAX = 7;
const tankCost = lv => Math.round((140 + (lv - 1) * 140) * PLAY_GRIND);
// The cowboy roster (ranger/kate/doc/slinger/outlaw/nomad) is no longer playable as heroes —
// they live on as Special Forces instead (see FORCES). Heroes left: Battle Tank + the Hero Squad.
const HEROES = [
  { id: 'tank',    name: 'Battle Tank',  rarity: 'Legendary',tank: true },
];
// ── RANK HEROES (primary roster) — the 10 upgradeable soldiers imported from the Claude Design
// project "Tower Defense Characters" (ranks-art.js → TDSRenderer). Combat profile derives from
// each rank's weapon; the art is drawn LIVE with a separately-AIMED gun (see drawHero).
const RANK_GUN = {
  pistol:  { dmg: 16, rate: 2.0, range: 0.95, spd: 1000, splash: 0 },
  mpistol: { dmg: 14, rate: 3.0, range: 0.90, spd: 1000, splash: 0 },
  smg:     { dmg: 13, rate: 4.2, range: 0.85, spd: 1050, splash: 0 },
  shotgun: { dmg: 34, rate: 1.2, range: 0.60, spd: 900,  splash: 40 },
  rifle:   { dmg: 22, rate: 3.0, range: 1.00, spd: 1150, splash: 0 },
  dmr:     { dmg: 46, rate: 1.1, range: 1.25, spd: 1400, splash: 0 },
  lmg:     { dmg: 18, rate: 4.5, range: 1.00, spd: 1150, splash: 0 },
  glrifle: { dmg: 30, rate: 1.8, range: 1.05, spd: 950,  splash: 55 },
  hmg:     { dmg: 24, rate: 5.0, range: 1.05, spd: 1200, splash: 0 },
  minigun: { dmg: 16, rate: 8.0, range: 0.95, spd: 1250, splash: 0 },
};
const RANK_RARITY = ['Common','Common','Common','Rare','Rare','Rare','Epic','Epic','Legendary','Legendary'];
if (window.TDSRenderer){
  TDSRenderer.CHARACTERS.forEach((c, i) => { const g = RANK_GUN[c.gun] || RANK_GUN.pistol;
    HEROES.push({ id: 'rk_' + c.id, name: c.name, rarity: RANK_RARITY[i] || 'Common', rank: true, ci: i, gun: c.gun,
      dmg: g.dmg, rate: g.rate, range: g.range, spd: g.spd, splash: g.splash }); });
} else if (window.HeroSquad){                              // fallback roster if ranks-art.js failed to load
  HeroSquad.ROSTER.forEach((h, i) => HEROES.push({
    id: 'sq_' + h.id, name: h.name, rarity: h.rarity, squad: true, sIdx: i, atk: h.atk,
    dmg: h.dmg, rate: h.rate, range: h.range, spd: h.spd, splash: h.splash || 0,
  }));
}
const RARITY_COL = { Common: '#7d8a99', Rare: '#3E97D6', Epic: '#9B5DE0', Legendary: '#F4B731' };
const RARITY_MULT = { Common: 1.0, Rare: 1.3, Epic: 1.7, Legendary: 2.2 };   // pricier (rarer) heroes hit harder
const rarityMult = h => RARITY_MULT[h && h.rarity] || 1;
const HERO_EMOJI = { ranger: '🤠', kate: '👮‍♀️', doc: '🎩', slinger: '🔫', outlaw: '🦹', nomad: '🐫' };
const HERO_UNLOCK = { Common: 60, Rare: 150, Epic: 300, Legendary: 500 };          // gem cost to unlock a locked hero
const HERO_UNLOCK_COIN = { Common: 5000, Rare: 12000, Epic: 24000, Legendary: 40000 }; // = gems × 80 (consistent)

// ── CAMPAIGN HERO PROGRESSION ────────────────────────────────────────────────
// Each level has ONE hero. You start owning level 1's hero; clearing a level unlocks the
// NEXT level's hero (a first-clear popup announces it). Clearing the LAST level unlocks the
// Battle Tank as the grand-finale hero. Heroes are earned ONLY by playing (no shop unlock).
// Order ramps by rarity so the reward grows with the challenge.
// derived from the roster: rank heroes (Recruit → Juggernaut) in tier order, one per level
// (falls back to the Hero Squad ids automatically if the rank renderer isn't loaded).
const HERO_BY_LEVEL = HEROES.filter(h => !h.tank).slice(0, LEVELS.length).map(h => h.id);
const HERO_FINALE = 'tank';                              // unlocked by clearing the final level
const STARTER_HERO = HERO_BY_LEVEL[0];
const STAR_MILESTONE = 3, STAR_REWARD_GEMS = 15;         // every 3 total campaign stars → a gem reward (mastery track)
const REPLAY_COIN_MULT = 0.4;                            // replaying a cleared level pays 40% of the first-clear purse
// the hero GRANTED by clearing `level` (1-based): the next level's hero, or the finale after the last.
function heroGrantedByClearing(level){ return level >= LEVELS.length ? HERO_FINALE : HERO_BY_LEVEL[level]; }
// which level you must CLEAR to earn a given hero (finale = the last level; starter = level 1).
function heroUnlockLevel(id){ if (id === HERO_FINALE) return LEVELS.length; const i = HERO_BY_LEVEL.indexOf(id); return i > 0 ? i : 1; }
// the next hero the player hasn't earned yet (for the "coming up" preview), or null if all owned.
function nextLockedHero(){ const id = HERO_BY_LEVEL.find(x => !heroOwned(x)) || (!heroOwned(HERO_FINALE) ? HERO_FINALE : null); return id ? HEROES.find(h => h.id === id) : null; }
// HEROES index (1-based, for Meta.hero) of a hero id.
function heroIndexOf(id){ const i = HEROES.findIndex(h => h.id === id); return (i < 0 ? 0 : i) + 1; }
// derive owned heroes from campaign progress: the starter + every hero for a level you've
// unlocked + the finale once the last level is beaten. Unions with existing owned (so saves
// that already had heroes keep them). Called on load and after each clear.
function reconcileHeroes(){
  const owned = new Set(Array.isArray(Meta.heroesOwned) ? Meta.heroesOwned : []);
  owned.add(STARTER_HERO);
  for (let L = 1; L <= (Meta.unlocked | 0); L++) if (HERO_BY_LEVEL[L - 1]) owned.add(HERO_BY_LEVEL[L - 1]);
  if (Meta.stars && Meta.stars[LEVELS.length]) owned.add(HERO_FINALE);          // beat the last level → Battle Tank
  Meta.heroesOwned = Array.from(owned).filter(id => HEROES.some(h => h.id === id));
}

// ── PER-HERO BULLETS ─────────────────────────────────────────────────────────
// Every hero fires a visually distinct projectile (colour / size / glow). Weapons and allies
// keep the default `bolt`. A shot carries its style so drawShots() can render the right one.
const BULLETS = {
  bolt:    { core:'#fff6d0', trail:'#ffe07a', r:3.4, w:5.5 },                    // default (weapons/allies)
  spark:   { core:'#ffffff', trail:'#bfefff', r:2.8, w:4.5 },                    // fast & light (scout)
  fire:    { core:'#fff1a8', trail:'#ff7a2a', r:4.4, w:7.5, glow:'#ff4400' },    // fireball (pyro)
  slug:    { core:'#eef3f9', trail:'#9aa7b6', r:4.8, w:8.0 },                    // heavy metal (riot/jugg/tank)
  arrow:   { core:'#e6ffc4', trail:'#7cd84e', r:3.0, w:4.5 },                    // bolt/arrow (archer)
  plasma:  { core:'#e0fbff', trail:'#22d3ee', r:3.9, w:6.5, glow:'#00b3d6' },    // energy (jet)
  arcane:  { core:'#f4ddff', trail:'#9B5DE0', r:4.5, w:7.5, glow:'#7b2fd6' },    // magic (mage)
  bomblet: { core:'#ffd7a8', trail:'#ff9040', r:4.2, w:6.5, glow:'#ff6000' },    // ordnance (sky bomber)
};
const HERO_BULLET = {
  tank:'slug', sq_rifleman:'bolt', sq_scout:'spark', sq_pyro:'fire', sq_riot:'slug',
  sq_archer:'arrow', sq_knight:'bolt', sq_juggernaut:'slug', sq_jet:'plasma',
  sq_mage:'arcane', sq_skybomber:'bomblet',
};
// rank heroes get a bullet style per WEAPON (pistol tracer → glowing minigun stream)
const GUN_BULLET = { pistol:'bolt', mpistol:'bolt', smg:'spark', shotgun:'slug', rifle:'bolt',
  dmr:'arrow', lmg:'spark', glrifle:'bomblet', hmg:'slug', minigun:'fire' };
HEROES.forEach(h => { if (h.rank) HERO_BULLET[h.id] = GUN_BULLET[h.gun] || 'bolt'; });
function heroBullet(h){ return BULLETS[HERO_BULLET[h && h.id]] || BULLETS.bolt; }

// ── HERO MASTERY ─────────────────────────────────────────────────────────────
// Playing a hero earns it mastery XP; each mastery level is a small permanent damage perk,
// rewarding players who cycle the roster. XP is stored per hero id in Meta.heroMastery.
const MASTERY_STEP = 3, MASTERY_MAX = 5, MASTERY_DMG = 0.03;   // 3 battles / level · 5 levels · +3% dmg each (≈+15%)
function heroMasteryLevel(h){ const xp = (Meta.heroMastery && Meta.heroMastery[h && h.id]) || 0; return Math.min(MASTERY_MAX, Math.floor(xp / MASTERY_STEP)); }
function heroMasteryMult(h){ return 1 + heroMasteryLevel(h) * MASTERY_DMG; }
function addHeroMastery(id, n){ if (!id) return; Meta.heroMastery = Meta.heroMastery || {}; Meta.heroMastery[id] = (Meta.heroMastery[id] || 0) + (n || 1); }

// ── DAILY MISSIONS ───────────────────────────────────────────────────────────
// Three missions that reset each day; completing one pays gems. Progress is driven by
// gameplay events (missionEvent) and persisted per day in Meta.missions.
// Pool of mission templates. Three are chosen DETERMINISTICALLY per day (so everyone sees the
// same set that day, and it rotates each day) — never the same three every day.
const MISSION_POOL = [
  { id: 'win3',   icon: '🏆', text: 'Win 3 battles',       type: 'win',  target: 3,   gems: 6 },
  { id: 'win5',   icon: '🏆', text: 'Win 5 battles',       type: 'win',  target: 5,   gems: 9 },
  { id: 'play4',  icon: '⚔️', text: 'Play 4 battles',      type: 'play', target: 4,   gems: 5 },
  { id: 'kill150',icon: '💀', text: 'Defeat 150 enemies',  type: 'kill', target: 150, gems: 6 },
  { id: 'kill300',icon: '💀', text: 'Defeat 300 enemies',  type: 'kill', target: 300, gems: 10 },
  { id: 'ult2',   icon: '⚡', text: 'Unleash 2 ultimates', type: 'ult',  target: 2,   gems: 8 },
  { id: 'ult4',   icon: '⚡', text: 'Unleash 4 ultimates', type: 'ult',  target: 4,   gems: 12 },
  { id: 'boss2',  icon: '👹', text: 'Defeat 2 bosses',     type: 'boss', target: 2,   gems: 9 },
  { id: 'star3',  icon: '⭐', text: 'Earn 3 stars',        type: 'star', target: 3,   gems: 8 },
];
const MISSIONS_PER_DAY = 3;
// deterministic per-day pick of 3 DISTINCT missions (murmur-style avalanche hash of index×day → lowest 3)
function dailyMissions(day){
  const h = i => { let x = (((i + 1) * 374761393) + ((day + 1) * 668265263)) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0; x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
  return MISSION_POOL.map((m, i) => i).sort((a, b) => h(a) - h(b)).slice(0, MISSIONS_PER_DAY).sort((a, b) => a - b).map(i => MISSION_POOL[i]);
}
function currentMissions(){ return dailyMissions(dayNum()); }
function missionsToday(){
  const d = dayNum();
  if (!Meta.missions || Meta.missions.day !== d){
    Meta.missions = { day: d, prog: currentMissions().map(() => 0), claimed: currentMissions().map(() => false) };
    Meta.save();
  }
  return Meta.missions;
}
function missionEvent(type, n){
  if (window.__sim || !n) return;
  const m = missionsToday(), list = currentMissions(); let changed = false;
  list.forEach((ms, i) => { if (ms.type === type && (m.prog[i] | 0) < ms.target){ m.prog[i] = Math.min(ms.target, (m.prog[i] | 0) + n); changed = true; } });
  if (changed){ Meta.save(); refreshMissionDot(); }
}
function missionClaimable(){ const m = missionsToday(), list = currentMissions(); return list.some((ms, i) => (m.prog[i] | 0) >= ms.target && !m.claimed[i]); }

const heroOwned = id => (Meta.heroesOwned || []).includes(id);
const heroUnlockCost = h => HERO_UNLOCK[h && h.rarity] || 150;
const heroUnlockCoin = h => HERO_UNLOCK_COIN[h && h.rarity] || 4000;
const kfmt = n => n >= 1000000 ? (n % 1000000 === 0 ? (n / 1000000) + 'm' : (n / 1000000).toFixed(1) + 'm')
  : n >= 1000 ? (n % 1000 === 0 ? (n / 1000) + 'k' : (n / 1000).toFixed(1) + 'k') : '' + n;
let _svgUid = 0;
function paintHero(box, h, pngClass, tokenClass){
  if (!box) return;
  const rc = RARITY_COL[h.rarity] || '#7d8a99';
  box.style.setProperty('--rc', rc);
  box.classList.toggle('is-tank', !!h.tank);   // only the tank keeps the loadout zoom transform; other heroes are pre-fitted by fitHeroSvg
  if (h.tank && window.TankArt){ box.innerHTML = TankArt.svg(Meta.tankLvl, 'h' + (++_svgUid), false); return; }   // tank already fills its portrait
  if (h.rank && window.TDSRenderer){                       // rank hero — render an idle pose to a crisp canvas portrait
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const cc = c.getContext('2d');
    cc.translate(38, 4);                                   // the figure sits left-of-centre in frame space; centre it
    TDSRenderer.drawFrame(cc, 248, h.ci, 'idle', 0.25);
    c.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain';
    box.innerHTML = ''; box.appendChild(c); return;
  }
  if (h.squad && window.HeroSquad){ box.innerHTML = HeroSquad.svg(h.sIdx, 'h' + (++_svgUid), false, 'walk', 0.12); fitHeroSvg(box); return; }
  if (window.HeroArt && HeroArt.CFG[h.id]){ box.innerHTML = HeroArt.svg(h.id, 'h' + (++_svgUid)); fitHeroSvg(box); return; }
  box.innerHTML = `<div class="${tokenClass || 'hero-token'}">${HERO_EMOJI[h.id] || '🦸'}</div>`;
}
// The standing-figure heroes share one tall viewBox with big top headroom (so the wizard's
// hat isn't clipped) — which leaves every OTHER hero rendering small and floating in the card,
// unlike the tank that fills its portrait. Re-crop each hero's SVG to its own measured bounds so
// they all fill the frame at a consistent size and stand on the card's ground line.
function fitHeroSvg(box){
  const svg = box && box.querySelector('svg'); if (!svg) return;
  let b; try { b = svg.getBBox(); } catch (_) { return; }
  if (!b || b.width < 1 || b.height < 1) return;                 // box hidden / not laid out → keep default framing
  // The big roster card (.hc-art) has a sandy ground strip covering its lower ~22%: leave slack
  // BELOW the feet so the hero lands ON the strip, not hidden behind it. The compact loadout
  // avatar (.lc-art) has no strip, so seat the feet near the bottom instead.
  const padX = 10, padTop = 8;
  const grounded = box.classList && box.classList.contains('hc-art');
  const padBot = (b.height + padTop) * (grounded ? 0.40 : 0.10);
  svg.setAttribute('viewBox', `${(b.x - padX).toFixed(1)} ${(b.y - padTop).toFixed(1)} ${(b.width + 2 * padX).toFixed(1)} ${(b.height + padTop + padBot).toFixed(1)}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
}

// Special forces — summoned IN battle with points; upgraded in the menu (Forces screen).
const SF_MAX = 10;
const SF_EVOLVE = 6;                                     // force level at which a unit evolves into its upgraded hero
const SF_FIELD_MAX = 4;                                  // max unit-forces on the field at once (airstrike exempt)
const sfCost = lvl => Math.round((80 + (lvl - 1) * 70) * PLAY_GRIND);   // upgrade a force one level
// The 3 unit forces ARE the old cowboy heroes; each evolves into a paired hero at Lv SF_EVOLVE.
const FORCES = [
  { id: 'ranger', name: 'RANGER',       icon: '🤠', cost: 10, kind: 'unit', hp: 70, dmg: 16, rate: 2.4, range: 0.72, spd: 950,  splash: 0,
    art: 'ranger', evo: 'slinger', evoName: 'GUNSLINGER', evoDmg: 30, evoRate: 2.6, evoSplash: 0,  col: '#6c8f3f' },
  { id: 'kate',   name: 'SHERIFF KATE', icon: '👮‍♀️', cost: 14, kind: 'unit', hp: 55, dmg: 24, rate: 1.8, range: 1.0,  spd: 1300, splash: 0,
    art: 'kate',   evo: 'nomad',   evoName: 'DUNE NOMAD', evoDmg: 36, evoRate: 2.2, evoSplash: 0,  col: '#3E97D6' },
  { id: 'doc',    name: 'DOC VEGA',     icon: '🎩', cost: 18, kind: 'unit', hp: 85, dmg: 20, rate: 2.0, range: 0.78, spd: 820,  splash: 50,
    art: 'doc',    evo: 'outlaw',  evoName: 'MAD OUTLAW', evoDmg: 40, evoRate: 1.4, evoSplash: 70, col: '#c0563a' },
  { id: 'airstrike', name: 'AIRSTRIKE', icon: '💥', cost: 24, kind: 'strike', dmg: 70, col: '#F4B731' },
  // ── air support wing: three distinct attack planes (strike-kind, like the airstrike) ──
  { id: 'jetstrike', name: 'JET STRAFE', icon: '🛩️', cost: 16, kind: 'strike', plane: 'jet',     dmg: 26, col: '#4db4ff' },   // fast pass, rapid gun run across the field
  { id: 'gunship',   name: 'GUNSHIP',    icon: '✈️', cost: 30, kind: 'strike', plane: 'gunship', dmg: 34, col: '#9B5DE0' },   // slow heavy pass, aimed plasma fire
  { id: 'napalm',    name: 'NAPALM RUN', icon: '🔥', cost: 22, kind: 'strike', plane: 'napalm',  dmg: 30, col: '#ff7a2a' },   // fire canisters → burning ground zones
];
const sfLevel = id => Meta.sfLvl[id] || 1;
// Forces are UNLOCKED ONE BY ONE: the Ranger is free from the start, the rest are bought with
// coins (kept cheap). Each force's FIRST upgrade (Lv 1→2) can be paid in coins OR a rewarded ad.
const SF_BUY = { ranger: 0, kate: 200, doc: 350, airstrike: 500,
  jetstrike: 0, gunship: 0, napalm: 0 };                             // cheap FLAT coin unlock cost per force (planes FREE for testing)
const sfBuyCost = id => (SF_BUY[id] != null ? SF_BUY[id] : 300);
const sfOwned = id => (Meta.sfOwned || []).includes(id);

const CASTLE_MAX = 6;                                    // castle build stages 0..6 (7 frames)
const WAGON_MAX = 2;                                     // 3 étages: 0=Battle Cart, 1=Fortified Wagon, 2=Siege Tower
const WAGON_HP = 160;                                    // bonus max shield HP per étage

const SFX = window.Sfx || { play(){}, setEnabled(){}, enabled: false };   // sfx.js loads first; stub if missing
// ── PLAY TICKETS ─────────────────────────────────────────────────────────────
// Every battle costs 1 🎫. They refill +1 every 5 minutes up to 10 (offline time counts),
// and a rewarded ad grants +1 any time you're not full. The calibration sim is exempt.
const PT_MAX = 10, PT_REGEN_MS = 5 * 60 * 1000;
const Meta = {
  coins: 300, gems: 0, hp: 1, dmg: 1, pow: 1, starter: false, level: 1, unlocked: 1, rel: 0, games: 0,
  sound: true, stars: {}, ftue: 0, starClaimed: 0,       // sound on/off · best stars per level · first-time-hint bitmask · star-track milestones claimed
  pticket: PT_MAX, pticketAt: 0,                         // play tickets (battle entry) · regen anchor timestamp
  wagon: 0, noAds: false, boostUntil: 0, energy: 0, tickets: 0, rated: false,   // rated: tapped the 5★ prompt (pays coins once, then stops nagging)
  ratePicked: false,                                     // gave a star rating in the picker popup (stops re-asking)
  endlessBest: 0,                                        // best score in Endless / boss-rush mode (post-campaign)
  bestScore: 0,                                          // best single-run score (feeds the global leaderboard)
  name: '',                                              // leaderboard nickname (chosen once)
  monthScore: null,                                      // monthly contest { m:'YYYY-MM', total } — sum of run scores this month
  monthClaimed: '',                                      // last month whose contest prizes were already settled for this player
  weekScore: null,                                       // weekly contest { w:'YYYY-Www', total } — same idea, weekly
  weekClaimed: '',                                       // last week whose contest prizes were already settled
  killsTotal: 0,                                         // lifetime zombies destroyed (achievements)
  starterBought: false, starterSeen: false,              // one-time STARTER PACK IAP · offer popup shown once
  sv: 0,                                                 // monotonic save version — cloud conflict resolution (last-write-wins)
  dailyDay: 0, adDay: 0, adChestUsed: 0, adCoinUsed: 0, adGemUsed: 0,    // daily free chest + per-day ad-box limits
  streak: 0, streakDay: 0,                                 // daily login streak (day N pays 100·N coins)
  heroesOwned: [STARTER_HERO],                            // unlocked heroes — the rest are EARNED by clearing levels
  weapons: [1, 2], owned: [1, 2], wlv: [1, 1],           // equipped (max 2) · owned · per-weapon level
  castle: 0,                                             // castle build stage (0..CASTLE_MAX)
  hero: 1,                                               // equipped hero (1..HEROES.length)
  tankLvl: 1,                                            // Battle Tank tier (1..TANK_MAX)
  heroLvl: {},                                           // per-hero upgrade level (non-tank)
  heroMastery: {},                                       // per-hero mastery XP (earned by playing that hero)
  missions: null,                                        // daily missions { day, prog[], claimed[] }
  storySeen: {},                                         // level ids whose intro story card was shown
  sfLvl: {},                                             // per-special-force upgrade level
  sfOwned: ['ranger'],                                   // unlocked forces (Ranger free; buy the rest one by one)
  load(){ try { const d = JSON.parse(localStorage.getItem(SAVE)); if (d) Object.assign(Meta, d); } catch(e){} },
  save(){ try { Meta.sv = (Meta.sv | 0) + 1; localStorage.setItem(SAVE, JSON.stringify({   // sv = monotonic save counter → cloud last-write-wins
    coins:Meta.coins, gems:Meta.gems, hp:Meta.hp, dmg:Meta.dmg, pow:Meta.pow, starter:Meta.starter,
    level:Meta.level, unlocked:Meta.unlocked, weapons:Meta.weapons, owned:Meta.owned, wlv:Meta.wlv,
    castle:Meta.castle, hero:Meta.hero, tankLvl:Meta.tankLvl, heroLvl:Meta.heroLvl, heroMastery:Meta.heroMastery, missions:Meta.missions, storySeen:Meta.storySeen, sfLvl:Meta.sfLvl, sfOwned:Meta.sfOwned, rel:Meta.rel, games:Meta.games,
    wagon:Meta.wagon, noAds:Meta.noAds, boostUntil:Meta.boostUntil, energy:Meta.energy, tickets:Meta.tickets,
    dailyDay:Meta.dailyDay, adDay:Meta.adDay, adChestUsed:Meta.adChestUsed, adCoinUsed:Meta.adCoinUsed, adGemUsed:Meta.adGemUsed,
    streak:Meta.streak, streakDay:Meta.streakDay, heroesOwned:Meta.heroesOwned,
    sound:Meta.sound, stars:Meta.stars, ftue:Meta.ftue, starClaimed:Meta.starClaimed, pticket:Meta.pticket, pticketAt:Meta.pticketAt, rated:Meta.rated, ratePicked:Meta.ratePicked,
    endlessBest:Meta.endlessBest, bestScore:Meta.bestScore, name:Meta.name, wagonCapMig:Meta.wagonCapMig,
    monthScore:Meta.monthScore, monthClaimed:Meta.monthClaimed, weekScore:Meta.weekScore, weekClaimed:Meta.weekClaimed,
    killsTotal:Meta.killsTotal, starterBought:Meta.starterBought, starterSeen:Meta.starterSeen, sv:Meta.sv })); } catch(e){} },
  // castle stats — upgrading HP / the castle stage make the castle tankier
  heroMaxHp(){ return 430 + (Meta.hp - 1) * 70; },                          // hero core — the LAST line of defence (bigger base so a fresh run lasts ~1 min+)
  wagonMaxHp(){ return 200 + Meta.castle * 90 + Meta.wagon * WAGON_HP; },    // wagon shield — soaks damage first
  maxHp(){ return Meta.heroMaxHp() + Meta.wagonMaxHp(); },                   // total survivability (shield + core)
  dmgMult(){ return 1 + (Meta.dmg - 1) * 0.14; },
  wagonDmgMult(){ return 1 + wagonEtage() * 0.10; },     // each étage also buffs mounted-weapon damage
  powIncome(){ return 1 + (Meta.pow - 1) * 0.45; },     // passive points/s — starts at 1.0/s
  hpCost(){ return Math.round((40 + (Meta.hp - 1) * 30) * PLAY_GRIND); },
  dmgCost(){ return Math.round((45 + (Meta.dmg - 1) * 32) * PLAY_GRIND); },
  powCost(){ return Math.round((50 + (Meta.pow - 1) * 35) * PLAY_GRIND); },
  castleCost(){ return Math.round((80 + Meta.castle * 110) * PLAY_GRIND); },
  wagonCost(){ return Math.round((120 + Meta.wagon * 240) * PLAY_GRIND); },
};
Meta.load();
// normalize after load (migrate older single-weapon saves)
if (!Array.isArray(Meta.weapons)){ Meta.weapons = Meta.weapon ? [Meta.weapon] : [1, 2]; }
if (!Array.isArray(Meta.owned))  { Meta.owned = Array.from(new Set([...(Meta.weapons||[]), 1, 2])); }
if (!Array.isArray(Meta.wlv))    Meta.wlv = [1, 1, 1, 1];
while (Meta.wlv.length < WEAPONS.length) Meta.wlv.push(1);
Meta.weapons = Meta.weapons.filter(id => id >= 1 && id <= WEAPONS.length).slice(0, weaponSlots());
if (!Meta.weapons.length) Meta.weapons = [1];
Meta.owned = Array.from(new Set(Meta.owned.filter(id => id >= 1 && id <= WEAPONS.length).concat(Meta.weapons)));
Meta.castle = Math.max(0, Math.min(CASTLE_MAX, Meta.castle | 0));
// One-time migration: WAGON_MAX dropped 6→2 when the wagon became a 3-étage tower. Refund coins
// for any tiers a returning player had bought above the new cap, so paid progression isn't lost.
if (!Meta.wagonCapMig){
  const savedWagon = Meta.wagon | 0;
  if (savedWagon > WAGON_MAX){
    let refund = 0;
    for (let L = WAGON_MAX + 1; L <= savedWagon; L++) refund += Math.round((70 + (L - 1) * 90) * PLAY_GRIND);  // old wagonCost(L-1)
    Meta.coins = (Meta.coins | 0) + refund;
  }
  Meta.wagonCapMig = true;
  Meta.save();                                          // persist flag + refund so it can never run twice
}
Meta.wagon = Math.max(0, Math.min(WAGON_MAX, Meta.wagon | 0));
if (Meta.hero < 1 || Meta.hero > HEROES.length) Meta.hero = 1;
if (!Array.isArray(Meta.heroesOwned)) Meta.heroesOwned = [];
Meta.tankLvl = Math.max(1, Math.min(TANK_MAX, Meta.tankLvl | 0));
if (typeof Meta.heroLvl !== 'object' || !Meta.heroLvl) Meta.heroLvl = {};
if (typeof Meta.heroMastery !== 'object' || !Meta.heroMastery) Meta.heroMastery = {};
if (typeof Meta.storySeen !== 'object' || !Meta.storySeen) Meta.storySeen = {};
Meta.sv = Meta.sv | 0;
if (typeof Meta.sfLvl !== 'object' || !Meta.sfLvl) Meta.sfLvl = {};
// forces ownership: Ranger always free; migrate older saves so any force already upgraded stays owned
{ const so = new Set(Array.isArray(Meta.sfOwned) ? Meta.sfOwned : []); so.add('ranger');
  for (const f of FORCES) if ((Meta.sfLvl[f.id] || 1) > 1) so.add(f.id);
  Meta.sfOwned = Array.from(so).filter(id => FORCES.some(f => f.id === id)); }
if (typeof Meta.stars !== 'object' || !Meta.stars) Meta.stars = {};
// campaign hero ownership (starter + earned by levels + finale); keep the equipped hero valid.
reconcileHeroes();
{ const eqH = HEROES[Meta.hero - 1]; if (!eqH || !heroOwned(eqH.id)) Meta.hero = heroIndexOf(STARTER_HERO); }
Meta.ftue = Meta.ftue | 0;
if (typeof Meta.pticket !== 'number' || isNaN(Meta.pticket)) Meta.pticket = PT_MAX;
Meta.pticket = Math.max(0, Math.min(PT_MAX, Meta.pticket | 0));
if (!Meta.pticketAt) Meta.pticketAt = Date.now();
// --- one-time RELEASE migration: retire old testing saves (all levels were force-unlocked
// and the economy was exercised with debug money) → start the real campaign fresh ---
if (!Meta.rel){
  Meta.coins = 300; Meta.gems = 0;
  Meta.hp = 1; Meta.dmg = 1; Meta.pow = 1; Meta.castle = 0;
  Meta.weapons = [1]; Meta.owned = [1]; Meta.wlv = Array(WEAPONS.length).fill(1);
  Meta.hero = heroIndexOf(STARTER_HERO); Meta.tankLvl = 1; Meta.heroLvl = {}; Meta.sfLvl = {}; Meta.sfOwned = ['ranger'];
  Meta.games = 0; Meta.wagon = 0; Meta.noAds = false; Meta.boostUntil = 0; Meta.energy = 0; Meta.tickets = 0;
  Meta.dailyDay = 0; Meta.adDay = 0; Meta.adChestUsed = 0; Meta.adCoinUsed = 0; Meta.adGemUsed = 0;
  Meta.streak = 0; Meta.streakDay = 0;
  Meta.heroesOwned = [STARTER_HERO];                     // campaign-only: earn the rest by clearing levels
  Meta.level = 1; Meta.unlocked = 1;
  Meta.rel = 1; Meta.save();
}
// progression sanity: unlocked ∈ [1, #levels], selected level ∈ [1, unlocked]
Meta.unlocked = Math.max(1, Math.min(LEVELS.length, Meta.unlocked | 0));
Meta.level = Math.max(1, Math.min(Meta.unlocked, Meta.level | 0));
SFX.setEnabled(Meta.sound !== false);

const heroLevel = h => h.tank ? Meta.tankLvl : (Meta.heroLvl[h.id] || 1);
const heroDmg   = h => (h.dmg || 18) * (1 + 0.12 * (heroLevel(h) - 1)) * rarityMult(h) * Meta.dmgMult() * heroMasteryMult(h);

/* ---------------- DOM helpers ---------------- */
const $ = id => document.getElementById(id);
function bump(el){ if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
const screens = { menu: $('menu'), game: $('game'), shop: $('shop'), levels: $('levels'), weapons: $('weapons'), heroes: $('heroes'), forces: $('forces') };
function show(name){
  for (const k in screens) screens[k].classList.toggle('active', k === name);
  state.screen = name;
  if (window.TDSAnalytics) TDSAnalytics.screen(name);   // Firebase: log the page/screen visit
  if (name === 'menu') refreshMenu();
  if (name === 'shop') refreshShop();
  if (name === 'levels') refreshLevels();
  if (name === 'weapons') refreshWeapons();
  if (name === 'heroes') refreshHeroes();
  if (name === 'forces') refreshForces();
}

/* ---------------- Canvas ---------------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const IMG = {};
function resize(){
  const r = $('app').getBoundingClientRect();
  W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));          // re-measure after the rotation settles
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);  // system-bar / keyboard viewport changes
setTimeout(resize, 300); setTimeout(resize, 1200);                                    // WebViews often report the wrong size on first paint

/* ---------------- Constants & state ---------------- */
const REWARD = 3, SCROLL_SPD = 96;                      // score/kill (coins) · world scroll speed (px/s @ S=1)
// Energy (deploy points) is purely TIME-based: passive income only (1.0/s at base, +0.45/s
// per POWER level). Kills pay coins (score), never energy — so the bar always fills at a
// steady, readable pace. Only the fort (+20) and boss (+30) milestones grant burst energy.
// Higher levels pay more coins per score point. Without this the player's relative power
// growth per play collapses (upgrade costs rise, income doesn't) and late levels become
// unclearable walls; with it, "plays to clear" stays ≈ constant across the campaign.
// The quadratic term keeps the LATE game moving (upgrade caps + diminishing multipliers
// make growth per play tiny there) and rewards pushing the frontier over farming old levels.
const levelCoinMul = lv => { const t = (lv || 1) - 1; return 1 + 0.5 * t + 0.08 * t * t; };   // steeper: higher levels pay more (upgrades cost more). L1 1.0× … L5 4.3× … L10 12.0×
// Difficulty ramps IN: gentle at level 1, escalating ever more steeply toward the final level.
const LV_T   = lv => Math.max(0, Math.min(1, (lv - 1) / (LEVELS.length - 1)));  // 0 at L1 → 1 at the last level
const lvEase = lv => Math.pow(LV_T(lv), 1.7);                                   // accelerating curve (slow start, steep finish)
// Per-level enemy-HP multipliers — CALIBRATED with the #dbgsim grind harness so that each
// level takes ≈20–30 earn-and-upgrade plays to clear. The jumps DECAY (×2.3 early → ×1.15
// late) because the player's relative power growth per play also decays as upgrades get
// pricier; a fixed geometric ramp made late levels unclearable. Re-run #dbgsim after touching.
const HP_MUL = [0.35, 0.97, 2.20, 4.40, 8.30, 11.9, 15.0, 18.0, 21.1, 23.1];
const enemyHpMul  = lv => HP_MUL[Math.max(0, Math.min(HP_MUL.length - 1, lv - 1))];
const enemyDmgMul = lv => 0.5 + 0.30 * (lv - 1);      // enemy damage per level (L1 0.5× … L10 3.2×, linear)
// Player "Power" — one rating from equipped gear (weapon DPS + hero DPS, scaled by
// the global damage mult and survivability). Lets the UI warn when a level outclasses
// the player so they know to upgrade. reqPower = recommended rating to clear level L,
// tracking enemy toughness — when Power < reqPower the level is a grind until upgraded.
function playerPower(){
  let wp = 0;
  for (const id of Meta.weapons){ const w = WEAPONS[id - 1]; if (!w) continue;
    const lvl = Meta.wlv[id - 1] || 1;
    wp += w.dmg * (1 + 0.22 * (lvl - 1)) * w.rate * (1 + 0.05 * (lvl - 1)) * (w.splash ? 1.4 : 1);
  }
  const h = HEROES[Meta.hero - 1] || HEROES[0], hl = heroLevel(h);
  let hpw;
  if (h.tank){ const fire = (window.TankArt && TankArt.CFG[hl] || { fire: hl }).fire; hpw = (12 + fire * 12) / 0.85; }
  else hpw = (h.dmg || 18) * (1 + 0.12 * (hl - 1)) * (h.rate || 2);
  const survive = Meta.maxHp() / 220;                  // 1.0 at base; grows with HP / castle / wagon
  return Math.round((wp + hpw) * Meta.dmgMult() * survive);
}
// Recommended Power per level — measured with the #dbgsim grind harness (the player Power on
// the run that actually cleared each level after steady upgrading). Purely advisory in the UI.
const REQ_PW = [5100, 24000, 77000, 260000, 590000, 1340000, 2400000, 3800000, 5700000, 8000000];
const reqPower = L => REQ_PW[Math.max(0, Math.min(REQ_PW.length - 1, L - 1))];
// Pick the 4 enemy types fielded by a level. The window of eligible roster indices
// (UndeadArt.ROSTER is ordered weakest → strongest) slides toward the dangerous tail as
// the level rises, so higher levels field nastier undead. Seeded by level → each level
// always shows the SAME random 4 (stable for testing); different levels differ.
function levelEnemyTypes(lv){
  // every level fields the full roster of undead "ghosts" — difficulty comes from the per-level
  // HP/damage scaling, not from restricting which enemies appear.
  const roster = (window.UndeadArt && UndeadArt.ROSTER) || [];
  const n = roster.length; if (n === 0) return [0];
  return roster.map((_, i) => i);
}
const FROST_DUR = 3.2, FROST_SLOW = 0.32;
const HERO_HURT_DUR = 0.45;                              // how long the hero plays its hurt anim after the convoy is hit
const state = {
  screen: 'menu', energy: 0, score: 0, paused: false, over: false, won: false,
  castle: null, enemies: [], allies: [], shots: [], eshots: [], pops: [], parts: [], zones: [], props: [], bombs: [], plane: null, planes: [], frost: 0,
  wpn: [], heroCd: 0, heroAng: -0.3, tankFire: 0, heroFire: 0, heroHurt: 0, heroDeadAt: 0, boss: null, bossDead: false, bossT: 0,
  spawnT: 0, interval: 2.2, energyAcc: 0, scroll: 0, t: 0, levelTypes: [],
};
try { window.state = state; window.Meta = Meta; window.startRun = startRun; window.update = update; window.deployForce = deployForce; window.FORCES = FORCES; } catch(e){}   // debug handles (harmless; functions are hoisted)

const S = () => H / 900;
const groundY = () => H * 0.70;
const levelLen = () => (16000 + ((state.level || 1) - 1) * 2200) * S();   // finish distance (L1 16000 ≈ 2.8min … L10 35800 ≈ 6.2min + fort/boss fights)
try { window.levelLen = levelLen; } catch(e){}
try { window.TDS_BUSY = () => state.screen === 'game' && !state.over; } catch(e){}   // cloud.js: don't reload mid-battle

/* ---- world layout: the hero advances right; the castle is the start point it departs ---- */
function castleDims(){
  const s = S(), stg = Meta.castle;
  return { s, stg, w: (84 + stg * 8) * s, wallH: (70 + stg * 11) * s };
}
const castleFrontX = () => castleDims().w;
function frontTowerTop(){ const { s, wallH } = castleDims(); return groundY() - (wallH + (20 + Meta.castle * 5) * s); }
// Convoy at ORIGINAL full size, anchored to the LEFT edge: the hero stands just far enough
// right (172 units) that the wagon + tower behind him are never cut off the left edge.
const CS = S;                                            // convoy uses the global scale (original sizes)
function heroPos(){ const s = S(); return { x: 172 * s, y: groundY() }; }
// the spot in front of the hero where enemies land their hits on the convoy
function frontLine(){ return heroPos().x + 20 * S(); }
// ── Armored war-wagon (imported "War-Wagon Asset Kit") ──────────────────────────
// The wagon is a 3-étage upgradeable tower (Meta.wagon 0..2). Art is a 512×640 side
// sprite per (stage × damage-state); weapons seat on fixed hardpoints; effects (smoke/
// fire/explosion/dust) play from per-deck anchors. All coords are in sprite pixel space.
const WAGON_SPR = { W: 512, H: 640, ground: 600 };        // sprite dims + ground-line Y
// weapon hardpoints per étage: [x, y, deckIndex, maxW?] (deck 0=base A, 1=mid B, 2=cap C).
// maxW caps the weapon's sprite-space width so guns seat on their OWN étage's exposed deck
// surface without hanging off the sprite edge or covering the tier above (each étage stacks
// differently, so the flat mount surfaces — and how much room a gun has — differ per stage).
// Mount ORDER = assignment order (weapon 0 → first entry…), so the most VISIBLE mounts come
// first — a player with 2 weapons sees them on the big prominent decks, not tucked at the sides.
const WAGON_HP_PTS = [
  // étage 0 (Battle Cart): one wide deck → two full-size guns on the mount sockets
  [[192,356,0,130],[320,356,0,130]],
  // étage 1 (Fortified Wagon): big upper-box mounts FIRST, then the lower crate's side corners
  [[194,262,1,116],[318,262,1,116],[118,356,0,72],[394,356,0,72]],
  // étage 2 (Siege Tower): fortress-top mounts FIRST, then the mid crate, then the base sides
  [[210,156,2,78],[302,156,2,78],[156,260,1,60],[358,260,1,60],[118,356,0,72],[394,356,0,72]],
];
const WAGON_ANCHORS = [[256,360],[256,256],[256,150]];    // deck top-centre (effect anchor)
const WAGON_DECK_BOT = [452,360,256];                     // deck base Y (dust anchor)
const WAGON_WHEELS = [[150,523],[362,523]], WAGON_WHEEL_R = 74;   // wheel centres + radius (sprite space, shared across étages)
// spinning wheels drawn OVER the sprite's baked wheels — they roll with state.scroll (the advance).
function drawWagonWheels(g){
  for (const wc of WAGON_WHEELS){
    const c = g.spr(wc[0], wc[1]), r = WAGON_WHEEL_R * g.scale;
    ctx.fillStyle = '#cfd6dd'; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill();          // steel rim
    ctx.fillStyle = '#9aa2ab'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.9, 0, 7); ctx.fill();
    ctx.fillStyle = '#6f7780';                                                                    // rim bolts
    for (let k = 0; k < 10; k++){ const a = k * Math.PI / 5; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95, r * 0.055, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(state.scroll / r);                            // wooden hub + spokes spin
    ctx.fillStyle = '#8c6239'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a3f24'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++){ const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#5a636c'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.22, 0, 7); ctx.fill();    // hub cap
    ctx.fillStyle = '#3a4149'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.1, 0, 7); ctx.fill();
  }
}
// draw the wagon sprite so its ground-line sits on groundY(), centred behind the hero.
function wagonGeom(){
  const s = CS();
  const dispH = 200 * s, scale = dispH / WAGON_SPR.H;
  const cx = heroPos().x - 80 * s;   // seat the wagon just behind the hero, fully on-screen (no left-edge clipping of the tower/guns)
  const topY = groundY() - WAGON_SPR.ground * scale;      // screen-Y of sprite y=0
  const leftX = cx - (WAGON_SPR.W / 2) * scale;
  return { s, scale, cx, topY, leftX, dispH,
    w: 322 * scale, deckY: topY + 360 * scale,            // base-deck width / top (back-compat)
    spr: (px, py) => ({ x: leftX + px * scale, y: topY + py * scale }) };
}
const heroIsTank = () => !!(HEROES[Meta.hero - 1] || HEROES[0]).tank;
function weaponMounts(){
  const g = wagonGeom();
  return WAGON_HP_PTS[wagonEtage()].map(p => { const q = g.spr(p[0], p[1]); return { x: q.x, y: q.y, deck: p[2] }; });
}
// animated effect sheets (horizontal frame strips). Returns false once a one-shot ends.
const FXSHEET = {
  smoke:     { key:'fx_smoke',     n:5, fps:12, loop:true  },
  fire:      { key:'fx_fire',      n:5, fps:14, loop:true  },
  explosion: { key:'fx_explosion', n:8, fps:20, loop:false },
  dust:      { key:'fx_dust',      n:6, fps:16, loop:false },
};
function drawFxSheet(name, cx, y, scale, tStart, anchor){
  const f = FXSHEET[name], im = IMG[f.key]; if (!im || !im.naturalWidth) return false;
  let fi = Math.floor((state.t - tStart) * f.fps);
  if (f.loop) fi = ((fi % f.n) + f.n) % f.n; else if (fi < 0 || fi >= f.n) return false;
  const fw = im.naturalWidth / f.n, fh = im.naturalHeight, dw = fw * scale, dh = fh * scale;
  ctx.drawImage(im, fi * fw, 0, fw, fh, cx - dw / 2, anchor === 'center' ? y - dh / 2 : y - dh, dw, dh);
  return true;
}

/* ---- sprite sheets ---- */
const FRAMES = { scout: 8, zombie: 8, dog: 8 };
function drawFrame(key, f, dx, dy, dw, dh){
  const im = IMG[key]; if (!im || !im.naturalWidth) return false;
  const n = FRAMES[key], fw = im.naturalWidth / n, fh = im.naturalHeight;
  ctx.drawImage(im, (((f % n) + n) % n) * fw, 0, fw, fh, dx, dy, dw, dh);
  return true;
}
function frameAspect(key){ const im = IMG[key]; return (im && im.naturalWidth) ? im.naturalHeight / (im.naturalWidth / FRAMES[key]) : 1.6; }

/* ---- hero rendering helpers: procedural HeroArt rasterised to canvas (like the tank) ---- */
const heroImgCache = {};
function heroRaster(id, key, fr){
  const k = id + '_' + key;
  if (!heroImgCache[k] && window.HeroArt){
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(HeroArt.svg(id, 'g' + k, true, fr));
    heroImgCache[k] = im;
  }
  return heroImgCache[k];
}
// 4-frame walk cycle: vertical bob + scissoring legs (step)
const HERO_BOB = [-1, -4, -1, -4];
const HERO_STEP = [1, 0, -1, 0];
function heroIdleImage(id, i){ const k = i % 4; return heroRaster(id, 'w' + k, { bob: HERO_BOB[k], step: HERO_STEP[k] }); }
function heroShootImage(id){ return heroRaster(id, 'fire', { shoot: true, bob: -1 }); }
let heroBobY = 0;
function heroBob(){ const s = S(), t = state.t; return (Math.sin(t * 3) * 1.2 + Math.sin(t * 7.3) * 0.5) * s; }
function heroDisp(){ const s = CS(); const w = 74 * s; return { w, h: 104 * s, s }; }
const TANK_FRAMES = 6;
const tankImgCache = {}, tankBounds = {};
function tankFrame(level, key, fr){
  const k = level + '_' + key;
  if (!tankImgCache[k] && window.TankArt){
    const im = new Image();
    im.onload = () => { tankBounds[k] = computeBounds(im); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TankArt.svg(level, 'g' + k, false, true, fr));
    tankImgCache[k] = im; im._bk = k;
  }
  return tankImgCache[k];
}
function tankMoveImage(level, i){ const ph = i / TANK_FRAMES; return tankFrame(level, 'm' + i, { wheelDeg: ph * 360, trackShift: ph * 17 }); }
function tankFireImage(level){ return tankFrame(level, 'fire', { recoil: 13, flash: true }); }

/* ---------------- Run lifecycle ---------------- */
function newCastle(){
  const h = Meta.heroMaxHp(), w = Meta.wagonMaxHp(), n = wagonEtage() + 1, per = w / n;
  const decks = []; for (let d = 0; d < n; d++) decks.push({ hp: per, max: per, dead: false, boomT: null });
  return { hp: h, maxHp: h, wagonHp: w, wagonMax: w, decks };
}
// a deck (étage) blows up — explosion+dust fire from its anchor, its weapons go offline.
function deckBreak(i){
  SFX.play('wagon');
  const g = wagonGeom(), a = WAGON_ANCHORS[i], p = g.spr(a[0], a[1]);
  for (let k = 0; k < 12; k++) burst(p.x, p.y, '#caa46a');
  const c = state.castle, allDown = c && c.decks && c.decks.every(d => d.dead);
  popup(p.x, p.y - 20 * S(), allDown ? 'WAGON DOWN!' : 'DECK DOWN!', allDown ? '#ffb142' : '#ffce54');
}
function wagonBreak(){ deckBreak(wagonEtage()); }   // legacy single-shield fallback
// LAYERED DEFENCE: forces (allies) block enemies first; what gets through is soaked by the
// wagon — damage eats the TOP étage first, then works down. Only overflow past the last
// deck reaches the hero core — the hero is the last line, so the run ends at hero HP 0.
function hitConvoy(dmg){
  const c = state.castle; if (!c) return;
  let d = dmg;
  if (c.decks && c.decks.length){
    for (let i = c.decks.length - 1; i >= 0 && d > 0; i--){
      const dk = c.decks[i]; if (dk.dead) continue;
      const soak = Math.min(dk.hp, d); dk.hp -= soak; d -= soak; c.wagonHp -= soak;
      if (dk.hp <= 0){ dk.hp = 0; dk.dead = true; dk.boomT = state.t; deckBreak(i); }
    }
    if (c.wagonHp < 0) c.wagonHp = 0;
  } else if (c.wagonHp > 0){
    const soak = Math.min(c.wagonHp, d); c.wagonHp -= soak; d -= soak;
    if (c.wagonHp <= 0){ c.wagonHp = 0; wagonBreak(); }
  }
  if (d > 0) c.hp = Math.max(0, c.hp - d);          // overflow hits the hero core
  SFX.play('hurt');
  refreshHp(); flash(); state.heroHurt = HERO_HURT_DUR;
  if (c.hp <= 0) gameOver();                          // hero down → game over
}
function startRun(){
  // every battle costs 1 play ticket (the calibration sim is exempt); none left → ad or wait
  if (!window.__sim && !spendTicket()){ if (state.screen !== 'menu') show('menu'); openTicketModal(); return; }
  const lv = Meta.level;
  if (!(Meta.ftue & 1)){ Meta.ftue |= 1; Meta.save(); }   // first PLAY tapped → retire the menu hint
  // energy starts at ZERO every battle and only grows by passive income (1/s + POWER) —
  // the shop "ENERGY ×30" bank is the single exception (bonus starting points, consumed here)
  const bank = Meta.energy || 0;
  if (bank){ Meta.energy = 0; Meta.save(); }
  Object.assign(state, { energy: bank, score: 0, paused: false, over: false, won: false, level: lv,
    ult: 0, ultReady: false, kills: 0,   // state.endless is set by the caller (startEndless=true, selectLevel=false) and preserved across a retry
    enemies: [], allies: [], shots: [], eshots: [], pops: [], parts: [], zones: [], props: [], bombs: [], plane: null, planes: [], fxAcc: 0, frost: 0,
    boss: null, bossDead: false, bossT: 0, heroHurt: 0, heroDeadAt: 0,
    fort: null, fortDead: false, fortT: 0,
    levelTypes: levelEnemyTypes(lv),
    spawnT: 0.7, energyAcc: 0, scroll: 0, heroCd: 0, tankFire: 0, heroFire: 0,
    hpMul: enemyHpMul(lv), dmgMul: enemyDmgMul(lv),
    group: 1,                                                    // smooth difficulty (no wave cliffs); density comes from spawn rate
    interval: 1.60 - 0.09 * (lv - 1),                           // spawn gap → sparser early so a pistol keeps up (L1 1.60s … L10 0.79s)
    intervalFloor: 1.00 - 0.06 * (lv - 1) });                   // linear density ramp (L1 1.00 … L10 0.46); HP_MUL carries the level curve
  if (state.endless){ state.endlessT = 0; state.hpMul0 = state.hpMul; state.dmgMul0 = state.dmgMul; }   // reset the ramp every endless run (incl. RETRY)
  state.castle = newCastle();
  state.wpn = Meta.weapons.map(() => ({ cd: 0, ang: -0.3, flash: 0 }));
  const rhero = HEROES[Meta.hero - 1] || HEROES[0];
  if (rhero.tank){ tankFireImage(Meta.tankLvl); for (let i = 0; i < TANK_FRAMES; i++) tankMoveImage(Meta.tankLvl, i); }
  else if (rhero.rank){ /* rank heroes are drawn live by TDSRenderer — nothing to preload */ }
  else if (rhero.squad){                                          // preload every frame so the sprite never blanks mid-cycle
    const atkAnim = rhero.atk === 'melee' ? 'attack' : (rhero.atk === 'bomb' ? 'bomb' : 'shoot');
    for (let i = 0; i < 6; i++){ squadRaster(rhero.sIdx, 'walk', i, 6); squadRaster(rhero.sIdx, atkAnim, i, 6); squadRaster(rhero.sIdx, 'hurt', i, 6); }
    for (let i = 0; i < 8; i++) squadRaster(rhero.sIdx, 'death', i, 8);
  }
  else { for (let i = 0; i < 4; i++) heroIdleImage(rhero.id, i); heroShootImage(rhero.id); }
  closeResultModals();
  $('pauseModal').classList.remove('active');
  show('game');
  if (!window.__sim && window.TDSAnalytics) TDSAnalytics.log('level_start', { level: lv, level_name: (LEVELS[lv - 1] || {}).name || ('LEVEL ' + lv) });
  buildSfBar();
  refreshHud();
  refreshHp();
}
// ── ENDLESS / SURVIVAL MODE (post-campaign) ──────────────────────────────────
// Unlocked once the final level is beaten. Uses the hardest scaling, no finish line and no
// boss gate — the convoy rolls forever while difficulty ramps with time; the run ends only on
// death. Score feeds the leaderboard + a personal best. Guarded so normal levels are untouched.
function endlessUnlocked(){ return !!(Meta.stars && Meta.stars[LEVELS.length]); }
function startEndless(){
  if (!endlessUnlocked()){ show('levels'); return; }
  Meta.level = LEVELS.length;                 // scale from the hardest campaign level
  state.endless = true;
  startRun();                                 // startRun resets the endless ramp baselines (endlessT/hpMul0)
}
function setEnergy(v){ const old = state.energy; state.energy = Math.max(0, Math.round(v)); refreshHud(); if (state.energy > old) bump($('g_energy')); }
function addScore(v){ state.score += v; refreshHud(); bump($('g_score').parentElement); }

/* ---------------- Special forces ---------------- */
function deployForce(f){
  if (!sfOwned(f.id)) return;                             // locked forces can't be deployed
  if (state.energy < f.cost) return;
  const lvl = sfLevel(f.id);
  if (f.kind === 'strike'){
    if (f.plane){                                          // support planes: one of each kind airborne at a time
      if (state.planes.some(pl => pl.kind === f.plane)){ popup(W * 0.5, groundY() - 150 * S(), 'ALREADY AIRBORNE', '#ff8a4a'); return; }
      setEnergy(state.energy - f.cost); spawnSupportPlane(f, lvl); return;
    }
    setEnergy(state.energy - f.cost); airstrike(lvl); return;   // classic airstrike: no cap
  }
  // cap deployed unit-forces on the field at once (airstrike is exempt, handled above)
  if (state.allies.filter(a => !a.dead).length >= SF_FIELD_MAX){ popup(W * 0.5, groundY() - 150 * S(), 'MAX ' + SF_FIELD_MAX + ' FORCES', '#ff8a4a'); return; }
  setEnergy(state.energy - f.cost);
  spawnAlly(f, lvl);
  SFX.play('deploy');
  if (!(Meta.ftue & 2)){ Meta.ftue |= 2; Meta.save(); }   // first deploy done → retire the hint
}
function spawnAlly(f, lvl){
  const s = S();
  // formation slot: reuse the lowest free slot — forces group 2-BY-2 in a tight block just
  // ahead of the hero (a pair in front, the next pair a small step behind on almost the same
  // line) instead of a long row stretching to the right.
  const used = new Set(state.allies.filter(a => !a.dead).map(a => a.slot));
  let slot = 0; while (used.has(slot)) slot++;
  // 2.5D: forces are DRAWN behind the hero on the far lane (vx/vy), but their COMBAT anchor
  // (x/y) stays at the hero's shoulder so they still block melee and soak shots at the front.
  const col = slot % 2, row = (slot / 2) | 0;
  const x = Math.min(W - 40 * s, heroPos().x + (24 + col * 40 + row * 10) * s);   // combat anchor (front line)
  const y = groundY();
  // visual: the FIRST pair (slots 0-1) tucks in just behind the hero; the SECOND pair (slots 2-3)
  // marches AHEAD of the hero, leading the convoy. Drawn after the hero so they're always visible.
  let vx, vy;
  if (row === 0){                                                                 // pair 1: behind the hero (unchanged spot)
    vx = Math.min(W * 0.40, Math.max(30 * s, heroPos().x - (18 + col * 22) * s));
    vy = groundY() - 14 * s;
  } else {                                                                        // pair 2: in front of the hero
    vx = Math.min(W * 0.52, heroPos().x + (48 + col * 30) * s);
    vy = groundY() - 14 * s;                                                      // same lane height as every other force
  }
  const evolved = lvl >= SF_EVOLVE && f.evo;                                          // past the threshold it becomes its upgraded hero
  const art = evolved ? f.evo : f.art;
  const dmg0 = evolved ? f.evoDmg : f.dmg, rate0 = evolved ? f.evoRate : f.rate, splash0 = evolved ? (f.evoSplash || 0) : (f.splash || 0);
  const mul = 1 + 0.25 * (lvl - 1);
  state.allies.push({
    type: f.id, col: f.col, icon: f.icon, art, slot,
    x, y, vx, vy, ph: Math.random() * 6,
    hp: f.hp * mul, maxHp: f.hp * mul,
    dmg: dmg0 * mul, rate: rate0, range: f.range * W, spd: f.spd, splash: splash0 * s,
    cd: 0, fire: 0, dead: false,
  });
  if (art) for (let i = 0; i < 4; i++) heroIdleImage(art, i);                          // preload hero frames so it doesn't pop in blank
  for (let k = 0; k < 8; k++) burst(vx, vy - 30 * s, '#cfe8ff');
  refreshHp();                                                                          // grow the shield bar at once
}
// AIRSTRIKE = a real bombing run: 5 bombs whistle down across the battlefield and each
// detonates on impact (fireball + shockwave particles), damaging everything near its blast.
function airstrike(lvl){
  SFX.play('strike');
  const s = S(), dmg = 70 * (1 + 0.3 * (lvl - 1)) * Meta.dmgMult();
  // a bomber plane flies in from the left and carpet-bombs the middle / right half of the field
  const dropXs = [];
  for (let i = 0; i < 5; i++) dropXs.push(W * (0.46 + 0.42 * i / 4));   // 0.46W → 0.88W — the "second middle" band where enemies mass
  state.plane = { x: -150 * s, y: (140 + Math.random() * 14) * s, vx: (W + 320 * s) / 1.5, dmg, dropXs, di: 0, prop: 0 };
  flash();
}
// ── SUPPORT PLANES ───────────────────────────────────────────────────────────
// Unlike the airstrike (a one-shot fly-by), these fly in and LOITER ABOVE THE TOWER, attacking
// from there for a support window, then fly off. One of each kind airborne at a time.
const PLANE_DUR = 10;                                      // seconds on station above the tower
function spawnSupportPlane(f, lvl){
  SFX.play('strike');
  const s = S(), mult = (1 + 0.3 * (lvl - 1)) * Meta.dmgMult();
  // altitude = the ULTIMATE button's height band (bottom:520px, 66px tall → centre H-553),
  // with a small per-kind stagger so the three planes never overlap each other
  const altOff = { jet: -24, gunship: 2, napalm: 26 }[f.plane] || 0;
  state.planes.push({
    kind: f.plane, dmg: f.dmg * mult,
    x: -140 * s, y: Math.max(90 * s, H - 553 + altOff * s),   // clamp for very short screens
    anchor: 0,                                            // set each frame: hover point above the wagon/tower
    vx: 0, ph: Math.random() * 6, cd: 0.5, life: PLANE_DUR, leaving: false, prop: 0, tr: null, flash: 0,
  });
}
function bombBlast(b){
  const s = S(), gy = groundY();
  if (b.fire){                                             // napalm canister → ignite a burning ground zone
    SFX.play('tank');
    for (let k = 0; k < 14; k++) burst(b.x + (Math.random() - 0.5) * 40 * s, gy - Math.random() * 30 * s, k % 2 ? '#ff7a1a' : '#ffd24a');
    state.zones.push({ x: b.x, y: gy, r: 66 * s, dps: b.dps, life: 4.0, tick: 0, fire: true });
    for (const e of state.enemies){ if (!e.dead && Math.abs(e.x - b.x) < 66 * s) hurt(e, b.dmg, '#ff7a1a'); }
    return;
  }
  SFX.play('tank');
  for (let k = 0; k < 18; k++) burst(b.x + (Math.random() - 0.5) * 30 * s, gy - Math.random() * 46 * s, k % 3 ? '#ffb142' : '#fff3c0');
  for (let k = 0; k < 6; k++) state.parts.push({ x: b.x, y: gy - 14 * s, vx: (Math.random() - 0.5) * 90 * s, vy: -Math.random() * 130 * s,
    life: 0.34, color: k % 2 ? '#ff8a2a' : '#ffd24a', size: (10 + Math.random() * 9) * s, g: -60 });
  for (const e of state.enemies){
    if (e.dead) continue;
    if (Math.abs(e.x - b.x) < 115 * s && state.t - (e._bt || 0) > 0.4){ e._bt = state.t; hurt(e, b.dmg, '#ffd24a'); }
  }
}

/* ---------------- Combat ---------------- */
function spawnEnemy(offset){
  const s = S();
  // draw one of this level's 4 Undead Squad types (more dangerous on higher levels)
  const types = (state.levelTypes && state.levelTypes.length) ? state.levelTypes : [0];
  const tIdx = types[(Math.random() * types.length) | 0];
  const z = (window.UndeadArt && UndeadArt.ROSTER[tIdx]) || null;
  const hpF = z ? z.hpF : 1, spdF = z ? z.spdF : 1, dmgF = z ? z.dmgF : 1;
  const flyer = !!(z && z.flyer), ranged = !!(z && z.ranged), bomb = !!(z && z.bomb);
  // tankier types scale by hpF; per-hit damage stays modest (attrition, not one-shots).
  // In-run pressure ramps with PROGRESS: an easy opening (×0.5) so a fresh loadout rolls
  // through the first stretch, then a steeply rising wall (×3.0 at the finish). Combined
  // with fight-to-advance, play 1 of a level stalls around 35–45% and each upgrade pass
  // pushes the wall further back. Bounded by progress, never by raw score.
  const prog = Math.min(1, state.scroll / levelLen());
  const ramp = 0.5 + 5.5 * Math.pow(prog, 2.2);
  const hp = 112 * hpF * (state.hpMul || 1) * DIFF * ramp;
  state.enemies.push({
    tIdx, type: 'undead', flyer, ranged, bomb, standoff: z ? z.standoff : 0,
    x: W + (40 + (offset || 0)) * s, y: groundY() - (flyer ? 122 : 2) * s,
    hp, maxHp: hp, speed: 76 * spdF * s, dmg: 9 * dmgF * (state.dmgMul || 1) * 1.5,
    dead: false, flash: 0, wob: Math.random() * 6, atkCd: Math.random() * 0.5,
    gap: Math.random() * 30 * s, anim: 'walk', phase: Math.random(),
  });
}
// nearest deployed force standing between an enemy at `ex` and the convoy (i.e. to its left)
function frontAlly(ex){
  let best = null;
  for (const a of state.allies){
    if (a.dead || a.x > ex) continue;
    if (!best || a.x > best.x) best = a;     // closest to the enemy takes the hit first
  }
  return best;
}
// ranged undead (Spitter / Bonechucker / Boomhead) lob a projectile — at a front force if one
// guards the line, otherwise straight at the convoy front.
function spawnEnemyShot(e){
  const s = S(), ox = e.x - 18 * s, oy = e.y - 42 * s;
  const guard = frontAlly(e.x);
  const tx = guard ? guard.x : frontLine(), ty = guard ? guard.y - 30 * s : groundY() - 26 * s;
  const a = Math.atan2(ty - oy, tx - ox), spd = (e.bomb ? 300 : 460) * s;
  state.eshots.push({ x: ox, y: oy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
    dmg: e.dmg, life: 3, bomb: !!e.bomb, color: e.bomb ? '#33373f' : '#bdf24a' });
}
// level BOSS — one big monster per level (MonsterArt), guards the finish line
function spawnBoss(){
  const s = S(), lv = state.level || 1;
  const roster = (window.MonsterArt && MonsterArt.ROSTER) || [];
  if (!roster.length){ levelComplete(); return; }                      // no boss art → just complete
  const idx = (lv - 1) % roster.length, m = roster[idx];
  const flyer = m.arch === 'float';
  const hp = 112 * enemyHpMul(lv) * DIFF * 58 * (1 + (Meta.dmg - 1) * 0.05);   // boss wall ≈ 58 base swarm-units (≈10 end-ramp units) at every level
  const boss = {
    boss: true, mIdx: idx, type: 'boss', flyer, ranged: false, bomb: false, standoff: 0,
    x: W + 130 * s, y: groundY() - (flyer ? 64 : 0) * s,
    hp, maxHp: hp, speed: 30 * s, dmg: 12 + 42 * lvEase(lv),             // eased per-level (not ×enemyDmgMul → bosses don't one-shot)
    dead: false, flash: 0, wob: Math.random() * 6, atkCd: 1.4, gap: 70 * s,
    anim: 'walk', phase: Math.random(),
  };
  state.boss = boss; state.bossT = 2.2;
  state.enemies.push(boss);
  SFX.play('boss');
  // pre-rasterise every walk/attack frame now (the ⚠ BOSS banner covers the decode time),
  // so the monster never pops in blank
  for (let i = 0; i < BOSS_WALK; i++) bossRaster(idx, 'walk', i, BOSS_WALK);
  for (let i = 0; i < BOSS_ATK; i++) bossRaster(idx, 'attack', i, BOSS_ATK);
  flash();
}
// mid-level ENEMY FORT — a destructible castle gate; weapons/hero auto-target it (it's an enemy entity).
// PLACEHOLDER art for now (drawMidFort) — swap in the real UI later.
function spawnFort(){
  const s = S(), lv = state.level || 1;
  const hp = 112 * enemyHpMul(lv) * DIFF * 35 * (1 + (Meta.dmg - 1) * 0.04);   // mid-gate ≈ 35 base swarm-units of HP at every level
  const fort = {
    fort: true, type: 'fort', dead: false, flash: 0,
    x: W - 96 * s, y: groundY() - 58 * s,                  // aim point ≈ mid-structure
    hp, maxHp: hp, atkCd: 1.6,
  };
  state.fort = fort; state.fortT = 2.0;
  state.enemies.push(fort);
  flash();
}
// the fort lobs the occasional cannonball at the convoy so the siege has some bite
function spawnFortShot(e){
  const s = S(), ox = e.x - 30 * s, oy = e.y - 30 * s, tx = frontLine(), ty = groundY() - 26 * s;
  const a = Math.atan2(ty - oy, tx - ox), spd = 380 * s;
  state.eshots.push({ x: ox, y: oy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
    dmg: 11 + 33 * lvEase(lv0(state.level)), life: 4, bomb: true, color: '#6b4f33' });
}
function lv0(l){ return l || 1; }
// true once an enemy's WHOLE body is inside the screen — weapons/hero/forces hold fire
// until the target has fully emerged from the right edge (not just crossed it with its centre).
// Bosses & forts are oversized set-pieces that park with an edge past the border by design,
// so for them we keep the looser "its anchor has entered the screen" test (else never targetable).
function enemyOnScreen(e){
  if (e.boss || e.fort) return e.x <= W;
  const s = S(), z = window.UndeadArt && UndeadArt.ROSTER[e.tIdx];
  const halfW = (z ? z.dispH : 92) * s * (200 / 262) / 2;   // sprite is drawn centred on e.x, width = h·200/262
  return e.x + halfW <= W;
}
// target picker for weapons / hero / forces — only considers enemies fully ON-screen
// (see enemyOnScreen), so nobody opens fire on spawns still emerging at the right edge.
function nearestEnemy(x, y, range){
  let best = null, bd = range * range;
  for (const e of state.enemies){
    if (e.dead || e.x < x - 8 * S() || !enemyOnScreen(e)) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}
// aim point on an enemy — its body centre / chest, NOT its feet
function aimY(e){
  const s = S();
  if (e.fort) return e.y - 34 * s;
  if (e.boss) return e.y - 100 * s;
  const z = window.UndeadArt && UndeadArt.ROSTER[e.tIdx];
  const h = (z ? z.dispH : 92) * s;
  return e.y - h * 0.55;
}
function fireShot(px, py, target, dmg, spd, splash, style){
  const ty = aimY(target);
  const dist = Math.hypot(target.x - px, ty - py), tt = dist / spd;
  const ax = target.x - (target.speed || 0) * tt, a = Math.atan2(ty - py, ax - px);
  state.shots.push({ x: px, y: py, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, splash: splash || 0, life: 2.2, style: style || null });
  SFX.play('shoot');
  return a;
}
const TANK_RELOAD = 0.85;
function fireTankCannon(target){
  state.tankFire = 0.2;
  SFX.play('tank');
  const fire = (window.TankArt && TankArt.CFG[Meta.tankLvl] || { fire: 1 }).fire;
  const dmg = (12 + fire * 12) * Meta.dmgMult(), r = (60 + fire * 9) * S();
  for (const e of state.enemies){ if (e.dead) continue; if (Math.hypot(e.x - target.x, e.y - target.y) < r) hurt(e, e === target ? dmg : dmg * 0.55, '#ffd24a'); }
  for (let k = 0; k < 10; k++) burst(target.x, target.y - 22 * S(), '#ffb142');
}
function hurt(e, dmg, color){
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  SFX.play('hit');
  popup(e.x, e.y - 56 * S(), Math.round(dmg), color || '#fff');
  if (e.hp <= 0) kill(e, true);
}
function kill(e, reward){
  if (e.dead) return; e.dead = true;
  if (e.boss){
    state.boss = null; state.bossDead = true;
    missionEvent('boss', 1);
    const col = (window.MonsterArt && MonsterArt.ROSTER[e.mIdx] && MonsterArt.ROSTER[e.mIdx].color) || '#ffd24a';
    setEnergy(state.energy + 30); addScore(40);
    for (let k = 0; k < 28; k++) burst(e.x, e.y - 60 * S(), col);
    levelComplete(); return;
  }
  if (e.fort){                                         // razing the mid-fort opens the road to the boss
    state.fort = null; state.fortDead = true;
    state.props.push({ kind: 'rubble', wx: state.scroll + e.x });   // leave world-anchored rubble that scrolls away
    SFX.play('fort');
    setEnergy(state.energy + 20); addScore(20);
    for (let k = 0; k < 30; k++) burst(e.x, e.y - 30 * S(), k % 2 ? '#caa46a' : '#8a929c');
    flash(); return;
  }
  if (reward){ SFX.play('die'); addScore(REWARD); gainUltOnKill(); state.kills = (state.kills || 0) + 1; for (let k = 0; k < 8; k++) burst(e.x, e.y - 24 * S(), '#7bbf4a'); }
}
function popup(x, y, txt, color){ state.pops.push({ x, y, vy: -52 * S(), life: 0.7, txt, color }); }
function burst(x, y, color){ const s = S(); state.parts.push({ x, y, vx: (Math.random()-0.5)*220*s, vy: -Math.random()*220*s, life: 0.5, color, size: (2+Math.random()*3)*s }); }
function flash(){ const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

// ── HERO ULTIMATE ────────────────────────────────────────────────────────────
// A signature screen-clear that charges over time (faster when you kill), tinted by the
// equipped hero's bullet colour. Big AoE damage + freeze survivors + heal the convoy core.
const ULT_CHARGE_SEC = 24;                                // fills over ~24 s of combat…
const ULT_KILL_GAIN  = 0.02;                             // …plus a bump per kill (aggressive play charges faster)
function chargeUlt(dt){
  if (state.ultReady || state.over) return;
  state.ult = Math.min(1, state.ult + dt / ULT_CHARGE_SEC);
  if (state.ult >= 1){ state.ult = 1; state.ultReady = true; SFX.play('chest'); }
}
function gainUltOnKill(){ if (!state.ultReady){ state.ult = Math.min(1, state.ult + ULT_KILL_GAIN); if (state.ult >= 1){ state.ult = 1; state.ultReady = true; } } }
function refreshUltBtn(){
  const b = $('ultBtn'); if (!b) return;
  b.style.display = (state.screen === 'game' && !state.over) ? '' : 'none';
  b.classList.toggle('ready', !!state.ultReady);
  b.style.setProperty('--fill', Math.round((state.ult || 0) * 100) + '%');
}
function fireUltimate(){
  if (!state.ultReady || state.over || state.paused) return;
  state.ultReady = false; state.ult = 0; refreshUltBtn();
  missionEvent('ult', 1);
  const hero = HEROES[Meta.hero - 1] || HEROES[0];
  const bs = heroBullet(hero), col = bs.glow || bs.trail || '#ffd24a';
  const dmg = heroDmg(hero) * 6 + 120;                    // hero-scaled screen-clear
  flash(); SFX.play('strike');
  for (const e of state.enemies){ if (e.dead) continue; hurt(e, e.boss ? dmg * 0.8 : dmg, col); }   // hits the boss too, at 80%
  state.frost = Math.max(state.frost, 2.4);               // freeze whoever survives
  if (state.castle){ const c = state.castle; c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.25); refreshHp(); }   // heal the core
  for (let k = 0; k < 30; k++) burst(W * (0.2 + Math.random() * 0.6), groundY() - Math.random() * 160 * S(), col);
  popup(heroPos().x, groundY() - 120 * S(), (hero.name || 'HERO') + ' ULTIMATE!', col);
}
/* ---------------- Results & rewards (Victory / Defeat popups + reward chests) ----------------
   Ported from the Claude Design "Monetization and Meta" batch. End-of-battle shows a Victory or
   Defeat card with a "COLLECT ×2" rewarded-ad option; clearing a level and every 4th game played
   each grant a reward-reveal chest, drained on the way back to the menu / retry. */
const ICON_COIN = '<svg class="ic" width="20" height="20" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#e0982a" stroke="#0a1a38" stroke-width="2.5"/><circle cx="16" cy="16" r="9" fill="#ffd24a" stroke="#b07d22" stroke-width="2"/></svg>';
const ICON_GEM  = '<svg class="ic" width="18" height="18" viewBox="0 0 30 30"><polygon points="15,2 27,11 15,28 3,11" fill="#c44dff" stroke="#0a1a38" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const ICON_PLAY = '<svg class="ic" width="24" height="20" viewBox="0 0 24 20"><rect x="1" y="3" width="22" height="14" rx="3" fill="#0a1a38"/><polygon points="9,6 18,10 9,14" fill="#fff"/></svg>';
const AD_BTN_HTML = ICON_PLAY + 'COLLECT ×2';
// NO revives: a lost run is over — that hard stop is what drives the upgrade grind.
// The post-battle interstitial (playInterstitial) plays before every result card instead.
const ICON_CHEST = '<svg width="78" height="64" viewBox="0 0 48 40"><rect x="6" y="16" width="36" height="21" rx="3" fill="#a8651f" stroke="#0a1a38" stroke-width="3"/><path d="M4 17 q20 -13 40 0 l0 4 -40 0z" fill="#c98a2f" stroke="#0a1a38" stroke-width="3"/><rect x="3" y="13" width="42" height="8" rx="3" fill="#e0a83f" stroke="#0a1a38" stroke-width="3"/><rect x="21" y="18" width="6" height="11" rx="2" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5"/></svg>';
const ICON_GIFT  = '<svg width="72" height="72" viewBox="0 0 48 48"><rect x="9" y="21" width="30" height="21" rx="3" fill="#3a7bd5" stroke="#0a1a38" stroke-width="3"/><rect x="6" y="14" width="36" height="9" rx="3" fill="#4a90e2" stroke="#0a1a38" stroke-width="3"/><rect x="21" y="14" width="6" height="28" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5"/><path d="M24 14 C18 6 12 12 24 14 C30 6 36 12 24 14Z" fill="#ffd24a" stroke="#0a1a38" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const STAR = (lit, big, i) => {
  const sz = big ? 40 : 33, fill = lit ? '#ffd24a' : '#2c3e5e', stroke = lit ? '#0a1a38' : '#5a6e8e';
  return `<svg class="${lit ? 'lit s' + i : ''}" width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="M12 2.5 L14.4 8.8 L21 9.1 L15.8 13.2 L17.6 19.7 L12 16 L6.4 19.7 L8.2 13.2 L3 9.1 L9.6 8.8 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
};

// Speed Boost (shop): 1.5× coin rewards while active
function coinBoost(){ return (Meta.boostUntil && Date.now() < Meta.boostUntil) ? 1.5 : 1; }
// blend two #rrggbb colours → 'rgb(...)' (used for the wagon's wood→steel tier ramp)
function lerpHex(a, b, t){
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round((A >> 16) + (((B >> 16) - (A >> 16)) * t));
  const g = Math.round(((A >> 8) & 255) + ((((B >> 8) & 255) - ((A >> 8) & 255)) * t));
  const bl = Math.round((A & 255) + (((B & 255) - (A & 255)) * t));
  return `rgb(${r},${g},${bl})`;
}

let pendingRewards = [];
function closeResultModals(){ ['victoryModal','defeatModal','rewardModal'].forEach(id => { const m = $(id); if (m) m.classList.remove('active'); }); }
function resetDoubleBtn(btn){ if (!btn) return; btn.disabled = false; btn.classList.remove('done'); btn.innerHTML = AD_BTN_HTML; }
function paintStars(n){
  const box = $('vicStars'); if (!box) return; box.innerHTML = '';
  for (let i = 0; i < 3; i++) box.insertAdjacentHTML('beforeend', STAR(i < n, i === 1, i));
}
// simulated rewarded video — a short overlay, then it resolves and the caller grants the bonus.
// ADMOB HOOK (rewarded): replace the overlay body with your rewarded-ad show() and call
// done() from the "user earned reward" callback.
function playRewardedAd(done){
  if (Meta.noAds){ done(); return; }                       // NO-ADS bundle: rewards resolve instantly
  const RC = window.TDSRemoteConfig;                        // Firebase Remote Config gates the ads
  if (RC && (!RC.getBool('ads_enabled') || !RC.getBool('rewarded_enabled'))){ done(); return; }  // off remotely → still grant the reward
  if (window.TDSAnalytics) TDSAnalytics.log('ad_impression', { ad_type: 'rewarded', ad_platform: (window.AdBridge && AdBridge.rewarded) ? 'admob' : 'sim' });
  if (window.AdBridge && AdBridge.rewarded){ AdBridge.rewarded(done); return; }   // native AdMob (Android build)
  const m = $('adModal'), c = $('adCount'), tx = $('adTxt'); if (!m){ done(); return; }
  if (tx) tx.textContent = 'Rewarded video…';
  let t = 3; if (c) c.textContent = t; m.classList.add('active');
  const iv = setInterval(() => {
    t--; if (t > 0){ if (c) c.textContent = t; }
    else { clearInterval(iv); m.classList.remove('active'); done(); }
  }, 700);
}
// INTERSTITIAL — auto-plays after EVERY battle, win or lose, before the result card.
// ADMOB HOOK (interstitial): pre-load in startRun(), replace the overlay body below with
// interstitial.show(), and call done() from the ad-dismissed callback.
// The NO-ADS bundle (Meta.noAds) skips these forced ads entirely; rewarded ads remain.
let _interstitialTick = 0;   // counts battle-ends → drives Remote Config's interstitial_frequency
function playInterstitial(done){
  if (Meta.noAds || window.__sim){ done(); return; }
  const RC = window.TDSRemoteConfig;                        // Firebase Remote Config gates the ads
  if (RC && (!RC.getBool('ads_enabled') || !RC.getBool('interstitial_enabled'))){ done(); return; }
  const freq = RC ? Math.max(1, Math.round(RC.getNumber('interstitial_frequency'))) : 1;
  if ((++_interstitialTick) % freq !== 0){ done(); return; }   // show only every Nth battle
  if (window.TDSAnalytics) TDSAnalytics.log('ad_impression', { ad_type: 'interstitial', ad_platform: (window.AdBridge && AdBridge.interstitial) ? 'admob' : 'sim' });
  if (window.AdBridge && AdBridge.interstitial){ AdBridge.interstitial(done); return; }   // native AdMob (Android build)
  const m = $('adModal'), c = $('adCount'), tx = $('adTxt'); if (!m){ done(); return; }
  if (tx) tx.textContent = 'Advertisement…';
  let t = 3; if (c) c.textContent = t; m.classList.add('active');
  const iv = setInterval(() => {
    t--; if (t > 0){ if (c) c.textContent = t; }
    else { clearInterval(iv); m.classList.remove('active'); done(); }
  }, 700);
}
// "COLLECT ×2": watch the ad, then add the run's coins a second time (total = 2×)
function doubleReward(which){
  if (state.doubled) return;
  playRewardedAd(() => {
    state.doubled = true;
    Meta.coins += (state.coinReward || 0); Meta.save();
    const lbl = $(which === 'vic' ? 'vicCoins' : 'defCoins'); if (lbl) lbl.textContent = (state.coinReward || 0) * 2;
    const btn = $(which === 'vic' ? 'vicDouble' : 'defDouble');
    if (btn){ btn.disabled = true; btn.classList.add('done'); btn.innerHTML = '✓ DOUBLED'; }
  });
}
// queue a level-cleared reward chest (scales with the level)
function queueLevelReward(level, advanced){
  const L = LEVELS[level - 1] || { name: 'LEVEL' };
  pendingRewards.push({
    icon: ICON_CHEST, accent: '#ffd24a',
    title: `LEVEL ${level} CLEARED`,
    tag: advanced ? 'NEW LEVEL UNLOCKED' : 'CLEARED',
    desc: `${L.name} secured — claim your spoils!`,
    coins: Math.round(100 * levelCoinMul(level)), gems: 3 + Math.floor(level / 2),   // ≈ ⅔ of a play at that level
  });
}
// count the game played; every 4th, queue a play-streak bonus chest
function tallyGameAndStreak(){
  Meta.games = (Meta.games || 0) + 1;
  // hero mastery (played this battle) + daily-mission progress (win + kills accrued this run)
  if (!window.__sim){
    const eqH = HEROES[Meta.hero - 1]; if (eqH) addHeroMastery(eqH.id, (state && state.won) ? 2 : 1);
    missionEvent('play', 1);
    if (state && state.won) missionEvent('win', 1);
    missionEvent('kill', state ? (state.kills || 0) : 0);
    // global leaderboard: track best single-run score, push it up if the player has a nickname
    const sc = state ? (state.score | 0) : 0;
    if (sc > (Meta.bestScore | 0)) Meta.bestScore = sc;
    if (Meta.name && window.TDSLeaderboard && TDSLeaderboard.ready) TDSLeaderboard.submit(Meta.name, Meta.bestScore);
    // weekly + monthly contests: every run's score adds to the running totals (top 10 win gems)
    if (sc > 0 && window.TDSLeaderboard && TDSLeaderboard.monthKey){
      const mk = TDSLeaderboard.monthKey();
      if (!Meta.monthScore || Meta.monthScore.m !== mk) Meta.monthScore = { m: mk, total: 0 };
      Meta.monthScore.total += sc;
      if (Meta.name && TDSLeaderboard.ready) TDSLeaderboard.submitMonthly(Meta.name, Meta.monthScore.total, mk);
      const wk = TDSLeaderboard.weekKey();
      if (!Meta.weekScore || Meta.weekScore.w !== wk) Meta.weekScore = { w: wk, total: 0 };
      Meta.weekScore.total += sc;
      if (Meta.name && TDSLeaderboard.ready) TDSLeaderboard.submitWeekly(Meta.name, Meta.weekScore.total, wk);
    }
    Meta.killsTotal = (Meta.killsTotal | 0) + (state ? (state.kills | 0) : 0);   // lifetime kills (achievements)
  }
  // Play Games Services: submit the run to the leaderboards + unlock milestone achievements
  // (Android only; a harmless no-op on web / before sign-in — see TDSGames in native.js).
  if (!window.__sim && window.TDSGames && window.TDSGames.ready){
    window.TDSGames.submitScore('highscore', state ? (state.score | 0) : 0);
    window.TDSGames.submitScore('toplevel', Meta.unlocked | 0);
    if (state && state.won) window.TDSGames.unlock('first_win');
    if (Meta.unlocked >= 5)  window.TDSGames.unlock('level_5');
    if (Meta.unlocked >= 10) window.TDSGames.unlock('level_10');
    if ((Meta.games | 0) >= 25) window.TDSGames.unlock('veteran');
    checkAchievements();                                 // second-wave milestones (kills, collection, streak…)
  }
  if (Meta.games % rateEvery() === 0) queueRating();   // rating popups every N games (remote-config cadence, default 5)
  if (Meta.games % 4 === 0){
    pendingRewards.push({
      icon: ICON_GIFT, accent: '#4a90e2',
      title: 'PLAY STREAK', tag: 'MILESTONE',
      desc: `${Meta.games} battles played — here's a bonus!`,
      coins: 150, gems: 2,
    });
  }
}
// show one reward chest; CLAIM grants it then runs onClaim (→ next chest, or finish)
function showRewardModal(r, onClaim){
  SFX.play(r.hero ? 'win' : 'chest');
  $('rwTitle').textContent = r.title;
  $('rwTag').textContent = r.tag || '';
  $('rwDesc').textContent = r.desc || '';
  const ico = $('rwIcon');
  if (r.hero){                                                        // NEW HERO reveal — paint the hero portrait
    ico.innerHTML = ''; ico.style.setProperty('--acc', r.accent || '#b15ce8');
    paintHero(ico, r.hero, 'hero-png');
  } else {
    ico.innerHTML = r.icon || ICON_GIFT; ico.style.setProperty('--acc', r.accent || '#4a90e2');
  }
  const g = $('rwGoodies'); g.innerHTML = '';
  if (r.coins) g.insertAdjacentHTML('beforeend', `<span class="rpill coin">${ICON_COIN}+${r.coins}</span>`);
  if (r.gems)  g.insertAdjacentHTML('beforeend', `<span class="rpill gem">${ICON_GEM}+${r.gems}</span>`);
  const grant = (mult) => { if (!r.hero) SFX.play('coin'); Meta.coins += (r.coins || 0) * mult; Meta.gems += (r.gems || 0) * mult; Meta.save(); onClaim(); };
  const claim = $('rwClaim'); claim.onclick = () => grant(1);
  const dbl = $('rwDouble');   // every reward can be doubled by watching an ad
  if (dbl){
    const can = r.adDouble !== false && (r.coins || r.gems);
    dbl.style.display = can ? '' : 'none'; dbl.disabled = false;
    dbl.onclick = () => { dbl.disabled = true; playRewardedAd(() => grant(2)); };
  }
  $('rewardModal').classList.add('active');
}
function drainRewards(done){
  if (!pendingRewards.length){ done(); return; }
  const r = pendingRewards.shift();
  showRewardModal(r, () => { $('rewardModal').classList.remove('active'); drainRewards(done); });
}
// ----- 5★ rate prompt: shown after clearing a level and every 10 battles, until the player rates once -----
let ratingPending = false;
const STORE_URL = 'https://play.google.com/store/apps/details?id=com.TDS.zombietowerdefense';   // TODO: replace with your real store link
const RATE_REWARD = 1000;
// ── rating popups: REMOTE-CONFIG gated (flip on/off from the Firebase console any time) ──
//   rate_popup_enabled        → popup 1: star picker (4-5★ → store page, 1-3★ → thank you)
//   rate_reward_popup_enabled → popup 2: "give us 5 stars and get 1000 coins"
//   rate_popup_every          → cadence in games played (default 5)
const RC = () => window.TDSRemoteConfig;
function rateEvery(){ const n = RC() ? RC().getNumber('rate_popup_every') : 5; return n > 0 ? n : 5; }
function ratePopup1On(){ return RC() ? RC().getBool('rate_popup_enabled') : true; }
function ratePopup2On(){ return RC() ? RC().getBool('rate_reward_popup_enabled') : true; }
function queueRating(){ if (!Meta.rated || !Meta.ratePicked) ratingPending = true; }
// popup 1 — the star picker. done(lowRating) continues the flow; lowRating skips popup 2 this cycle.
function showRateStars(done){
  const modal = $('rateStarsModal'); if (!modal){ done(false); return; }
  const stars = Array.from(modal.querySelectorAll('.rate-stars button'));
  const title = $('rsTitle'), sub = $('rsSub'), ok = $('rsOk'), close = $('rsClose'), row = $('rsStars');
  title.textContent = 'ENJOYING THE GAME?'; sub.textContent = 'How many stars would you give us?';
  row.style.display = ''; ok.style.display = 'none'; close.style.display = '';
  stars.forEach(b => b.classList.remove('lit'));
  let picked = false;
  const finish = (low) => { modal.classList.remove('active'); done(!!low); };
  stars.forEach(b => b.onclick = () => {
    if (picked) return; picked = true;
    const n = +b.dataset.star;
    stars.forEach(s => s.classList.toggle('lit', +s.dataset.star <= n));
    if (window.TDSAnalytics) TDSAnalytics.log('rate_stars', { stars: n });
    Meta.ratePicked = true; Meta.save();
    setTimeout(() => {
      if (n >= 4){ try { window.open(STORE_URL, '_blank'); } catch (e) {} finish(false); }
      else {                                              // low rating → thank them, no store push
        row.style.display = 'none'; close.style.display = 'none';
        title.textContent = 'THANK YOU! ❤️'; sub.textContent = 'Thanks for your feedback — we keep improving the game!';
        ok.style.display = ''; ok.onclick = () => finish(true);
      }
    }, 420);
  });
  close.onclick = () => finish(false);
  SFX.play('chest');
  modal.classList.add('active');
}
// every rate_popup_every games: popup 1 (star picker) → popup 2 (5★ = 1000 coins) → continue
function showRatingFlow(done){
  const p2 = () => { if (ratePopup2On() && !Meta.rated) showRatingModal(done); else done(); };
  if (ratePopup1On() && !Meta.ratePicked) showRateStars(low => { if (low) done(); else p2(); });
  else p2();
}
function showRatingModal(done){
  const modal = $('rateModal'); if (!modal){ done && done(); return; }
  const goodies = $('rateGoodies'); if (goodies) goodies.innerHTML = `<span class="rpill coin">${ICON_COIN}+${RATE_REWARD}</span>`;
  const finish = () => { modal.classList.remove('active'); done && done(); };
  $('rateGo').onclick = () => {
    try { window.open(STORE_URL, '_blank'); } catch (e) {}
    if (!Meta.rated){ Meta.rated = true; Meta.coins += RATE_REWARD; SFX.play('coin'); Meta.save(); refreshMenu(); }
    finish();
  };
  $('rateLater').onclick = finish;
  SFX.play('chest');
  modal.classList.add('active');
}
// leave the result card: reveal any queued reward chests, then the rate prompt, then retry or go to the menu
function proceed(action){
  closeResultModals();
  drainRewards(() => {
    const go = () => { if (action === 'retry') startRun(); else show('menu'); };
    if (ratingPending){ ratingPending = false; showRatingFlow(go); } else go();
  });
}

function gameOver(){
  if (state.over) return;
  state.over = true; state.heroDeadAt = state.t;
  refreshUltBtn();                              // hide the ultimate button on defeat
  if (state.endless){ Meta.endlessBest = Math.max(Meta.endlessBest | 0, state.score | 0); Meta.save(); }   // record survival best
  // consolation coins are only CREDITED when the player leaves (retry/menu)
  state.coinReward = Math.round(state.score * levelCoinMul(state.level) * coinBoost()); state.doubled = false;
  if (!window.__sim && window.TDSAnalytics) TDSAnalytics.log('level_fail', { level: state.level, score: state.score, progress_pct: Math.min(100, Math.round(state.scroll / levelLen() * 100)) });
  SFX.play('lose');
  $('defCoins').textContent = state.coinReward;
  resetDoubleBtn($('defDouble'));
  refreshSkipBtn();
  // let the convoy's death/explosion animation play out (1.5s) → post-battle interstitial → defeat card
  setTimeout(() => { if (state.screen !== 'game') return;
    playInterstitial(() => $('defeatModal').classList.add('active')); }, 1500);
}
// defeat COLLECT ×2: watch an ad to double the consolation (credited on give-up); no immediate Meta change
function defeatDouble(){
  if (state.doubled) return;
  playRewardedAd(() => {
    state.doubled = true;
    const lbl = $('defCoins'); if (lbl) lbl.textContent = (state.coinReward || 0) * 2;
    const b = $('defDouble'); if (b){ b.disabled = true; b.classList.add('done'); b.innerHTML = '✓ DOUBLED'; }
  });
}
// give up the run: credit the consolation coins (×2 if doubled) and count the game played
function finalizeDefeat(){
  Meta.coins += (state.coinReward || 0) * (state.doubled ? 2 : 1);
  tallyGameAndStreak();
  Meta.save();
}
// 🎟️ SKIP LEVEL (defeat card): spend a skip ticket (shop → GEMS tab) on the level you're stuck
// on — it counts as a clear (unlock + advance) but pays no victory reward.
function canSkip(){ return (Meta.tickets || 0) > 0 && state.level >= Meta.unlocked && Meta.unlocked < LEVELS.length; }
function refreshSkipBtn(){
  const b = $('defSkip'); if (!b) return;
  b.style.display = canSkip() ? '' : 'none';
  if (canSkip()) b.innerHTML = `🎟️ SKIP LEVEL · ${Meta.tickets} left`;
}
function skipLevel(){
  if (!canSkip()) return;
  Meta.tickets--;
  Meta.unlocked++; Meta.level = Meta.unlocked;
  finalizeDefeat();                          // still credits the run's consolation coins + saves
  closeResultModals();
  drainRewards(() => show('menu'));
}
// reached the finish line — win, bonus coins, unlock the next level, grant a clear reward
function levelComplete(){
  if (state.over) return;
  state.over = true; state.won = true;
  refreshUltBtn();                                 // hide the ultimate button on victory
  const firstClear = !Meta.stars[state.level];    // no star recorded yet → this is the first-ever clear
  // victory purse ramps with level so later levels fund their pricier upgrades: L1 1000 … L5 4200 … L10 10450 — doublable via COLLECT ×2 ad
  const lt = state.level - 1;
  const reward = Math.round((1000 + 600 * lt + 50 * lt * lt) * coinBoost() * (firstClear ? 1 : REPLAY_COIN_MULT)); Meta.coins += reward; state.coinReward = reward; state.doubled = false;
  const hpFrac = state.castle ? (state.castle.hp + (state.castle.wagonHp || 0)) / (state.castle.maxHp + (state.castle.wagonMax || 0)) : 0;
  state.winStars = hpFrac > 0.66 ? 3 : hpFrac > 0.33 ? 2 : 1;
  Meta.stars[state.level] = Math.max(Meta.stars[state.level] || 0, state.winStars);   // best stars persist → level map
  missionEvent('star', state.winStars);
  if (!window.__sim && window.TDSAnalytics) TDSAnalytics.log('level_complete', { level: state.level, stars: state.winStars, coins: reward });
  SFX.play('win');
  // clearing the frontier level unlocks the next one AND selects it, so PLAY continues the campaign
  const advanced = (state.level >= Meta.unlocked && Meta.unlocked < LEVELS.length);
  if (advanced){ Meta.unlocked++; Meta.level = Meta.unlocked; }
  // CAMPAIGN HERO UNLOCK — the FIRST clear of a level grants the next hero (Battle Tank after the last).
  if (firstClear){
    const grantId = heroGrantedByClearing(state.level);
    if (grantId && !heroOwned(grantId)){
      Meta.heroesOwned.push(grantId);
      const gh = HEROES.find(h => h.id === grantId);
      if (gh) pendingRewards.push({ hero: gh, title: 'NEW HERO UNLOCKED', tag: (gh.rarity || '').toUpperCase(),
        desc: `${gh.name} joined your squad! Equip it from the Heroes screen.`, accent: RARITY_COL[gh.rarity] || '#b15ce8', adDouble: false });
    }
  }
  // STAR MASTERY TRACK — every STAR_MILESTONE total campaign stars grants a gem reward
  { let totalStars = 0; for (const k in Meta.stars) totalStars += Meta.stars[k] | 0;
    Meta.starClaimed = Meta.starClaimed | 0;
    while (totalStars >= (Meta.starClaimed + 1) * STAR_MILESTONE){
      Meta.starClaimed++;
      pendingRewards.push({ icon: '⭐', title: 'STAR MILESTONE', tag: (Meta.starClaimed * STAR_MILESTONE) + ' STARS', desc: 'Campaign mastery reward!', gems: STAR_REWARD_GEMS, accent: '#ffd24a' });
    }
  }
  queueLevelReward(state.level, advanced);     // reward for the level achieved
  tallyGameAndStreak();                        // also counts toward the every-4-games chest (and the every-N-games rate prompt)
  Meta.save();
  $('vicCoins').textContent = reward;
  paintStars(state.winStars);
  resetDoubleBtn($('vicDouble'));
  // a beat for the boss-kill burst → post-battle interstitial → victory card
  setTimeout(() => { if (state.screen !== 'game') return;
    playInterstitial(() => $('victoryModal').classList.add('active')); }, 800);
}

/* ---------------- Update ---------------- */
// the convoy only advances while the road ahead is CLEAR — any living enemy inside the
// front zone stalls it. Distance reached therefore reflects the player's strength: a fresh
// loadout bogs down well before the finish (≈30-40% on play 1), and each upgrade pushes the
// stall point further, until a strong enough build can clear the road all the way to the boss.
function roadBlocked(){
  const zone = frontLine() + W * 0.38;
  for (const e of state.enemies){ if (!e.dead && !e.fort && e.x < zone) return true; }
  return false;
}
function update(dt){
  const s = S(), front = frontLine();
  chargeUlt(dt); refreshUltBtn();                         // hero ultimate charge + HUD meter
  // ENDLESS: ramp difficulty with time; new spawns get tougher (+100% every 45s)
  if (state.endless){
    state.endlessT = (state.endlessT || 0) + dt;
    const k = 1 + state.endlessT / 45;
    state.hpMul = (state.hpMul0 || state.hpMul) * k;
    state.dmgMul = (state.dmgMul0 || state.dmgMul) * k;
  }
  // advance the world; reaching the finish line completes the level
  // advance toward the level's end; at the finish line the level BOSS appears (beat it to win)
  // ENDLESS has no finish line / boss gate → the convoy rolls forever.
  const bossLine = state.endless ? Infinity : levelLen() - heroPos().x;
  const midLine = state.endless ? Infinity : levelLen() * 0.5 - heroPos().x;
  // the convoy halts at the mid-level fort until it's razed, then advances to the boss line
  const cap = state.fortDead ? bossLine : midLine;
  if (state.scroll < cap && !roadBlocked()) state.scroll += SCROLL_SPD * s * dt;
  if (state.scroll > cap) state.scroll = cap;
  const atMid = !state.fortDead && state.scroll >= midLine;
  const atBoss = state.fortDead && state.scroll >= bossLine;
  if (atMid && !state.fort) spawnFort();
  if (atBoss){ state.scroll = bossLine; if (!state.boss && !state.bossDead) spawnBoss(); }
  if (state.bossT > 0) state.bossT -= dt;
  if (state.fortT > 0) state.fortT -= dt;
  $('progFill').style.width = Math.min(100, state.scroll / levelLen() * 100) + '%';
  if (!atMid && !atBoss){                                              // regular enemies pause at either gate
    state.spawnT -= dt;
    if (state.spawnT <= 0){
      const n = state.group + (state.score > 70 ? 1 : 0);              // more attackers at higher levels & late in the run
      for (let k = 0; k < n; k++) spawnEnemy(k * 48 + Math.random() * 22);
      state.interval = Math.max(state.intervalFloor || 0.8, state.interval - 0.015);
      state.spawnT = state.interval;
    }
  }
  if (state.tankFire > 0) state.tankFire -= dt;
  if (state.heroFire > 0) state.heroFire -= dt;
  if (state.heroHurt > 0) state.heroHurt -= dt;
  if (state.frost > 0) state.frost = Math.max(0, state.frost - dt);
  const fmul = state.frost > 0 ? FROST_SLOW : 1;

  // weapons fire from their castle mounts
  const mounts = weaponMounts();
  Meta.weapons.forEach((wid, i) => {
    const w = WEAPONS[wid - 1], m = mounts[i], st = state.wpn[i];
    if (!w || !m || !st) return;
    if (m.deck != null && state.castle && state.castle.decks && state.castle.decks[m.deck] && state.castle.decks[m.deck].dead) return;   // a destroyed deck's weapons stop firing
    st.cd -= dt; if (st.flash > 0) st.flash -= dt;
    const t = nearestEnemy(m.x, m.y, w.range * W);
    if (t) st.ang = Math.atan2(t.y - m.y, t.x - m.x);
    if (t && st.cd <= 0){
      const lvl = Meta.wlv[wid - 1] || 1;
      const dmg = w.dmg * (1 + 0.22 * (lvl - 1)) * Meta.dmgMult() * Meta.wagonDmgMult();
      st.cd = 1 / (w.rate * (1 + 0.05 * (lvl - 1)));
      fireShot(m.x, m.y, t, dmg, w.spd, w.splash * s);
      st.flash = 0.06;
    }
  });

  // hero fires (tank cannon, or ranged shots) — fire origin follows the convoy scale
  const hero = HEROES[Meta.hero - 1] || HEROES[0], hp_ = heroPos(), hcs = CS();
  state.heroCd -= dt;
  const ht = nearestEnemy(hp_.x, hp_.y - 44 * hcs, (hero.range || 0.9) * W);
  if (ht){
    state.heroAng = Math.atan2((hp_.y - 44 * hcs) - ht.y, ht.x - hp_.x);
    if (state.heroCd <= 0){
      if (hero.tank){ state.heroCd = TANK_RELOAD; fireTankCannon(ht); }
      else { state.heroCd = 1 / (hero.rate || 2);
        const my = hero.rank ? 60 * hcs : 78 * hcs;        // rank soldiers hold the gun lower than the tall squad figures
        fireShot(hp_.x + 28 * hcs, hp_.y - my, ht, heroDmg(hero), hero.spd || 950, (hero.splash || 0) * s, heroBullet(hero)); state.heroFire = 0.12; }
    }
  }

  // allies fire
  for (const a of state.allies){
    if (a.dead) continue;
    a.cd -= dt; if (a.fire > 0) a.fire -= dt;
    const t = nearestEnemy(a.x, a.y - 24 * s, a.range);
    if (t && a.cd <= 0){ a.cd = 1 / a.rate; fireShot((a.vx != null ? a.vx : a.x) + 14 * s, (a.vy != null ? a.vy : a.y) - 30 * s, t, a.dmg, a.spd, a.splash); a.fire = 0.08; }   // muzzle at the DRAWN spot
  }

  // enemies advance, then attack the nearest blocking ally or the convoy front
  const reach = 40 * s;
  for (const e of state.enemies){
    if (e.dead) continue;
    if (e.fort){                                        // static gate — only lobs the odd cannonball
      if (e.flash > 0) e.flash -= dt;
      e.atkCd -= dt;
      if (e.atkCd <= 0){ e.atkCd = 2.4; spawnFortShot(e); }
      continue;
    }
    if (e.flash > 0) e.flash -= dt;
    e.anim = 'walk';
    // melee undead can be blocked by an allied unit just to their left; ranged shoot over it
    let ally = null;
    if (!e.ranged){ for (const a of state.allies){ if (!a.dead && a.x <= e.x && e.x - a.x <= reach){ if (!ally || a.x > ally.x) ally = a; } } }
    if (ally){
      e.atkCd -= dt; e.anim = 'attack';
      if (e.atkCd <= 0){ e.atkCd = 0.7; ally.hp -= e.dmg * 1.4; if (ally.hp <= 0){ ally.dead = true; for (let k = 0; k < 8; k++) burst(ally.vx != null ? ally.vx : ally.x, (ally.vy != null ? ally.vy : ally.y) - 24 * s, '#c98'); } }
    } else {
      // clamp the stop/attack point on-screen so enemies (esp. ranged, with a big standoff)
      // walk into view before they fire — no attacks from off the right edge.
      const stopX = Math.min(front + reach + (e.ranged ? (e.standoff || 0) * s : e.gap), W - 60 * s);
      if (e.x <= stopX){
        e.atkCd -= dt;
        e.anim = e.ranged ? 'shoot' : 'attack';
        if (e.atkCd <= 0){
          if (e.ranged){ e.atkCd = 1.5; spawnEnemyShot(e); }
          else { e.atkCd = 0.7; hitConvoy(e.dmg); }
        }
      } else {
        e.x -= e.speed * dt * fmul; e.wob += dt * 8 * fmul;
      }
    }
  }

  // toxic clouds (unused by default — kept for future forces)
  for (const z of state.zones){ z.life -= dt; z.tick -= dt;
    if (z.tick <= 0){ z.tick = 0.25; for (const e of state.enemies) if (!e.dead && Math.hypot(e.x - z.x, e.y - z.y) < z.r) hurt(e, z.dps * 0.25 * Meta.dmgMult(), z.fire ? '#ff7a1a' : '#9be23a'); } }

  // projectiles — sub-stepped so a fast shot collides WHERE it's drawn (never teleports past), and the
  // bullet is kept ONE extra frame at its impact point so its tracer is drawn reaching the enemy on the
  // SAME frame the enemy's HP drops (no more "health falls before the bullet arrives")
  for (const b of state.shots){
    b.px = b.x; b.py = b.y;                                    // frame-start position → drawn as a tracer streak
    if (b.spent){ b.life = -1; continue; }                     // impact already drawn last frame → retire now
    b.life -= dt;
    if (b.life <= 0) continue;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / (12 * s)));   // ≤12px per sub-step, well inside the hit radius
    const sdt = dt / steps;
    for (let n = 0; n < steps && !b.spent; n++){
      b.x += b.vx * sdt; b.y += b.vy * sdt;
      for (const e of state.enemies){
        if (e.dead || Math.hypot(e.x - b.x, aimY(e) - b.y) >= (e.fort ? 58 * s : 26 * s)) continue;   // tighter: hit lands on the body, not the outer edge
        hurt(e, b.dmg, '#ffe07a');
        if (b.splash > 0) for (const o of state.enemies) if (o !== e && !o.dead && Math.hypot(o.x - b.x, aimY(o) - b.y) < b.splash) hurt(o, b.dmg * 0.5, '#ffb142');
        for (let k = 0; k < 8; k++) burst(b.x, b.y, b.splash > 0 ? '#ffb142' : '#ffe07a');   // impact spark at the exact point of contact
        b.spent = true; break;                                  // keep alive this frame so the tracer is drawn reaching the enemy
      }
    }
  }

  // enemy projectiles (Spitter / Bonechucker / Boomhead) fly left toward the convoy front —
  // but a deployed force in the line of fire soaks the hit first (its HP shields the heroes).
  for (const b of state.eshots){
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let soaked = false;
    for (const a of state.allies){
      if (a.dead) continue;
      if (Math.hypot(a.x - b.x, (a.y - 30 * s) - b.y) < 26 * s){
        a.hp -= b.dmg;
        if (a.hp <= 0){ a.dead = true; for (let k = 0; k < 8; k++) burst(a.vx != null ? a.vx : a.x, (a.vy != null ? a.vy : a.y) - 24 * s, '#c98'); }
        for (let k = 0; k < 7; k++) burst(b.x, b.y, b.color);
        b.life = -1; soaked = true; break;
      }
    }
    if (soaked) continue;
    if (b.x <= frontLine()){
      hitConvoy(b.dmg);
      for (let k = 0; k < 7; k++) burst(b.x, b.y, b.color);
      b.life = -1;
    }
  }

  // airstrike bomber: flies across the sky, releasing each bomb as it passes the target x
  if (state.plane){
    const pl = state.plane; pl.x += pl.vx * dt; pl.prop += dt * 46;
    while (pl.di < pl.dropXs.length && pl.x >= pl.dropXs[pl.di]){
      state.bombs.push({ x: pl.dropXs[pl.di] + (Math.random() - 0.5) * 22 * s, y: pl.y + 12 * s,
        vy: (860 + Math.random() * 220) * s, dmg: pl.dmg, hit: false });
      pl.di++;
    }
    if (pl.x > W + 170 * s) state.plane = null;
  }

  // support planes: fly in, hold station ABOVE THE TOWER (gentle patrol), attack, then leave
  for (const pl of state.planes){
    pl.prop += dt * 46; pl.ph += dt; pl.cd -= dt; if (pl.flash > 0) pl.flash -= dt;
    if (pl.tr){ pl.tr.life -= dt; if (pl.tr.life <= 0) pl.tr = null; }
    pl.anchor = heroPos().x - 60 * s + Math.sin(pl.ph * (pl.kind === 'jet' ? 2.2 : 0.9)) * (pl.kind === 'jet' ? 88 : 40) * s;   // hover over the wagon/tower
    if (!pl.leaving){
      pl.life -= dt; if (pl.life <= 0){ pl.leaving = true; }
      pl.x += (pl.anchor - pl.x) * Math.min(1, dt * 2.4);                      // ease onto / around station
      pl.y += Math.sin(pl.ph * 1.7) * 5 * s * dt;                              // soft altitude bob
      // ---- attacks (only once on station) ----
      const onSta = Math.abs(pl.x - pl.anchor) < 120 * s;
      if (onSta && pl.cd <= 0){
        if (pl.kind === 'jet'){                                                // rapid strafing bursts at the nearest enemy
          const t = nearestEnemy(pl.x, pl.y, W * 0.9);
          if (t){ pl.cd = 0.12; pl.flash = 0.05;
            pl.tr = { x2: t.x, y2: aimY(t), life: 0.06 };
            hurt(t, pl.dmg * 0.18, '#4db4ff');
          } else pl.cd = 0.2;
        } else if (pl.kind === 'gunship'){                                     // heavy aimed plasma shells
          const t = nearestEnemy(pl.x, pl.y, W);
          if (t){ pl.cd = 0.45; pl.flash = 0.08; fireShot(pl.x + 26 * s, pl.y + 9 * s, t, pl.dmg, 1350, 26 * s, BULLETS.plasma); }
          else pl.cd = 0.3;
        } else if (pl.kind === 'napalm'){                                      // fire canister ahead of the tower → burning zone
          const t = nearestEnemy(pl.x, pl.y, W);
          const tx = t ? Math.max(frontLine() + 60 * s, Math.min(W * 0.92, t.x)) : W * 0.6;
          pl.cd = 1.6;
          state.bombs.push({ x: tx, y: pl.y + 10 * s, vy: 430 * s, dmg: pl.dmg * 0.6, fire: true, dps: pl.dmg * 0.5, hit: false });
        }
      }
    } else {
      pl.x += (900 * s) * dt; pl.y -= 30 * s * dt;                             // support window over → climb out to the right
    }
  }
  state.planes = state.planes.filter(pl => pl.x < W + 220 * s);
  // airstrike bombs fall and detonate on impact
  for (const b of state.bombs){ b.y += b.vy * dt; if (!b.hit && b.y >= groundY() - 4 * s){ b.hit = true; bombBlast(b); } }
  state.bombs = state.bombs.filter(b => !b.hit);

  // points income (passive power)
  state.energyAcc += Meta.powIncome() * dt;
  if (state.energyAcc >= 1){ const n = Math.floor(state.energyAcc); state.energyAcc -= n; setEnergy(state.energy + n); }

  for (const p of state.pops){ p.y += p.vy * dt; p.vy += 60 * s * dt; p.life -= dt; }
  for (const p of state.parts){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g != null ? p.g : 320) * s * dt; p.life -= dt; }
  state.enemies = state.enemies.filter(e => !e.dead);
  state.allies  = state.allies.filter(a => !a.dead);
  state.shots   = state.shots.filter(b => b.life > 0);
  state.eshots  = state.eshots.filter(b => b.life > 0);
  state.pops    = state.pops.filter(p => p.life > 0);
  state.parts   = state.parts.filter(p => p.life > 0);
  state.zones   = state.zones.filter(z => z.life > 0);
  refreshHp();                                            // keep the shield bar tracking live force HP
}

/* ---------------- Drawing ---------------- */
function rr(x, y, w, h, r){ r = Math.min(r, w/2, h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
const SKY = ['#fbeec2', '#f1c98a'];
function drawBg(){
  const name = LEVEL_BG[state.level];
  const lvIm = name ? IMG['bg_' + name] : null;
  const im = (lvIm && lvIm.naturalWidth) ? lvIm : IMG.bg;
  if (im && im.naturalWidth){
    const iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(W / iw, H / ih);
    ctx.drawImage(im, (W - iw * sc) / 2, 0, iw * sc, ih * sc);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, SKY[0]); g.addColorStop(1, SKY[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
let menuStars = null;
function drawMenuBg(){
  const s = S();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#202a55'); g.addColorStop(0.46, '#2b2a58'); g.addColorStop(1, '#0a0b1a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!menuStars){ menuStars = []; for (let i = 0; i < 70; i++) menuStars.push({ x: Math.random(), y: Math.random() * 0.66, r: Math.random() * 1.3 + 0.4, a: Math.random() * 0.55 + 0.25 }); }
  ctx.fillStyle = '#eaf2ff';
  for (const st of menuStars){ ctx.globalAlpha = st.a; ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r * s, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.74, 8 * s, W * 0.5, H * 0.74, H * 0.62);
  glow.addColorStop(0, 'rgba(232,128,70,0.30)'); glow.addColorStop(0.5, 'rgba(150,80,120,0.15)'); glow.addColorStop(1, 'rgba(150,80,120,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const top = ctx.createRadialGradient(W * 0.5, H * 0.1, 8 * s, W * 0.5, H * 0.1, H * 0.42);
  top.addColorStop(0, 'rgba(120,170,255,0.18)'); top.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.28, W * 0.5, H * 0.5, H * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
}
function drawGround(by){
  const s = S(), off = state.scroll % (150 * s);
  ctx.fillStyle = '#36302e'; ctx.fillRect(0, by, W, H - by);
  ctx.fillStyle = '#574b40'; ctx.fillRect(0, by - 7 * s, W, 7 * s);
  ctx.fillStyle = 'rgba(222,200,110,.4)';
  for (let x = -off; x < W; x += 150 * s) ctx.fillRect(x, by + 46 * s, 64 * s, 8 * s);
  // scrolling foreground rocks/tufts sell the sense of speed
  const sp = 230 * s, o2 = state.scroll % sp;
  ctx.fillStyle = 'rgba(20,16,14,.5)';
  for (let x = -o2; x < W; x += sp){ ctx.beginPath(); ctx.ellipse(x + 40 * s, by + 18 * s, 16 * s, 7 * s, 0, 0, 7); ctx.fill(); }
}
// finish line at the end of the level, scrolling in from the right
function drawFinish(by){
  const s = S(), x = levelLen() - state.scroll;
  if (x > W + 110 * s || x < -150 * s) return;
  const w = 92 * s;
  ctx.fillStyle = '#23262c'; ctx.fillRect(x, by - 156 * s, 9 * s, 156 * s); ctx.fillRect(x + w, by - 156 * s, 9 * s, 156 * s);
  ctx.fillStyle = '#e23b2e'; ctx.fillRect(x, by - 156 * s, w + 9 * s, 30 * s);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${17 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', x + (w + 9 * s) / 2, by - 141 * s);
  const cs = 12 * s, n = Math.ceil((w + 9 * s) / cs);
  for (let c = 0; c < n; c++){ ctx.fillStyle = c % 2 ? '#15171b' : '#eef0f2'; ctx.fillRect(x + c * cs, by + 2 * s, cs, 10 * s); }
}
// merlons (battlements) sitting on top of a wall edge
function drawMerlons(x, topY, w, n, col){
  const s = S(), per = w / n; ctx.fillStyle = col;
  for (let i = 0; i < n; i++) ctx.fillRect(x + i * per + per * 0.14, topY - 11 * s, per * 0.6, 12 * s);
}
function drawCastle(by){
  const { s, stg, w, wallH } = castleDims();
  const wallTop = by - wallH;
  const front = '#d4a262', frontHi = '#eccb8d', back = '#a47c46', dark = '#7a5430';
  // back keep (left)
  const bkW = 44 * s, bkH = wallH + (20 + stg * 7) * s;
  let g = ctx.createLinearGradient(0, by - bkH, 0, by);
  g.addColorStop(0, back); g.addColorStop(1, '#8c6843');
  ctx.fillStyle = g; ctx.fillRect(0, by - bkH, bkW, bkH);
  drawMerlons(0, by - bkH, bkW, 3, '#9a7740');
  // main wall
  g = ctx.createLinearGradient(0, wallTop, 0, by);
  g.addColorStop(0, frontHi); g.addColorStop(1, front);
  ctx.fillStyle = g; ctx.fillRect(0, wallTop, w, wallH);
  ctx.fillStyle = 'rgba(90,55,20,.15)';
  for (let i = 1; i < 3; i++) ctx.fillRect(0, wallTop + wallH * i / 3, w, 3 * s);
  ctx.fillStyle = 'rgba(80,50,20,.16)'; ctx.fillRect(w - 9 * s, wallTop, 9 * s, wallH);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, wallTop, w, 4 * s);
  drawMerlons(0, wallTop, w, Math.max(5, 5 + stg), frontHi);
  // arrow slits
  ctx.fillStyle = '#3a2a18';
  for (let i = 0; i < 3; i++){ const sx = w * (0.2 + i * 0.22); rr(sx, wallTop + wallH * 0.34, 5 * s, 16 * s, 2 * s); ctx.fill(); }
  // gate
  const gw = 40 * s, gx = w * 0.5 - gw / 2, gh = Math.min(wallH * 0.62, 70 * s);
  ctx.fillStyle = '#2c1e12'; rr(gx, by - gh, gw, gh, gw / 2); ctx.fill();
  g = ctx.createLinearGradient(gx, 0, gx + gw, 0); g.addColorStop(0, '#5a3c24'); g.addColorStop(1, '#3a2616');
  ctx.fillStyle = g; rr(gx + 3 * s, by - gh + 2 * s, gw - 6 * s, gh - 2 * s, (gw - 6 * s) / 2); ctx.fill();
  ctx.fillStyle = '#241710'; ctx.fillRect(gx + gw / 2 - 1.2 * s, by - gh + 6 * s, 2.4 * s, gh - 8 * s);
  // front tower (taller, right edge)
  const twW = 46 * s, twX = w - twW, twTop = frontTowerTop();
  g = ctx.createLinearGradient(0, twTop, 0, by); g.addColorStop(0, frontHi); g.addColorStop(1, front);
  ctx.fillStyle = g; ctx.fillRect(twX, twTop, twW, by - twTop);
  ctx.fillStyle = 'rgba(80,50,20,.16)'; ctx.fillRect(twX + twW - 8 * s, twTop, 8 * s, by - twTop);
  drawMerlons(twX, twTop, twW, 3, frontHi);
  ctx.fillStyle = '#3a2a18'; rr(twX + twW / 2 - 2.5 * s, twTop + 30 * s, 5 * s, 16 * s, 2 * s); ctx.fill();
  // flag on the front tower
  const px = twX + twW / 2, py = twTop - 12 * s, fh = 26 * s;
  ctx.strokeStyle = '#46321f'; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - fh); ctx.stroke();
  const wave = Math.sin(state.t * 3) * 3 * s;
  ctx.fillStyle = '#E0783C'; ctx.beginPath(); ctx.moveTo(px, py - fh); ctx.lineTo(px + 22 * s, py - fh + 6 * s + wave); ctx.lineTo(px, py - fh + 13 * s); ctx.closePath(); ctx.fill();
}
// the hand-drawn weapon sprites (assets/weapons/<dir>/lvNN.png) — loaded on demand.
// On load we also compute the opaque content box so each weapon can be seated by its real
// pixels (the sprites have very different transparent padding, which is why they looked off).
const wpnImgCache = {}, wpnBounds = {};
function computeBounds(im){
  try {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0);
    const d = x2.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++){
      if (d[(y * c.width + x) * 4 + 3] > 18){ found = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    return found ? { x: minX / c.width, y: minY / c.height, w: (maxX - minX + 1) / c.width, h: (maxY - minY + 1) / c.height } : null;
  } catch (e) { return null; }
}
function weaponImage(w, lvl){
  // Arsenal weapons: rasterise their SVG once into the shared image/bounds cache
  if (w && w.key && window.Arsenal && Arsenal.has(w.key)){
    const k = 'ars/' + w.key;
    if (!wpnImgCache[k]){
      const im = new Image();
      im.onload = () => { wpnBounds[k] = computeBounds(im); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Arsenal.svgRaw(w.key, { width: 600, height: 244 }));
      wpnImgCache[k] = im; im._key = k;
    }
    return wpnImgCache[k];
  }
  if (!w || !w.dir) return null;
  const pad = String(Math.max(1, Math.min(WEAPON_MAX, lvl | 0))).padStart(2, '0');
  const k = w.dir + '/' + pad;
  if (!wpnImgCache[k]){
    const im = new Image();
    im.onload = () => { wpnBounds[k] = computeBounds(im); };
    im.src = `assets/weapons/${w.dir}/lv${pad}.png`;
    wpnImgCache[k] = im; im._key = k;
  }
  return wpnImgCache[k];
}
// draw the whole convoy: wagon, tower, both weapons seated on their surfaces
function drawConvoy(){
  const g = wagonGeom(), et = wagonEtage(), c = state.castle;
  const decks = c && c.decks ? c.decks : null;
  const nDead = decks ? decks.filter(d => d.dead).length : 0;
  const frac  = c ? c.wagonHp / (c.wagonMax || 1) : 1;
  // damage state → which sprite: all decks gone = destroyed; any gone / <60% = damaged
  let ds = 'intact';
  if (nDead >= et + 1 || frac <= 0) ds = 'destroyed';
  else if (nDead > 0 || frac < 0.6) ds = 'damaged';
  const im = IMG['wagon_s' + (et + 1) + '_' + ds];
  if (im && im.naturalWidth) ctx.drawImage(im, g.leftX, g.topY, WAGON_SPR.W * g.scale, WAGON_SPR.H * g.scale);
  else {                                                                       // fallback: a plain cart body so guns/wheels never float if the sprite fails to load
    const bx = g.leftX + 96 * g.scale, bw = 320 * g.scale, byT = g.topY + 300 * g.scale, bh = (200 + et * 100) * g.scale;
    ctx.fillStyle = '#6b4f33'; rr(bx, byT - (et * 100) * g.scale, bw, bh, 12 * g.scale); ctx.fill();
    ctx.fillStyle = '#8a6a4a'; rr(bx, byT - (et * 100) * g.scale, bw, 10 * g.scale, 6 * g.scale); ctx.fill();
  }
  drawWagonWheels(g);                                                          // spinning wheels over the baked-in ones
  // per-deck effects: burning while damaged, explosion+dust on death, smoke from rubble
  if (decks) for (let d = 0; d < decks.length; d++){
    const dk = decks[d], a = g.spr(WAGON_ANCHORS[d][0], WAGON_ANCHORS[d][1]);
    const bot = g.spr(WAGON_ANCHORS[d][0], WAGON_DECK_BOT[d]);
    if (dk.dead){
      if (dk.boomT != null){ drawFxSheet('explosion', a.x, a.y, g.scale * 1.3, dk.boomT, 'center'); drawFxSheet('dust', bot.x, bot.y, g.scale * 1.2, dk.boomT, 'bottom'); }
      drawFxSheet('smoke', a.x, a.y, g.scale, 0, 'bottom');                    // rubble keeps smoking
    } else if (dk.hp < dk.max * 0.5){
      drawFxSheet('fire',  a.x, a.y, g.scale * 0.9, 0, 'bottom');
      drawFxSheet('smoke', a.x, a.y, g.scale * 0.8, 0, 'bottom');
    }
  }
  // mounted weapons — seated on their hardpoints, sized to each deck's hardpoint spacing so
  // upper decks (closer hardpoints) get smaller guns that never overlap. Skip destroyed decks.
  const pts = WAGON_HP_PTS[et];
  weaponMounts().forEach((m, i) => {
    const wid = Meta.weapons[i]; if (!wid) return;
    if (decks && decks[m.deck] && decks[m.deck].dead) return;
    let gap = 220;                                                             // px to the nearest same-deck hardpoint (sprite space)
    for (let j = 0; j < pts.length; j++) if (j !== i && pts[j][2] === pts[i][2]) gap = Math.min(gap, Math.abs(pts[j][0] - pts[i][0]));
    const cap = pts[i][3] || 130;                                             // per-hardpoint size cap (side/upper guns are smaller)
    const ww = Math.min(cap, gap * 0.95) * g.scale;                          // cap the size, then fit to spacing (looser fit → bigger, clearer guns)
    drawWeaponTurret(m, WEAPONS[wid - 1], state.wpn[i] || {}, Meta.wlv[wid - 1] || 1, ww, ww * 0.74);
  });
}
// draw a weapon so its real pixels are seated bottom-centre on the mount surface (m.x, m.y)
function drawWeaponTurret(m, w, st, lvl, maxW, targetH){
  const s = S();
  maxW = maxW || 104 * s; targetH = targetH || 58 * s;
  const im = weaponImage(w, lvl);
  if (im && im.naturalWidth){
    const b = wpnBounds[im._key];
    let mzX, mzY;
    if (b){
      const scale = Math.min(targetH / (b.h * im.naturalHeight), maxW / (b.w * im.naturalWidth));
      const dw = im.naturalWidth * scale, dh = im.naturalHeight * scale;
      ctx.drawImage(im, m.x - (b.x + b.w / 2) * dw, m.y - (b.y + b.h) * dh, dw, dh);   // content bottom sits on the surface
      mzX = m.x + (b.w / 2) * dw * 0.96; mzY = m.y - b.h * dh * 0.62;
    } else {
      const dw = maxW, dh = dw * (im.naturalHeight / im.naturalWidth);
      ctx.drawImage(im, m.x - dw / 2, m.y - dh * 0.82, dw, dh);
      mzX = m.x + dw * 0.46; mzY = m.y - dh * 0.5;
    }
    if (st && st.flash > 0){   // muzzle flash on fire
      ctx.save(); ctx.fillStyle = 'rgba(255,210,90,.95)';
      ctx.beginPath(); ctx.arc(mzX, mzY, 9 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff8e2'; ctx.beginPath(); ctx.arc(mzX, mzY, 4 * s, 0, 7); ctx.fill();
      ctx.restore();
    }
    return;
  }
  // fallback: simple procedural turret
  const r = 14 * s, col = WEAPON_COL[w.key] || '#7d8a99';
  ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(m.x, m.y - r, r, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(m.x, m.y - r); ctx.rotate(st.ang || -0.3);
  const bl = 26 * s; ctx.fillStyle = col; rr(0, -3 * s, bl, 6 * s, 3 * s); ctx.fill();
  if (st.flash > 0){ ctx.fillStyle = 'rgba(255,210,90,.95)'; ctx.beginPath(); ctx.arc(bl, 0, 7 * s, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawHero(){
  const p = heroPos(), by = p.y, cx = p.x, s = CS(), bob = heroBob(); heroBobY = bob;
  const h = heroDisp().h, hero = HEROES[Meta.hero - 1] || HEROES[0];
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx, by - 3 * s, 30 * s, 8 * s, 0, 0, 7); ctx.fill();
  if (hero.tank){
    const lvl = Meta.tankLvl;
    const im = (state.tankFire > 0) ? tankFireImage(lvl) : tankMoveImage(lvl, Math.floor(state.t * 8) % TANK_FRAMES);
    // seat the tank by its REAL pixel bottom (the sprite has empty space below the tracks),
    // sunk to the wagon's wheel level so it sits flat on the street
    if (im && im.naturalWidth){
      const tkH = 116 * s, tkW = tkH * (640 / 400), b = tankBounds[im._bk];
      const botFrac = b ? (b.y + b.h) : 0.85;
      ctx.drawImage(im, cx - tkW * 0.42, (by + 14 * s) - botFrac * tkH + bob, tkW, tkH);
      return;
    }
    drawHeroToken(cx, by, h, hero); return;
  }
  // Rank hero — drawn LIVE by TDSRenderer with a separately-attached gun that ROTATES TO AIM at
  // the hero's current target (state.heroAng is y-up; canvas rotation is y-down → negate).
  if (hero.rank && window.TDSRenderer){
    let anim, t;
    if (state.over && !state.won){ anim = 'die'; t = Math.min(0.999, (state.t - (state.heroDeadAt || state.t)) / 1.3); }
    else if (state.heroHurt > 0){ anim = 'hit'; t = Math.min(0.999, 1 - Math.max(0, state.heroHurt) / HERO_HURT_DUR); }
    else if (state.heroFire > 0 || state.heroCd > 0 && state.heroCd < 0.18){ anim = 'shoot'; t = (state.t * 1.1) % 1; }
    else { anim = 'walk'; t = (state.t * 0.85) % 1; }
    const size = 148 * s, k = size / 128;
    const ox = cx - 46 * k, oy = by - 116 * k + (anim === 'die' ? 0 : bob);   // frame ground line (y=116) sits on the street
    ctx.save(); ctx.translate(ox, oy);
    TDSRenderer.drawFrame(ctx, size, hero.ci, anim, t, { gun: 'none' });     // body only…
    const so = TDSRenderer.getSocket(hero.ci, anim, t);                      // …then the gun, rotated to the live aim
    if (so.visible){
      const aim = Math.max(-0.9, Math.min(0.45, -(state.heroAng || 0)));
      ctx.translate(so.x * k, so.y * k); ctx.rotate(so.angle + aim); ctx.scale(so.scale * k, so.scale * k);
      const G = TDSRenderer.GUNS[hero.gun];
      G.draw(ctx, anim === 'shoot' ? (state.t * 3) : 0);
      if (state.heroFire > 0.05){ ctx.translate(G.muz[0], G.muz[1]); TDSRenderer.drawFlash(ctx); }
    }
    ctx.restore(); return;
  }
  // Hero Squad — procedural HeroSquad art (faces right), walk loop + attack burst when firing
  if (hero.squad && window.HeroSquad){
    let anim, fi, NF;
    if (state.over && !state.won){                                 // game over → topple-and-fade death (one-shot)
      anim = 'death'; NF = 8;
      const dp = Math.min(0.999, (state.t - (state.heroDeadAt || state.t)) / 1.3);
      fi = Math.min(NF - 1, Math.floor(dp * NF));
    } else if (state.heroHurt > 0){                                 // convoy just took a hit → hurt shake + flash
      anim = 'hurt'; NF = 6;
      const hp = 1 - Math.max(0, state.heroHurt) / HERO_HURT_DUR;
      fi = Math.min(NF - 1, Math.max(0, Math.floor(hp * NF)));
    } else {                                                        // walk loop, attack/shoot/bomb burst when firing
      NF = 6; const firing = state.heroFire > 0;
      anim = firing ? (hero.atk === 'melee' ? 'attack' : (hero.atk === 'bomb' ? 'bomb' : 'shoot')) : 'walk';
      const rate = anim === 'walk' ? 1.6 : 1.2;
      fi = (Math.floor((state.t * rate + (hero.sIdx || 0) * 0.13) * NF) % NF + NF) % NF;
    }
    const im = squadRaster(hero.sIdx, anim, fi, NF);
    // if this exact frame hasn't decoded yet, reuse the last good one so the sprite never blanks (not for death — it must fall)
    const ready = (im && im.naturalWidth) ? im : (anim === 'death' ? im : squadLast[hero.sIdx]);
    if (ready && ready.naturalWidth){
      if (im && im.naturalWidth && anim !== 'death') squadLast[hero.sIdx] = im;
      const yoff = (anim === 'death') ? 0 : bob;                    // no idle bob while dying
      const hH = 118 * s, hW = hH * (200 / 302); ctx.drawImage(ready, cx - hW / 2, by - hH * 0.90 + yoff, hW, hH); return;
    }
    drawHeroToken(cx, by, h, hero); return;
  }
  // foot-hero art has its boots at ~96% of the 200x280 image — seat them on the street too
  const im = (state.heroFire > 0) ? heroShootImage(hero.id) : heroIdleImage(hero.id, Math.floor(state.t * 7) % 4);
  if (im && im.naturalWidth){ const hH = 104 * s, hW = hH * (200 / 280); ctx.drawImage(im, cx - hW / 2, by - hH * 0.96 + bob, hW, hH); }
  else drawHeroToken(cx, by, h, hero);
}
const squadCache = {}, squadLast = {};
function squadRaster(idx, anim, fi, NF){
  const k = idx + '_' + anim + fi;
  if (!squadCache[k] && window.HeroSquad){
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(HeroSquad.svg(idx, 'q' + k, true, anim, fi / NF));
    squadCache[k] = im;
  }
  return squadCache[k];
}
function drawHeroToken(cx, by, _ph, hero){
  const s = CS(), bob = heroBobY, rc = RARITY_COL[hero.rarity] || '#7d8a99';
  // human-sized placeholder (a bit taller than a zombie), independent of the sprite-sheet aspect
  const ph = 96 * s, pw = 58 * s, x = cx - pw / 2, y = by - ph + bob;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx, by - 3 * s, pw * 0.55, 9 * s, 0, 0, 7); ctx.fill();
  const grad = ctx.createLinearGradient(0, y, 0, y + ph); grad.addColorStop(0, rc); grad.addColorStop(1, '#14161e');
  ctx.fillStyle = grad; rr(x, y, pw, ph, 18 * s); ctx.fill();
  ctx.lineWidth = 4 * s; ctx.strokeStyle = rc; rr(x, y, pw, ph, 18 * s); ctx.stroke();
  const gcy = y + ph * 0.45, discR = pw * 0.32;
  ctx.fillStyle = 'rgba(8,10,16,0.5)'; ctx.beginPath(); ctx.arc(cx, gcy, discR, 0, 7); ctx.fill();
  ctx.font = `${discR * 1.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(HERO_EMOJI[hero.id] || '🦸', cx, gcy);
  ctx.font = `700 ${12 * s}px Fredoka, sans-serif`; ctx.fillStyle = '#fff';
  ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.strokeText(hero.name, cx, y + ph - 11 * s); ctx.fillText(hero.name, cx, y + ph - 11 * s);
}
function drawAlly(a){
  const s = S(), x = (a.vx != null ? a.vx : a.x), y = (a.vy != null ? a.vy : a.y);   // render at the far-lane visual spot
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 15 * s, 5 * s, 0, 0, 7); ctx.fill();
  // hero-art forces (ranger/kate/doc & their evolved forms) draw the actual cowboy sprite
  const im = a.art ? (a.fire > 0 ? heroShootImage(a.art) : heroIdleImage(a.art, Math.floor(state.t * 7 + a.ph) % 4)) : null;
  const healthPill = (topY) => { const hbw = 30 * s, hp = Math.max(0, a.hp / a.maxHp);
    ctx.fillStyle = '#241616'; rr(x - hbw / 2, topY, hbw, 6 * s, 3 * s); ctx.fill();
    ctx.fillStyle = '#5fd36a'; rr(x - hbw / 2, topY, hbw * hp, 6 * s, 3 * s); ctx.fill(); };
  if (im && im.naturalWidth){
    const dh = 66 * s, dw = dh * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, x - dw / 2, y - dh, dw, dh);
    healthPill(y - dh - 8 * s);
    return;
  }
  // fallback token (also shown briefly while the hero sprite rasterises)
  const bob = Math.sin(state.t * 8 + a.ph) * 2 * s, h = 44 * s;
  const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, a.col); g.addColorStop(1, '#1b1d22');
  ctx.fillStyle = g; rr(x - 9 * s, y - h * 0.62 + bob, 18 * s, h * 0.62, 4 * s); ctx.fill();
  ctx.fillStyle = '#f0c89a'; ctx.beginPath(); ctx.arc(x, y - h * 0.62 - 5 * s + bob, 7.5 * s, 0, 7); ctx.fill();
  ctx.fillStyle = a.col; rr(x - 9 * s, y - h + bob, 18 * s, 9 * s, 4 * s); ctx.fill();
  const gl = (a.fire > 0 ? 26 : 22) * s;
  ctx.fillStyle = '#23262c'; ctx.fillRect(x + 5 * s, y - h * 0.55 + bob, gl, 5 * s);
  if (a.fire > 0){ ctx.fillStyle = 'rgba(255,210,90,.9)'; ctx.beginPath(); ctx.arc(x + 5 * s + gl, y - h * 0.55 + 2.5 * s + bob, 5 * s, 0, 7); ctx.fill(); }
  healthPill(y - h - 14 * s);
}
function drawShots(){
  const s = S();
  for (const b of state.shots){
    const st = b.style || BULLETS.bolt;                                     // per-hero bullet look (default for weapons/allies)
    const px = b.px != null ? b.px : b.x, py = b.py != null ? b.py : b.y;   // streak spans this frame's travel → fast shots read as one continuous tracer
    if (st.glow){ ctx.shadowColor = st.glow; ctx.shadowBlur = 9 * s; }       // energy/fire bullets glow
    const g = ctx.createLinearGradient(px, py, b.x, b.y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, st.trail);
    ctx.strokeStyle = g; ctx.lineWidth = st.w * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = st.core; ctx.beginPath(); ctx.arc(b.x, b.y, st.r * s, 0, 7); ctx.fill();   // bright bullet head
    ctx.shadowBlur = 0;
  }
}
// falling airstrike bombs — black shells with fins, slight tilt
function drawBombs(){
  const s = S();
  for (const b of state.bombs){
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(0.16);
    ctx.fillStyle = '#23262c'; ctx.beginPath(); ctx.ellipse(0, 0, 7 * s, 11 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a929c';
    ctx.beginPath(); ctx.moveTo(-6 * s, -14 * s); ctx.lineTo(0, -20 * s); ctx.lineTo(0, -10 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6 * s, -14 * s); ctx.lineTo(0, -20 * s); ctx.lineTo(0, -10 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-2 * s, -3 * s, 2 * s, 4.5 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}
// airstrike bomber flying over — side view, spinning prop, drops the bombs
// support planes — three distinct side-view silhouettes loitering above the tower
function drawSupportPlanes(){
  const s = S();
  for (const pl of state.planes){
    // jet tracer (drawn under the plane)
    if (pl.tr){ const g = ctx.createLinearGradient(pl.x + 30 * s, pl.y + 8 * s, pl.tr.x2, pl.tr.y2);
      g.addColorStop(0, 'rgba(140,210,255,.9)'); g.addColorStop(1, 'rgba(140,210,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(pl.x + 30 * s, pl.y + 8 * s); ctx.lineTo(pl.tr.x2, pl.tr.y2); ctx.stroke(); }
    ctx.save(); ctx.translate(pl.x, pl.y);
    if (pl.kind === 'jet'){
      ctx.rotate(pl.leaving ? -0.16 : Math.sin(pl.ph * 2.2) * 0.07);                       // banks as it patrols
      ctx.fillStyle = '#ffb45e';                                                           // afterburner flicker
      ctx.beginPath(); ctx.moveTo(-34 * s, 0); ctx.lineTo((-46 - Math.random() * 8) * s, 0); ctx.lineTo(-34 * s, 4 * s); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, -8 * s, 0, 10 * s); g.addColorStop(0, '#9fb6d6'); g.addColorStop(1, '#4a5b74');
      ctx.fillStyle = g; ctx.strokeStyle = '#26303f'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(38 * s, 1 * s); ctx.lineTo(6 * s, -7 * s); ctx.lineTo(-34 * s, -4 * s); ctx.lineTo(-34 * s, 5 * s); ctx.lineTo(10 * s, 7 * s); ctx.closePath(); ctx.fill(); ctx.stroke();   // dart fuselage
      ctx.fillStyle = '#3d4a61'; ctx.beginPath(); ctx.moveTo(4 * s, 0); ctx.lineTo(-16 * s, 16 * s); ctx.lineTo(-26 * s, 15 * s); ctx.lineTo(-6 * s, -1 * s); ctx.closePath(); ctx.fill();               // swept wing
      ctx.beginPath(); ctx.moveTo(-26 * s, -3 * s); ctx.lineTo(-36 * s, -16 * s); ctx.lineTo(-27 * s, -14 * s); ctx.lineTo(-20 * s, -4 * s); ctx.closePath(); ctx.fill();                                 // tail
      ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(16 * s, -4 * s, 8 * s, 4 * s, 0, 0, 7); ctx.fill();
      if (pl.flash > 0){ ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.arc(38 * s, 6 * s, 4.5 * s, 0, 7); ctx.fill(); }
    } else if (pl.kind === 'gunship'){
      ctx.rotate(Math.sin(pl.ph * 0.9) * 0.03);
      const g = ctx.createLinearGradient(0, -14 * s, 0, 14 * s); g.addColorStop(0, '#8a7fb8'); g.addColorStop(1, '#4a4270');
      ctx.fillStyle = g; ctx.strokeStyle = '#241f38'; ctx.lineWidth = 2.2 * s;
      ctx.beginPath(); ctx.ellipse(0, 0, 44 * s, 13 * s, 0, 0, 7); ctx.fill(); ctx.stroke();                 // fat fuselage
      ctx.fillStyle = '#5a5186'; ctx.beginPath(); ctx.moveTo(6 * s, -2 * s); ctx.lineTo(30 * s, 17 * s); ctx.lineTo(42 * s, 17 * s); ctx.lineTo(18 * s, -3 * s); ctx.closePath(); ctx.fill();            // wing
      for (const ex of [-14, 12]){ ctx.fillStyle = '#3a3358'; ctx.beginPath(); ctx.ellipse(ex * s, 12 * s, 8 * s, 5 * s, 0, 0, 7); ctx.fill();                                                            // twin engines
        ctx.save(); ctx.translate(ex * s, 12 * s); ctx.rotate(pl.prop); ctx.fillStyle = 'rgba(220,225,245,.4)'; ctx.fillRect(-1.4 * s, -9 * s, 2.8 * s, 18 * s); ctx.restore(); }
      ctx.fillStyle = '#4a4270'; ctx.beginPath(); ctx.moveTo(-36 * s, -2 * s); ctx.lineTo(-50 * s, -18 * s); ctx.lineTo(-38 * s, -16 * s); ctx.lineTo(-28 * s, -3 * s); ctx.closePath(); ctx.fill();     // tail
      ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(22 * s, -5 * s, 9 * s, 5 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c2745'; ctx.fillRect(18 * s, 6 * s, 16 * s, 4 * s);                                 // chin cannon
      if (pl.flash > 0){ ctx.fillStyle = '#c9a6ff'; ctx.beginPath(); ctx.arc(36 * s, 8 * s, 6 * s, 0, 7); ctx.fill(); }
    } else {                                                                                                 // napalm bomber: red-belly prop plane
      ctx.rotate(Math.sin(pl.ph * 0.9) * 0.04);
      const g = ctx.createLinearGradient(0, -12 * s, 0, 12 * s); g.addColorStop(0, '#c96a4a'); g.addColorStop(1, '#8a3a24');
      ctx.fillStyle = g; ctx.strokeStyle = '#3a1810'; ctx.lineWidth = 2.2 * s;
      ctx.beginPath(); ctx.ellipse(0, 0, 38 * s, 12 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a04a2e'; ctx.beginPath(); ctx.moveTo(2 * s, 0); ctx.lineTo(22 * s, 15 * s); ctx.lineTo(34 * s, 15 * s); ctx.lineTo(14 * s, -1 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b85838'; ctx.beginPath(); ctx.moveTo(-30 * s, -1 * s); ctx.lineTo(-43 * s, -15 * s); ctx.lineTo(-30 * s, -13 * s); ctx.lineTo(-23 * s, -2 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(-6 * s, 1 * s, 5 * s, 0, 7); ctx.fill();           // hazard roundel
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(-6 * s, 1 * s, 2.6 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(16 * s, -5 * s, 8 * s, 5 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b1610'; ctx.fillRect(-14 * s, 9 * s, 22 * s, 5 * s);                                // canister rack
      ctx.save(); ctx.translate(40 * s, 0); ctx.rotate(pl.prop); ctx.fillStyle = 'rgba(240,220,205,.42)';
      ctx.fillRect(-1.6 * s, -11 * s, 3.2 * s, 22 * s); ctx.restore();
    }
    ctx.restore();
  }
}
// burning napalm zones — looping flame sheet + ember glow on the ground
function drawFireZones(){
  const s = S();
  for (const z of state.zones){
    if (!z.fire) continue;
    const a = Math.min(1, z.life / 0.8);                                       // fade out at the end
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.ellipse(z.x, z.y - 2 * s, z.r, 10 * s, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = a;
    for (const off of [-0.55, 0, 0.55]) drawFxSheet('fire', z.x + z.r * off, z.y + 2 * s, s * 0.55, 0, 'bottom');
    ctx.globalAlpha = 1;
  }
}
function drawPlane(){
  if (!state.plane) return;
  const s = S(), pl = state.plane;
  ctx.save(); ctx.translate(pl.x, pl.y);
  // far wing
  ctx.fillStyle = '#3d4a61';
  ctx.beginPath(); ctx.moveTo(-2*s, 1*s); ctx.lineTo(18*s, 11*s); ctx.lineTo(28*s, 11*s); ctx.lineTo(6*s, 0); ctx.closePath(); ctx.fill();
  // tail fin
  ctx.fillStyle = '#4a5b74';
  ctx.beginPath(); ctx.moveTo(-30*s, -1*s); ctx.lineTo(-42*s, -15*s); ctx.lineTo(-29*s, -13*s); ctx.lineTo(-23*s, -2*s); ctx.closePath(); ctx.fill();
  // fuselage
  const g = ctx.createLinearGradient(0, -12*s, 0, 12*s);
  g.addColorStop(0, '#6d81a0'); g.addColorStop(1, '#3c4a62');
  ctx.fillStyle = g; ctx.strokeStyle = '#26303f'; ctx.lineWidth = 2*s;
  ctx.beginPath(); ctx.ellipse(0, 0, 36*s, 11*s, 0, 0, 7); ctx.fill(); ctx.stroke();
  // near wing
  ctx.fillStyle = '#5b6e88';
  ctx.beginPath(); ctx.moveTo(4*s, 0); ctx.lineTo(24*s, 15*s); ctx.lineTo(34*s, 15*s); ctx.lineTo(14*s, -1*s); ctx.closePath(); ctx.fill();
  // cockpit
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath(); ctx.ellipse(15*s, -5*s, 9*s, 5.5*s, 0, 0, 7); ctx.fill();
  ctx.lineWidth = 1.6*s; ctx.stroke();
  // roundel emblem
  ctx.fillStyle = '#e6eef8'; ctx.beginPath(); ctx.arc(-7*s, 1*s, 6*s, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a7bd5'; ctx.beginPath(); ctx.arc(-7*s, 1*s, 3.8*s, 0, 7); ctx.fill();
  ctx.fillStyle = '#e94b4b'; ctx.beginPath(); ctx.arc(-7*s, 1*s, 1.7*s, 0, 7); ctx.fill();
  // nose cone
  ctx.fillStyle = '#2b3542'; ctx.beginPath(); ctx.ellipse(35*s, 0, 5*s, 8*s, 0, 0, 7); ctx.fill();
  // spinning propeller
  ctx.save(); ctx.translate(38*s, 0); ctx.rotate(pl.prop);
  ctx.fillStyle = 'rgba(210,225,245,.42)';
  ctx.beginPath(); ctx.ellipse(0, 0, 2.4*s, 20*s, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1c242e'; ctx.beginPath(); ctx.arc(38*s, 0, 3*s, 0, 7); ctx.fill();
  ctx.restore();
}
function drawEnemyShots(){
  const s = S();
  for (const b of state.eshots){
    ctx.fillStyle = b.color || '#bdf24a';
    ctx.beginPath(); ctx.arc(b.x, b.y, (b.bomb ? 8 : 6) * s, 0, 7); ctx.fill();
    ctx.lineWidth = 1.5 * s; ctx.strokeStyle = '#1f2a28'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(b.x - 1.6 * s, b.y - 1.6 * s, 2 * s, 0, 7); ctx.fill();
  }
}
/* Undead Squad enemies — procedural UndeadArt rasterised to canvas (like the hero/tank).
   Per type we bake a short walk cycle + attack/shoot frames; they face LEFT already. */
const WALK_FRAMES = 6, ATK_FRAMES = 5;
const undeadCache = {};
function undeadRaster(idx, anim, fi, NF){
  const k = idx + '_' + anim + fi;
  if (!undeadCache[k] && window.UndeadArt){
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(UndeadArt.svg(idx, 'u' + k, true, anim, fi / NF));
    undeadCache[k] = im;
  }
  return undeadCache[k];
}
/* Level bosses — procedural MonsterArt rasterised to canvas (faces LEFT, like the enemies). */
const BOSS_WALK = 8, BOSS_ATK = 8;
const bossCache = {};
function bossRaster(idx, anim, fi, NF){
  const k = idx + '_' + anim + fi;
  if (!bossCache[k] && window.MonsterArt){
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MonsterArt.svg(idx, 'm' + k, true, anim, fi / NF));
    bossCache[k] = im;
  }
  return bossCache[k];
}
function drawBoss(e){
  const s = S(), m = (window.MonsterArt && MonsterArt.ROSTER[e.mIdx]) || { color: '#ffd24a', name: 'BOSS' };
  const h = 196 * s, w = h * (240 / 190);
  const anim = e.anim || 'walk', NF = anim === 'attack' ? BOSS_ATK : BOSS_WALK;
  const rate = anim === 'attack' ? 0.9 : 0.8;
  const fi = (Math.floor((state.t * rate + e.phase) * NF) % NF + NF) % NF;
  const im = bossRaster(e.mIdx, anim, fi, NF);
  ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.beginPath(); ctx.ellipse(e.x, groundY() - 2 * s, w * 0.32, 11 * s, 0, 0, 7); ctx.fill();
  if (im && im.naturalWidth){ if (e.flash > 0) ctx.globalAlpha = 0.7; ctx.drawImage(im, e.x - w / 2, e.y - h, w, h); ctx.globalAlpha = 1; }
  else {                                                   // frame not decoded yet → silhouette so the boss is NEVER invisible
    ctx.globalAlpha = 0.85; ctx.fillStyle = m.color;
    rr(e.x - w * 0.28, e.y - h * 0.78, w * 0.56, h * 0.78, 26 * s); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // boss health bar + name
  const bw = 162 * s, hp = Math.max(0, e.hp / e.maxHp), by = e.y - h - 18 * s;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(e.x - bw / 2 - 3 * s, by - 3 * s, bw + 6 * s, 14 * s, 6 * s); ctx.fill();
  ctx.fillStyle = '#2a0d0d'; rr(e.x - bw / 2, by, bw, 10 * s, 4 * s); ctx.fill();
  ctx.fillStyle = m.color; rr(e.x - bw / 2, by, bw * hp, 10 * s, 4 * s); ctx.fill();
  ctx.font = `700 ${13 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3.5 * s; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText((m.name || 'BOSS').toUpperCase(), e.x, by - 7 * s);
  ctx.fillStyle = '#fff'; ctx.fillText((m.name || 'BOSS').toUpperCase(), e.x, by - 7 * s);
}
function drawZombie(e){
  if (e.fort){ drawMidFort(e); return; }
  if (e.boss){ drawBoss(e); return; }
  const s = S(), z = (window.UndeadArt && UndeadArt.ROSTER[e.tIdx]) || null;
  const h = (z ? z.dispH : 92) * s, w = h * (200 / 262);
  const anim = e.anim || 'walk', NF = anim === 'walk' ? WALK_FRAMES : ATK_FRAMES;
  const rate = anim === 'walk' ? 1.6 : (anim === 'shoot' ? 1.0 : 1.4);
  const fi = (Math.floor((state.t * rate + e.phase) * NF) % NF + NF) % NF;
  const im = undeadRaster(e.tIdx, anim, fi, NF);
  // ground shadow stays on the floor even for flyers (so they read as airborne)
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(e.x, groundY() - 2 * s, w * 0.32, 7 * s, 0, 0, 7); ctx.fill();
  if (im && im.naturalWidth){
    if (z && z.ghosted){                       // ghosts blend into bright backdrops → dark aura + cyan rim so they read clearly
      const cx = e.x, cy = e.y - h * 0.52, rad = w * 0.72;
      const g = ctx.createRadialGradient(cx, cy, 4 * s, cx, cy, rad);
      g.addColorStop(0, 'rgba(130,225,255,.38)'); g.addColorStop(0.55, 'rgba(16,34,60,.5)'); g.addColorStop(1, 'rgba(16,34,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
    }
    if (e.flash > 0) ctx.globalAlpha = 0.6;
    ctx.drawImage(im, e.x - w / 2, e.y - h, w, h);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = z ? z.skin : '#6fae46'; rr(e.x - 15 * s, e.y - 58 * s, 30 * s, 56 * s, 8 * s); ctx.fill();
  }
  const hbw = 44 * s, hp = Math.max(0, e.hp / e.maxHp), hy = e.y - h - 9 * s;
  ctx.fillStyle = '#241616'; rr(e.x - hbw / 2, hy, hbw, 9 * s, 4 * s); ctx.fill();
  ctx.fillStyle = '#ff3030'; rr(e.x - hbw / 2, hy, hbw * hp, 9 * s, 4 * s); ctx.fill();
  if (hp > 0){ ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(e.x - hbw / 2 + 2 * s, hy + 1.5 * s, Math.max(0, hbw * hp - 4 * s), 2.5 * s, 1 * s); ctx.fill(); }
}
// Mid-level enemy fortress — a dark keep with two towers, glowing windows, a portcullis gate,
// flaming braziers and a skull banner. Each level themes it with its own accent colour.
const FORT_SCALE = 0.72;                                 // overall mid-fort size (lower = smaller)
// destroyed state — broken stone heaps, drifting smoke and ember glow
function drawFortRubble(e, s, by){
  const w = 162 * s;
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(e.x, by - 2 * s, w * 0.5, 12 * s, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++){                                          // smoke
    const sx = e.x + (-50 + i * 25) * s, sy = by - (66 + (i % 2) * 18) * s + Math.sin(state.t * 1.5 + i) * 4 * s;
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#9aa1ad'; ctx.beginPath(); ctx.arc(sx, sy, (15 + i * 2) * s, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const [dx, hh] of [[-56, 50], [-18, 70], [24, 44], [56, 58]]){   // broken stone heaps
    const hx = e.x + dx * s, g = ctx.createLinearGradient(0, by - hh * s, 0, by);
    g.addColorStop(0, '#857f8e'); g.addColorStop(1, '#3a3540'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(hx - 26 * s, by); ctx.lineTo(hx - 16 * s, by - hh * 0.7 * s);
    ctx.lineTo(hx - 2 * s, by - hh * s); ctx.lineTo(hx + 14 * s, by - hh * 0.5 * s); ctx.lineTo(hx + 26 * s, by);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#37323d';                                           // scattered blocks
  [[-46, 12], [8, 10], [42, 14], [-10, 9]].forEach(([bx, bw]) => { rr(e.x + bx * s, by - 12 * s, bw * s, 11 * s, 2 * s); ctx.fill(); });
  for (const gx of [-32, 16, 48]){                                     // ember glow
    const fy = by - 8 * s, fg = ctx.createRadialGradient(e.x + gx * s, fy, 1 * s, e.x + gx * s, fy, 15 * s);
    fg.addColorStop(0, '#ffb24a'); fg.addColorStop(0.6, 'rgba(255,120,30,.5)'); fg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(e.x + gx * s, fy, 15 * s, 0, 7); ctx.fill();
  }
  ctx.font = `700 ${13 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3.5 * s; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText('FORT DESTROYED', e.x, by - 86 * s); ctx.fillStyle = '#ff8a5a'; ctx.fillText('FORT DESTROYED', e.x, by - 86 * s);
}
function drawMidFort(e){
  const s = S() * FORT_SCALE, by = groundY();
  if (e.destroyed){ drawFortRubble(e, s, by); return; }
  const w = 162 * s, h = 170 * s, x = e.x - w / 2, top = by - h;
  const hpFrac = Math.max(0, e.hp / e.maxHp), dmg = 1 - hpFrac, flashing = e.flash > 0;
  const ACCENTS = ['#e0451f', '#7a4fe0', '#2fae5a', '#3E97D6', '#caa23a', '#d23b6e', '#37b0a6', '#c07a2a', '#5a78d6', '#c44dff'];
  const acc = ACCENTS[((state.level || 1) - 1) % ACCENTS.length];
  const stoneTop = lerpHex('#6b7380', '#5a3f44', dmg), stoneBot = lerpHex('#3a414b', '#26202a', dmg);
  const grad = (yT, yB) => { const g = ctx.createLinearGradient(0, yT, 0, yB); g.addColorStop(0, stoneTop); g.addColorStop(1, stoneBot); return g; };
  ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.beginPath(); ctx.ellipse(e.x, by - 2 * s, w * 0.52, 13 * s, 0, 0, 7); ctx.fill();
  // side towers — taller, with crenellations, a glowing slit and a pennant
  const twW = 40 * s, twH = h + 30 * s;
  for (const tx of [x + 2 * s, x + w - twW - 2 * s]){
    ctx.fillStyle = flashing ? '#fff' : grad(by - twH, by); rr(tx, by - twH, twW, twH, 4 * s); ctx.fill();
    drawMerlons(tx, by - twH, twW, 3, stoneTop);
    ctx.globalAlpha = 0.9; ctx.fillStyle = acc; rr(tx + twW * 0.5 - 3 * s, by - twH * 0.6, 6 * s, 16 * s, 3 * s); ctx.fill(); ctx.globalAlpha = 1;
    const px = tx + twW / 2, pyTop = by - twH - 26 * s;
    ctx.strokeStyle = '#2a2228'; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(px, by - twH - 2 * s); ctx.lineTo(px, pyTop); ctx.stroke();
    ctx.fillStyle = acc; ctx.beginPath(); ctx.moveTo(px, pyTop); ctx.lineTo(px + 22 * s, pyTop + 6 * s); ctx.lineTo(px, pyTop + 13 * s); ctx.closePath(); ctx.fill();
  }
  // central keep wall
  const wx = x + twW * 0.7, ww = w - twW * 1.4;
  ctx.fillStyle = flashing ? '#fff' : grad(top, by); rr(wx, top, ww, h, 4 * s); ctx.fill();
  drawMerlons(wx, top, ww, 5, stoneTop);
  ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2 * s;
  for (let i = 1; i < 5; i++){ const ly = top + (h / 5) * i; ctx.beginPath(); ctx.moveTo(wx + 4 * s, ly); ctx.lineTo(wx + ww - 4 * s, ly); ctx.stroke(); }
  ctx.globalAlpha = 0.85; ctx.fillStyle = acc;
  rr(e.x - 30 * s, top + 30 * s, 9 * s, 18 * s, 4 * s); ctx.fill();
  rr(e.x + 21 * s, top + 30 * s, 9 * s, 18 * s, 4 * s); ctx.fill(); ctx.globalAlpha = 1;
  // arched portcullis gate, with a faint inner glow + bars
  const gw = 52 * s, gx = e.x - gw / 2, gh = 72 * s, gtop = by - gh;
  const gatePath = () => { ctx.beginPath(); ctx.moveTo(gx, by); ctx.lineTo(gx, gtop + gw / 2); ctx.arc(e.x, gtop + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(gx + gw, by); ctx.closePath(); };
  ctx.fillStyle = '#16110f'; gatePath(); ctx.fill();
  const ig = ctx.createRadialGradient(e.x, by - 16 * s, 2 * s, e.x, by - 16 * s, gw * 0.75);
  ig.addColorStop(0, acc); ig.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5; ctx.fillStyle = ig; gatePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(22,18,16,.9)'; ctx.lineWidth = 3 * s;
  for (let i = 1; i < 5; i++){ const bx = gx + (gw / 5) * i; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, gtop + 8 * s); ctx.stroke(); }
  for (let i = 1; i < 3; i++){ const yb = gtop + 18 * s + i * 18 * s; ctx.beginPath(); ctx.moveTo(gx + 3 * s, yb); ctx.lineTo(gx + gw - 3 * s, yb); ctx.stroke(); }
  // skull banner over the gate
  ctx.fillStyle = '#9c2a2a'; rr(e.x - 12 * s, top + 6 * s, 24 * s, 40 * s, 3 * s); ctx.fill();
  ctx.fillStyle = '#1f1416'; rr(e.x - 12 * s, top + 6 * s, 24 * s, 5 * s, 2 * s); ctx.fill();
  ctx.fillStyle = '#f4eee0'; ctx.font = `700 ${18 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('☠', e.x, top + 28 * s);
  // flaming braziers at the base
  for (const bxp of [x + 15 * s, x + w - 15 * s]){
    const fy = by - 16 * s, fg = ctx.createRadialGradient(bxp, fy, 1 * s, bxp, fy, 17 * s);
    fg.addColorStop(0, '#fff1a0'); fg.addColorStop(0.5, '#ff8a2a'); fg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(bxp, fy, 17 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a22'; rr(bxp - 4 * s, fy, 8 * s, 16 * s, 2 * s); ctx.fill();
  }
  // damage cracks
  if (dmg > 0.35){ ctx.strokeStyle = 'rgba(8,8,12,.55)'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(x + w * 0.40, top + 14 * s); ctx.lineTo(x + w * 0.50, top + h * 0.42); ctx.lineTo(x + w * 0.42, top + h * 0.72); ctx.stroke(); }
  if (dmg > 0.66){ ctx.beginPath(); ctx.moveTo(x + w * 0.62, top + 24 * s); ctx.lineTo(x + w * 0.56, top + h * 0.52); ctx.lineTo(x + w * 0.66, top + h * 0.86); ctx.stroke(); }
  // HP bar + label
  const bw = 156 * s, bx = e.x - bw / 2, byy = top - 30 * s;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(bx - 3 * s, byy - 3 * s, bw + 6 * s, 14 * s, 6 * s); ctx.fill();
  ctx.fillStyle = '#2a0d0d'; rr(bx, byy, bw, 10 * s, 4 * s); ctx.fill();
  ctx.fillStyle = '#e0a83f'; rr(bx, byy, bw * hpFrac, 10 * s, 4 * s); ctx.fill();
  ctx.font = `700 ${13 * s}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3.5 * s; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText('ENEMY FORT', e.x, byy - 7 * s); ctx.fillStyle = '#fff'; ctx.fillText('ENEMY FORT', e.x, byy - 7 * s);
}
function drawPopups(){
  const s = S(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of state.pops){
    ctx.globalAlpha = Math.max(0, p.life / 0.7);
    ctx.font = `700 ${22 * s}px Fredoka, sans-serif`;
    ctx.lineWidth = 4 * s; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(p.txt, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.txt, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  for (const p of state.parts){ ctx.globalAlpha = Math.min(1, Math.max(0, p.life / 0.5)); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawFrostOverlay(){ if (state.frost <= 0) return; ctx.fillStyle = `rgba(140,205,255,${Math.min(0.2, state.frost * 0.09)})`; ctx.fillRect(0, 0, W, H); }
// world-anchored props (fort rubble) — stored at world x, drawn at world x − scroll so they
// slide away behind the advancing convoy like the rest of the world
function drawProps(by){
  const s = S() * FORT_SCALE;
  for (const p of state.props){
    const x = p.wx - state.scroll;
    if (x < -160 * s || x > W + 160 * s) continue;
    if (p.kind === 'rubble') drawFortRubble({ x }, s, by);
  }
}
function render(){
  ctx.clearRect(0, 0, W, H);
  if (state.screen !== 'game'){ drawMenuBg(); return; }
  drawBg();
  const by = groundY();
  drawGround(by);
  // the castle we set out from scrolls away to the left behind the convoy
  if (castleDims().w - state.scroll > -20){ ctx.save(); ctx.translate(-state.scroll, 0); drawCastle(by); ctx.restore(); }
  if (!state.endless && !state.boss && !state.bossDead) drawFinish(by);   // no finish gate in endless; the boss replaces it otherwise
  drawProps(by);                                                       // razed-fort rubble etc. (world-anchored)
  const wreck = state.over && !state.won;                              // defeat: the convoy renders as a burnt-out wreck
  if (wreck) ctx.filter = 'grayscale(0.7) brightness(0.55)';
  drawConvoy();
  drawHero();                                                          // convoy + hero share the wreck tint
  if (wreck) ctx.filter = 'none';                                      // living allies are NOT part of the wreck tint
  // forces render AFTER the hero so it never hides them — but kept within the left 40% of the
  // screen (see spawnAlly vx clamp) so they cluster just behind/beside the hero, not mid-scene.
  for (const a of [...state.allies].sort((p, q) => p.y - q.y)) drawAlly(a);
  for (const e of state.enemies) drawZombie(e);
  drawFireZones();
  drawShots(); drawBombs(); drawPlane(); drawSupportPlanes(); drawEnemyShots(); drawPopups(); drawFrostOverlay();
  if (state.bossT > 0) drawBossBanner();
  if (state.fortT > 0) drawFortBanner();
}
function drawFortBanner(){
  const s = S(), a = Math.min(1, state.fortT / 0.4);
  ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${38 * s}px Fredoka, sans-serif`;
  ctx.lineWidth = 7 * s; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#ffd24a';
  ctx.strokeText('🏰 ENEMY FORT', W / 2, H * 0.30); ctx.fillText('🏰 ENEMY FORT', W / 2, H * 0.30);
  ctx.globalAlpha = 1;
}
function drawBossBanner(){
  const s = S(), a = Math.min(1, state.bossT / 0.4);
  ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${44 * s}px Fredoka, sans-serif`;
  ctx.lineWidth = 7 * s; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#ff5252';
  ctx.strokeText('⚠ BOSS ⚠', W / 2, H * 0.34); ctx.fillText('⚠ BOSS ⚠', W / 2, H * 0.34);
  ctx.globalAlpha = 1;
}

/* ---------------- Battle HUD ---------------- */
let sfButtons = [];
function buildSfBar(){
  const bar = $('sfBar'); if (!bar) return;
  bar.innerHTML = ''; sfButtons = [];
  for (const f of FORCES){
    if (!sfOwned(f.id)) continue;                          // only deployable (owned) forces show in the battle bar
    const b = document.createElement('button');
    b.className = 'sf' + (f.kind === 'strike' ? ' strike' : '');
    const nm = (f.evo && sfLevel(f.id) >= SF_EVOLVE) ? f.evoName : f.name;
    b.innerHTML = `<span class="sf-ico">${f.icon}</span><span class="sf-name">${nm}</span><span class="sf-cost"><i class="blt"></i><b>${f.cost}</b></span>`;
    b.addEventListener('click', () => deployForce(f));
    bar.appendChild(b); sfButtons.push({ b, f });
  }
}
function refreshHp(){
  if (!state.castle) return;
  const c = state.castle, heroMax = c.maxHp || 1;
  const heroHp = Math.max(0, c.hp);
  const f = $('hpFill');                                   // hero core (top bar) — the last line
  if (f){ f.style.width = (heroHp / heroMax * 100) + '%'; f.classList.toggle('low', heroHp > 0 && heroHp / heroMax < 0.3); }
  // shield bar = wagon plating + the HP of every deployed force, so adding forces grows it
  let wagHp = Math.max(0, c.wagonHp || 0), wagMax = c.wagonMax || 0;
  for (const a of state.allies){ if (a.dead) continue; wagHp += Math.max(0, a.hp); wagMax += a.maxHp; }
  const w = $('hpWagon');                                  // wagon shield + forces (bottom bar) — drops first
  if (w) w.style.width = (wagMax ? wagHp / wagMax * 100 : 0) + '%';
  const t = $('hpTxt'); if (t) t.textContent = Math.ceil(heroHp);
  const wt = $('hpWagonTxt'); if (wt) wt.textContent = Math.ceil(wagHp);
}
function refreshHud(){
  if (state.screen !== 'game' && !state.castle) return;
  refreshHp();
  $('g_energy').textContent = state.energy;
  $('g_score').textContent = state.score;
  $('progFill').style.width = Math.min(100, state.scroll / levelLen() * 100) + '%';
  refreshUltBtn();
  for (const { b, f } of sfButtons) b.disabled = state.energy < f.cost;
  // first-time: once the player can afford a force, point at the forces bar until they deploy
  const fd = $('ftueDeploy'); if (fd) fd.style.display = (!(Meta.ftue & 2) && !state.over && state.energy >= FORCES[0].cost) ? '' : 'none';
}

/* ---------------- Menu refresh ---------------- */
let _coinsShown = null, _gemsShown = null;
function refreshMenu(){
  if (_coinsShown !== null && Meta.coins !== _coinsShown) bump($('m_coins').parentElement);
  if (_gemsShown !== null && Meta.gems !== _gemsShown) bump($('m_gems').parentElement);
  _coinsShown = Meta.coins; _gemsShown = Meta.gems;
  $('m_coins').textContent = Meta.coins; $('m_gems').textContent = Meta.gems;
  const lv = LEVELS[Meta.level - 1] || LEVELS[0];
  $('m_levelno').textContent = lv.id; $('m_levelname').textContent = lv.name;
  renderCastle(); refreshCastleUpg(); refreshLoadout(); refreshHeroLoadout(); refreshSndUi(); refreshMissionDot();
  regenTickets(); refreshTikUi();
  const sn = $('streakN'); if (sn) sn.textContent = streakNext();
  const sb = $('toStreak'); if (sb) sb.classList.toggle('ready', streakClaimable());
  const fp = $('ftuePlay'); if (fp) fp.style.display = (Meta.ftue & 1) ? 'none' : '';   // first-time: point at PLAY
}
/* ---------------- Play tickets (battle entry) ---------------- */
function regenTickets(){
  const now = Date.now();
  if (Meta.pticket >= PT_MAX){ Meta.pticketAt = now; return; }        // full → idle anchor
  const gained = Math.floor((now - Meta.pticketAt) / PT_REGEN_MS);
  if (gained > 0){
    Meta.pticket = Math.min(PT_MAX, Meta.pticket + gained);
    Meta.pticketAt = Meta.pticket >= PT_MAX ? now : Meta.pticketAt + gained * PT_REGEN_MS;
    Meta.save();
  }
}
function spendTicket(){
  regenTickets();
  if (Meta.pticket <= 0) return false;
  if (Meta.pticket >= PT_MAX) Meta.pticketAt = Date.now();            // leaving full → start the clock
  Meta.pticket--; Meta.save();
  return true;
}
function grantTicket(n){ regenTickets(); Meta.pticket = Math.min(PT_MAX, Meta.pticket + (n || 1)); Meta.save(); refreshTikUi(); }
function tikCountdownText(){
  if (Meta.pticket >= PT_MAX) return 'FULL';
  const ms = Math.max(0, Meta.pticketAt + PT_REGEN_MS - Date.now());
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return `+1 in ${m}:${String(s).padStart(2, '0')}`;
}
function refreshTikUi(){
  const n = $('tikN'); if (n) n.textContent = Meta.pticket;
  const t = $('tikT'); if (t) t.textContent = tikCountdownText();
  const mn = $('tkModalN'); if (mn) mn.textContent = 'Next ticket: ' + tikCountdownText();
}
function openTicketModal(){ regenTickets(); refreshTikUi(); $('ticketModal').classList.add('active'); }
function closeTicketModal(){ $('ticketModal').classList.remove('active'); }
function adTicket(){ playRewardedAd(() => { grantTicket(1); SFX.play('coin'); closeTicketModal(); refreshMenu(); }); }

/* ---------------- Sound toggle (menu chip + pause modal) ---------------- */
function refreshSndUi(){
  const on = Meta.sound !== false;
  const b1 = $('sndBtn'); if (b1){ const i = b1.querySelector('.ico'); if (i) i.textContent = on ? '🔊' : '🔇'; }
  const b2 = $('sndBtn2'); if (b2) b2.textContent = on ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
}
function toggleSound(){ Meta.sound = Meta.sound === false; SFX.setEnabled(Meta.sound); Meta.save(); refreshSndUi(); }
/* ---------------- Shop (Gear / Top Up / Gems tabs) ----------------
   Layout ported from the Claude Design "Monetization and Meta" batch; chest opens reuse the
   reward-reveal modal. First-pass economy — placeholder $ purchases just grant the goods. */
// ── PRICING MODEL — keep the whole app consistent ────────────────────────────
// 1 gem ≈ 80 coins · $1 ≈ 50 gems ≈ 4000 coins. Dual-priced items: coins = gems×80.
// Loot chests pay back ≈ their price in value (slightly + so opening feels good);
// real-money items hand back a little bonus value per dollar.
const CHESTS = {  // payout value ≈ price (gems counted at 80 coins each)
  legendary: { name: 'LEGENDARY CHEST', short: 'LEGENDARY', rarity: 'Legendary', accent: '#F4B731', priceGems: 120, coins: [4500, 10000], gems: [22, 48] },
  rare:      { name: 'RARE CHEST',      short: 'RARE',      rarity: 'Rare',      accent: '#3E97D6', priceGems: 40,  coins: [1500, 3500],  gems: [6, 14] },
  common:    { name: 'COMMON CHEST',    short: 'COMMON',    rarity: 'Common',    accent: '#7d8a99', priceCoins: 250, coins: [120, 400],   gems: [0, 1] },
};
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function boostLeftText(){ const m = Math.max(0, Math.ceil(((Meta.boostUntil || 0) - Date.now()) / 60000)); return `Active · ${m} min left`; }
// ----- daily free chest + ad-box limits (reset each calendar day) -----
// FREE-money rule: every faucet is anchored to levelCoinMul (what a PLAY earns at the current
// level) so free coins are a bonus, never a substitute for playing — one ad ≈ half a play,
// and the whole day of freebies ≈ 3-4 plays. Gems stay scarce so gem items keep their value.
const DAY_MS = 86400000, AD_CHEST_MAX = 4, AD_COIN_MAX = 6, AD_GEM_MAX = 3, AD_GEM_REWARD = 2;
const adCoinReward = () => Math.max(30, Math.round(60 * levelCoinMul(Meta.level) / 5) * 5);   // ≈ half a play's coins at the current level
const dayNum = () => Math.floor(Date.now() / DAY_MS);
function rollShopDay(){ const d = dayNum(); if (Meta.adDay !== d){ Meta.adDay = d; Meta.adChestUsed = 0; Meta.adCoinUsed = 0; Meta.adGemUsed = 0; Meta.save(); } }
function fmtCountdown(ms){ const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`; }
function shopHead(txt){ const d = document.createElement('div'); d.className = 'shop-head'; d.textContent = txt; return d; }
let shopTab = 'free';
// ---- daily login streak: claim day N for 100·N coins; miss a day and it resets to day 1 ----
function streakNext(){ if (Meta.streakDay === dayNum()) return Meta.streak || 1; if (Meta.streakDay === dayNum() - 1) return (Meta.streak || 0) + 1; return 1; }
function streakClaimable(){ return (Meta.streakDay || 0) < dayNum(); }
let streakBonus = 0;   // amount just claimed that a rewarded ad can still double
// 7-day login rewards — bases scale with levelCoinMul so a streak day ≈ ½–1 play early in
// the week, day 7 ≈ a 4-play jackpot, at ANY campaign stage (doublable via ad).
// Miss a day → the streak resets to day 1 (enforced in claimStreak/streakNext).
const STREAK_REWARDS = [60, 90, 130, 170, 220, 280, 700];
const streakReward = day => Math.round(STREAK_REWARDS[(((day - 1) % 7) + 7) % 7] * levelCoinMul(Meta.level));
function claimStreak(){
  if (!streakClaimable()) return;
  Meta.streak = (Meta.streakDay === dayNum() - 1) ? (Meta.streak || 0) + 1 : 1;
  Meta.streakDay = dayNum();
  const base = streakReward(Meta.streak); Meta.coins += base; streakBonus = base;
  if (Meta.streak % 7 === 0) Meta.gems += 20;              // day-7 calendar bonus: +20 💎 on top of the coins
  Meta.save();
  openStreak(); refreshMenu();
}
function streakDoubleAd(){ if (streakBonus <= 0) return; const b = streakBonus; playRewardedAd(() => { Meta.coins += b; streakBonus = 0; Meta.save(); openStreak(); refreshMenu(); }); }
function closeStreak(){ streakBonus = 0; const m = $('streakModal'); if (m) m.classList.remove('active'); }
function openStreak(){
  const claimable = streakClaimable(), cur = streakNext(), base = Math.floor((cur - 1) / 7) * 7;
  const row = $('streakRow');
  if (row){ row.innerHTML = '';
    for (let i = 1; i <= 7; i++){
      const day = base + i, done = day < cur || (day === cur && !claimable), next = day === cur && claimable, bonus = i === 7;
      const t = document.createElement('div');
      t.className = 'st-tile' + (done ? ' done' : '') + (next ? ' next' : '') + (bonus ? ' bonus' : '');
      t.innerHTML = `<span class="st-day">${bonus ? 'Day 7 · BONUS' : 'Day ' + i}</span>`
        + `<span class="st-coin">${ICON_COIN}</span>`
        + `<span class="st-amt">${streakReward(day)}${bonus ? ' +20💎' : ''}</span>`
        + (done ? '<span class="st-chk">✓</span>' : '');
      row.appendChild(t);
    }
  }
  const sub = $('streakSub');
  if (sub) sub.textContent = streakBonus > 0 ? `Claimed +${streakBonus}! Double it with a quick ad 👇`
    : (claimable ? `Day ${((cur - 1) % 7) + 1} ready — claim ${streakReward(cur)} coins!` : `Claimed — come back tomorrow to keep your streak`);
  const btn = $('streakClaim');
  if (btn){
    if (claimable){ btn.disabled = false; btn.style.display = ''; btn.innerHTML = `CLAIM ${ICON_COIN}${streakReward(cur)}`; }
    else { btn.disabled = true; btn.style.display = streakBonus > 0 ? 'none' : ''; btn.textContent = '⏳ ' + fmtCountdown((dayNum() + 1) * DAY_MS - Date.now()); }
  }
  const db = $('streakDouble'); if (db) db.style.display = streakBonus > 0 ? '' : 'none';
  const m = $('streakModal'); if (m) m.classList.add('active');
}

function shopCard(o){
  const card = document.createElement('div');
  card.className = 'shop-card' + (o.badge ? ' hot' : '');
  if (o.accent) card.style.setProperty('--acc', o.accent);
  const label = o.owned ? (o.ownedLabel || 'OWNED') : o.priceHtml;
  card.innerHTML = (o.badge ? `<span class="sc-badge">${o.badge}</span>` : '')
    + `<div class="sc-ico">${o.icon}</div>`
    + `<div class="sc-txt"><b>${o.name}</b><span>${o.desc}</span></div>`
    + `<button class="sc-buy${o.owned ? ' owned' : ''}"${o.owned ? ' disabled' : ''}>${label}</button>`;
  const btn = card.querySelector('.sc-buy');
  if (btn && !o.owned){
    if (o.afford === false) btn.disabled = true;           // can't pay → greyed out, not silent
    else if (o.onBuy) btn.addEventListener('click', o.onBuy);
  }
  return card;
}
function chestTile(kind){
  const c = CHESTS[kind];
  const tile = document.createElement('div'); tile.className = 'chest-tile'; tile.style.setProperty('--acc', c.accent);
  const price = c.priceGems ? `${ICON_GEM}${c.priceGems}` : `${ICON_COIN}${c.priceCoins}`;
  const afford = c.priceGems ? Meta.gems >= c.priceGems : Meta.coins >= c.priceCoins;
  tile.innerHTML = `<div class="ct-ico">${ICON_CHEST}</div><b class="ct-name">${c.short}</b><span class="ct-tag">${c.rarity}</span><button class="sc-buy"${afford ? '' : ' disabled'}>${price}</button>`;
  if (afford) tile.querySelector('.sc-buy').addEventListener('click', () => buyChest(kind));
  return tile;
}
function buyChest(kind){
  const c = CHESTS[kind];
  if (c.priceGems && Meta.gems < c.priceGems) return;
  if (c.priceCoins && Meta.coins < c.priceCoins) return;
  if (c.priceGems) Meta.gems -= c.priceGems; else Meta.coins -= c.priceCoins;
  Meta.save();
  const coins = randInt(c.coins[0], c.coins[1]), gems = randInt(c.gems[0], c.gems[1]);
  showRewardModal({ icon: ICON_CHEST, accent: c.accent, title: c.name, tag: c.rarity.toUpperCase(), desc: 'You cracked it open!', coins, gems },
    () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); });
}
// ---- claim actions ----
function claimDaily(){
  if (Meta.dailyDay >= dayNum()) return;
  Meta.dailyDay = dayNum(); Meta.save();
  showRewardModal({ icon: ICON_GIFT, accent: '#ffd24a', title: 'DAILY REWARD', tag: 'COME BACK TOMORROW', desc: 'Your free daily chest!', coins: Math.round(randInt(80, 140) * levelCoinMul(Meta.level)), gems: randInt(2, 4) },
    () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); });
}
function openAdChest(){
  rollShopDay(); if (Meta.adChestUsed >= AD_CHEST_MAX) return;
  playRewardedAd(() => { Meta.adChestUsed = (Meta.adChestUsed || 0) + 1; Meta.save();
    showRewardModal({ icon: ICON_CHEST, accent: '#7cd84e', title: 'AD CHEST', tag: 'FREE LOOT', desc: 'Thanks for watching!', coins: Math.round(randInt(50, 110) * levelCoinMul(Meta.level)), gems: randInt(0, 1) },
      () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); }); });
}
function claimAdCoins(){
  rollShopDay(); if (Meta.adCoinUsed >= AD_COIN_MAX) return;
  playRewardedAd(() => { Meta.adCoinUsed = (Meta.adCoinUsed || 0) + 1; Meta.coins += adCoinReward(); Meta.save(); refreshShop(); refreshMenu(); });
}
function claimAdGems(){
  rollShopDay(); if (Meta.adGemUsed >= AD_GEM_MAX) return;
  playRewardedAd(() => { Meta.adGemUsed = (Meta.adGemUsed || 0) + 1; Meta.gems += AD_GEM_REWARD; Meta.save(); refreshShop(); refreshMenu(); });
}
// spend gems for an instant power boost
// instant gem upgrades — priced at the coin-grind they save (coin cost ÷ 80, the gem⇄coin
// anchor), recomputed live so the price stays honest as upgrade costs climb
function weaponBoostGems(){
  let total = 0;
  for (const id of Meta.weapons){ const lv = Meta.wlv[id - 1] || 1; for (let k = 0; k < 3 && lv + k < WEAPON_MAX; k++) total += weaponCost(lv + k); }
  return Math.max(10, Math.round(total / 80));
}
function heroBoostGems(){
  const h = HEROES[Meta.hero - 1] || HEROES[0]; let total = 0;
  if (h.tank){ for (let k = 0; k < 3 && Meta.tankLvl + k < TANK_MAX; k++) total += tankCost(Meta.tankLvl + k); }
  else { const lv = Meta.heroLvl[h.id] || 1; for (let k = 0; k < 3 && lv + k < HERO_LVL_MAX; k++) total += heroUpCost(lv + k); }
  return Math.max(10, Math.round(total / 80));
}
function castleGems(){ return Math.max(8, Math.round(Meta.castleCost() / 80)); }
function gemUpgrade(kind){
  if (kind === 'weapon'){
    const g = weaponBoostGems(); if (Meta.gems < g) return; let any = false;
    for (const id of Meta.weapons){ const lv = Meta.wlv[id - 1] || 1, nl = Math.min(WEAPON_MAX, lv + 3); if (nl > lv){ Meta.wlv[id - 1] = nl; any = true; } }
    if (!any) return; Meta.gems -= g;
  } else if (kind === 'hero'){
    const g = heroBoostGems(); if (Meta.gems < g) return; const h = HEROES[Meta.hero - 1] || HEROES[0];
    if (h.tank){ const nl = Math.min(TANK_MAX, Meta.tankLvl + 3); if (nl <= Meta.tankLvl) return; Meta.tankLvl = nl; }
    else { const lv = Meta.heroLvl[h.id] || 1, nl = Math.min(HERO_LVL_MAX, lv + 3); if (nl <= lv) return; Meta.heroLvl[h.id] = nl; }
    Meta.gems -= g;
  } else if (kind === 'castle'){
    const g = castleGems(); if (Meta.gems < g || Meta.castle >= CASTLE_MAX) return; Meta.gems -= g; Meta.castle++;
  }
  Meta.save(); refreshShop(); refreshMenu();
}
// ---- tabs ----
function buildFreeTab(body){
  body.appendChild(shopHead('Daily reward'));
  const claimable = Meta.dailyDay < dayNum(), msLeft = (dayNum() + 1) * DAY_MS - Date.now();
  body.appendChild(shopCard({ icon: ICON_GIFT, name: 'DAILY CHEST', desc: claimable ? 'Free coins + gems, every day' : 'Come back tomorrow',
    badge: claimable ? 'FREE' : '', accent: '#ffd24a', owned: !claimable, ownedLabel: '⏳ ' + fmtCountdown(msLeft), priceHtml: 'CLAIM', onBuy: claimDaily }));
  body.appendChild(shopHead('Watch & earn'));
  const chestLeft = Math.max(0, AD_CHEST_MAX - (Meta.adChestUsed || 0));
  body.appendChild(shopCard({ icon: ICON_CHEST, name: 'AD CHEST', desc: 'Open a free box — watch a short ad', accent: '#7cd84e',
    owned: chestLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ ${chestLeft} LEFT`, onBuy: openAdChest }));
  const coinLeft = Math.max(0, AD_COIN_MAX - (Meta.adCoinUsed || 0));
  body.appendChild(shopCard({ icon: ICON_COIN, name: 'FREE COINS', desc: `Watch an ad for +${adCoinReward()} coins`, accent: '#7cd84e',
    owned: coinLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ +${adCoinReward()}`, onBuy: claimAdCoins }));
  const gemLeft = Math.max(0, AD_GEM_MAX - (Meta.adGemUsed || 0));
  body.appendChild(shopCard({ icon: ICON_GEM, name: 'FREE GEMS', desc: `Watch an ad for +${AD_GEM_REWARD} gems`, accent: '#b15ce8',
    owned: gemLeft <= 0, ownedLabel: 'BACK TOMORROW', priceHtml: `▶ +${AD_GEM_REWARD}`, onBuy: claimAdGems }));
  regenTickets();
  body.appendChild(shopCard({ icon: '🎫', name: 'FREE TICKET', desc: `Watch an ad for +1 play ticket (${Meta.pticket}/${PT_MAX})`, accent: '#7cd84e',
    owned: Meta.pticket >= PT_MAX, ownedLabel: 'FULL', priceHtml: '▶ +1', onBuy: () => playRewardedAd(() => { grantTicket(1); refreshShop(); }) }));
}
function buildPowerTab(body){
  // Heroes are EARNED by clearing levels — show the next one as a locked carrot (not for sale).
  const nh = nextLockedHero();
  body.appendChild(shopHead('Next hero · earn by playing'));
  if (nh) body.appendChild(shopCard({ icon: '🔒', name: nh.name, desc: `${nh.rarity} hero · clear Level ${heroUnlockLevel(nh.id)} to unlock`, badge: 'HERO', accent: RARITY_COL[nh.rarity] || '#b15ce8', owned: true, ownedLabel: `▶ LEVEL ${heroUnlockLevel(nh.id)}` }));
  else body.appendChild(shopCard({ icon: '🦸', name: 'ALL HEROES UNLOCKED', desc: 'You earned every hero!', accent: '#7cd84e', owned: true, ownedLabel: '✓ DONE' }));
  body.appendChild(shopHead('Instant upgrades · 💎'));
  const wMaxed = Meta.weapons.every(id => (Meta.wlv[id - 1] || 1) >= WEAPON_MAX);
  const hEq = HEROES[Meta.hero - 1] || HEROES[0];
  const hMaxed = hEq.tank ? Meta.tankLvl >= TANK_MAX : (Meta.heroLvl[hEq.id] || 1) >= HERO_LVL_MAX;
  body.appendChild(shopCard({ icon: '🔫', name: 'WEAPON BOOST', desc: '+3 levels to your equipped weapons', accent: '#7cd84e', owned: wMaxed, ownedLabel: 'MAX', priceHtml: `${ICON_GEM}${weaponBoostGems()}`, afford: Meta.gems >= weaponBoostGems(), onBuy: () => gemUpgrade('weapon') }));
  body.appendChild(shopCard({ icon: '🦸', name: 'HERO LEVELS', desc: '+3 levels to your hero', accent: '#7cd84e', owned: hMaxed, ownedLabel: 'MAX', priceHtml: `${ICON_GEM}${heroBoostGems()}`, afford: Meta.gems >= heroBoostGems(), onBuy: () => gemUpgrade('hero') }));
  body.appendChild(shopCard({ icon: '🏰', name: 'CASTLE STAGE', desc: 'Instantly +1 castle stage', accent: '#7cd84e', owned: Meta.castle >= CASTLE_MAX, ownedLabel: 'MAX', priceHtml: `${ICON_GEM}${castleGems()}`, afford: Meta.gems >= castleGems(), onBuy: () => gemUpgrade('castle') }));
}
// ── IN-APP PURCHASES (real money · Google Play Billing via CdvPurchase) ──────────
// Paste the product IDs you create in the Play Console into `id`. Until then, on Android these
// buttons do nothing (never grant for free); in the browser build they simulate the grant so the
// shop stays testable. The grant logic lives here (it owns Meta); iap.js only drives the store.
const IAP = [
  { key: 'gems1', id: '100gems',   type: 'consumable',     gems: 100 },   // $1.99
  { key: 'gems2', id: '700gems',   type: 'consumable',     gems: 700 },   // $4.99
  { key: 'gems3', id: '1600gems',  type: 'consumable',     gems: 1600 },  // $9.99
  { key: 'mega',  id: 'megachest', type: 'consumable',     special: 'mega' },   // $2.99
  { key: 'noads', id: 'roads',     type: 'non-consumable', special: 'noads' },  // $4.99  ⚠️ verify this ID (looks like a typo for "noads")
  { key: 'starter', id: 'starterpack', type: 'non-consumable', special: 'starter' },  // $2.99 one-time: 500 💎 + 5000 coins
];
function grantIap(pr){
  if (!pr) return;
  if (pr.special === 'mega'){
    showRewardModal({ icon: ICON_CHEST, accent: '#F4B731', title: 'MEGA CHEST', tag: 'JACKPOT', desc: 'Huge haul!', coins: randInt(6000, 11000), gems: randInt(40, 80), adDouble: false },
      () => { $('rewardModal').classList.remove('active'); refreshShop(); refreshMenu(); });
    return;
  }
  if (pr.special === 'noads'){ Meta.noAds = true; Meta.gems += 300; }
  else if (pr.special === 'starter'){ Meta.starterBought = true; Meta.gems += 500; Meta.coins += 5000; const sm = $('starterModal'); if (sm) sm.classList.remove('active'); }
  else { Meta.gems += (pr.gems || 0); Meta.coins += (pr.coins || 0); }
  SFX.play('coin'); Meta.save(); refreshShop(); refreshMenu();
}
function buyIap(key){ if (window.TDSIAP) TDSIAP.buy(key).catch(() => {}); }   // grant happens via grantIap on success
// live localized price (e.g. "$1.99" / "€1,99") once the store loads, else the hard-coded fallback
function iapPrice(key, fallback){ const pr = IAP.find(p => p.key === key); const live = pr && window.TDSIAP && TDSIAP.price(pr.id); return live || fallback; }
if (window.TDSIAP) TDSIAP.configure(IAP, grantIap);

function buildBoxesTab(body){
  body.appendChild(shopHead('Loot boxes'));
  const grid = document.createElement('div'); grid.className = 'chest-grid';
  grid.appendChild(chestTile('legendary')); grid.appendChild(chestTile('rare')); grid.appendChild(chestTile('common'));
  body.appendChild(grid);
  body.appendChild(shopHead('Mega deal'));
  body.appendChild(shopCard({ icon: ICON_CHEST, name: 'MEGA CHEST', desc: '6000–11000 coins + 40–80 gems', badge: 'BEST', accent: '#F4B731', priceHtml: iapPrice('mega', '$2.99'),
    onBuy: () => buyIap('mega') }));
}
function buildCoinsTab(body){
  body.appendChild(shopHead('Buy coins with 💎'));
  const packs = [ { name: 'POUCH OF COINS', coins: 1000, gems: 12 }, { name: 'BAG OF COINS', coins: 4000, gems: 40, badge: '+10%' }, { name: 'VAULT OF COINS', coins: 12000, gems: 100, badge: 'BEST' } ];
  for (const p of packs) body.appendChild(shopCard({ icon: ICON_COIN, name: p.name, desc: `${p.coins.toLocaleString()} coins`, badge: p.badge, accent: '#ffd24a', priceHtml: `${ICON_GEM}${p.gems}`,
    afford: Meta.gems >= p.gems, onBuy: () => { if (Meta.gems < p.gems) return; Meta.gems -= p.gems; Meta.coins += p.coins; Meta.save(); refreshShop(); refreshMenu(); } }));
  body.appendChild(shopHead('Keep earning'));
  const active = Meta.boostUntil && Date.now() < Meta.boostUntil;
  body.appendChild(shopCard({ icon: '⚡', name: 'SPEED BOOST', desc: active ? boostLeftText() : '1.5× coins · 30 min', accent: '#7cd84e', owned: !!active, ownedLabel: 'ACTIVE', priceHtml: `${ICON_GEM}20`,
    afford: Meta.gems >= 20, onBuy: () => { if (Meta.gems < 20) return; Meta.gems -= 20; Meta.boostUntil = Date.now() + 30 * 60 * 1000; Meta.save(); refreshShop(); refreshMenu(); } }));
  body.appendChild(shopCard({ icon: '🔋', name: 'ENERGY ×30', desc: `Next battle starts with +30 pts${Meta.energy ? ` (banked: +${Meta.energy})` : ''}`, accent: '#7cd84e', priceHtml: `${ICON_GEM}10`,
    afford: Meta.gems >= 10, onBuy: () => { if (Meta.gems < 10) return; Meta.gems -= 10; Meta.energy = (Meta.energy || 0) + 30; Meta.save(); refreshShop(); refreshMenu(); } }));
}
function buildGemsTab(body){
  if (!Meta.starterBought){
    body.appendChild(shopHead('One-time offer'));
    body.appendChild(shopCard({ icon: '🎁', name: 'STARTER PACK', desc: '500 💎 + 5,000 coins · one time only', badge: '-80%', accent: '#ff7a45',
      priceHtml: iapPrice('starter', '$2.99'), onBuy: () => buyIap('starter') }));
  }
  body.appendChild(shopHead('Get gems'));
  const packs = [ { name: 'PILE OF GEMS', gems: 100, price: '$1.99', key: 'gems1' }, { name: 'SACK OF GEMS', gems: 700, price: '$4.99', badge: '+100 BONUS', key: 'gems2' }, { name: 'CHEST OF GEMS', gems: 1600, price: '$9.99', badge: 'BEST VALUE', key: 'gems3' } ];
  for (const p of packs) body.appendChild(shopCard({ icon: '💎', name: p.name, desc: `${p.gems} gems`, badge: p.badge, accent: '#b15ce8', priceHtml: iapPrice(p.key, p.price),
    onBuy: () => buyIap(p.key) }));
  body.appendChild(shopHead('Specials'));
  body.appendChild(shopCard({ icon: '🚫', name: 'NO-ADS BUNDLE', desc: 'Remove forced ads + 300 💎', badge: 'VALUE', accent: '#ffd24a', owned: Meta.noAds, ownedLabel: 'OWNED', priceHtml: iapPrice('noads', '$4.99'),
    onBuy: () => buyIap('noads') }));
  body.appendChild(shopCard({ icon: '🎟️', name: 'SKIP TICKETS ×3', desc: `Skip a level you’re stuck on (use on the defeat card)${Meta.tickets ? ` · you have ${Meta.tickets}` : ''}`, accent: '#b15ce8', priceHtml: `${ICON_GEM}60`,
    afford: Meta.gems >= 60, onBuy: () => { if (Meta.gems < 60) return; Meta.gems -= 60; Meta.tickets = (Meta.tickets || 0) + 3; Meta.save(); refreshShop(); refreshMenu(); } }));
}
function refreshShop(){
  rollShopDay();
  $('sh_coins').textContent = Meta.coins; $('sh_gems').textContent = Meta.gems;
  document.querySelectorAll('.shtab').forEach(t => t.classList.toggle('cur', t.dataset.tab === shopTab));
  const body = $('shopBody'); if (!body) return; body.innerHTML = '';
  if (shopTab === 'free') buildFreeTab(body);
  else if (shopTab === 'boxes') buildBoxesTab(body);
  else if (shopTab === 'coins') buildCoinsTab(body);
  else if (shopTab === 'power') buildPowerTab(body);
  else buildGemsTab(body);
}

/* ---------------- Levels ---------------- */
function buildLevels(){
  const wrap = $('levelMap'); if (!wrap) return;
  wrap.innerHTML = '';
  for (const L of LEVELS){ const b = document.createElement('button'); b.className = 'level-node'; b.dataset.level = L.id; b.addEventListener('click', () => selectLevel(L.id)); wrap.appendChild(b); }
  refreshLevels();
}
function refreshLevels(){
  $('lv_coins').textContent = Meta.coins;
  refreshEndlessBtn();
  document.querySelectorAll('.level-node').forEach(btn => {
    const id = +btn.dataset.level, L = LEVELS[id - 1], boss = LEVEL_BOSS[id - 1] || {};
    const locked = id > Meta.unlocked, current = id === Meta.level && !locked;
    btn.classList.toggle('locked', locked); btn.classList.toggle('current', current); btn.disabled = locked;
    // each level shows its END BOSS — a dim silhouette while locked, revealed once unlocked
    const bossBadge = `<span class="ln-boss${locked ? ' silhouette' : ''}" title="${boss.name || ''}">${boss.emoji || '👹'}</span>`;
    if (locked){
      btn.innerHTML = `<span class="ln-badge">🔒</span><span class="ln-info"><span class="ln-name">LEVEL ${id}</span><span class="ln-stars">LOCKED · BOSS ???</span></span>${bossBadge}`;
    } else {
      const pw = playerPower(), need = reqPower(id), weak = pw < need;
      const st = Meta.stars[id] || 0;
      btn.innerHTML = `<span class="ln-badge">${id}</span><span class="ln-info"><span class="ln-name">${L.name}${st ? ` <i class="ln-best">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</i>` : ''}</span>`
        + `<span class="ln-stars" style="color:${weak ? '#ff7a7a' : '#8fe388'}">⚡ ${kfmt(pw)} / ${kfmt(need)} · 👑 ${boss.name}</span></span>${bossBadge}<span class="ln-go">▶</span>`;
    }
  });
}
function refreshEndlessBtn(){
  const b = $('endlessBtn'); if (!b) return;
  const on = endlessUnlocked();
  b.style.display = on ? '' : 'none';
  const best = $('endlessBest'); if (best) best.textContent = Meta.endlessBest ? `· BEST ${kfmt(Meta.endlessBest)}` : '';
}
function selectLevel(id){ if (id > Meta.unlocked) return; state.endless = false; Meta.level = id; Meta.save(); refreshLevels(); launchLevel(); }
// gate the battle behind a one-time story intro card the FIRST time you enter a level
function launchLevel(){
  const id = Meta.level;
  if (!Meta.storySeen[id] && LEVEL_STORY[id - 1]) showStory(id, () => { Meta.storySeen[id] = 1; Meta.save(); startRun(); });
  else startRun();
}
function showStory(id, onBegin){
  const modal = $('storyModal'); if (!modal){ onBegin(); return; }
  const L = LEVELS[id - 1] || {}, boss = LEVEL_BOSS[id - 1] || {};
  $('stLevel').textContent = 'LEVEL ' + id;
  $('stName').textContent = L.name || '';
  $('stText').textContent = LEVEL_STORY[id - 1] || '';
  $('stBoss').textContent = boss.emoji ? (boss.emoji + '  BOSS: ' + boss.name) : '';
  $('stBegin').onclick = () => { modal.classList.remove('active'); onBegin(); };
  modal.classList.add('active');
}

// ── Daily missions UI ──
function refreshMissionDot(){ const d = $('missionDot'); if (d) d.style.display = missionClaimable() ? '' : 'none'; }
function openMissions(){
  const modal = $('missionModal'), listEl = $('missionList'); if (!modal || !listEl) return;
  const m = missionsToday(), list = currentMissions();
  listEl.innerHTML = '';
  list.forEach((ms, i) => {
    const prog = Math.min(ms.target, m.prog[i] | 0), done = prog >= ms.target, claimed = m.claimed[i];
    const pct = Math.round(prog / ms.target * 100);
    const row = document.createElement('div'); row.className = 'mission-row' + (claimed ? ' claimed' : '');
    row.innerHTML = `<span class="mi-ico">${ms.icon}</span>`
      + `<span class="mi-mid"><b>${ms.text}</b><span class="mi-bar"><i style="width:${pct}%"></i></span><em>${prog} / ${ms.target}</em></span>`
      + (claimed ? `<span class="mi-claim done">✓</span>`
                 : `<button class="mi-claim${done ? '' : ' locked'}"${done ? '' : ' disabled'}>${ICON_GEM}${ms.gems}</button>`);
    if (done && !claimed){ const b = row.querySelector('button'); if (b) b.addEventListener('click', () => claimMission(i)); }
    listEl.appendChild(row);
  });
  modal.classList.add('active');
}
// ── Global leaderboard UI ──
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function ensureName(cb){
  const modal = $('nameModal'), inp = $('nameInput'); if (!modal || !inp){ cb && cb(); return; }
  inp.value = Meta.name || '';
  $('nameSave').onclick = () => {
    Meta.name = (inp.value || '').trim().slice(0, 16) || 'Player';
    Meta.save(); modal.classList.remove('active');
    if (window.TDSLeaderboard && TDSLeaderboard.ready) TDSLeaderboard.submit(Meta.name, Meta.bestScore);
    cb && cb();
  };
  modal.classList.add('active');
  try { inp.focus(); } catch (e) {}
}
/* ---------------- Weekly + monthly contests (top 10 win gems) ---------------- */
// Prize amounts come from Remote Config (tune live, no app update); these are the shipped defaults.
function rcNum(key, dflt){ try { if (window.TDSRemoteConfig && TDSRemoteConfig.on){ const v = TDSRemoteConfig.getNumber(key); if (v > 0) return v; } } catch(e){} return dflt; }
function monthPrize(rank){ return rank >= 1 && rank <= 3 ? rcNum('month_prize_top3', 1000) : (rank >= 4 && rank <= 10 ? rcNum('month_prize_top10', 300) : 0); }
function weekPrize(rank){ return rank >= 1 && rank <= 3 ? rcNum('week_prize_top3', 300) : (rank >= 4 && rank <= 10 ? rcNum('week_prize_top10', 100) : 0); }
// Settle a FINISHED contest once per player: read its final top 10, grant gems if we placed.
// Retries harmlessly until the board fetch succeeds and the cloud identity exists.
function settleContest(prevKey, claimedField, topFn, prizeFn, label){
  const LB = window.TDSLeaderboard;
  if (!LB || !LB.ready) return;
  if (Meta[claimedField] === prevKey) return;              // already settled
  const me = LB.uid(); if (!me) return;                    // identity not up yet → retry later
  topFn(prevKey, 10).then(rows => {
    if (!rows) return;                                     // fetch FAILED → keep unclaimed, retry later
    Meta[claimedField] = prevKey;                          // settled — even when unranked or empty board
    let rank = 0; rows.forEach((r, i) => { if (r.uid === me) rank = i + 1; });
    const gems = prizeFn(rank);
    if (gems){
      Meta.gems += gems; SFX.play('coin');
      const sub = $('monthSub'), g = $('monthGems'), m = $('monthModal');
      if (sub) sub.textContent = `You finished #${rank} in last ${label}'s contest!`;
      if (g) g.textContent = `+${gems} 💎`;
      if (m) m.classList.add('active');
      refreshMenu();
    }
    Meta.save();
  });
}
function checkMonthReward(){
  const LB = window.TDSLeaderboard; if (!LB || !LB.ready) return;
  settleContest(LB.prevMonthKey(), 'monthClaimed', (k, n) => LB.topMonthly(k, n), monthPrize, 'month');
  settleContest(LB.prevWeekKey(),  'weekClaimed',  (k, n) => LB.topWeekly(k, n),  weekPrize,  'week');
}
let lbTab = 'month';                                       // 'week' | 'month' | 'all' — the contests are the default views
function daysLeftInMonth(){ const d = new Date(); return Math.max(1, Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 1) - d) / 86400000)); }
function openLeaderboard(){
  if (!window.TDSLeaderboard || !TDSLeaderboard.ready) return;
  if (!Meta.name){ ensureName(openLeaderboard); return; }                 // pick a nickname first
  const modal = $('lbModal'); if (!modal) return;
  modal.classList.add('active');
  checkMonthReward();                                      // settle last month's prizes on open too
  renderLb();
}
function daysLeftInWeek(){ const dn = new Date().getDay() || 7; return Math.max(1, 8 - dn); }   // ISO week ends Sunday
function renderLb(){
  const list = $('lbList'), you = $('lbYou'), foot = $('lbFoot'), prizes = $('lbPrizes');
  const tw = $('lbTabWeek'), tm = $('lbTabMonth'), ta = $('lbTabAll');
  if (!list || !you) return;
  if (tw) tw.classList.toggle('active', lbTab === 'week');
  if (tm) tm.classList.toggle('active', lbTab === 'month');
  if (ta) ta.classList.toggle('active', lbTab === 'all');
  if (prizes){
    prizes.style.display = lbTab === 'all' ? 'none' : '';
    const top3 = lbTab === 'week' ? weekPrize(1) : monthPrize(1), top10 = lbTab === 'week' ? weekPrize(4) : monthPrize(4);
    prizes.innerHTML = `🥇🥈🥉 <b>${top3}</b> 💎 &nbsp;•&nbsp; #4–10 <b>${top10}</b> 💎`;
  }
  list.innerHTML = '<div class="lb-empty">Loading…</div>'; you.textContent = ''; you.className = 'lb-you';
  const me = TDSLeaderboard.uid();
  if (lbTab === 'week'){
    const wk = TDSLeaderboard.weekKey();
    const mine = (Meta.weekScore && Meta.weekScore.w === wk) ? (Meta.weekScore.total | 0) : 0;
    if (mine > 0) TDSLeaderboard.submitWeekly(Meta.name, mine, wk);        // ensure my total is posted
    if (foot) foot.textContent = `Total score this week · ends in ${daysLeftInWeek()}d · prizes paid Monday`;
    TDSLeaderboard.topWeekly(wk, 100).then(rows => fillLbRows(list, you, rows || [], me, 'total', mine, weekPrize));
  } else if (lbTab === 'month'){
    const mk = TDSLeaderboard.monthKey();
    const mine = (Meta.monthScore && Meta.monthScore.m === mk) ? (Meta.monthScore.total | 0) : 0;
    if (mine > 0) TDSLeaderboard.submitMonthly(Meta.name, mine, mk);       // ensure my total is posted
    if (foot) foot.textContent = `Total score this month · ends in ${daysLeftInMonth()}d · prizes paid on the 1st`;
    TDSLeaderboard.topMonthly(mk, 100).then(rows => fillLbRows(list, you, rows || [], me, 'total', mine, monthPrize));
  } else {
    if (foot) foot.textContent = 'Best single-run score · updates after each battle';
    TDSLeaderboard.submit(Meta.name, Meta.bestScore);                      // ensure my latest best is posted
    TDSLeaderboard.top(100).then(rows => fillLbRows(list, you, rows || [], me, 'score', Meta.bestScore | 0, null));
  }
}
function fillLbRows(list, you, rows, me, field, mineVal, prizeFn){
  list.innerHTML = '';
  if (!rows.length){ list.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>'; }
  let myRank = 0;
  rows.forEach((r, i) => {
    const isMe = me && r.uid === me; if (isMe) myRank = i + 1;
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1);
    const row = document.createElement('div'); row.className = 'lb-row' + (isMe ? ' me' : '');
    row.innerHTML = `<span class="lb-rank${i < 3 ? ' top' : ''}">${medal}</span>`
      + `<span class="lb-name">${escapeHtml(r.name || 'Player')}</span>`
      + `<span class="lb-score">${(r[field] || 0).toLocaleString()}</span>`;
    list.appendChild(row);
  });
  const prize = prizeFn ? prizeFn(myRank) : 0;                             // the reward your CURRENT rank would pay
  you.className = 'lb-you' + (myRank ? '' : ' out');
  you.innerHTML = `<span>${myRank ? ('YOU · #' + myRank) : 'YOU · unranked'}${prize ? ` · wins ${prize} 💎` : ''}</span>`
    + `<span>${(mineVal || 0).toLocaleString()}</span>`;
}
/* ---------------- Second-wave PGS achievements (ids live in native.js GAMES_IDS) ---------------- */
function checkAchievements(){
  const G = window.TDSGames; if (!G || !G.ready) return;   // unlock() no-ops for ids still marked PASTE
  if ((Meta.games | 0)      >= 100)   G.unlock('veteran100');
  if ((Meta.killsTotal | 0) >= 1000)  G.unlock('kills_1k');
  if ((Meta.killsTotal | 0) >= 10000) G.unlock('kills_10k');
  if ((Meta.wlv || []).some(l => l >= WEAPON_MAX))       G.unlock('weapon_max');
  if ((Meta.owned || []).length >= WEAPONS.length)       G.unlock('all_weapons');
  if ((Meta.heroesOwned || []).length >= 5)              G.unlock('heroes_5');
  if (Meta.castle >= CASTLE_MAX)                         G.unlock('castle_max');
  if ((Meta.streak | 0) >= 7)                            G.unlock('streak_7');
  if ((Meta.endlessBest | 0) >= 5000)                    G.unlock('endless_5k');
  if ((Meta.coins | 0) >= 10000)                         G.unlock('rich_10k');
}
function claimMission(i){
  const m = missionsToday(), ms = currentMissions()[i];
  if (!ms || (m.prog[i] | 0) < ms.target || m.claimed[i]) return;
  m.claimed[i] = true; Meta.gems += ms.gems; SFX.play('coin'); Meta.save();
  openMissions(); refreshMenu(); refreshMissionDot();
}

/* ---------------- Weapons (buy · equip max 2 · upgrade) ---------------- */
function refreshWeapons(){
  $('wp_coins').textContent = Meta.coins;
  const ec = $('wp_eqcount'); if (ec) ec.textContent = `${Meta.weapons.length} / ${weaponSlots()} mounted`;
  const wrap = $('weaponGrid'); if (!wrap) return;
  wrap.innerHTML = '';
  for (const w of WEAPONS){
    const owned = Meta.owned.includes(w.id), equipped = Meta.weapons.includes(w.id), lvl = Meta.wlv[w.id - 1] || 1;
    const tier = window.WeaponArt ? WeaponArt.tier(lvl) : null;
    const card = document.createElement('div');
    card.className = 'weapon-card' + (equipped ? ' equipped' : '');
    let actions = '';
    if (!owned){
      actions = `<button class="wc-btn buy" data-act="buy"${Meta.coins < w.buy ? ' disabled' : ''}>${w.buy ? `<span class="ico ic-coin"></span>${w.buy}` : 'FREE'}</button>`;
    } else {
      const upg = lvl >= WEAPON_MAX ? `<button class="wc-btn max" disabled>MAX</button>` : `<button class="wc-btn up" data-act="upg"${Meta.coins < weaponCost(lvl) ? ' disabled' : ''}><span class="up-ar">⬆</span><span class="ico ic-coin"></span>${weaponCost(lvl)}</button>`;
      const adUp = lvl === 1 ? `<button class="wc-btn adup" data-act="adup">▶ FREE</button>` : '';   // first upgrade: rewarded ad
      actions = `<button class="wc-btn eq${equipped ? ' on' : ''}" data-act="equip">${equipped ? 'EQUIPPED' : 'EQUIP'}</button>${upg}${adUp}`;
    }
    // live combat stats so upgrading shows a number going up (dmg +22%/lvl, rate +5%/lvl — see fire loop)
    const wDmg = Math.round(w.dmg * (1 + 0.22 * (lvl - 1)));
    const wRate = w.rate * (1 + 0.05 * (lvl - 1));
    card.innerHTML = `<span class="wc-thumb">${weaponArt(w, lvl)}</span>`
      + `<span class="wc-name">${w.name}</span>`
      + (tier ? `<span class="wc-tier" style="color:${tier.acc}">${tier.name}</span>` : '')
      + `<span class="wc-lv">Lv ${lvl} / ${WEAPON_MAX}</span>`
      + `<span class="wc-stat">${wDmg} dmg · ${wRate.toFixed(1)}/s${w.splash ? ' · aoe' : ''}</span>`
      + `<span class="wc-acts">${actions}</span>`;
    const buy = card.querySelector('[data-act=buy]'); if (buy) buy.addEventListener('click', () => buyWeapon(w.id));
    const eq = card.querySelector('[data-act=equip]'); if (eq) eq.addEventListener('click', () => toggleWeapon(w.id));
    const up = card.querySelector('[data-act=upg]'); if (up) up.addEventListener('click', () => upgradeWeaponId(w.id));
    const au = card.querySelector('[data-act=adup]'); if (au) au.addEventListener('click', () => upgradeWeaponAd(w.id));
    wrap.appendChild(card);
  }
}
function buyWeapon(id){ const w = WEAPONS[id - 1]; if (!w || Meta.owned.includes(id) || Meta.coins < w.buy) return; Meta.coins -= w.buy; Meta.owned.push(id); Meta.save(); refreshWeapons(); refreshMenu(); }
function toggleWeapon(id){
  if (!Meta.owned.includes(id)) return;
  const i = Meta.weapons.indexOf(id);
  if (i >= 0){ if (Meta.weapons.length <= 1) return; Meta.weapons.splice(i, 1); }
  else { if (Meta.weapons.length >= weaponSlots()) Meta.weapons.shift(); Meta.weapons.push(id); }
  Meta.save(); refreshWeapons(); refreshMenu();
}
function upgradeWeaponId(id){ const lvl = Meta.wlv[id - 1] || 1; if (lvl >= WEAPON_MAX) return; const c = weaponCost(lvl); if (Meta.coins < c) return; Meta.coins -= c; Meta.wlv[id - 1] = lvl + 1; Meta.save(); refreshWeapons(); refreshMenu(); }
// FIRST weapon upgrade (Lv 1 → 2) can be earned with a rewarded ad
function upgradeWeaponAd(id){ if ((Meta.wlv[id - 1] || 1) !== 1) return; playRewardedAd(() => { Meta.wlv[id - 1] = 2; Meta.save(); refreshWeapons(); refreshMenu(); }); }

/* ---------------- Heroes (equip · upgrade) ---------------- */
function refreshHeroes(){
  $('hr_coins').textContent = Meta.coins;
  const wrap = $('heroGrid'); if (!wrap) return;
  wrap.innerHTML = '';
  HEROES.forEach((h, idx) => {
    const eq = (idx + 1) === Meta.hero, rc = RARITY_COL[h.rarity] || '#7d8a99';
    const lvl = heroLevel(h), maxed = h.tank ? lvl >= TANK_MAX : lvl >= HERO_LVL_MAX;
    const cost = h.tank ? tankCost(lvl) : heroUpCost(lvl);
    const lvLabel = h.tank && window.TankArt ? `Lv ${lvl}/${TANK_MAX} · ${TankArt.name(lvl)}` : `Lv ${lvl} / ${HERO_LVL_MAX}`;
    const card = document.createElement('div');
    const owned = heroOwned(h.id);
    card.className = 'hero-card' + (eq ? ' equipped' : '') + (owned ? '' : ' locked');
    card.style.setProperty('--rc', rc);
    const upg = maxed ? `<button class="wc-btn max" disabled>MAX</button>` : `<button class="wc-btn up" data-act="upg"${Meta.coins < cost ? ' disabled' : ''}><span class="up-ar">⬆</span><span class="ico ic-coin"></span>${cost}</button>`;
    const adUp = lvl === 1 ? `<button class="wc-btn adup" data-act="adup">▶ FREE</button>` : '';   // first upgrade: rewarded ad
    const acts = owned
      ? `<button class="wc-btn eq${eq ? ' on' : ''}" data-act="equip">${eq ? 'EQUIPPED' : 'EQUIP'}</button>${upg}${adUp}`
      : `<button class="wc-btn locked" disabled>🔒 CLEAR LEVEL ${heroUnlockLevel(h.id)}</button>`;
    // live damage so upgrading shows a number going up (hero dmg +12%/lvl × rarity; tank 12+fire*12 per tier)
    let hDmg;
    if (h.tank){ const fire = (window.TankArt && TankArt.CFG[lvl] || { fire: lvl }).fire; hDmg = 12 + fire * 12; }
    else hDmg = (h.dmg || 18) * (1 + 0.12 * (lvl - 1)) * rarityMult(h);
    const hRate = h.tank ? (1 / TANK_RELOAD) : (h.rate || 2);
    card.innerHTML = `<span class="hc-rarity" style="background:${rc}">${h.rarity}</span>`
      + `<span class="hc-art"></span>`
      + (owned ? '' : '<span class="hc-lock">🔒</span>')
      + `<span class="hc-name">${h.name}</span>`
      + `<span class="hc-lv">${lvLabel}${(() => { const mlv = heroMasteryLevel(h); return mlv ? ` · <b class="hc-mast">${'★'.repeat(mlv)} M${mlv} +${Math.round(mlv * MASTERY_DMG * 100)}%</b>` : ''; })()}</span>`
      + `<span class="hc-stat">${Math.round(hDmg)} dmg · ${hRate.toFixed(1)}/s${h.splash ? ' · aoe' : ''}</span>`
      + `<span class="wc-acts">${acts}</span>`;
    wrap.appendChild(card);                                   // attach BEFORE paintHero so fitHeroSvg's getBBox can measure the laid-out svg
    paintHero(card.querySelector('.hc-art'), h, 'hero-png');
    const eqBtn = card.querySelector('[data-act=equip]'); if (eqBtn) eqBtn.addEventListener('click', () => selectHero(h.id));
    const up = card.querySelector('[data-act=upg]'); if (up) up.addEventListener('click', () => upgradeHeroId(h.id));
    const au = card.querySelector('[data-act=adup]'); if (au) au.addEventListener('click', () => upgradeHeroAd(h.id));
    const ug = card.querySelector('[data-act=unlock-gem]'); if (ug) ug.addEventListener('click', () => unlockHero(h.id, 'gems'));
    const uc = card.querySelector('[data-act=unlock-coin]'); if (uc) uc.addEventListener('click', () => unlockHero(h.id, 'coins'));
  });
}
function selectHero(id){ if (!heroOwned(id)) return; const idx = HEROES.findIndex(h => h.id === id); if (idx < 0) return; Meta.hero = idx + 1; Meta.save(); refreshHeroes(); refreshMenu(); }
function unlockHero(id, cur){
  const h = HEROES.find(x => x.id === id); if (!h || heroOwned(id)) return;
  if (cur === 'coins'){ const c = heroUnlockCoin(h); if (Meta.coins < c) return; Meta.coins -= c; }
  else { const g = heroUnlockCost(h); if (Meta.gems < g) return; Meta.gems -= g; }
  Meta.heroesOwned.push(id); Meta.save(); selectHero(id);
}
function upgradeHeroId(id){
  const h = HEROES.find(x => x.id === id); if (!h) return;
  if (h.tank){ if (Meta.tankLvl >= TANK_MAX) return; const c = tankCost(Meta.tankLvl); if (Meta.coins < c) return; Meta.coins -= c; Meta.tankLvl++; }
  else { const lvl = Meta.heroLvl[id] || 1; if (lvl >= HERO_LVL_MAX) return; const c = heroUpCost(lvl); if (Meta.coins < c) return; Meta.coins -= c; Meta.heroLvl[id] = lvl + 1; }
  Meta.save(); refreshHeroes(); refreshMenu();
}
// FIRST hero upgrade (Lv 1 → 2 / tank tier 1 → 2) can be earned with a rewarded ad
function upgradeHeroAd(id){
  const h = HEROES.find(x => x.id === id); if (!h || !heroOwned(id)) return;
  if (heroLevel(h) !== 1) return;
  playRewardedAd(() => { if (h.tank) Meta.tankLvl = 2; else Meta.heroLvl[id] = 2; Meta.save(); refreshHeroes(); refreshMenu(); });
}

/* ---------------- Forces screen (castle stats + special-force upgrades) ---------------- */
function refreshForces(){
  $('fo_coins').textContent = Meta.coins;
  // castle stat upgrades
  $('s_hp').textContent = Math.round(Meta.maxHp());
  $('s_dmg').textContent = Math.round(Meta.dmgMult() * 100) + '%';
  $('s_pow').textContent = Meta.powIncome().toFixed(1) + '/s';
  $('l_hp').textContent = 'Lv ' + Meta.hp; $('l_dmg').textContent = 'Lv ' + Meta.dmg; $('l_pow').textContent = 'Lv ' + Meta.pow;
  $('c_hp').textContent = Meta.hpCost(); $('c_dmg').textContent = Meta.dmgCost(); $('c_pow').textContent = Meta.powCost();
  $('forces').querySelector('[data-act=hp]').disabled = Meta.coins < Meta.hpCost();
  $('forces').querySelector('[data-act=dmg]').disabled = Meta.coins < Meta.dmgCost();
  $('forces').querySelector('[data-act=pow]').disabled = Meta.coins < Meta.powCost();
  // "first upgrade by ad" chips — visible only while the stat is still at its base level
  { const adf = (act, show) => { const b = $('forces').querySelector(`.adfree[data-adact=${act}]`); if (b) b.style.display = show ? '' : 'none'; };
    adf('hp', Meta.hp === 1); adf('dmg', Meta.dmg === 1); adf('pow', Meta.pow === 1); adf('wagon', Meta.wagon === 0); }
  // wagon armor upgrade
  $('wagonArt').innerHTML = '<img src="assets/wagon_stage' + (wagonEtage() + 1) + '_intact.png?v=1" alt="wagon" style="width:100%;height:100%;object-fit:contain">';
  $('l_wagon').textContent = 'Lv ' + (Meta.wagon + 1);
  $('s_wagon').textContent = '+' + (Meta.wagon * WAGON_HP) + ' HP · ' + weaponSlots() + ' slots';
  const wBtn = $('forces').querySelector('[data-act=wagon]'), wIco = wBtn.querySelector('.ic-coin'), wVal = $('c_wagon');
  if (Meta.wagon >= WAGON_MAX){ wBtn.disabled = true; wVal.textContent = 'MAX'; if (wIco) wIco.style.display = 'none'; }
  else { wBtn.disabled = Meta.coins < Meta.wagonCost(); wVal.textContent = Meta.wagonCost(); if (wIco) wIco.style.display = ''; }
  // special forces cards
  const wrap = $('sfGrid'); if (!wrap) return;
  wrap.innerHTML = '';
  for (const f of FORCES){
    const owned = sfOwned(f.id);
    const lvl = sfLevel(f.id), maxed = lvl >= SF_MAX, cost = sfCost(lvl);
    const evolved = f.evo && lvl >= SF_EVOLVE;
    const nm = evolved ? f.evoName : f.name, baseD = evolved ? f.evoDmg : f.dmg;
    const stat = f.kind === 'strike' ? `${Math.round(f.dmg * (1 + 0.3 * (lvl - 1)))} dmg` : `${Math.round(baseD * (1 + 0.25 * (lvl - 1)))} dmg · ${Math.round(f.hp * (1 + 0.25 * (lvl - 1)))} hp`;
    const evoNote = (owned && f.evo && !evolved) ? `<span class="sfc-evo">⬆ ${f.evoName} · Lv ${SF_EVOLVE}</span>` : '';
    const card = document.createElement('div'); card.className = 'sf-card' + (owned ? '' : ' locked');
    card.style.setProperty('--rc', f.col);
    let acts;
    if (!owned){
      const bc = sfBuyCost(f.id);
      acts = bc > 0
        ? `<button class="wc-btn buy" data-act="buysf"${Meta.coins < bc ? ' disabled' : ''}><span class="ico ic-coin"></span>${bc}</button>`
        : `<button class="wc-btn buy" data-act="buysf">FREE</button>`;
    } else {
      const upg = maxed ? `<button class="wc-btn max" disabled>MAX</button>` : `<button class="wc-btn up" data-act="upg"${Meta.coins < cost ? ' disabled' : ''}><span class="up-ar">⬆</span><span class="ico ic-coin"></span>${cost}</button>`;
      const adUp = (lvl === 1) ? `<button class="wc-btn adup" data-act="adup">▶ FREE</button>` : '';   // first upgrade: rewarded ad
      acts = upg + adUp;
    }
    card.innerHTML = `<span class="sfc-ico">${f.icon}</span>`
      + `<span class="sfc-name">${nm}</span>`
      + (owned ? `<span class="sfc-lv">Lv ${lvl} / ${SF_MAX}</span>` : `<span class="sfc-lv locked">🔒 LOCKED</span>`)
      + `<span class="sfc-stat">${stat}</span>`
      + evoNote
      + `<span class="sfc-cost">cost <i class="blt"></i>${f.cost} pts</span>`
      + `<span class="wc-acts">${acts}</span>`;
    const up = card.querySelector('[data-act=upg]'); if (up) up.addEventListener('click', () => upgradeSF(f.id));
    const bsf = card.querySelector('[data-act=buysf]'); if (bsf) bsf.addEventListener('click', () => buySF(f.id));
    const adu = card.querySelector('[data-act=adup]'); if (adu) adu.addEventListener('click', () => upgradeSFAd(f.id));
    wrap.appendChild(card);
  }
}
function upgradeSF(id){ if (!sfOwned(id)) return; const lvl = sfLevel(id); if (lvl >= SF_MAX) return; const c = sfCost(lvl); if (Meta.coins < c) return; Meta.coins -= c; Meta.sfLvl[id] = lvl + 1; Meta.save(); refreshForces(); refreshMenu(); }
function buySF(id){                                        // unlock a locked force with coins (cheap)
  if (sfOwned(id)) return;
  const c = sfBuyCost(id); if (Meta.coins < c) return;
  Meta.coins -= c; Meta.sfOwned.push(id); Meta.sfLvl[id] = Meta.sfLvl[id] || 1;
  SFX.play('coin'); Meta.save(); refreshForces(); refreshMenu();
}
function upgradeSFAd(id){                                  // FIRST upgrade only (Lv 1→2) via a rewarded ad
  if (!sfOwned(id) || sfLevel(id) !== 1) return;
  playRewardedAd(() => { Meta.sfLvl[id] = 2; Meta.save(); refreshForces(); refreshMenu(); });
}

/* ---------------- Menu castle + loadout ---------------- */
let castleShown = -1;
function renderCastle(){ const box = $('castleBox'); if (!box || !window.CastleArt) return; if (Meta.castle !== castleShown){ castleShown = Meta.castle; CastleArt.render(box, Meta.castle); } }
function upgradeCastle(){ if (Meta.castle >= CASTLE_MAX) return; const c = Meta.castleCost(); if (Meta.coins < c) return; Meta.coins -= c; Meta.castle++; Meta.save(); renderCastle(); refreshMenu(); bump($('castleBox')); }
function refreshCastleUpg(){
  const btn = $('castleUpg'); if (!btn) return;
  $('castleStage').textContent = `Stage ${Meta.castle + 1} / ${CASTLE_MAX + 1}`;
  const cvv = $('castleCostV'), ic = $('castleCostBox').querySelector('.ic-coin');
  if (Meta.castle >= CASTLE_MAX){ btn.classList.add('max'); btn.disabled = true; cvv.textContent = 'MAX'; ic.style.display = 'none'; }
  else { btn.classList.remove('max'); cvv.textContent = Meta.castleCost(); ic.style.display = ''; btn.disabled = Meta.coins < Meta.castleCost(); }
  const adc = $('castleUpgAd'); if (adc) adc.style.display = Meta.castle === 0 ? '' : 'none';   // first stage can be earned with an ad
}
// cheapest upgradable EQUIPPED weapon — what the menu ⬆ button will level up
function nextWeaponUp(){
  return Meta.weapons.map(id => WEAPONS[id - 1]).filter(Boolean)
    .filter(w => (Meta.wlv[w.id - 1] || 1) < WEAPON_MAX)
    .sort((a, b) => weaponCost(Meta.wlv[a.id - 1] || 1) - weaponCost(Meta.wlv[b.id - 1] || 1))[0];
}
function refreshLoadout(){
  const eq = Meta.weapons.map(id => WEAPONS[id - 1]).filter(Boolean);
  $('lc_wpnArt').innerHTML = eq.map(w => weaponArt(w, Meta.wlv[w.id - 1] || 1)).join('');
  $('lc_wpnName').textContent = eq.length > 1 ? `${eq.length} WEAPONS` : (eq[0] ? eq[0].name : 'NO WEAPON');
  $('lc_wpnLv').textContent = eq.length ? eq.map(w => 'Lv' + (Meta.wlv[w.id - 1] || 1)).join(' · ') : '—';
  // ⬆ upgrades the cheapest upgradable equipped weapon straight from the menu (cost shown)
  const upBtn = $('lc_wpnUpg');
  if (upBtn){
    const cand = nextWeaponUp();
    if (!cand){ upBtn.classList.add('maxed'); upBtn.disabled = true; upBtn.innerHTML = '<span class="up-ar">MAX</span>'; }
    else {
      const c = weaponCost(Meta.wlv[cand.id - 1] || 1);
      upBtn.classList.remove('maxed'); upBtn.disabled = Meta.coins < c;
      upBtn.innerHTML = `<span class="up-ar">⬆</span><span class="ico ic-coin"></span>${kfmt(c)}`;
    }
  }
}
let heroLoadShown = -1, heroLoadLvl = -1;
function refreshHeroLoadout(){
  const h = HEROES[Meta.hero - 1] || HEROES[0];
  const lvl = heroLevel(h);
  const nm = $('lc_heroName'); if (nm) nm.textContent = h.tank ? 'TANK' : h.name;
  const rr = $('lc_heroRarity');
  if (rr){
    rr.textContent = h.tank && window.TankArt ? `Lv ${Meta.tankLvl} · ${TankArt.name(Meta.tankLvl)}` : `${h.rarity} · Lv ${lvl}`;
    rr.style.color = RARITY_COL[h.rarity] || '#8fd3ff';
  }
  if (Meta.hero !== heroLoadShown || lvl !== heroLoadLvl){ heroLoadShown = Meta.hero; heroLoadLvl = lvl; paintHero($('lc_heroArt'), h, 'lc-png', 'lc-tok'); }
  // ⬆ upgrades the equipped hero directly from the menu (same economy as the HEROES screen)
  const upBtn = $('lc_heroUpg');
  if (upBtn){
    const maxed = h.tank ? lvl >= TANK_MAX : lvl >= HERO_LVL_MAX;
    const cost = h.tank ? tankCost(Meta.tankLvl) : heroUpCost(Meta.heroLvl[h.id] || 1);
    if (maxed){ upBtn.classList.add('maxed'); upBtn.disabled = true; upBtn.innerHTML = '<span class="up-ar">MAX</span>'; }
    else { upBtn.classList.remove('maxed'); upBtn.disabled = Meta.coins < cost; upBtn.innerHTML = `<span class="up-ar">⬆</span><span class="ico ic-coin"></span>${kfmt(cost)}`; }
  }
}

/* ---------------- Input wiring ---------------- */
$('playBtn').addEventListener('click', () => { state.endless = false; launchLevel(); });   // menu PLAY = current campaign level (never endless)
$('toShop').addEventListener('click', () => show('shop'));
$('toBattle').addEventListener('click', () => show('menu'));
$('toLevels').addEventListener('click', () => show('levels'));
$('levelsBack').addEventListener('click', () => show('menu'));
$('toWeapons').addEventListener('click', () => show('weapons'));
$('weaponsBack').addEventListener('click', () => show('menu'));
$('toHeroes').addEventListener('click', () => show('heroes'));
$('heroesBack').addEventListener('click', () => show('menu'));
$('toForces').addEventListener('click', () => show('forces'));
$('forcesBack').addEventListener('click', () => show('menu'));
$('toStreak').addEventListener('click', openStreak);
$('streakClaim').addEventListener('click', claimStreak);
$('streakDouble').addEventListener('click', streakDoubleAd);
$('streakClose').addEventListener('click', closeStreak);
$('castleUpg').addEventListener('click', upgradeCastle);
{ const b = $('castleUpgAd'); if (b) b.addEventListener('click', () => {   // first castle stage via rewarded ad
    if (Meta.castle !== 0) return;
    playRewardedAd(() => { Meta.castle = 1; Meta.save(); renderCastle(); refreshCastleUpg(); refreshMenu(); bump($('castleBox')); });
  }); }
$('loadWeapon').addEventListener('click', () => show('weapons'));
$('loadHero').addEventListener('click', () => show('heroes'));
$('lc_wpnUpg').addEventListener('click', e => { e.stopPropagation(); const cand = nextWeaponUp(); if (cand) upgradeWeaponId(cand.id); });
$('lc_heroUpg').addEventListener('click', e => { e.stopPropagation(); const h = HEROES[Meta.hero - 1] || HEROES[0]; upgradeHeroId(h.id); });
// castle stat upgrades live on the Forces screen
// FIRST upgrade of each castle stat / the wagon can be earned with a rewarded ad (Lv 1 → 2 only)
document.querySelectorAll('#forces .adfree[data-adact]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.adact;
  const atBase = a === 'hp' ? Meta.hp === 1 : a === 'dmg' ? Meta.dmg === 1 : a === 'pow' ? Meta.pow === 1 : Meta.wagon === 0;
  if (!atBase) return;
  playRewardedAd(() => {
    if (a === 'hp') Meta.hp = 2; else if (a === 'dmg') Meta.dmg = 2; else if (a === 'pow') Meta.pow = 2; else Meta.wagon = 1;
    Meta.save(); refreshForces(); refreshMenu();
  });
}));
document.querySelectorAll('#forces .upg[data-act]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if (a === 'wagon'){ if (Meta.wagon >= WAGON_MAX) return; const c = Meta.wagonCost(); if (Meta.coins < c) return; Meta.coins -= c; Meta.wagon++; Meta.save(); refreshForces(); refreshMenu(); return; }
  const cost = a === 'hp' ? Meta.hpCost() : a === 'dmg' ? Meta.dmgCost() : Meta.powCost();
  if (Meta.coins < cost) return;
  Meta.coins -= cost;
  if (a === 'hp') Meta.hp++; else if (a === 'dmg') Meta.dmg++; else Meta.pow++;
  Meta.save(); refreshForces(); refreshMenu();
}));

$('sndBtn').addEventListener('click', toggleSound);
$('sndBtn2').addEventListener('click', toggleSound);
{ const ub = $('ultBtn'); if (ub) ub.addEventListener('click', fireUltimate); }   // hero ultimate
{ const eb = $('endlessBtn'); if (eb) eb.addEventListener('click', () => { closeResultModals(); startEndless(); }); }   // endless / survival
{ const mb = $('missionBtn'); if (mb) mb.addEventListener('click', openMissions);        // daily missions
  const mc = $('missionClose'); if (mc) mc.addEventListener('click', () => $('missionModal').classList.remove('active')); }
// Play Games Services menu buttons (Android): open the native leaderboard / achievements UI.
// The buttons stay hidden until sign-in fires 'tds-games-ready' (never shown on web).
{ const lb = $('btnLeaderboard'), ac = $('btnAchievements'), gb = $('gamesBtns');
  if (lb) lb.addEventListener('click', openLeaderboard);                      // Firestore global leaderboard
  if (ac){ ac.addEventListener('click', () => window.TDSGames && TDSGames.showAchievements()); ac.style.display = 'none'; }
  const showGames = () => { if (gb) gb.style.display = ''; };
  // show the 🏆 button once the leaderboard backend (Firebase) is ready, or when PGS signs in
  if (window.TDSLeaderboard && TDSLeaderboard.ready) showGames();
  document.addEventListener('tds-games-ready', () => { showGames(); if (ac) ac.style.display = ''; });   // PGS additionally lights achievements
  const lbc = $('lbClose'); if (lbc) lbc.addEventListener('click', () => $('lbModal').classList.remove('active'));
  // contest tabs + reward popup
  const twb = $('lbTabWeek');  if (twb) twb.addEventListener('click', () => { lbTab = 'week'; renderLb(); });
  const tmb = $('lbTabMonth'); if (tmb) tmb.addEventListener('click', () => { lbTab = 'month'; renderLb(); });
  const tab = $('lbTabAll');   if (tab) tab.addEventListener('click', () => { lbTab = 'all'; renderLb(); });
  const mcl = $('monthClaim'); if (mcl) mcl.addEventListener('click', () => $('monthModal').classList.remove('active'));
  // starter pack offer popup
  const spb = $('starterBuy');   if (spb) spb.addEventListener('click', () => { $('starterModal').classList.remove('active'); buyIap('starter'); });
  const spl = $('starterLater'); if (spl) spl.addEventListener('click', () => $('starterModal').classList.remove('active'));
}
// settle last week's + month's contest prizes shortly after boot (the cloud identity arrives async)
setTimeout(checkMonthReward, 6000); setTimeout(checkMonthReward, 30000);

/* ---------------- Starter pack one-time offer ---------------- */
function maybeOfferStarter(){
  if (Meta.starterBought || Meta.starterSeen || (Meta.unlocked | 0) < 3) return;   // offered once, after level 3
  if (state.screen !== 'menu' || document.querySelector('.modal.active')) return;  // never stack over another popup
  Meta.starterSeen = true; Meta.save();
  const m = $('starterModal'); if (m) m.classList.add('active');
}

/* ---------------- Local notifications (Android come-back reminders) ----------------
   Scheduled when the app goes to background, cleared when it returns (nothing fires
   while playing). No-op on web / until @capacitor/local-notifications is present. */
const LNotif = (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins) ? Capacitor.Plugins.LocalNotifications : null;
if (LNotif){
  setTimeout(() => { try { LNotif.requestPermissions().catch(() => {}); } catch(e){} }, 8000);   // Android 13+ prompt, after the menu settles
  const clearNotifs = () => { try { LNotif.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] }).catch(() => {}); } catch(e){} };
  const scheduleNotifs = () => {
    try {
      const list = [];
      regenTickets();
      if (Meta.pticket < PT_MAX){                            // fires the moment the 🎫 bar refills
        const at = new Date(Meta.pticketAt + (PT_MAX - Meta.pticket) * PT_REGEN_MS);
        if (at.getTime() > Date.now() + 60000) list.push({ id: 1, title: '🎫 Tickets refilled!', body: 'Your battle tickets are full — the zombies are waiting!', schedule: { at } });
      }
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(19, 0, 0, 0);   // tomorrow evening
      list.push({ id: 2, title: '🔥 Daily reward ready', body: `Day ${streakNext()} login reward is waiting — don't break the streak!`, schedule: { at: t } });
      const c = new Date(Date.now() + 3 * 86400000); c.setHours(18, 0, 0, 0);      // 3-day comeback nudge
      list.push({ id: 3, title: '🧟 The zombies are back…', body: 'Your tower misses you, Commander. Come defend it!', schedule: { at: c } });
      LNotif.schedule({ notifications: list }).catch(() => {});
    } catch(e){}
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) scheduleNotifs(); else clearNotifs(); });
  window.addEventListener('pagehide', scheduleNotifs);
  clearNotifs();                                             // launch → drop anything still pending
}
$('tkAd').addEventListener('click', adTicket);
$('tkClose').addEventListener('click', closeTicketModal);
setInterval(() => { if (state.screen === 'menu'){ regenTickets(); refreshTikUi(); maybeOfferStarter(); } }, 1000);   // live 🎫 countdown + one-time starter offer
$('pauseBtn').addEventListener('click', () => { state.paused = true; refreshSndUi(); $('pauseModal').classList.add('active'); });
$('resumeBtn').addEventListener('click', () => { state.paused = false; $('pauseModal').classList.remove('active'); });
$('pauseMenuBtn').addEventListener('click', () => { state.paused = false; $('pauseModal').classList.remove('active'); show('menu'); });
// Victory / Defeat result cards
$('vicDouble').addEventListener('click', () => doubleReward('vic'));
$('vicContinue').addEventListener('click', () => proceed('menu'));
$('defDouble').addEventListener('click', defeatDouble);
$('defRetry').addEventListener('click', () => { finalizeDefeat(); proceed('retry'); });
$('defSkip').addEventListener('click', skipLevel);
$('defMenu').addEventListener('click', () => { finalizeDefeat(); proceed('menu'); });

// shop tab switching
document.querySelectorAll('.shtab').forEach(t => t.addEventListener('click', () => { shopTab = t.dataset.tab; refreshShop(); }));

// Android hardware BACK — never exits the app; steps back through the UI instead (invoked by native.js).
window.TDS_BACK = function(){
  const open = document.querySelector('.modal.active');
  if (open){                                                    // a modal is up
    const pm = $('pauseModal');
    if (pm && pm.classList.contains('active')){ state.paused = false; pm.classList.remove('active'); }   // pause → resume
    return;                                                     // otherwise swallow back so reward/result flows aren't skipped
  }
  if (state.screen === 'game'){                                 // in battle → open pause
    if (!state.paused){ state.paused = true; refreshSndUi(); $('pauseModal').classList.add('active'); }
    return;
  }
  if (state.screen && state.screen !== 'menu'){ show('menu'); return; }   // sub-screen → back to menu
  // already on the menu → stay in the app (do nothing)
};

/* ---------------- Boot ---------------- */
let last = 0;
// after a defeat the convoy goes down in flames — rolling explosions + smoke keep animating
// while the result flow (interstitial → card) plays, even though the main update() stopped
function defeatFx(dt){
  const s = S(), t = state.t - (state.heroDeadAt || state.t);
  state.fxAcc = (state.fxAcc || 0) + dt;
  if (t < 2.4 && state.fxAcc > 0.13){
    state.fxAcc = 0;
    const g = wagonGeom(), hx = heroPos().x;
    const px = Math.random() < 0.5 ? g.cx + (Math.random() - 0.5) * g.w : hx + (Math.random() - 0.5) * 70 * s;
    const py = groundY() - (10 + Math.random() * 80) * s;
    for (let k = 0; k < 12; k++) burst(px, py, k % 3 ? '#ffb142' : '#ff5a3c');
    state.parts.push({ x: px, y: py, vx: 0, vy: -40 * s, life: 0.45, color: '#ffd24a', size: (10 + Math.random() * 8) * s, g: -50 });
    SFX.play('hurt');
  }
  if (Math.random() < 0.5){                                          // smoke columns from the wreck
    const g = wagonGeom();
    state.parts.push({ x: g.cx + (Math.random() - 0.5) * g.w, y: groundY() - 30 * s, vx: (Math.random() - 0.5) * 20 * s,
      vy: (-50 - Math.random() * 40) * s, life: 0.9, color: 'rgba(96,96,108,.55)', size: (7 + Math.random() * 9) * s, g: -30 });
  }
  for (const p of state.pops){ p.y += p.vy * dt; p.vy += 60 * s * dt; p.life -= dt; }
  for (const p of state.parts){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g != null ? p.g : 320) * s * dt; p.life -= dt; }
  state.pops = state.pops.filter(p => p.life > 0);
  state.parts = state.parts.filter(p => p.life > 0);
}
function loop(ts){
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  state.t += dt;
  if (state.screen === 'game' && !state.paused){
    if (!state.over) update(dt);
    else if (!state.won) defeatFx(dt);
  }
  render();
  requestAnimationFrame(loop);
}
function preload(cb){
  const list = { bg: 'assets/bg.png' };   // enemies are now procedural (UndeadArt); no sprite sheets needed
  for (const k in LEVEL_BG) list['bg_' + LEVEL_BG[k]] = 'assets/bg/' + LEVEL_BG[k] + '.png';  // per-level scenes
  for (let st = 1; st <= 3; st++) for (const d of ['intact','damaged','destroyed']) list['wagon_s' + st + '_' + d] = 'assets/wagon_stage' + st + '_' + d + '.png';   // 3-étage wagon tower
  for (const fx of ['smoke','fire','explosion','dust']) list['fx_' + fx] = 'assets/fx_' + fx + '.png';   // destruction effect sheets
  let n = Object.keys(list).length;
  for (const k in list){ const im = new Image(); IMG[k] = im; im.onload = im.onerror = () => { if (--n === 0) cb(); }; im.src = list[k]; }
}
resize();
buildLevels();
preload(() => {
  show('menu');
  if (location.hash === '#play') startRun();
  else if (location.hash === '#shop') show('shop');
  else if (location.hash === '#levels') show('levels');
  else if (location.hash === '#weapons') show('weapons');
  else if (location.hash === '#heroes') show('heroes');
  else if (location.hash.startsWith('#dbgsim')) { setTimeout(() => {
    resize();
    window.__sim = true;                          // sim: interstitials resolve instantly (no overlays)
    bump = () => {};                              // sim speed: skip the forced-reflow HUD bump animation
    const base = () => { Meta.hp = 1; Meta.dmg = 1; Meta.pow = 1; Meta.castle = 0; Meta.weapons = [1]; Meta.owned = [1]; Meta.wlv = Array(WEAPONS.length).fill(1); Meta.hero = 1; Meta.tankLvl = 1; Meta.heroLvl = {}; Meta.wagon = 0; Meta.sfLvl = {}; Meta.sfOwned = FORCES.map(f => f.id); Meta.coins = 300; Meta.gems = 0; };
    const dps = w => (w.dmg * w.rate) * (w.splash ? 1.4 : 1);
    const reEquip = () => { Meta.weapons = Meta.owned.slice().sort((a, b) => dps(WEAPONS[b - 1]) - dps(WEAPONS[a - 1])).slice(0, weaponSlots()); };
    // the sim PLAYS like a real player: keeps the force field topped up, airstrikes crowds
    const FUNIT = FORCES.filter(f => f.kind === 'unit'), FSTRIKE = FORCES.find(f => f.kind === 'strike');
    const simDeploy = () => {
      const alive = state.allies.filter(a => !a.dead).length;
      if (alive < SF_FIELD_MAX){ const f = FUNIT[alive % FUNIT.length]; if (f && state.energy >= f.cost) deployForce(f); return; }
      if (FSTRIKE && state.energy >= FSTRIKE.cost + 10 && state.enemies.filter(e => !e.dead && !e.fort && e.x <= W).length >= 6) deployForce(FSTRIKE);
    };
    const runOnce = lvl => { Meta.level = lvl; Meta.unlocked = Math.max(Meta.unlocked, lvl); startRun(); let st = 0; while (!state.over && st < 18000) { update(0.05); if (st % 10 === 0) simDeploy(); st++; } return { won: state.won, pct: Math.min(100, Math.round(state.scroll / levelLen() * 100)), coins: state.won ? 1000 + 500 * (lvl - 1) : Math.round(state.score * levelCoinMul(lvl)) }; };
    // greedy spend: keep a balanced build climbing while coins allow
    const spend = () => { let go = true; while (go) { go = false;
      const opts = [['dmg', Meta.dmgCost(), () => Meta.dmg++], ['hp', Meta.hpCost(), () => Meta.hp++]];
      const unowned = WEAPONS.filter(w => !Meta.owned.includes(w.id)).sort((a, b) => a.buy - b.buy)[0];
      if (unowned) opts.push(['buy', unowned.buy, () => { Meta.owned.push(unowned.id); reEquip(); }]);
      for (const id of Meta.weapons){ const l = Meta.wlv[id - 1] || 1; if (l < WEAPON_MAX) opts.push(['w' + id, weaponCost(l), () => Meta.wlv[id - 1] = l + 1]); }
      if (Meta.tankLvl < TANK_MAX) opts.push(['tank', tankCost(Meta.tankLvl), () => Meta.tankLvl++]);
      if (Meta.wagon < WAGON_MAX) opts.push(['wagon', Meta.wagonCost(), () => Meta.wagon++]);
      for (const f of FORCES){ const l = sfLevel(f.id); if (l < SF_MAX) opts.push(['sf' + f.id, sfCost(l), () => Meta.sfLvl[f.id] = l + 1]); }
      if (Meta.castle < CASTLE_MAX) opts.push(['castle', Meta.castleCost(), () => Meta.castle++]);
      opts.push(['pow', Meta.powCost(), () => Meta.pow++]);
      opts.sort((a, b) => a[1] - b[1]);
      for (const [, c, act] of opts) { if (Meta.coins >= c) { Meta.coins -= c; act(); go = true; break; } }
    } };
    // CUMULATIVE grind: keep gear across levels (real progression). Plays = incremental runs to clear each level.
    // Coin model matches the live game: run score (+60 on a win) + level-clear chest + ~150/4 games milestone chest.
    // #dbgsim runs L1-L5 from a fresh base; #dbgsim6 RESUMES L6-L10 from the checkpointed save
    // (same browser profile) — a full 10-level session outlives Chrome's renderer, split it in two.
    const startL = Math.max(1, Math.min(LEVELS.length, parseInt(location.hash.slice(7), 10) || 1));
    const endL = Math.min(LEVELS.length, startL + 4);
    if (startL === 1) base();                     // resume sessions keep the loaded save as-is
    const results = []; let total = 0;
    for (let L = startL; L <= endL; L++){
      let runs = 0, firstPct = 0;
      while (runs < 60){ const r = runOnce(L); runs++; if (runs === 1) firstPct = r.pct;
        Meta.coins += r.coins + (r.won ? Math.round(100 * levelCoinMul(L)) : 0) + 38; pendingRewards.length = 0;
        if (r.won) break; spend(); }
      total += runs;
      Meta.save();                                // checkpoint so a #dbgsimN session can resume here
      const line = `L${L}:${runs >= 60 ? '>60' : runs}(${firstPct}%,pw${playerPower()})`;
      results.push(line);
      console.log('SIMLVL ' + line);              // streamed live via --enable-logging=stderr
      if (runs >= 60) break;
    }
    console.log('SIMDONE total=' + total + ' | ' + results.join(' '));
    document.title = 'GRIND total=' + total + ' | ' + results.join(' ');
  }, 700); }
  else if (location.hash === '#forces') show('forces');
  // debug hooks for previewing the result/reward cards (harmless; only fire on explicit hash)
  else if (location.hash === '#dbgwin'){ show('game'); state.level = Meta.level = 3; Meta.unlocked = 3; state.castle = { hp: 78, maxHp: 100 }; state.score = 920; levelComplete(); }
  else if (location.hash === '#dbglose'){ show('game'); state.level = 1; state.score = 415; gameOver(); }
  else if (location.hash === '#dbgreward'){ Meta.games = 3; pendingRewards.length = 0; tallyGameAndStreak(); drainRewards(() => {}); }
  else if (location.hash === '#dbgrate'){ show('menu'); Meta.rated = false; Meta.ratePicked = false; showRatingFlow(() => {}); }   // preview the every-5-games rating popups
  else if (location.hash === '#dbgad'){ $('adCount').textContent = '3'; $('adModal').classList.add('active'); }
  else if (location.hash === '#shopcoins'){ shopTab = 'coins'; show('shop'); }
  else if (location.hash === '#shopgems'){ shopTab = 'gems'; show('shop'); }
  else if (location.hash === '#dbgwagon'){ Meta.wagon = WAGON_MAX; show('forces'); }
  else if (location.hash === '#dbgwbat'){ Meta.wagon = WAGON_MAX; Meta.level = 1; startRun(); }
  else if (location.hash === '#dbgfort'){ Meta.level = 1; startRun(); state.scroll = levelLen() * 0.5 - heroPos().x; }
  // #dbgtik — preview the out-of-tickets modal (0 tickets, 1 min into the regen window)
  else if (location.hash === '#dbgtik'){ Meta.pticket = 0; Meta.pticketAt = Date.now() - 60000; startRun(); }
  // #dbgboss<N> — jump straight to level N's boss (e.g. #dbgboss7); verifies each level's final ghost
  else if (location.hash.startsWith('#dbgboss')){
    const L = parseInt(location.hash.slice(8), 10);
    Meta.level = Math.max(1, Math.min(LEVELS.length, L || 1));
    startRun(); state.fortDead = true;
    state.scroll = levelLen() - heroPos().x;               // at the boss line
    spawnBoss(); if (state.boss) state.boss.x = W * 0.72;  // drop it on-screen for instant inspection
  }
  requestAnimationFrame(loop);
});

/* ---------------- Connectivity gate: this game REQUIRES an internet connection ----------------
   RULE: the game must not be playable without a working internet connection.
   navigator.onLine catches airplane-mode / no-signal instantly. An active reachability probe
   also catches "connected to Wi-Fi but no real internet" (captive portals, dead uplinks).
   The probe LOADS A REMOTE IMAGE rather than fetch()-ing:
     • an <img> load works cross-origin AND from a file:// page — a no-cors fetch does neither
       (it rejects outright on a file:// origin, so it would falsely lock out online players);
     • it resolves online ONLY when a real image actually decodes, so a captive portal — which
       serves an HTML login page, not an image — correctly reads as OFFLINE (a no-cors fetch
       instead "succeeds" on that HTML and would wave the user straight past the gate).
   The host is a Google asset: the game already hard-depends on Google (Firebase/gstatic,
   Analytics/AdMob), so if it is unreachable the game cannot run regardless. While offline the
   whole UI is covered by #netGate and any live battle is paused; when the connection returns
   the gate hides and the battle we paused resumes. */
(function(){
  const gate = $('netGate'), retry = $('netRetry');
  if (!gate) return;
  const PROBE_URL = 'https://www.google.com/favicon.ico';   // small, stable, decodes to a real image
  let shown = false, misses = 0, probing = false;

  function probe(){                                        // resolves true only if a real image actually decodes
    return new Promise(res => {
      if (!navigator.onLine){ res(false); return; }
      const img = new Image();
      let done = false;
      const finish = ok => { if (done) return; done = true; clearTimeout(to); img.onload = img.onerror = null; res(ok); };
      const to = setTimeout(() => finish(false), 5000);     // slow/dead link ⇒ treat as offline
      img.onload  = () => finish(img.naturalWidth > 0);     // a decoded image ⇒ genuine internet
      img.onerror = () => finish(false);                    // no route, or captive-portal HTML ⇒ offline
      img.src = PROBE_URL + '?_=' + Date.now();             // cache-bust so we test the live link every time
    });
  }
  function setGate(offline){
    if (offline === shown) return;
    shown = offline;
    gate.classList.toggle('show', offline);
    if (offline){
      if (state.screen === 'game' && !state.paused){ state.paused = true; state.netPaused = true; }
    } else if (state.netPaused){                           // auto-resume the battle the outage paused
      state.netPaused = false;
      const pm = $('pauseModal');
      if (!(pm && pm.classList.contains('active'))) state.paused = false;
    }
  }
  function evaluate(force){                                // force = user tapped RETRY → reflect the result immediately
    if (!navigator.onLine){ misses = 0; setGate(true); return; }
    if (probing) return; probing = true;
    probe().then(ok => {
      probing = false;
      if (ok){ misses = 0; setGate(false); }
      else if (force) setGate(true);                       // explicit retry: honour the failure now
      else if (++misses >= 2) setGate(true);               // background: tolerate one transient miss
    });
  }
  addEventListener('online',  () => evaluate());
  addEventListener('offline', () => { misses = 0; setGate(true); });
  retry && retry.addEventListener('click', () => evaluate(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) evaluate(); });
  setInterval(() => { if (!document.hidden) evaluate(); }, 15000);   // catch a captive-portal / dead-uplink drop promptly
  if (!navigator.onLine) setGate(true); else evaluate();   // initial check on boot
})();
})();
