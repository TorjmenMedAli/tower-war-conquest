# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A workspace for **Tower War: Conquest** (formerly *Tower Destiny Survive / Zombie Tower Defense*). Since Sept 2026 `tds-web/` is a **swipe-to-conquer tower strategy game** in the style of *Tower War – Tactical Conquest* (towers breed troops, swipe routes between towers, capture the map; 100-level campaign, Special Ops, PvP vs bots, troop collection). The older Godot ports below still contain the previous side-scroller design:

- **`tds-web/`** — the **actively developed** standalone browser build (HTML/CSS/JS, no build step, no server). This is where most work happens; it's the source of truth for gameplay/balance.
- **`tds-godot/`** — a **Godot 4.6 port of `tds-web`** (made by copying tds-web, then rewriting it in GDScript). Faithful gameplay/tuning, procedural `_draw()` art, reuses the PNG backgrounds. Run it with `Godot.exe --path tds-godot --import` (once) then `--path tds-godot`. See `tds-godot/README.md`.
- **`godot-game/`** — an **earlier, separate** Godot 4.6 build of the same game, edited and tested **through the Godot MCP Pro addon**. Not the same codebase as `tds-godot`.
- **`godot-mcp-pro-v1.14.1/`** — a **vendored third-party** MCP server (Node/TypeScript) that bridges Claude Code to a running Godot editor. It provides the `godot-mcp-pro` tools; treat it as a dependency, not product code to redesign.
- Asset / design directories (see *Asset pipeline*).

The game builds are independent codebases that share design and art, not code. Save data is separate: web uses `localStorage['tds_save_web']`; both Godot projects use `user://tds_save.json`.

## tds-web (primary)

No build, no bundler, no package manager. **Run it by opening `tds-web/index.html` in a browser.** `index.html#play` boots straight into a run, skipping the menu.

### Architecture
- `index.html` — markup + the screens (`loading`, `menu`, `game`, `shop`, `levels`, `troops`, `pvp`, `missions`), then a fixed-order list of `<script>` tags.
- `style.css` — the entire "glossy candy" UI (CSS gradients / bevels / shadows). ~62 KB.
- `game.js` — the whole game in one file (~1.5 K lines): config/economy → `Meta` (save) → battle engine (`genLevel` deterministic maps, `update`, `aiThink`, pointer input) → canvas rendering → screens → boot. Loaded **last**.
- `troops-art.js` — procedural SVG portraits (`TroopArt.svg`) for troop cards; towers/units are drawn on the canvas procedurally.

Key `game.js` landmarks: `REGIONS`/`UNLOCK_AT`/`INTRO` (campaign + mechanic unlock levels), `TROOPS` + rarity tables, `OPS` (special missions), `LEAGUES`, `Meta`. The live battle lives in `state` (towers/units/routes in a 720×1000 map space mapped through `MAP`). Debug hashes: `#lv<N>`, `#demo<N>`, `#sim` (synchronous autoplay → page title), see `tds-web/README.md`.

### Cache-busting convention (important)
Scripts and CSS are loaded with version query strings, e.g. `game.js?v=200`, `style.css?v=100`. **After editing a JS or CSS file, bump its `?v=` number in `index.html`** — otherwise the browser serves stale cached code and your change won't appear. This is the single most common footgun here.

### Assets
`tds-web/assets/` now only holds HUD icons and the play/battle button art; all game art is procedural. `tds-web/README.md` documents gameplay rules, modes and debug hashes.

## godot-game (Godot 4.6, MCP-driven)

Edited via the **`godot-mcp-pro` MCP tools**, not by writing `.tscn`/`.gd` files blind. The intended loop is: launch the Godot editor so the addon connects, then use the MCP tools (`get_scene_tree`, `add_node`, `edit_script`, `play_scene`, `get_game_screenshot`, etc.) to build and test against the live editor. Runtime tools fail unless the game is actually playing.

- Main scene: `scenes/MainMenu.tscn`. Portrait mobile target (720×1280, `gl_compatibility`).
- **Autoload singletons are the architecture** (see `project.godot` `[autoload]`):
  - `Game.gd` — central run state **+ signal event bus**. Gameplay nodes emit (`score_changed`, `vehicle_health_changed`, `enemy_died`, `segment_built`…); the HUD reacts to signals and routes player intent back through `try_*` methods. This decouples HUD from gameplay nodes.
  - `Meta.gd` — persistent meta-progression saved to `user://tds_save.json` (coins, gems, HP/Damage/Power upgrade levels). A run reads Meta to buff the cart, then pays out `coins = score`.
  - `ResourceManager.gd` — shared resources.
  - `MCPScreenshot` / `MCPInputService` / `MCPGameInspector` — injected by the `godot_mcp` addon (`addons/godot_mcp/`), not game code.
- Scenes/scripts pair by name (`scripts/Enemy.gd` ↔ `scenes/Enemy.tscn`); weapons live under `scripts/weapons/` + `scenes/weapons/`.

### Launching the editor (path-with-spaces gotcha)
The project path contains spaces. Pass the project via **working directory**, not as a path argument, or Godot bounces to the Project Manager and the MCP addon never loads:
```powershell
Start-Process -FilePath "C:\Users\Habib Torjmen\Downloads\Godot_v4.6.3-stable_win64.exe\Godot_v4.6.3-stable_win64.exe" -ArgumentList "--editor" -WorkingDirectory "C:\Users\Habib Torjmen\Desktop\Habib Enetcom\plane\godot-game"
```
Addon connects to the Node MCP server over `ws://127.0.0.1:6505-6509`. If tools report "Godot editor is not connected", a stale `node.exe` is usually holding the port — kill `node.exe` and relaunch.

## godot-mcp-pro server (vendored tooling)

Only touch this if the MCP bridge itself is broken. It's wired into Claude Code via the repo-root `.mcp.json` (already enabled in `.claude/settings.local.json`).

```bash
cd godot-mcp-pro-v1.14.1/server
npm install
npm run build        # tsc → build/index.js  (this is what .mcp.json runs)
npm test             # vitest run
npm run watch        # tsc --watch
```
Architecture: `server/src/index.ts` registers tools from `server/src/tools/*`, talks to the editor over WebSocket (`godot-connection.ts`); inside Godot, `addons/godot_mcp/command_router.gd` dispatches to `addons/godot_mcp/commands/*.gd`.

## Asset pipeline (working directories)

These hold reference material and intermediate art, not code:
- `extracted/` — transparent-PNG asset pack (characters, icons, UI buttons); source for the game art sets.
- `designs/`, `screens/`, `elements/` — UI/layout design references (e.g. `city_sunset_battle_layout_*`), sourced from the Claude Design / Stitch projects.
- `captures/` + `hierarchy/` — Android emulator screenshots and UI-automation dumps, produced by **`tools/snap.ps1 -Name <step> [-Dump]`** (uses `adb` against emulator `127.0.0.1:21503`).
