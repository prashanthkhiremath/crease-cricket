// Smoke test: serves dist/, plays a few balls in bat mode and bowl mode, fails on any page error.
// Usage: npm run build && npm run smoke   (needs Playwright with Chromium installed)
// Options: SHOTS=dir to save screenshots, BALLS=n balls per mode (default 3).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const BALLS = +(process.env.BALLS || 3);
const SHOTS = process.env.SHOTS;

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

async function playMode(browser, url, role) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
  await page.click(role === 'bowl' ? '#r1' : '#r0');
  await page.click('#play');
  // simple autoplayer: bats with near-perfect timing, or bowls with a centred release
  await page.evaluate((role) => {
    const G = window.__game; let i = 0;
    setInterval(() => {
      const g = G.game;
      if (role === 'bat') {
        if (g.phase === 'delivery' && g.del && !g.del.pressed && g.t >= g.del.tContact - 0.025) { g.del.pressed = 1; G.shot(++i % 2 === 0); }
        if (g.phase === 'live' && g.live && !g.live.inProg && g.live.runs < 1 && g.live.boundaryT === undefined && g.live.tRet > g.live.t + 3.2) G.callRun();
      } else {
        const key = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        if (g.phase === 'aim' && g.t > 0.3) key();
        if (g.phase === 'runup' && g.meter && !g.meter.locked && Math.abs(Math.cos(g.t * 7.2)) < 0.15) key();
      }
    }, 8);
  }, role);
  const t0 = Date.now(); let st = null;
  while (Date.now() - t0 < 60000 * BALLS) {
    st = await page.evaluate(() => { const M = window.__game.M; return M ? { balls: M.balls + M.overLog.filter((s) => /Wd|Nb/.test(s)).length, phase: window.__game.game.phase, score: `${M.runs}/${M.wkts}` } : null; });
    if (st && (st.balls >= BALLS || st.phase === 'result')) break;
    await page.waitForTimeout(500);
  }
  console.log(`${role}: ${st ? `${st.balls} ball(s) bowled, score ${st.score}, phase ${st.phase}` : 'match did not start'}`);
  const skinned = await page.evaluate(() => !!window.__game.SKIN.src);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${role}.png`) }); }
  await page.close();
  return { errors, skinned };
}

server.listen(0, async () => {
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
  let failed = false;
  for (const role of ['bat', 'bowl']) {
    const r = await playMode(browser, url, role);
    if (!r.skinned) { console.log(`${role}: player models did not load`); failed = true; }
    if (r.errors.length) { console.log(`${role} errors:\n  ` + r.errors.join('\n  ')); failed = true; }
  }
  await browser.close(); server.close();
  console.log(failed ? 'SMOKE FAILED' : 'SMOKE OK');
  process.exit(failed ? 1 : 0);
});
