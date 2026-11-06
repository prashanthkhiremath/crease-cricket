# Crease Cricket — notes for coding agents

Browser cricket game: Vite + plain ES modules + Three.js 0.169. No framework.

## Commands
- `npm run dev` — dev server. `npm run build` — static build to `dist/`.
- `npm run build:artifact` — single-file build (`dist/artifact.html` + `dist/models/xbot.json`) for the claude.ai artifact.
- `npm run smoke` (after a build) — headless playthrough of bat and bowl mode; must print `SMOKE OK`. Uses the globally installed Playwright; in a cloud container pass nothing extra. Software rendering is slow, so expect a few minutes.

## Architecture
- One shared game state lives in `match.js` (`game`, `input`, `M`). `M` is the current match and is reassigned only in `newMatch`.
- Phase machine in `loop.js`: `menu → ready|aim → runup → delivery → live → dead → …`, `result`. `aim` is bowl mode only.
- Players: each player is a procedural `Rig` (players.js) driven by the `POSE` library. When the Mixamo model loads, `athletes.js` attaches a skinned body to every rig and copies the rig's pose onto the Mixamo skeleton each frame (`retarget`). The rig meshes are then hidden; the bat stays on the rig.
- Ball flight is precomputed: deliveries in `bowling.js` (`simulateDelivery`), hits in `fielding.js` (`simulateHit`), sampled by time with `pathPos`.
- Coordinates: metres; striker's stumps at z=0, bowler's stumps at z=-20.12; +x is the off side for the right-handed batter; field centre at z=-10.06.
- Batting aids live in `assist.js`: pitch marker (delivery is pre-built at run-up start in bat mode, `game.preDel`), held-key eight-way direction (`keyDir`), shot names and the timing bar. Ball speed setting scales `dt` during `runup`/`delivery` in bat mode (`SPEEDS`).
- `window.__game` is a test hook used by `scripts/smoke.cjs`; keep it.

## Conventions
- Teams and players are fictional. Do not add real cricketers' names, likenesses or official team marks.
- The artifact host does not serve `.glb`; models ship as embedded glTF `.json` in `public/models/`.
- Light intensities were scaled by π when moving from r128 to r169 (physical light units).
