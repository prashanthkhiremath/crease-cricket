// match.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { $, BATTERS, BOWLERS, FIELD_PACE, FIELD_SPIN, MODES, OPP_BATTERS, PITCH, YOUR_BOWLERS, rand } from './config.js';
import { resetStumps, stumpsFar, stumpsNear } from './scene.js';
import { NR, SR, ball, bowler, bshadow, clearTrail, fielders, nonStriker, setBatAngles, signal, striker, trackLine } from './players.js';
import { updateHUD } from './scoring.js';
import { comm } from './hud.js';
import { syncDirBtns } from './input.js';
import { hideLanding } from './assist.js';
import { applyKits, buildTypeButtons, updateAimInfo } from './bowlmode.js';

// ================= game state =================
const game={phase:'menu',t:0,mode:MODES[0],modeIdx:0,diff:'normal',role:'bat',camMode:'close',shake:0,speed:'real',marker:true,preDel:null,aim:{x:.18,len:6.2},dti:0,meter:null};
let M=null;
 // match
const input={dir:'auto',pressT:null,loft:false,charge:false};
const tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
function newMatch(){
  const mode=MODES[game.modeIdx];
  const bowlRole=game.role==='bowl';
  M={mode, role:game.role, target:Math.round(rand(mode.tgt[0],mode.tgt[1])), runs:0, wkts:0, balls:0, extras:0,
     batters:(bowlRole?OPP_BATTERS:BATTERS).map(n=>({n,r:0,b:0,f4:0,f6:0,out:null})), s:0, ns:1, next:2,
     bowlers:(bowlRole?YOUR_BOWLERS:BOWLERS).map(b=>Object.assign({},b,{balls:0,runs:0,w:0})), bi:0, overLog:[], freeHit:false, over:0, done:false, resetOver:false};
  M.oppText=bowlRole?`Your XI ${M.target-1}/${Math.floor(rand(4,8))}`:`Opposition XI ${M.target-1}/${Math.floor(rand(4,8))}`;
  $('menu').hidden=true; $('result').hidden=true; $('hud').hidden=false;
  document.querySelector('.s-team').textContent=bowlRole?'OPP XI':'YOUR XI';
  $('batctl').hidden=bowlRole; $('bowlctl').hidden=!bowlRole;
  applyKits(); setField(); nextBall(true);
  if(mode.nets){ comm(bowlRole?'Nets session. Bowl as many balls as you like.':'Nets session. Face as many balls as you like: try every shot.'); return; }
  comm(bowlRole?`${M.oppText} in ${mode.overs} overs. Defend ${M.target-1}: the Opposition XI need ${M.target} to win.`:`${M.oppText} in ${mode.overs} overs. You need ${M.target} to win.`);
}
const curBowler=()=>M.bowlers[M.bi];
function setField(){
  const def=(M?curBowler():BOWLERS[0]).type==='spin'?FIELD_SPIN:FIELD_PACE;
  fielders.forEach((f,i)=>{ f.def=def[i]; f.home.set(def[i].x,0,def[i].z); f.m.position.copy(f.home); f.m.lookAt(0,0,-PITCH/2); });
}
function nextBall(first){
  if(M.resetOver){ M.overLog=[]; M.resetOver=false; }
  game.phase=M.role==='bowl'?'aim':'ready'; game.t=first?-.6:0;
  $('meter').hidden=M.role!=='bowl';
  if(M.role==='bowl'){ buildTypeButtons(); game.meter=null; $('meter').hidden=false; $('needle').style.left='0%'; $('meterlbl').textContent='AIM, THEN PRESS BOWL'; updateAimInfo(); }
  hideLanding(); game.preDel=null; $('tbar').hidden=true; $('shotsel').textContent='';
  game.stroke=null;
  input.dir='auto'; input.pressT=null; input.loft=false; input.charge=false; syncDirBtns();
  ball.visible=false; bshadow.visible=false; clearTrail(); trackLine.visible=false;
  resetStumps(stumpsNear); resetStumps(stumpsFar);
  striker.position.set(-.38,0,-1.05); striker.rotation.set(0,Math.PI/2,0);
  nonStriker.position.set(-1.1,0,-PITCH-.9); nonStriker.rotation.set(0,0,0);
  setBatAngles(SR,-.2,-.4,0,0); setBatAngles(NR,.35,.15,0,0); signal(null);
  bowler.position.set(.9,0,-PITCH-11); bowler.rotation.set(0,0,0);
  fielders.forEach(f=>{ f.m.position.copy(f.home); f.m.lookAt(0,0,-PITCH/2); f.m.rotation.z=0; });
  bowler.rotation.set(0,0,0);
  $('drs').hidden=true; $('freehit').hidden=!M.freeHit; $('speed').classList.remove('show');
  $('b-run').classList.remove('hot');
  updateHUD();
}

export { game, M, input, tmp, tmp2, newMatch, curBowler, setField, nextBall };
