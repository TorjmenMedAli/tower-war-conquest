# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A workspace for **Tower Destiny Survive (TDS)** — a 2D side-scrolling tower-defense / advance hybrid — implemented multiple times, plus the tooling and art pipeline that feed the builds:

- **`tds-web/`** — the **actively developed** standalone browser build (HTML/CSS/JS, no build step, no server). This is where most work happens; it's the source of truth for gameplay/balance.
- **`tds-godot/`** — a **Godot 4.6 port of `tds-web`** (made by copying tds-web, then rewriting it in GDScript). Faithful gameplay/tuning, procedural `_draw()` art, reuses the PNG backgrounds. Run it with `Godot.exe --path tds-godot --import` (once) then `--path tds-godot`. See `tds-godot/README.md`.
- **`godot-game/`** — an **earlier, separate** Godot 4.6 build of the same game, edited and tested **through the Godot MCP Pro addon**. Not the same codebase as `tds-godot`.
- **`godot-mcp-pro-v1.14.1/`** — a **vendored third-party** MCP server (Node/TypeScript) that bridges Claude Code to a running Godot editor. It provides the `godot-mcp-pro` tools; treat it as a dependency, not product code to redesign.
- Asset / design directories (see *Asset pipeline*).

The game builds are independent codebases that share design and art, not code. Save data is separate: web uses `localStorage['tds_save_web']`; both Godot projects use `user://tds_save.json`.

## tds-web (primary)

No build, no bundler, no package manager. **Run it by opening `tds-web/index.html` in a browser.** `index.html#play` boots straight into a run, skipping the menu.

### Architecture
- `index.html` — markup + the seven screens (`menu`, `game`, `shop`, `levels`, `weapons`, `heroes`, `forces`), then a fixed-order list of `<script>` tags.
- `style.css` — the entire "glossy candy" UI (CSS gradients / bevels / shadows). ~62 KB.
- `game.js` — the whole engine in one file (~3 KB lines): gameplay, Canvas rendering, UI wiring, and save/load. Loaded **last** because it consumes the art modules as globals.
- `*-art.js` — procedural art modules, each exposing a global (e.g. `WeaponArt`, `HeroArt`, `TankArt`, `CastleArt`, `Arsenal`, `UndeadArt`, `MonsterArt`, `HeroSquad`). They return **inline SVG strings** that `game.js` rasterizes to `Image` objects via `data:image/svg+xml,...` URIs and draws onto the canvas. PNGs are used for backgrounds and as fallbacks only.

Key `game.js` landmarks (top-of-file config blocks): `LEVELS` / `LEVEL_BG` (10-level campaign + per-level background key), `WEAPONS` + `weaponCost`, `HEROES` + rarity tables, `FORCES` + `sfCost`, and the `Meta` object (persistent progression, the web analog of Godot's `Meta` autoload). The live run lives in `state`; the world scrolls past a fixed-position hero (`state.scroll`).

### Cache-busting convention (important)
Scripts and CSS are loaded with version query strings, e.g. `game.js?v=52`, `style.css?v=49`, art modules `?v=26`. **After editing a JS or CSS file, bump its `?v=` number in `index.html`** — otherwise the browser serves stale cached code and your change won't appear. This is the single most common footgun here.

### Assets
`tds-web/assets/` is the live asset set the game loads at runtime (`assets/bg/<level>.png` backgrounds, `assets/weapons/<dir>/lv<NN>.png` per-tier weapon art, sprite sheets like `zombie_sheet.png` / `dog_sheet.png` sliced into 8 frames, HUD icons). The `tds-web/README.md` is detailed and current — read it for gameplay rules and per-asset notes.

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
