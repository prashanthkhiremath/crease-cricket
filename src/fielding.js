// fielding.js — generated from the prototype; edit freely.
import { say } from './commentary.js';
import * as THREE from 'three';
import { $, BALL_R, DIFF, FC, G, K_DRAG, PITCH, ROLL_DEC, R_BOUND, clamp, lerp, pick } from './config.js';
import { Snd } from './audio.js';
import { breakStumps, stumpsFar, stumpsNear } from './scene.js';
import { ball, bowler, bowlerF, fielders, nonStriker, pushTrail, setBallPos, striker } from './players.js';
import { pathPos } from './physics.js';
import { M, game, tmp, tmp2 } from './match.js';
import { endBall } from './scoring.js';
import { comm, flash } from './hud.js';

// ================= ball in play =================
function simulateHit(p0,v0){
  const dt=1/120, s=[], p=p0.clone(), v=v0.clone(); let t=0, firstBounce=null, boundary=null, rolling=false, stopT=null;
  for(let i=0;i<120*14;i++){
    s.push({x:p.x,y:p.y,z:p.z});
    const dx=p.x-FC.x, dz=p.z-FC.z;
    if(dx*dx+dz*dz>=R_BOUND*R_BOUND){ boundary={t,six:firstBounce===null}; break; }
    if(!rolling){
      const sp=v.length(); v.addScaledVector(v,-K_DRAG*sp*dt); v.y-=G*dt; p.addScaledVector(v,dt);
      if(p.y<=BALL_R&&v.y<0){ p.y=BALL_R; if(firstBounce===null) firstBounce=t; if(-v.y>1.6){v.y=-v.y*.38; v.x*=.72; v.z*=.72;} else {v.y=0; rolling=true;} }
    } else {
      const h=Math.hypot(v.x,v.z); if(h<.25){ stopT=t; break; }
      const nh=Math.max(0,h-ROLL_DEC*dt); v.x*=nh/h; v.z*=nh/h; p.addScaledVector(v,dt);
    }
    t+=dt;
  }
  if(stopT===null&&!boundary) stopT=t;
  return {dt,s,firstBounce,boundary,stopT};
}
function analyseFielding(path){
  const df=DIFF[game.diff]; let best=null; const n=path.s.length;
  bowlerF.home.copy(bowler.position);
  for(const f of [...fielders,bowlerF]){
    const sp=7.1*df.field*(f.def.keeper?.75:1), react=(f.def.keeper||f.def.slip)?.1:f.def.n==='Bowler'?.2:.3;
    for(let i=0;i<n;i++){
      const t=i*path.dt; if(best&&t>=best.t) break;
      const q=path.s[i], air=path.firstBounce===null||t<path.firstBounce;
      if(q.y>(air?2.7:1.1)) continue;
      const d=Math.hypot(q.x-f.home.x,q.z-f.home.z), reach=air?(f.def.keeper?1.8:1.5):1.15;
      const need=Math.max(0,d-reach), avail=Math.max(0,t-react)*sp;
      if(avail>=need){ best={f,t,i,air,margin:avail-need,sp,react}; break; }
    }
  }
  if(!best&&!path.boundary){
    const q=path.s[n-1];
    for(const f of [...fielders,bowlerF]){ const sp=7.1*df.field, d=Math.hypot(q.x-f.home.x,q.z-f.home.z), t=Math.max(path.stopT,.3+Math.max(0,d-1)/sp); if(!best||t<best.t) best={f,t,i:n-1,air:false,margin:1,sp,react:.3}; }
  }
  return best;
}
function startLive(p0,v0,o){
  const path=simulateHit(p0,v0), fe=analyseFielding(path), L={path,fe,o,t:0,runs:0,inProg:false,rs:0,rd:0,ended:false,events:[]};
  game.live=L; game.phase='live'; game.t=0;
  const protectedBall=game.del.noBall||M.freeHit;
  if(path.boundary&&(!fe||fe.t>=path.boundary.t)){ L.boundaryT=path.boundary.t; L.six=path.boundary.six; }
  else if(fe){
    const q=path.s[fe.i]; L.chaser=fe.f; L.collectT=fe.t; L.collectP=new THREE.Vector3(q.x,0,q.z);
    if(fe.air){
      const spd=v0.length()*(1-Math.min(.5,fe.t*.08));
      let pc=fe.f.def.keeper?.9:fe.f.def.slip?.75:.86; if(fe.margin<.9) pc-=.28; if(spd>27) pc-=.18; pc*=DIFF[game.diff].catchM;
      if(Math.random()<pc){ if(protectedBall){L.caughtFree=true;} else L.caught=true; }
      else { L.dropped=true; L.collectT=fe.t+.9; }
    }
    if(!L.caught){
      const toNear=Math.hypot(q.x,q.z), toFar=Math.hypot(q.x,q.z+PITCH);
      L.end=toNear<=toFar?0:1; const dist=Math.min(toNear,toFar);
      L.throwStart=L.collectT+(fe.f.def.keeper&&dist<4?.1:.35);
      L.tRet=L.throwStart+(dist<4?.15:dist/30);
      L.throwFrom=null;
    }
  }
  L.chaseFrom=fe?fe.f.m.position.clone():null; L.diveSide=Math.random()<.5?-1:1;
  $('b-run').classList.toggle('hot',!L.caught&&!L.boundaryT);
}
function callRun(){
  const L=game.live; if(game.phase!=='live'||!L||L.ended||L.inProg||L.caught) return;
  if(L.tRet!==undefined&&L.t>=L.tRet) return;
  L.inProg=true; L.rs=L.t; L.rd=L.runs===0?3.05:2.75;
}
function runnerPos(which,L){ // which 0 = original striker, 1 = non-striker; u in [0,2)
  const prog=L.inProg?clamp((L.t-L.rs)/L.rd,0,1):0, c=L.runs+prog; let u=(c+(which?1:0))%2;
  const zA=-1.3, zB=-PITCH+1.3, z=u<=1?lerp(zA,zB,u):lerp(zB,zA,u-1);
  return {z, x:which?-1.2:.9, moving:L.inProg};
}
function comm0(t){ $('comm').textContent=t; say(t,0); }
function updateLive(dt){
  const L=game.live; L.t+=dt; const t=L.t;
  if(M.role==='bowl'&&!L.ended&&!L.inProg&&!L.caught&&L.boundaryT===undefined&&L.tRet!==undefined&&L.runs<3&&t>.12){
    const need=M.target-M.runs, left=M.mode.overs*6-M.balls, rr=need/Math.max(1,left)*6;
    const dur=L.runs===0?3.05:2.75, margin=(L.runs===0?.2:.4)-clamp((rr-8)/20,0,.25);
    if(t+dur+margin<L.tRet) callRun();
  }
  // running
  if(L.inProg&&t-L.rs>=L.rd){ L.inProg=false; L.runs++; if(!L.ended) comm0(L.runs===1?'They scamper through for one.':L.runs===2?'Back for the second.':'And they run three!'); }
  for(const [w,p] of [[0,striker],[1,nonStriker]]){
    if(L.runs===0&&!L.inProg&&w===0) continue;
    const r=runnerPos(w,L), dz=r.z-p.position.z;
    p.position.z=r.z; p.position.x=lerp(p.position.x,r.x,.1);
    if(Math.abs(dz)>.001){ p.rotation.y=dz<0?Math.PI:0; }
  }
  // ball
  if(L.caught||L.caughtFree){
    if(t<L.collectT){ pathPos(L.path,t,tmp); setBallPos(tmp); pushTrail(tmp); }
    else { tmp.copy(L.chaser.m.position); tmp.y=1.3; setBallPos(tmp); }
    if(t>=L.collectT&&!L.ended){
      if(L.caught){ Snd.groan(); return endBall({runs:0,wicket:{how:`c ${L.chaser.def.n} b ${game.del.bowler.name}`,type:'Caught',who:M.s},text:catchText(L)}); }
      L.caughtFree=false; L.dropped=false; comm('Taken, but it was a free hit. Not out!'); L.collectT=t; L.end=0; L.throwStart=t+.35; L.tRet=L.throwStart+Math.hypot(tmp.x,tmp.z)/30;
    }
  } else if(L.boundaryT!==undefined){
    pathPos(L.path,Math.min(t,L.boundaryT),tmp); setBallPos(tmp); pushTrail(tmp);
    if(t>=L.boundaryT&&!L.ended) return endBall({runs:L.six?6:4,boundary:L.six?6:4,text:boundaryText(L),wait:2.4});
  } else if(L.collectT!==undefined){
    if(t<L.collectT){ pathPos(L.path,t,tmp); setBallPos(tmp); pushTrail(tmp); }
    else if(t<L.throwStart){ tmp.copy(L.chaser.m.position); tmp.y=.9; setBallPos(tmp); if(L.dropped&&!L.dropSaid){L.dropSaid=true; comm(`Put down! ${L.chaser.def.n} spills a chance.`); flash('DROPPED','','fx',1);} }
    else {
      if(!L.throwFrom) L.throwFrom=L.chaser.m.position.clone().setY(1.6);
      const u=clamp((t-L.throwStart)/Math.max(.01,L.tRet-L.throwStart),0,1), tz=L.end===0?0:-PITCH;
      tmp.set(lerp(L.throwFrom.x,0,u),lerp(L.throwFrom.y,.6,u)+Math.sin(u*Math.PI)*Math.min(4,L.throwFrom.distanceTo(tmp2.set(0,0,tz))*.05),lerp(L.throwFrom.z,tz,u));
      setBallPos(tmp); pushTrail(tmp);
    }
    if(t>=L.tRet&&!L.ended){
      if(L.inProg){
        const frac=(t-L.rs)/L.rd;
        if(frac<.94){
          if(1-frac<.22&&Math.random()<.45){ L.inProg=false; L.runs++; comm('Shy at the stumps... and missed! They make it home.'); return endBall({runs:L.runs,text:'Shy at the stumps, missed, and they make it home.'}); }
          const end=L.end, c=L.runs; const who=end===0?(c%2===0?M.ns:M.s):(c%2===0?M.s:M.ns);
          breakStumps(end===0?stumpsNear:stumpsFar,end===0?1:-1);
          return endBall({runs:L.runs,wicket:{how:`run out (${L.chaser.def.n})`,type:'Run out',who,runout:true},text:`Run out! A sharp throw from ${L.chaser.def.n} and ${M.batters[who].n} is short of the crease.`});
        }
        L.inProg=false; L.runs++;
      }
      return endBall({runs:L.runs,text:L.runs===0?pick([`Straight to ${L.chaser.def.n}. No run.`,`Good fielding by ${L.chaser.def.n}. Dot ball.`,'Firmly struck, but straight to the fielder.']):`${L.runs} run${L.runs>1?'s':''}, well run.`});
    }
  }
  // fielders
  const fe=L.fe;
  for(const f of [...fielders,bowlerF]){
    if(fe&&f===fe.f){
      const target=L.collectP; const tt=clamp((t-fe.react)/Math.max(.05,fe.t-fe.react),0,1);
      const from=L.chaseFrom; const dist=from.distanceTo(target), arrive=Math.max(0,dist-1);
      const k=dist>0?arrive/dist:0;
      if(t<L.collectT){ f.m.position.set(lerp(from.x,from.x+(target.x-from.x)*k,tt),0,lerp(from.z,from.z+(target.z-from.z)*k,tt)); f.m.lookAt(ball.position.x,0,ball.position.z); }
      else { f.m.lookAt(0,0,L.end===1?-PITCH:0); }
    } else if(f!==bowlerF) {
      tmp2.set(ball.position.x-f.m.position.x,0,ball.position.z-f.m.position.z); const dd=tmp2.length();
      if(dd>6&&t<4&&!f.def.keeper){ f.m.position.addScaledVector(tmp2.normalize(),dt*1.6); }
      f.m.lookAt(ball.position.x,0,ball.position.z);
    }
  }
  // bowler follow-through
  if(!(fe&&fe.f===bowlerF)) bowler.position.z=Math.min(bowler.position.z+dt*2,-PITCH+6);
}
function catchText(L){ const n=L.chaser.def.n, b=game.del.bowler.name;
  if(L.chaser.def.keeper) return `Edged and taken! The keeper makes no mistake off ${b}.`;
  if(L.chaser.def.slip) return `Nicked, and snapped up at slip!`;
  if(L.o.loft) return pick([`Up in the air... and taken at ${n}! He tried to clear the rope.`,`Skied! ${n} settles under it and holds on.`]);
  return pick([`Caught at ${n}! Uppish drive picked out the fielder.`,`Straight down the throat of ${n}.`]); }
function boundaryText(L){
  const ang=L.o.theta, region=ang>110?'third man':ang>65?'point':ang>25?'cover':ang>-20?'down the ground':ang>-70?'midwicket':ang>-110?'square leg':'fine leg';
  if(L.six) return pick([`SIX! Launched over ${region}, into the stands.`,`Massive! That is out of the ground over ${region}.`,`Maximum. Cleared ${region} with ease.`]);
  return pick([`FOUR! Placed beautifully through ${region}.`,`Cracking shot, races away to the ${region} boundary.`,`Four runs. Nobody is stopping that through ${region}.`]);
}

export { simulateHit, analyseFielding, startLive, callRun, runnerPos, updateLive, catchText, boundaryText };
