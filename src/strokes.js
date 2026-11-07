// strokes.js — batting stroke animation.
// Each stroke is three key poses of the bat (backlift → contact → follow-through) plus footwork.
// a = arm swing about the shoulders, w = wrist cock, tilt = swing plane (0 vertical, + towards a
// horizontal leg-side swing, - a horizontal off-side swing), piv = height of the swing pivot.
import { clamp, lerp, smooth } from './config.js';

const BACKLIFT = { a: -1.05, w: -1.25 };
const STROKES = {
  drive:   { back: [-1.1, -1.3], hit: [.1, -.05], follow: [2.05, 1.85], tilt: [0, 0, 0], piv: 1.18, legs: 'front', yawK: .75 },
  loft:    { back: [-1.25, -1.4], hit: [.15, 0], follow: [2.55, 2.05], tilt: [0, 0, .1], piv: 1.2, legs: 'front', yawK: .75 },
  backpunch: { back: [-1.0, -1.2], hit: [.18, .05], follow: [1.35, .95], tilt: [0, .15, .2], piv: 1.24, legs: 'backdef', yawK: .7 },
  cut:     { back: [-1.3, -1.35], hit: [.32, .1], follow: [1.7, 1.15], tilt: [-.3, -1.05, -1.1], piv: 1.22, legs: 'cut', yawK: .45 },
  pull:    { back: [-1.2, -1.2], hit: [.38, .12], follow: [2.05, 1.3], tilt: [.3, 1.2, 1.25], piv: 1.24, legs: 'pull', yawK: .4 },
  flick:   { back: [-.95, -1.15], hit: [.16, .25], follow: [1.15, 1.55], tilt: [0, .2, .35], piv: 1.18, legs: 'front', yawK: .6 },
  sweep:   { back: [-1.15, -1.2], hit: [.42, .1], follow: [1.6, 1.0], tilt: [.4, 1.25, 1.3], piv: .86, legs: 'sweep', yawK: .35 },
  defend:  { back: [-.95, -1.1], hit: [.32, -.32], follow: [.34, -.34], tilt: [0, 0, 0], piv: 1.16, legs: 'front', yawK: .25, hold: true },
  backdef: { back: [-.9, -1.05], hit: [.36, -.28], follow: [.38, -.3], tilt: [0, 0, 0], piv: 1.25, legs: 'backdef', yawK: .25, hold: true },
};
const FOLLOW_TIME = .42;

// Pick the stroke for a shot direction, the ball's length and the bowler type.
function chooseStroke(dir, loft, d) {
  const len = d ? d.len : 6, short = len > 8.5, spin = d && d.bowler.type === 'spin', full = len < 4.6;
  const x = d && d.atContact ? d.atContact.x : .1;
  switch (dir) {
    case 'block': return short ? 'backdef' : 'defend';
    case 'cut': return 'cut';
    case 'off': return short ? (x > .3 ? 'cut' : 'backpunch') : loft ? 'loft' : 'drive';
    case 'leg': return short ? 'pull' : spin && full && !loft ? 'sweep' : loft ? 'loft' : 'flick';
    case 'glance': return short ? 'pull' : spin && full ? 'sweep' : 'flick';
    case 'straight': case 'offdrive': case 'ondrive': return short && !spin ? 'backpunch' : loft ? 'loft' : 'drive';
    default: // auto: read the line and length
      if (short) return x > .35 ? 'cut' : x < 0 ? 'pull' : 'backpunch';
      if (x < -.05) return 'flick';
      return loft ? 'loft' : 'drive';
  }
}

// Bat parameters for a stroke at time t after the shot was pressed; contactT is when the bat meets the ball.
function strokeBat(kind, t, contactT, yawShot) {
  const S = STROKES[kind] || STROKES.drive;
  let a, w, tilt;
  if (t < contactT) {                               // downswing accelerates into the ball
    const q = Math.pow(clamp(t / contactT, 0, 1), 1.6);
    a = lerp(S.back[0], S.hit[0], q); w = lerp(S.back[1], S.hit[1], q); tilt = lerp(S.tilt[0], S.tilt[1], q);
  } else {
    const q = S.hold ? 0 : smooth((t - contactT) / FOLLOW_TIME);
    a = lerp(S.hit[0], S.follow[0], q); w = lerp(S.hit[1], S.follow[1], q); tilt = lerp(S.tilt[1], S.tilt[2], q);
  }
  return { a, w, tilt, piv: S.piv, yaw: yawShot * S.yawK, legs: S.legs, legsU: clamp(t / Math.max(.12, contactT), 0, 1) };   // feet are set by the time the bat arrives
}
function backliftFor(kind) { const S = STROKES[kind]; return S ? { a: S.back[0], w: S.back[1], tilt: S.tilt[0], piv: S.piv } : { ...BACKLIFT, tilt: 0, piv: 1.18 }; }

export { STROKES, BACKLIFT, chooseStroke, strokeBat, backliftFor };
