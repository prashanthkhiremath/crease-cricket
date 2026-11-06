// camera.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { FC } from './config.js';
import { camera } from './scene.js';
import { ball } from './players.js';
import { game, tmp, tmp2 } from './match.js';

// ================= camera =================
const camPos=new THREE.Vector3(0,30,-90), camLook=new THREE.Vector3(0,0,-10);
const BOWL_CAM={p:new THREE.Vector3(0,8.4,-60),l:new THREE.Vector3(0,.95,-2.2)};
function updateCamera(dt){
  if(window.__cam){ if(window.__cam.f){camera.fov=window.__cam.f;camera.updateProjectionMatrix();} camera.position.set(...window.__cam.p); camera.lookAt(...window.__cam.l); return; }
  let p, l, k=1-Math.pow(.02,dt);
  if(game.phase==='menu'||game.phase==='result'){
    const a=performance.now()*.00005; p=tmp.set(FC.x+Math.cos(a)*85,32,FC.z+Math.sin(a)*85); l=tmp2.set(0,0,-10); k=1-Math.pow(.3,dt);
  } else if(game.phase==='live'||(game.phase==='dead'&&game.live&&!game.live.fromMiss&&game.live.ended&&game.lastLive)){
    const b=ball.position; const dx=b.x-FC.x, dz=b.z-FC.z, dist=Math.hypot(dx,dz)||1;
    const toB=new THREE.Vector3(dx/dist,0,dz/dist);
    p=tmp.set(FC.x+toB.x*(dist*.45-28),16+Math.min(dist,60)*.18,FC.z+toB.z*(dist*.45-28));
    l=tmp2.copy(b).setY(b.y*.5); k=1-Math.pow(.08,dt);
  } else { p=BOWL_CAM.p; l=BOWL_CAM.l; }
  camPos.lerp(p,k); camLook.lerp(l,k);
  camera.position.copy(camPos); camera.lookAt(camLook);
}

export { camPos, camLook, BOWL_CAM, updateCamera };
