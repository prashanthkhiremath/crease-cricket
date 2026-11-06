# Crease Cricket

A 3D T20 cricket game that runs in the browser. Bat to chase a target or bowl to defend one, under floodlights, with pace and spin bowling, fielding, running between the wickets and ball-tracking LBW reviews.

## Run it

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build in `dist/` (static files, host anywhere) |
| `npm run build:artifact` | Single-file build for publishing as a claude.ai artifact (`dist/artifact.html` plus `dist/models/`) |
| `npm run smoke` | Plays a few balls in bat and bowl mode in a headless browser and fails on any error (run a build first; needs Playwright) |

## Controls

**Batting:** pick a direction (← off, ↑ straight, → leg, ↓ block), then press Space to drive or L to loft as the ball arrives. R runs, C steps out to spinners. On phones, use the on-screen buttons.

**Bowling:** drag on the pitch or use the arrow keys to aim, pick a delivery with 1–5, press Space to run in, then press Space again with the needle in the green.

## Project layout

```
index.html          page markup (menus, HUD, controls)
src/
  main.js           entry point: wires modules together, starts the loop
  config.js         constants: formats, difficulty, teams, field settings, helpers
  scene.js          renderer, lighting, stadium, pitch, stumps
  players.js        procedural pose rigs, pose library, bat, ball and trail
  athletes.js       skinned 3D players, kit colours, retargeting from the pose rigs
  animation.js      chooses each player's pose every frame
  physics.js        path sampling helpers
  bowling.js        delivery generation and ball flight to the batter
  batting.js        shot timing and contact
  fielding.js       hit ball flight, fielder interception, catches, throws, running
  scoring.js        end-of-ball scoring, HUD scoreboard
  match.js          match state, new match, field setting, next ball
  bowlmode.js       player bowling: aim marker, release meter, computer batter
  hud.js            flash messages, commentary, ball tracking panel, result screen
  camera.js         broadcast and follow cameras
  loop.js           main loop and phase machine
  input.js          keyboard and touch input
  audio.js          synthesised sound effects
public/models/      3D player model (Mixamo X Bot, embedded glTF)
prototype/          the original single-file version, kept for reference
scripts/            artifact packaging and smoke test
```

## Roadmap

| Phase | Goal |
|---|---|
| 0. Foundation | Vite project, current Three.js, code split into modules, asset pipeline |
| 1. Controls | Reliable shot playing, ball landing marker, swipe controls, front/back foot, full shot set, nets tutorial |
| 2. Realistic players | Character models with faces, motion-captured cricket animations |
| 3. Broadcast | Multiple TV cameras, replays, Hawk-Eye and DRS, UltraEdge, wagon wheel, pitch map |
| 4. Commentary | Spoken commentary, crowd and stump-mic audio |
| 5. Full matches | Toss, two innings, T20/ODI, team selection, field editor, conditions |
| 6. Tournaments and career | Leagues, stats, career mode, saved progress |
| 7. Multiplayer and release | Online play, public website, mobile apps |

All teams and players are fictional.

## Credits

Player model: X Bot by Mixamo (Adobe), used under Mixamo's terms for use in projects. Built with [Three.js](https://threejs.org).
