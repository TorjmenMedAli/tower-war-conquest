# Tower Destiny Survive — Web

A standalone browser build (HTML/CSS/JS, no build step, no server needed).

## Run
Just open **`index.html`** in any modern browser (Chrome, Edge, Firefox, Safari).
On a phone, add it to the home screen for a full-screen app feel.

- `index.html#play` — boot straight into a run (skips the menu).

## How to play — advance to the finish
Every battle costs a **🎫 play ticket** (max 10; +1 refills every 5 minutes, offline time
counts; a rewarded ad grants +1 any time you're not full — see the pill above PLAY).

The level is a **fight-to-advance** march: the hero holds a fixed screen spot and the world
scrolls (`state.scroll`) — but **only while the road ahead is clear**. Enemies engaged in
the front zone stall the convoy (`roadBlocked()`), so how far you get reflects your gear:
a fresh loadout bogs down around 30–40%, and each upgrade pushes the stall point further.
Zombies come from the right; raze the mid-level **ENEMY FORT**, then beat the level **BOSS**
at the finish line to **win** (`levelComplete()` → bonus coins + unlocks the next level).
If the convoy's **HP** drains to 0 first, it's game over.

Your defenders auto-fire for free:
- **2 mounted weapons** that ride with the convoy as escort turrets (whatever you've equipped).
- **1 hero** leading the advance (the tank drives, foot heroes walk with a leg stride).

In battle you earn **points** from passive **Power** income only (1/s at base — kills pay
coins, not points; the fort/boss milestones grant burst points) and spend them
on **special forces** (bottom bar):
- **RANGER** (10) / **SHERIFF KATE** (14) / **DOC VEGA** (18) — deploy an allied unit that
  holds a line ahead of the convoy and fires at enemies (has its own HP; max 4 fielded).
  Each **evolves** into its upgraded hero form at force Lv 6.
- **AIRSTRIKE** (24) — instant area blast across the whole battlefield.

Win or lose you keep **coins = score × level multiplier** (plus a finish bonus and reward
chests) to spend on pre-battle upgrades. Levels are tuned so clearing one takes **~20–30
plays** of earn-and-upgrade. There are **no revives** — when a run ends (win or lose) an
**interstitial ad** plays before the result card (`playInterstitial()`, the AdMob hook;
the NO-ADS bundle skips it), then it's back to the garage.

## Pre-battle upgrades (all in the menu)
- **Castle** (menu) — tap **🏰 CASTLE** to advance its build stage (`CastleArt`); it's the
  fort you set out from each run, and each stage adds convoy HP. Stored in `Meta.castle`.
- **Weapons** (nav tab) — **buy** weapons from the 10-gun Arsenal (Pistol → Grenade
  Launcher), **mount up to 2** (`Meta.weapons`), and **upgrade** each Lv 1 → 20
  (`Meta.wlv`). Each has a distinct combat profile in the `WEAPONS` array (`game.js`).
- **Heroes** (nav tab) — equip one hero (`Meta.hero`) and upgrade it. The Battle Tank
  uses its 7 procedural tiers (`Meta.tankLvl`); other heroes use `Meta.heroLvl`.
- **Forces** (nav tab) — upgrade the **convoy stats** (HP / Damage / Power) and the
  **special forces** (`Meta.sfLvl`, Lv 1 → 10; more damage + HP per level).

## Menu sections
- **Levels** (tap the stage banner) — a 10-level campaign map; level 1 starts unlocked,
  and clearing your highest level **unlocks and auto-selects the next**. Each node shows
  your ⚡ Power vs the level's recommended Power so you know when to upgrade. Stuck? A
  **🎟️ skip ticket** (shop → GEMS) can be spent on the defeat card.
- **Weapon art** — `weapons-art.js` (`WeaponArt.svg(type, lv)`) procedurally draws each
  weapon at its upgrade tier as an animated inline SVG. Ported from the Claude Design
  component *Weapon Upgrade Tiers* — 20 tiers ramp barrels/armor/muzzle and elemental
  upgrades (fire → electric → ice → poison → plasma → prismatic "Apex Prime"). Used in
  the weapon cards, the hero badge, and the garage row, swapping per level.

Progress (coins, gems, upgrades) is saved in your browser via `localStorage`.

## Art
`bg.png` is the city-sunset backdrop. The characters, icons and buttons come from the
`../extracted/` asset pack (transparent PNGs).

**Sprite sheets** (8 frames laid out horizontally, sliced at runtime in `game.js`):
- `zombie_sheet.png` — urban-zombie walk cycle.
- `dog_sheet.png` — robot-dog walk cycle.
  Enemy sheets face **right** by default, so they are flipped horizontally on draw to
  face **left** (their direction of travel toward the castle).
- `scout_sheet.png` — legacy cart cycle (no longer used; kept for its aspect ratio).

> The castle itself is drawn on the canvas in `drawCastle()` (procedural stone walls,
> gate, tower, battlements, flag), scaling with its build stage. Defenders/allies and
> weapon turrets are also procedural canvas art.

**Heroes are fully procedural** — `hero-art.js` (`HeroArt.svg(id, prefix, px, fr)`) draws
each of the 6 western heroes as an inline SVG (distinct hat + palette + weapon), used both
in the menu (animated) and rasterised onto the battle canvas (idle + shoot frames), same
technique as `tank-art.js`. No hero PNGs needed; a rarity-tinted token only shows if
`HeroArt` fails to load.

**HUD assets:**
- `icon_coins.png`, `icon_gem.png` — chip / upgrade icons.
- `ab_bomb.png`, `ab_toxic.png`, `ab_frost.png` — ability tiles (cost badges baked in).
- `btn_play.png`, `btn_battle.png` — menu PLAY / shop BATTLE buttons.
- `ab_energy.png`, `icon_bolt.png` — extra art (available).

## Files
- `index.html` — markup + screens
- `style.css` — the glossy "candy" UI (CSS gradients / bevels / shadows)
- `game.js` — gameplay + Canvas rendering + UI wiring + save/load
- `hero-art.js` — procedural SVG art for the 6 heroes
- `tank-art.js` — procedural SVG art for the Battle Tank hero (7 tiers)
- `castle-art.js` — procedural DOM art for the menu castle showcase
- `weapons-art.js` — procedural SVG art for the 4 weapons (20 tiers)
