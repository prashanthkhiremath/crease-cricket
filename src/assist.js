// assist.js — batting aids: pitch marker, eight-way shot direction, shot names, timing bar.
import * as THREE from 'three';
import { $, clamp, rand } from './config.js';
import { scene } from './scene.js';

// ---- direction: base angle of each shot (degrees; + is the off side, 0 is straight back past the bowler)
const SHOT_ANGLE = { straight: 4, offdrive: 25, off: 60, cut: 100, ondrive: -25, leg: -60, glance: -125, block: 0 };

// held arrow/WASD keys -> direction (diagonals give drives, cuts and glances)
const held = new Set();
const KEYMAP = { arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r' };
function keyDir() {
  const u = held.has('u'), dn = held.has('d'), l = held.has('l'), r = held.has('r');
  if (u && l) return 'offdrive'; if (u && r) return 'ondrive';
  if (dn && l) return 'cut'; if (dn && r) return 'glance';
  if (u) return 'straight'; if (l) return 'off'; if (r) return 'leg'; if (dn) return 'block';
  return null;
}
function trackKey(k, down) { const m = KEYMAP[k]; if (!m) return false; if (down) held.add(m); else held.delete(m); return true; }
window.addEventListener('blur', () => held.clear());

// ---- shot naming
function shotName(dir, d, loft, spin) {
  const len = d ? d.len : 6, short = len > 8.5, full = len < 4.4;
  let n;
  switch (dir) {
    case 'block': return short ? 'Back-foot defence' : 'Forward defence';
    case 'straight': n = short ? 'Back-foot drive' : 'Straight drive'; break;
    case 'offdrive': n = 'Off drive'; break;
    case 'off': n = short ? 'Back-foot punch' : 'Cover drive'; break;
    case 'cut': n = short ? 'Square cut' : 'Late cut'; break;
    case 'ondrive': n = 'On drive'; break;
    case 'leg': n = short ? 'Pull' : spin && full ? 'Sweep' : 'Flick'; break;
    case 'glance': n = short ? 'Hook' : spin ? 'Paddle sweep' : 'Leg glance'; break;
    default: n = 'Shot';
  }
  if (loft && !/Pull|Hook|Sweep|defence/.test(n)) n = 'Lofted ' + n.toLowerCase();
  return n;
}

// ---- pitch marker: where the next ball will bounce, shown during the run-up
const landing = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(.34, .46, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(.34, 40), new THREE.MeshBasicMaterial({ color: 0x2a7bf0, transparent: true, opacity: .8, depthWrite: false, toneMapped: false }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2; fill.position.y = -.001;
  landing.add(fill, ring); landing.visible = false; scene.add(landing);
}
function showLanding(d, accuracy) { // accuracy: 0 exact, larger = more jitter
  if (!d || !d.bounce) return;
  landing.position.set(d.bounce.x + rand(-1, 1) * accuracy, .016, d.bounce.z + rand(-1, 1) * accuracy * 2.5);
  landing.userData.until = d.bounce.t; landing.visible = true; landing.scale.setScalar(1);
}
function updateLanding(phase, t) {
  if (!landing.visible) return;
  if (phase === 'delivery') {
    const left = landing.userData.until - t;
    if (left < -0.15) landing.visible = false; else landing.scale.setScalar(1 + Math.max(0, left) * .6);
  } else if (phase !== 'runup') landing.visible = false;
}
function hideLanding() { landing.visible = false; }

// ---- timing bar shown after a shot: needle left = early, right = late
let tbTO = null;
function showTimingBar(diff, W) {
  const el = $('tbar'); if (!el) return;
  const pos = clamp(.5 + diff / (2 * W.E * 1.25), 0, 1);
  el.querySelector('.tn').style.left = (pos * 100) + '%';
  const g = W.G / (W.E * 1.25) * 100, p = W.P / (W.E * 1.25) * 100;
  el.querySelector('.tg').style.cssText = `left:${50 - g / 2}%;width:${g}%`;
  el.querySelector('.tp').style.cssText = `left:${50 - p / 2}%;width:${p}%`;
  el.hidden = false; clearTimeout(tbTO); tbTO = setTimeout(() => { el.hidden = true; }, 2200);
}

// ---- timing meter: the needle reaches the centre of the green exactly when the ball reaches the bat
function updateMeter(game, M, W) {
  const el = $('tmeter'); if (!el) return;
  const d = game.del, on = game.marker && M && M.role === 'bat' && game.phase === 'delivery' && d && !d.resolved;
  if (!on) { if (!el.hidden && (!d || game.phase !== 'delivery' || d.resolved)) { el.dataset.off = (+(el.dataset.off || 0) + 1); if (+el.dataset.off > 30) el.hidden = true; } return; }
  el.dataset.off = 0;
  const span = d.tContact + W.E;                 // bar covers release .. last chance to hit
  const at = v => clamp(v / span, 0, 1) * 100;
  el.querySelector('.tz').style.cssText = `left:${at(d.tContact - W.G)}%;width:${at(d.tContact + W.G) - at(d.tContact - W.G)}%`;
  el.querySelector('.tzp').style.cssText = `left:${at(d.tContact - W.P)}%;width:${at(d.tContact + W.P) - at(d.tContact - W.P)}%`;
  el.querySelector('.tn2').style.left = at(game.t) + '%';
  el.hidden = false;
}

export { updateMeter, SHOT_ANGLE, keyDir, trackKey, shotName, showLanding, updateLanding, hideLanding, showTimingBar };
