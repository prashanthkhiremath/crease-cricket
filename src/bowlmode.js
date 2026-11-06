// bowlmode.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { $, DTYPES, KIT_OPP, KIT_YOU, clamp, gauss, lengthName, lineName } from './config.js';
import { Snd } from './audio.js';
import { camera, canvas, scene } from './scene.js';
import { BR, NR, SR, fielders } from './players.js';
import { M, curBowler, game } from './match.js';
import { startRunup } from './bowling.js';

// ---- bowling controls
const aimMarker=new THREE.Group();
{ const mm=new THREE.MeshBasicMaterial({color:0xff2d55,transparent:true,opacity:.95,depthWrite:false,toneMapped:false});
  const fill=new THREE.Mesh(new THREE.CircleGeometry(.3,32),new THREE.MeshBasicMaterial({color:0xff2d55,transparent:true,opacity:.28,depthWrite:false,toneMapped:false})); fill.rotation.x=-Math.PI/2; aimMarker.add(fill);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.26,.34,40),mm); ring.rotation.x=-Math.PI/2; aimMarker.add(ring);
  const wm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthWrite:false,toneMapped:false});
  for(const r of [0,Math.PI/2]){ const bar=new THREE.Mesh(new THREE.PlaneGeometry(.62,.04),wm); bar.rotation.x=-Math.PI/2; bar.rotation.z=r; bar.position.y=.002; aimMarker.add(bar); }
  aimMarker.visible=false; scene.add(aimMarker); }
function meterPos(){ return .5-.5*Math.cos(game.t*7.2); }
function meterErr(){ return Math.abs(meterPos()-.5)*2; }
function updateAimInfo(){ if(!M||M.role!=='bowl') return; const b=curBowler(); $('kmh').textContent=String(b.base); $('dtype').textContent=`${lengthName(game.aim.len)} · ${lineName(game.aim.x)}`; $('speed').classList.add('show'); }
function nudgeAim(dx,dl){ if(game.phase!=='aim') return; game.aim.x=clamp(game.aim.x+dx,-1.3,1.3); game.aim.len=clamp(game.aim.len+dl,.6,12.5); updateAimInfo(); }
function pickType(i){ const b=curBowler(), list=DTYPES[b.type==='pace'?'pace':b.style]; if(i<list.length&&game.phase==='aim'){ game.dti=i; buildTypeButtons(); } }
function buildTypeButtons(){ const b=curBowler(), list=DTYPES[b.type==='pace'?'pace':b.style]; if(game.dti>=list.length) game.dti=0;
  const box=$('dtypes'); box.innerHTML=''; list.forEach((n,i)=>{ const el=document.createElement('button'); el.type='button'; el.className='btn dt'+(i===game.dti?' sel':''); el.id='dt'+i; el.innerHTML=`${n}<kbd>${i+1}</kbd>`; el.addEventListener('pointerdown',e=>{e.preventDefault(); Snd.init(); pickType(i);}); box.appendChild(el); }); }
function bowlPress(){
  if(!M||M.role!=='bowl') return;
  if(game.phase==='aim'){ game.meter={locked:false,err:null}; $('meterlbl').textContent='PRESS AGAIN IN THE GREEN TO RELEASE'; startRunup(); return; }
  if(game.phase==='runup'&&game.meter&&!game.meter.locked){ game.meter.locked=true; game.meter.err=meterErr(); $('meterlbl').textContent=game.meter.err<.15?'PERFECT':game.meter.err<.45?'GOOD':'LOOSE'; }
}
{ const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
  const aimAt=e=>{ if(!M||M.role!=='bowl'||game.phase!=='aim') return; const r=canvas.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1)); ray.setFromCamera(ndc,camera); if(ray.ray.intersectPlane(plane,hit)){ game.aim.x=clamp(hit.x,-1.3,1.3); game.aim.len=clamp(-hit.z,.6,12.5); updateAimInfo(); } };
  canvas.addEventListener('pointerdown',aimAt); canvas.addEventListener('pointermove',e=>{ if(e.buttons) aimAt(e); }); }
function aiPlan(d){
  const at=d.atContact; if(!at) return {leave:true};
  const x=at.x, y=at.y, len=d.len, left=M.mode.overs*6-M.balls, need=M.target-M.runs, rr=need/Math.max(1,left)*6;
  let q=.12;
  if(len<1.9) q+=.45; else if(len>9.4) q+=.22; else if(len>4.4&&len<7.4) q+=.25; else if(len<.9) q-=.1;
  if(x>-.02&&x<.35) q+=.18; if(x<-.2) q-=.2; if(x>.6) q-=.08;
  if(/Slower|Googly|Carrom|Arm/.test(d.name)) q+=.15;
  q+=Math.min(.15,Math.abs(d.swing)*.04+Math.abs(d.dev)*.05)-(d.userErr||0)*.25;
  q=clamp(q,0,1);
  if(x>.95||x<-.62||y>1.8||(x>.7&&Math.random()<.65)) return {leave:true};
  const agg=clamp((rr-6)/8,0,1)*.7+.15;
  const block=(len<1.9||q>.65)&&Math.random()<.55*(1-agg);
  const dir=block?'block':(len>9&&Math.random()<.7)?'leg':x>.28?'off':x<-.05?'leg':(Math.random()<.5?'straight':'auto');
  const loft=!block&&Math.random()<agg*(1.1-q);
  const sk={easy:1.6,normal:1.15,hard:.85}[game.diff];
  let err=gauss()*(.025+q*.085)*sk; if(/Slower/.test(d.name)) err-=.045*sk;
  return {dir,loft,pressT:d.tContact+err};
}
function recolor(r,k){ const S=r.skin; if(!S) return; if(S.kit){ S.kit.shirt.color.set(k.shirt); S.kit.pants.color.set(k.pants); } else if(S.cols){ S.cols[1].set(k.shirt); if(r.o.longSleeve) S.cols[2].set(k.shirt); S.cols[4].set(k.pants); } if(S.capMat) S.capMat.color.set(k.cap); }
function applyKits(){ if(!M) return; const bat=M.role==='bowl'?KIT_OPP:KIT_YOU, fld=M.role==='bowl'?KIT_YOU:KIT_OPP; recolor(SR,bat); recolor(NR,bat); recolor(BR,fld); fielders.forEach((f,i)=>{ if(i>0) recolor(f.rig,fld); }); }

export { aimMarker, meterPos, meterErr, updateAimInfo, nudgeAim, pickType, buildTypeButtons, bowlPress, aiPlan, recolor, applyKits };
