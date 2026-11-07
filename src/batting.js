// batting.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { SHOT_ANGLE, keyDir, shotName, showTimingBar } from './assist.js';
import { chooseStroke } from './strokes.js';
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
// Timing windows (seconds either side of the moment the ball reaches the bat).
// When you bat they are generous, like console cricket; the computer batter in bowl mode keeps the tight ones.
function windows(){
  const d=game.del, you=!(M&&M.role==='bowl');
  const f=(you?DIFF[game.diff].win:1)*(input.dir==='block'?1.4:1)*(d.name==='Yorker'?.85:1)*(d.name==='Bouncer'?.92:1);
  return you?{P:.055*f,G:.12*f,E:.24*f}:{P:.038*f,G:.08*f,E:.135*f};
}
// Timing assist: on easier levels an off-timed press is pulled towards the ball
const ASSIST={easy:.5,normal:.75,hard:1};
function shot(loft){
  if(game.phase!=='delivery'||input.pressT!==null) return;
  const kd=keyDir(); if(kd) input.dir=kd;
  input.pressT=game.t;
  { const d=game.del, x=d.atContact?d.atContact.x:.1;
    const ang=input.dir in SHOT_ANGLE?SHOT_ANGLE[input.dir]:(x>.25?45:x<-.05?-50:5);
    game.stroke=chooseStroke(input.dir,loft&&input.dir!=='block',d);
    game.swingC=clamp(d.tContact-game.t,.07,.3);            // the bat reaches the ball when the ball arrives
    game.swingYaw=clamp(-ang*Math.PI/180*.9,-1.3,1.3); } input.loft=loft&&input.dir!=='block';
  game.swingT=0;
}
function charge(){ if((game.phase==='runup'||game.phase==='ready')&&!input.charge){ input.charge=true; $('b-charge').classList.add('sel'); } }
function resolveContact(){
  const d=game.del; d.resolved=true;
  const W=windows(), q=d.atContact;
  if(input.pressT===null||!q){ return startMiss(false); }
  const raw=input.pressT-d.tContact, diff=M.role==='bat'?raw*ASSIST[game.diff]:raw, ad=Math.abs(diff);
  const batX=striker.position.x+.3;
  const reachable=q.y<1.85 && q.x>batX-.6 && q.x<batX+1.15;
  if(!reachable||ad>W.E) return startMiss(true, diff);
  let cls=ad<=W.P?'perfect':ad<=W.G?'good':'edge';
  const dir=input.dir;
  const down=()=>{cls=cls==='perfect'?'good':'edge';};
  const spin=d.bowler.type==='spin', shortB=d.len>8.5, fullB=d.len<4.4;
  if(((dir==='off'||dir==='cut'||dir==='offdrive')&&q.x<-.25)||((dir==='leg'||dir==='glance'||dir==='ondrive')&&q.x>.5)) down();
  if(dir==='cut'&&fullB) down();
  if((dir==='straight'||dir==='offdrive'||dir==='ondrive')&&shortB&&!spin) down();
  if(q.x>.6&&cls!=='edge'&&Math.random()<.3) down();
  if(d.name==='Bouncer'&&!['leg','glance','cut'].includes(dir)&&!input.loft&&Math.random()<.4) down();
  const sname=dir==='auto'?'':shotName(dir,d,input.loft,spin);
  showTiming((sname?sname.toUpperCase()+' · ':'')+(cls==='edge'?(diff<0?'EARLY':'LATE'):cls==='perfect'?'PERFECT':diff<0?'GOOD · EARLY':'GOOD · LATE'), cls);
  if(M.role==='bat') showTimingBar(diff,W);
  // direction (theta>0 = off side, 0 = straight back past the bowler)
  let base=SHOT_ANGLE[dir];
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
  Snd.bat(cls==='perfect'?1:cls==='good'?.6:.25);
  if(cls==='perfect'&&dir!=='block') game.shake=.14;
  startLive(p0,v0,{cls,theta,loft:input.loft,dir,name:sname});
}
function startMiss(offered,diff){
  const d=game.del;
  if(offered){ Snd.ooh(); showTiming(diff<0?'TOO EARLY':'TOO LATE','edge'); if(M.role==='bat'&&diff!==undefined) showTimingBar(diff,windows()); } else if(input.pressT===null) {}
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
