// batgear.js — batting equipment: bat, gloves (mounted on the handle) and helmet.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTex, mat } from './scene.js';

// Handle runs along +y of the bat's "wrist" frame; the blade face points +x (towards the bowler at contact)
// and the back of the blade (the spine) points -x.
const HANDLE_TOP = .15, HANDLE_BOT = -.15, BLADE_LEN = .56;
const GRIP_TOP = .085, GRIP_BOT = -.015;          // glove centres on the handle (top hand above bottom hand)

function tube(points, r, m, segs = 24) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segs, r, 6, false), m);
}

function buildBat(wrist) {
  const willow = mat(0xe7d09c, { roughness: .5 }), edge = mat(0xd9be84, { roughness: .55 });
  const gripM = mat(0x1d3d2c, { roughness: .9 }), tape = mat(0x111111, { roughness: .6 });
  // handle with a ribbed rubber grip
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.0165, .0175, HANDLE_TOP - HANDLE_BOT, 12), gripM);
  handle.position.y = (HANDLE_TOP + HANDLE_BOT) / 2; wrist.add(handle);
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.0175, .0018, 4, 14), gripM); r.rotation.x = Math.PI / 2; r.position.y = HANDLE_BOT + .03 + i * .03; wrist.add(r); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .012, 12), tape); cap.position.y = HANDLE_TOP; wrist.add(cap);
  // blade: flat face, thick spine at the back, rounded toe, sloping shoulders
  const top = HANDLE_BOT, bladeY = top - BLADE_LEN / 2;
  const face = new THREE.Mesh(new RoundedBoxGeometry(.03, BLADE_LEN, .108, 3, .008), willow); face.position.set(.006, bladeY, 0); face.castShadow = true; wrist.add(face);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.032, .026, BLADE_LEN * .82, 14, 1, false, Math.PI, Math.PI), edge);
  spine.scale.set(1.1, 1, 1.45); spine.position.set(-.006, bladeY - .02, 0); spine.castShadow = true; wrist.add(spine);
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(.02, .054, .05, 14), willow); shoulders.scale.set(.6, 1, 1); shoulders.position.set(0, top - .02, 0); wrist.add(shoulders);
  const splice = new THREE.Mesh(new THREE.BoxGeometry(.004, .07, .02), tape); splice.position.set(.022, top - .035, 0); wrist.add(splice);
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(.1, .2), new THREE.MeshStandardMaterial({ map: batSticker(), transparent: true, roughness: .5 }));
  sticker.rotation.y = Math.PI / 2; sticker.position.set(.022, top - .17, 0); wrist.add(sticker);
}
let _sticker = null;
function batSticker() {
  if (_sticker) return _sticker;
  _sticker = canvasTex(128, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#16295a'; x.fillRect(8, 30, w - 16, h - 60);
    x.fillStyle = '#ffc23d'; x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2);
    x.font = '800 44px "Saira Condensed","Arial Narrow",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CREASE', 0, 2); x.restore();
  });
  return _sticker;
}

// A padded batting glove wrapped around the handle at height y. The back of the hand faces `side`
// (-z: towards the batter's body, where the forearm comes from). Returns the glove and its wrist anchor.
function buildGlove(wrist, y, team) {
  const g = new THREE.Group(); g.position.y = y; wrist.add(g);
  const white = mat(0xf4f3ee, { roughness: .7 }), trim = mat(team, { roughness: .6 }), palm = mat(0xdedcd2, { roughness: .9 });
  // finger rolls curl around the handle (open side towards the back of the hand)
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.0285, .0115, 8, 16, Math.PI * 1.45), i === 0 ? trim : white);
    const holder = new THREE.Group(); holder.rotation.y = Math.PI / 4 + Math.PI * .03; ring.rotation.x = Math.PI / 2;
    holder.position.y = .033 - i * .022; holder.add(ring); g.add(holder);
  }
  const back = new THREE.Mesh(new RoundedBoxGeometry(.09, .1, .05, 3, .018), white); back.position.set(-.004, 0, -.042); g.add(back);
  const stripe = new THREE.Mesh(new RoundedBoxGeometry(.018, .102, .052, 2, .006), trim); stripe.position.set(.026, 0, -.043); g.add(stripe);
  const thumb = new THREE.Mesh(new RoundedBoxGeometry(.026, .07, .026, 2, .011), white); thumb.position.set(.03, .028, .012); thumb.rotation.set(.2, 0, -.55); g.add(thumb);
  const palmPad = new THREE.Mesh(new RoundedBoxGeometry(.05, .085, .02, 2, .008), palm); palmPad.position.set(-.024, 0, -.012); g.add(palmPad);
  const cuff = new THREE.Mesh(new RoundedBoxGeometry(.085, .06, .055, 3, .02), trim); cuff.position.set(-.004, 0, -.088); g.add(cuff);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const anchor = new THREE.Object3D(); anchor.position.set(-.004, 0, -.11); g.add(anchor);   // where the forearm meets the cuff
  return { glove: g, anchor };
}

