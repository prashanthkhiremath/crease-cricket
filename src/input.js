// input.js — generated from the prototype; edit freely.
import { $ } from './config.js';
import { keyDir, trackKey, shotName, hideLanding } from './assist.js';
import { Snd } from './audio.js';
import { setCommentary, stopCommentary } from './commentary.js';
import { M, game, input, newMatch } from './match.js';
import { charge, shot } from './batting.js';
import { callRun } from './fielding.js';
import { bowlPress, nudgeAim, pickType } from './bowlmode.js';

// ================= input =================
function setDir(d){ if(game.phase==='live'||game.phase==='dead'||game.phase==='menu'||game.phase==='result') return; if(input.pressT!==null) return; input.dir=input.dir===d?'auto':d; syncDirBtns(); }
function syncDirBtns(){ document.querySelectorAll('.dir').forEach(b=>b.classList.toggle('sel',b.dataset.dir===input.dir)); $('b-charge').classList.toggle('sel',input.charge); }
const press=(id,fn)=>{ const el=$(id); el.addEventListener('pointerdown',e=>{e.preventDefault(); Snd.init(); fn();}); el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fn();}}); };
document.querySelectorAll('.dir').forEach(b=>press(b.id,()=>setDir(b.dataset.dir)));
press('b-hit',()=>shot(false));
 press('b-loft',()=>shot(true));
 press('b-run',callRun);
 press('b-charge',charge);
window.addEventListener('keyup',e=>{ if(trackKey(e.key.toLowerCase(),false)) showHeld(); });
function showHeld(){ if(!M||M.role!=='bat') return; const kd=keyDir(); const d=game.preDel||game.del; $('shotsel').textContent=kd&&input.pressT===null?shotName(kd,d,false,d&&d.bowler.type==='spin'):''; }
$('mute').addEventListener('click',()=>{ Snd.init(); Snd.on=!Snd.on; $('mute').textContent=Snd.on?'Sound on':'Sound off'; setCommentary(Snd.on&&document.getElementById('vc0').classList.contains('sel')); if(Snd.master) Snd.master.gain.value=Snd.on?.8:0; });
window.addEventListener('keydown',e=>{
  if(game.phase==='menu'||game.phase==='result'){ if(e.key==='Enter'&&document.activeElement.tagName!=='BUTTON'){ Snd.init(); newMatch(); } return; }
  const k=e.key.toLowerCase(); let used=true;
  if(k==='v'){ game.camMode=game.camMode==='broadcast'?'close':'broadcast'; document.querySelectorAll('#voices .opt').forEach(b=>b.addEventListener('click',()=>{ setCommentary(b.dataset.voice==='on'); document.querySelectorAll('#voices .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
document.querySelectorAll('#cams .opt').forEach(x=>x.classList.toggle('sel',x.dataset.cam===game.camMode)); e.preventDefault(); return; }
  if(M&&M.role==='bowl'){
    if(k==='arrowleft'||k==='a') nudgeAim(.06,0); else if(k==='arrowright'||k==='d') nudgeAim(-.06,0);
    else if(k==='arrowup'||k==='w') nudgeAim(0,-.3); else if(k==='arrowdown'||k==='s') nudgeAim(0,.3);
    else if(k===' '||k==='enter') bowlPress(); else if(/^[1-5]$/.test(k)) pickType(+k-1); else used=false;
    if(used){ e.preventDefault(); Snd.init(); } return;
  }
  if(trackKey(k,true)){ showHeld(); }
  else if(k===' '||k==='j') shot(false); else if(k==='l'||k==='k'||k==='shift') shot(true);
  else if(k==='r') callRun(); else if(k==='c') charge(); else used=false;
  if(used){ e.preventDefault(); Snd.init(); }
});
document.querySelectorAll('#roles .opt').forEach(b=>b.addEventListener('click',()=>{ game.role=b.dataset.role; document.querySelectorAll('#roles .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
press('b-bowl',()=>bowlPress());
document.querySelectorAll('#modes .opt').forEach(b=>b.addEventListener('click',()=>{ game.modeIdx=+b.dataset.mode; document.querySelectorAll('#modes .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
document.querySelectorAll('#speeds .opt').forEach(b=>b.addEventListener('click',()=>{ game.speed=b.dataset.speed; document.querySelectorAll('#speeds .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
document.querySelectorAll('#cams .opt').forEach(b=>b.addEventListener('click',()=>{ game.camMode=b.dataset.cam; document.querySelectorAll('#cams .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
document.querySelectorAll('#markers .opt').forEach(b=>b.addEventListener('click',()=>{ game.marker=b.dataset.marker==='on'; document.querySelectorAll('#markers .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
document.querySelectorAll('#diffs .opt').forEach(b=>b.addEventListener('click',()=>{ game.diff=b.dataset.diff; document.querySelectorAll('#diffs .opt').forEach(x=>x.classList.toggle('sel',x===b)); }));
$('play').addEventListener('click',()=>{ Snd.init(); newMatch(); });
$('again').addEventListener('click',()=>{ newMatch(); });
$('quit').addEventListener('click',()=>{ stopCommentary(); $('hud').hidden=true; $('menu').hidden=false; game.phase='menu'; hideLanding(); });
$('tomenu').addEventListener('click',()=>{ $('result').hidden=true; $('menu').hidden=false; game.phase='menu'; });

export { setDir, syncDirBtns, press };
