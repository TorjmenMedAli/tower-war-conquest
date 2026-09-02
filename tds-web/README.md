# Tower War: Conquest — web build

A swipe-to-conquer tower strategy game in the style of *Tower War – Tactical Conquest*.
No build step: open `index.html` in a browser (or serve the folder statically). `index.html#play`
boots straight into the current campaign level.

## How it plays
- Every **tower** breeds troops (its number = troops inside, max 63; forts 99).
- **Swipe from one of your towers to any tower within reach** to open a route. Troops stream along
  it: they reinforce your own towers, fight enemy troops they meet on the road, and subtract from
  enemy/neutral towers. A tower that drops below 0 is **captured**.
- A tower has **1 route** below Lv 10, **2** from Lv 10, **3** from Lv 20 (white dots under it).
  **Swipe across a route to cut it.**
- Win by capturing every enemy tower. Lose when you have no towers and no troops left.

### Tower types
| Type | Breeds | Notes |
|---|---|---|
| Barracks | soldiers (1) | the default |
| Factory | tanks (2 each) | from level 4 |
| Sniper | — | shoots troops in range · level 11+ |
| Rocket | — | locks one target, splash damage · level 26+ |
| Fort | soldiers ×2 rate | huge, holds 99 · level 41+ |

### Obstacles
Blockades (chop through, costs troops) from level 7 · Land mines from 15 · Rivers (first 5 troops
build the bridge) from 19 · two enemy armies from 9, three from 33.

## Modes
- **Campaign** — 5 regions × 20 levels (100). Maps are deterministic per level.
- **Special Ops** — 8 fixed missions (multiplier gates, timers, minefields…). One-time gold/gem/bomb
  reward, replayable for 20% gold.
- **PvP** — asynchronous duels against a generated bot with troops around your level. ±league
  points, 6 leagues (Bronze → Champion).

## Meta
- **Troops**: 5 soldiers + 5 tanks across 5 rarities. Equip one of each. Upgrade with gold (Lv 1–30);
  from Lv 15 an upgrade also needs a spare copy. **Summon** (25 gems) rolls a random troop; duplicates
  become copies.
- **Air Strike** (💣): consumable, drops an enemy tower to 0. Won from milestones/chests, bought with gems.
- Battle tickets (10, +1 / 5 min), daily streak, daily quests, shop (daily/ads, chests, items, gold,
  gems + real IAPs), rating prompts, offline gold, global leaderboard, Play Games / Game Center hooks —
  all carried over from the previous build.

## Files
- `index.html` — screens: loading, menu, game HUD, shop, levels (region map), troops, pvp, missions
  (special ops) + modals.
- `game.js` — everything: config/economy → `Meta` save → battle engine (`genLevel`, `update`, AI,
  input) → canvas rendering → screens → boot. Save key: `localStorage['tds_save_web']`
  (old Zombie Tower Defense saves are migrated: wallet + flags kept, gameplay reset).
- `troops-art.js` — procedural SVG portraits for troop cards.
- `style.css` — UI. New Tower War styles are appended at the end.
- `sfx.js`, `firebase.js`, `cloud.js`, `leaderboard.js`, `native.js`, `iap.js` — platform/services, unchanged.

**Cache-busting**: after editing a JS/CSS file bump its `?v=` in `index.html`.

## Debug hashes
`#menu` `#shop` `#levels` `#troops` `#pvp` `#ops` · `#lv<N>` start level N · `#dbgwin` / `#dbglose`
result cards · `#dbgrich` free currency · `#sim` (or `#sim1,5,20@2.5`) runs a synchronous autoplay
of the listed levels at troop strength 2.5 and writes the results to the page title.

## Art pipeline (sprites)
`assets/sprites/*.png` are pre-rendered 3D sprites: towers/walls/bridges/scenery come from Kenney's
**Tower Defense Kit** (CC0, see `assets/sprites/LICENSE-kenney.txt`) with the palette accents hue-shifted
per team (`_n` neutral, `_p` blue player, `_r` red, `_y` yellow, `_v` purple); soldiers and tanks are built
from primitives in the same scene so lighting matches. Towers have 3 visual tiers (Lv 1 / 10 / 20), five
rarity tiers for troops, plus `port_*` low-angle portraits for the cards.
To re-render: put the kit's `Models/GLB format` folder next to `tools/render-sprites.html`, run
`python3 tools/render-server.py` (serves + saves POSTed PNGs into `sprites/`) and open
`http://127.0.0.1:8766/render-sprites.html?from=0&to=30` (chunked; `?only=name,name` for a subset), then
downscale the PNGs to 256 px into `assets/sprites/`.