// Cricket helmet sized to a head: dims = {r: shell radius}. Origin is the centre of the shell sphere.
function buildHelmet(dims, color) {
  const r = dims.r, g = new THREE.Group();
  const shellM = new THREE.MeshPhysicalMaterial({ color, roughness: .32, metalness: .05, clearcoat: .8, clearcoatRoughness: .2 });
  const steel = mat(0xc4c8cf, { metalness: .85, roughness: .28 }), dark = mat(0x15171c, { roughness: .7 });
  // shell, slightly longer front to back, with a flared neck guard at the back
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20, 0, Math.PI * 2, 0, Math.PI * .58), shellM); shell.scale.set(1, .98, 1.12); g.add(shell);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.1, .06, 24, 1, true, Math.PI * .62, Math.PI * .76), shellM);
  guard.scale.set(1, 1, 1.12); guard.position.y = -.045; g.add(guard);
  // peak: a curved sector over the eyes, tilted down
  const peak = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.32, .008, 32, 1, false, -Math.PI * .36, Math.PI * .72), shellM);
  peak.scale.set(1, 1, 1.15); peak.position.set(0, -.008, .004); peak.rotation.x = .14; g.add(peak);
  // ear flaps down to the jaw
  for (const s of [1, -1]) {
    const flap = new THREE.Mesh(new RoundedBoxGeometry(.016, .1, .1, 2, .007), shellM);
    flap.position.set(s * r * .98, -.07, .012); flap.rotation.z = s * .06; g.add(flap);
    for (const hy of [-.045, -.09]) { const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .006, 8), steel); bolt.rotation.z = Math.PI / 2; bolt.position.set(s * (r * .98 + .009), hy, .045); g.add(bolt); }
  }
  // grille: horizontal bars around the face, joined by vertical bars
  const R = r * 1.12, bar = (y, rr, span) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const a = -span + 2 * span * i / 12; pts.push(new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr * 1.08)); }
    return tube(pts, .0045, steel);
  };
  g.add(bar(-.042, R, 1.15), bar(-.085, R * .98, 1.1), bar(-.128, R * .86, .95));
  for (const a of [-.42, 0, .42]) {
    const pts = [[-.042, R], [-.085, R * .98], [-.128, R * .86]].map(([y, rr]) => new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr * 1.08));
    g.add(tube(pts, .0042, steel, 8));
  }
  // chin strap
  const strap = []; for (let i = 0; i <= 10; i++) { const a = -1.4 + 2.8 * i / 10; strap.push(new THREE.Vector3(Math.sin(a) * r * .9, -.13 - .035 * Math.cos(a), Math.cos(a) * r * .55)); }
  g.add(tube(strap, .006, dark, 16));
  // badge on the front
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.022, 20), new THREE.MeshStandardMaterial({ map: helmetBadge(), roughness: .4 }));
  badge.position.set(0, .045, r * 1.1); badge.rotation.x = -.35; g.add(badge);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
let _badge = null;
function helmetBadge() {
  if (_badge) return _badge;
  _badge = canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = '#ffc23d'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill();
    x.fillStyle = '#0d1b3d'; x.beginPath(); x.arc(32, 32, 25, 0, 7); x.fill();
    x.fillStyle = '#ffc23d'; x.font = '800 30px "Saira Condensed",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('XI', 32, 34);
  });
  return _badge;
}

export { buildBat, buildGlove, buildHelmet, GRIP_TOP, GRIP_BOT };
