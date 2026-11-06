// batting.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { $, DIFF, clamp, pick, rand } from './config.js';
import { Snd } from './audio.js';
import { breakStumps, stumpsNear } from './scene.js';
import { ball, pushTrail, setBallPos, striker } from './players.js';
import { pathPos } from './physics.js';
import { M, game, input, tmp } from './match.js';
import { startLive } from './fielding.js';
import { endBall } from './scoring.js';
import { showDRS, showTiming } from './hud.js';

// ================= batting =================
function windows(){ const d=game.del, f=(M&&M.role==='bowl'?1:DIFF[game.diff].win)*(input.dir==='block'?1.6:1)*(d.name==='Yorker'?.8:1)*(d.name==='Bouncer'?.9:1); return {P:.038*f,G:.08*f,E:.135*f}; }
function shot(loft){
  if(game.phase!=='delivery'||input.pressT!==null) return;
  input.pressT=game.t; input.loft=loft&&input.dir!=='block';
  game.swingT=0;
}
function charge(){ if((game.phase==='runup'||game.phase==='ready')&&!input.charge){ input.charge=true; $('b-charge').classList.add('sel'); } }
function resolveContact(){
  const d=game.del; d.resolved=true;
  const W=windows(), q=d.atContact;
  if(input.pressT===null||!q){ return startMiss(false); }
  const diff=input.pressT-d.tContact, ad=Math.abs(diff);
  const batX=striker.position.x+.3;
  const reachable=q.y<1.85 && q.x>batX-.6 && q.x<batX+1.15;
  if(!reachable||ad>W.E) return startMiss(true, diff);
  let cls=ad<=W.P?'perfect':ad<=W.G?'good':'edge';
  const dir=input.dir;
  const down=()=>{cls=cls==='perfect'?'good':'edge';};
  if((dir==='off'&&q.x<-.25)||(dir==='leg'&&q.x>.5)) down();
  if(q.x>.6&&cls!=='edge'&&Math.random()<.3) down();
  if(d.name==='Bouncer'&&dir!=='leg'&&!input.loft&&Math.random()<.4) down();
  showTiming(cls==='edge'?(diff<0?'EARLY':'LATE'):cls==='perfect'?'PERFECT':diff<0?'GOOD · EARLY':'GOOD · LATE', cls);
  // direction (theta>0 = off side, 0 = straight back past the bowler)
  let base={off:55,straight:6,leg:-55,block:0}[dir];
  if(dir==='auto') base=q.x>.25?rand(35,60):q.x<-.05?rand(-65,-35):rand(-15,20);
  let theta=base+clamp(diff/W.G,-1.6,1.6)*30+rand(-10,10), phi, sp;
  const ch=input.charge?3:0;
  if(dir==='block'){
    if(cls==='edge'){theta=diff>0?rand(120,160):rand(-30,30); sp=rand(8,14); phi=diff>0?rand(4,12):rand(15,35);}
    else {sp=rand(3,7); phi=rand(-4,4); theta=rand(-25,25);}
  } else if(cls==='edge'){
    if(diff>0){ theta=rand(115,165)*(q.x>-.1?1:-1); sp=rand(16,26); phi=rand(2,14); }
    else if(d.name==='Bouncer'||d.name==='Short of length'){ theta=-rand(130,170); sp=rand(18,26); phi=rand(35,55); }
    else { theta=rand(-30,70); sp=rand(10,17); phi=rand(25,55); }
  } else if(input.loft){
    phi=rand(27,35); sp=cls==='perfect'?rand(34.5,38)+ch:rand(27,31.5)+ch;
  } else {
    phi=rand(1,6)+(q.y>1?8:0); sp=cls==='perfect'?rand(30,34)+ch:rand(21,26)+ch;
  }
  const th=theta*Math.PI/180, ph=phi*Math.PI/180;
  const v0=new THREE.Vector3(sp*Math.cos(ph)*Math.sin(th), sp*Math.sin(ph), -sp*Math.cos(ph)*Math.cos(th));
  const p0=new THREE.Vector3(q.x,Math.max(q.y,.12),d.contactZ);
  game.swingYaw=clamp(-theta*Math.PI/180*.7,-1.2,1.2);
  Snd.bat(cls==='perfect'?1:cls==='good'?.6:.25);
  startLive(p0,v0,{cls,theta,loft:input.loft,dir});
}
function startMiss(offered,diff){
  const d=game.del;
  if(offered) showTiming(diff<0?'TOO EARLY':'TOO LATE','edge'); else if(input.pressT===null) {}
  d.miss={offered};
  const pad=d.atPad, stumps=d.atStumps;
  const inPad=pad&&pad.x>striker.position.x-.02&&pad.x<striker.position.x+.5&&pad.y<.7;
  if(inPad){ d.miss.ev='pad'; d.miss.t=pad.t; d.miss.pad=pad; }
  else if(stumps&&Math.abs(stumps.x)<.15&&stumps.y<.75){ d.miss.ev='bowled'; d.miss.t=stumps.t; }
  else { d.miss.ev='keeper'; d.miss.t=d.tEnd; }
}
function updateDelivery(dt){
  const d=game.del, t=game.t;
  if(d.ai&&!d.ai.done&&!d.ai.leave&&t>=d.ai.pressT){ d.ai.done=true; input.dir=d.ai.dir; shot(d.ai.loft); }
  if(!d.resolved){
    const W=windows();
    if(input.pressT!==null&&t>=d.tContact&&t>=input.pressT) resolveContact();
    else if(t>=d.tContact+W.E) resolveContact();
  }
  if(game.phase!=='delivery') return;
  const m=d.miss;
  const tt=m?Math.min(t,m.t):t;
  pathPos(d.path,tt,tmp); setBallPos(tmp); pushTrail(tmp);
  if(m&&t>=m.t&&!m.done){ m.done=true; handleMissEvent(); }
}
function handleMissEvent(){
  const d=game.del, m=d.miss, protectedBall=d.noBall||M.freeHit;
  if(m.ev==='bowled'){
    breakStumps(stumpsNear,1);
    if(protectedBall){ return endBall({runs:0,text:'Through the gate and onto the stumps, but it is a free hit. Not out.',sym:'•'}); }
    return endBall({runs:0,wicket:{how:'b '+d.bowler.name,type:'Bowled',who:M.s},text:pick([`Bowled him! ${d.name} crashes into the stumps.`,`Timber! ${d.bowler.name} knocks back the off stump.`,`Clean bowled. The ${d.name.toLowerCase()} beats the bat and the stumps are a mess.`])});
  }
  if(m.ev==='pad'){
    const pitchedOutsideLeg=d.bounce&&d.bounce.x<-.15;
    const impactInLine=Math.abs(m.pad.x)<=.15, impactOutsideOff=m.pad.x>.15;
    const hitting=d.atStumps&&Math.abs(d.atStumps.x)<.15&&d.atStumps.y<.76;
    const out=!pitchedOutsideLeg&&(impactInLine||(impactOutsideOff&&!m.offered))&&hitting&&!protectedBall;
    showDRS(pitchedOutsideLeg,impactInLine?'In line':impactOutsideOff?'Outside off':'Outside leg',hitting,out);
    ball.position.y=.2;
    if(out) return endBall({runs:0,wicket:{how:'lbw b '+d.bowler.name,type:'LBW',who:M.s},text:`Big appeal, and the finger goes up. Ball tracking shows it hitting ${Math.abs(d.atStumps.x)<.05?'middle':d.atStumps.x>0?'off':'leg'} stump.`,wait:3.2});
    return endBall({runs:0,text:pitchedOutsideLeg?'Thuds into the pad. Pitched outside leg, so not out.':hitting?'Struck on the pad, but the impact was outside off with a shot offered. Not out.':'Hits the pad. Ball tracking says it was missing the stumps.',sym:'•',wait:2.8});
  }
  // keeper takes it
  const at=d.atContact, wideH=at&&at.y>1.85, wideL=at&&(at.x>.98||at.x<-.62);
  if(input.charge&&d.bowler.type==='spin'&&!protectedBall&&!(wideL||wideH)){
    breakStumps(stumpsNear,1);
    return endBall({runs:0,wicket:{how:'st Keeper b '+d.bowler.name,type:'Stumped',who:M.s},text:`Down the track, beaten in the flight, and the keeper whips the bails off. Stumped!`});
  }
  if(wideH||wideL) return endBall({runs:0,wide:true,text:wideH?'Too high, over the head. The umpire calls wide.':pick(['Wide. That one strays well outside the line.','Signalled wide. The bowler loses his radar.']),sym:'Wd'});
  return endBall({runs:0,text:m.offered?pick([`Played and missed. Lovely ${d.name.toLowerCase()} from ${d.bowler.name}.`,'Beaten! That one did a bit off the seam.','Swing and a miss.']):pick(['Left alone, through to the keeper.','Shoulders arms. No run.','Watchful leave.']),sym:'•'});
}

export { windows, shot, charge, resolveContact, startMiss, updateDelivery, handleMissEvent };
