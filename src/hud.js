// hud.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { $, DIFF } from './config.js';
import { Snd } from './audio.js';
import { trackGeo, trackLine } from './players.js';
import { M, game } from './match.js';
import { oversStr } from './scoring.js';

// ================= messages =================
let flashTO=null, timingTO=null;
function flash(big,sub,cls,dur){ const f=$('flash'); f.className='show '+cls; $('fbig').textContent=big; $('fsub').textContent=sub; clearTimeout(flashTO); flashTO=setTimeout(()=>f.className='',dur*1000); }
function showTiming(txt,cls){ const e=$('timing'); e.textContent=txt; e.style.color=cls==='perfect'?'#34c777':cls==='good'?'#ffc23d':'#ff6b61'; e.classList.add('show'); clearTimeout(timingTO); timingTO=setTimeout(()=>e.classList.remove('show'),2000); }
function comm(t){ $('comm').textContent=t; }
function showDRS(outsideLeg,impact,hitting,out){
  const e=$('drs'); e.hidden=false;
  e.innerHTML=`<h4>BALL TRACKING</h4><div class="r"><span>Pitching</span><span class="${outsideLeg?'no':'ok'}">${outsideLeg?'Outside leg':'In line'}</span></div><div class="r"><span>Impact</span><span class="${impact==='In line'?'ok':'no'}">${impact}</span></div><div class="r"><span>Wickets</span><span class="${hitting?'ok':'no'}">${hitting?'Hitting':'Missing'}</span></div><div class="dec" style="color:${out?'#ff6b61':'#34c777'}">${out?'OUT':'NOT OUT'}</div>`;
  // projected path line
  const d=game.del, pts=[]; const s=d.path.s; const i0=Math.floor(d.bounce.t/d.path.dt);
  for(let i=i0;i<s.length;i+=4){ pts.push(new THREE.Vector3(s[i].x,s[i].y,s[i].z)); if(s[i].z>0.05) break; }
  trackGeo.setFromPoints(pts); trackLine.material.color.set(hitting?0xff4d4d:0x4dd28a); trackLine.visible=true;
}
// ================= result =================
function showResult(){
  game.phase='result'; $('hud').hidden=true; $('result').hidden=false;
  const left=M.mode.overs*6-M.balls, wl=M.mode.wkts-M.wkts;
  const h=$('r-h'), sub=$('r-sub');
  if(M.role==='bowl'){
    if(M.done==='win'){ h.textContent=`Opposition won by ${wl} wicket${wl===1?'':'s'}`; h.className='res-h'; sub.textContent=`They reached ${M.runs}/${M.wkts} in ${oversStr(M.balls)} overs, with ${left} ball${left===1?'':'s'} to spare.`; }
    else if(M.done==='tie'){ h.textContent='Match tied'; h.className='res-h'; sub.textContent=`Scores level on ${M.runs}.`; }
    else { const by=M.target-1-M.runs; h.textContent=`You won by ${by} run${by===1?'':'s'}`; h.className='res-h win'; sub.textContent=`You bowled them out for ${M.runs}/${M.wkts} in ${oversStr(M.balls)} overs, defending ${M.target-1}.`; Snd.cheer(1.2); }
  } else if(M.done==='win'){ h.textContent=`You won by ${wl} wicket${wl===1?'':'s'}`; h.className='res-h win'; sub.textContent=`${M.runs}/${M.wkts} in ${oversStr(M.balls)} overs, with ${left} ball${left===1?'':'s'} to spare. ${M.oppText} beaten.`; Snd.cheer(1.2); }
  else if(M.done==='tie'){ h.textContent='Match tied'; h.className='res-h'; sub.textContent=`Scores level on ${M.runs}. Nothing to separate the sides.`; }
  else { const by=M.target-1-M.runs; h.textContent=`Opposition won by ${by} run${by===1?'':'s'}`; h.className='res-h'; sub.textContent=`You finished on ${M.runs}/${M.wkts} in ${oversStr(M.balls)} overs, chasing ${M.target}.`; }
  $('r-k').textContent=`RESULT · ${M.mode.name.toUpperCase()} · ${DIFF[game.diff].label.toUpperCase()}`;
  let rows=M.role==='bowl'?'<tr><th>BOWLER</th><th></th><th>O</th><th>R</th><th>W</th><th></th><th>ECON</th></tr>'+M.bowlers.filter(b=>b.balls).map(b=>`<tr><td>${b.name}</td><td class="how">${b.type==='spin'?'spin':'pace'}</td><td>${oversStr(b.balls)}</td><td>${b.runs}</td><td>${b.w}</td><td></td><td>${(b.runs/b.balls*6).toFixed(1)}</td></tr>`).join(''):'';
  rows+='<tr><th>BATTER</th><th></th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>';
  M.batters.forEach((b,i)=>{ if(b.b===0&&!b.out&&i!==M.s&&i!==M.ns) return; rows+=`<tr><td>${b.n}</td><td class="how">${b.out||'not out'}</td><td>${b.r}</td><td>${b.b}</td><td>${b.f4}</td><td>${b.f6}</td><td>${b.b?(b.r/b.b*100).toFixed(1):'–'}</td></tr>`; });
  rows+=`<tr><td>Extras</td><td></td><td>${M.extras}</td><td colspan="4"></td></tr>`;
  $('r-tbl').innerHTML=rows;
}

export { flashTO, timingTO, flash, showTiming, comm, showDRS, showResult };
