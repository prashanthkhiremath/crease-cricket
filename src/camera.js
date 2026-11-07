// camera.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { FC } from './config.js';
import { camera } from './scene.js';
import { ball } from './players.js';
import { game, tmp, tmp2 } from './match.js';

// ================= camera =================
const camPos=new THREE.Vector3(0,30,-90), camLook=new THREE.Vector3(0,0,-10);
const BOWL_CAM={p:new THREE.Vector3(0,8.4,-60),l:new THREE.Vector3(0,.95,-2.2)};
const CLOSE_CAM={p:new THREE.Vector3(0,3.1,-28),l:new THREE.Vector3(0,1.02,-1.4)};   // lower and nearer, like a batting view in a console game
const _shake=new THREE.Vector3(); let _lastMode='bat';
function updateCamera(dt){
  if(window.__cam){ if(window.__cam.f){camera.fov=window.__cam.f;camera.updateProjectionMatrix();} camera.position.set(...window.__cam.p); camera.lookAt(...window.__cam.l); return; }
  let p, l, k=1-Math.pow(.02,dt);
  if(game.phase==='menu'||game.phase==='result'){
    const a=performance.now()*.00005; p=tmp.set(FC.x+Math.cos(a)*85,32,FC.z+Math.sin(a)*85); l=tmp2.set(0,0,-10); k=1-Math.pow(.3,dt);
  } else if((game.phase==='live'||(game.phase==='dead'&&game.live&&game.live.ended&&game.lastLive))&&game.live&&game.live.t<.45){
    // hold the batting view for a moment so the stroke can be seen
    const C=game.camMode==='broadcast'?BOWL_CAM:CLOSE_CAM; p=C.p; l=C.l; k=1-Math.pow(.2,dt);
  } else if(game.phase==='live'||(game.phase==='dead'&&game.live&&!game.live.fromMiss&&game.live.ended&&game.lastLive)){
    // follow the ball from behind the batter, rising as it travels, looking out at the field
    const b=ball.position, dx=b.x, dz=b.z+1, dist=Math.max(8,Math.hypot(dx,dz)), ux=dx/dist, uz=dz/dist;
    p=tmp.set(b.x-ux*26, 15+Math.min(dist,70)*.1, b.z-uz*26);       // high behind the ball, like a TV chase camera
    l=tmp2.set(b.x+ux*6,Math.max(0,b.y*.5),b.z+uz*6); k=1-Math.pow(.05,dt);
  } else { const C=game.camMode==='broadcast'?BOWL_CAM:CLOSE_CAM; p=C.p; l=C.l; }
  // field of view: the close camera uses a wider lens; the ball-follow camera keeps the long lens
  const portrait=camera.aspect<1, close=game.camMode!=='broadcast'&&game.phase!=='live'&&!(game.phase==='dead'&&game.lastLive)&&game.phase!=='menu'&&game.phase!=='result';
  const fov=close?(portrait?34:23):(portrait?20:12.5);
  if(Math.abs(camera.fov-fov)>.01){ camera.fov+=(fov-camera.fov)*Math.min(1,k*1.5); camera.updateProjectionMatrix(); }
  // cut (rather than glide across the ground) when the shot changes between batting view and ball-follow view
  const mode=(game.phase==='live'||(game.phase==='dead'&&game.lastLive))&&game.live&&game.live.t>=.45?'follow':'bat';
  if(mode!==_lastMode&&game.phase!=='menu'&&game.phase!=='result'){ k=1; _lastMode=mode; }
  camPos.lerp(p,k); camLook.lerp(l,k);
  camera.position.copy(camPos);
  if(game.shake>0){ game.shake-=dt; const s=Math.max(0,game.shake)*.35; camera.position.add(_shake.set((Math.random()-.5)*s,(Math.random()-.5)*s,0)); }
  camera.lookAt(camLook);
}

export { camPos, camLook, BOWL_CAM, updateCamera };
