// scoring.js — generated from the prototype; edit freely.
import { $ } from './config.js';
import { Snd } from './audio.js';
import { signal } from './players.js';
import { M, curBowler, game } from './match.js';
import { comm, flash } from './hud.js';

// ================= scoring =================
function endBall(o){
  const L=game.live; if(L) L.ended=true;
  const d=game.del, bw=d.bowler, bat=M.batters[M.s];
  game.phase='dead'; game.t=0; game.deadWait=o.wait||(o.wicket?2.6:o.boundary?2.3:1.6);
  $('b-run').classList.remove('hot');
  const wide=!!o.wide, nb=!!d.noBall&&!wide, extras=(wide?1:0)+(nb?1:0);
  M.runs+=o.runs+extras; M.extras+=extras; bw.runs+=o.runs+extras;
  const legal=!wide&&!nb;
  if(!wide){ bat.b++; bat.r+=o.runs; if(o.boundary===4)bat.f4++; if(o.boundary===6)bat.f6++; }
  if(legal){ M.balls++; bw.balls++; }
  let sym=o.sym||(o.runs?String(o.runs):'•');
  if(nb) sym='Nb'+(o.runs?'+'+o.runs:''); if(wide) sym='Wd';
  if(o.wicket){
    const w=o.wicket; M.wkts++; sym='W'; if(!w.runout) bw.w++;
    M.batters[w.who].out=w.how;
    if(o.runs%2===1){ [M.s,M.ns]=[M.ns,M.s]; }
    if(!M.mode.nets&&M.next<11&&M.wkts<M.mode.wkts){ if(w.who===M.s) M.s=M.next; else M.ns=M.next; M.next++; }
    flash('OUT!',w.type,'fw',2.2); Snd.groan();
  } else {
    if(o.runs%2===1) [M.s,M.ns]=[M.ns,M.s];
    if(o.boundary===6){flash('SIX','Maximum','f6',2); Snd.cheer(1);} else if(o.boundary===4){flash('FOUR','Boundary','f4',2); Snd.cheer(.7);}
    else if(wide) flash('WIDE','+1','fx',1.2);
  }
  signal(o.wicket?'out':o.boundary===6?'six':o.boundary===4?'four':wide?'wide':null);
  M.overLog.push(sym);
  M.freeHit=nb?true:(wide?M.freeHit:false);
  comm(o.text||'');
  // match end?
  const maxB=M.mode.overs*6;
  if(M.mode.nets){}
  else if(M.runs>=M.target){ M.done='win'; }
  else if(M.wkts>=M.mode.wkts||M.balls>=maxB){ M.done=M.runs===M.target-1?'tie':'loss'; }
  if(!M.done&&legal&&M.balls%6===0){
    [M.s,M.ns]=[M.ns,M.s]; M.over++; M.resetOver=true;
    M.bi=M.over%M.bowlers.length; game.pendingField=true;
    setTimeout(()=>{ if(M&&!M.done) comm(`End of the over. ${curBowler().name} (${curBowler().type==='spin'?(curBowler().style==='off'?'off-spin':'leg-spin'):'pace'}) to bowl the next.`); }, game.deadWait*1000-200);
  }
  updateHUD();
}
function oversStr(b){ return `${Math.floor(b/6)}.${b%6}`; }
function updateHUD(){
  if(!M) return;
  $('score').textContent=`${M.runs}/${M.wkts}`; $('overs').textContent=M.mode.nets?oversStr(M.balls):`${oversStr(M.balls)} / ${M.mode.overs}`;
  const need=M.target-M.runs, left=M.mode.overs*6-M.balls;
  $('chase').innerHTML=M.mode.nets?`Nets · <b>${M.balls}</b> balls · ${M.wkts} dismissal${M.wkts===1?'':'s'}`:need>0?`${M.role==='bowl'?'Opp need':'Need'} <b>${need}</b> from <b>${left}</b> ball${left===1?'':'s'} · Target ${M.target}`:`Target ${M.target} reached`;
  $('crr').textContent=M.balls?(M.runs/M.balls*6).toFixed(2):'0.00';
  $('rrr').textContent=M.mode.nets?'–':left>0&&need>0?(need/left*6).toFixed(2):'–';
  const b1=M.batters[M.s], b2=M.batters[M.ns], bw=curBowler();
  $('batcard').innerHTML=`<div class="ln"><span class="nm on">${b1.n} *</span><span>${b1.r} <span class="st">(${b1.b})</span></span></div><div class="ln"><span class="nm">${b2.n}</span><span>${b2.r} <span class="st">(${b2.b})</span></span></div>`;
  $('bowlcard').innerHTML=`<div class="ln"><span class="nm">${bw.name}</span><span class="st">${bw.type==='spin'?(bw.style==='off'?'Off-spin':'Leg-spin'):'Pace'}</span></div><div class="ln"><span class="st">${oversStr(bw.balls)}-${bw.runs}-${bw.w}</span><span class="st">Econ ${bw.balls?(bw.runs/bw.balls*6).toFixed(1):'0.0'}</span></div>`;
  $('over').innerHTML='<span class="lbl">THIS OVER</span>'+M.overLog.map(s=>`<span class="ball ${s==='4'?'b4':s==='6'?'b6':s==='W'?'bw':/Wd|Nb/.test(s)?'bx':''}">${s}</span>`).join('');
}

export { endBall, oversStr, updateHUD };
