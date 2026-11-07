// bowling.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { showLanding } from './assist.js';
import { say, runupLine } from './commentary.js';
import { $, BALL_R, DIFF, DTYPES, G, PITCH, clamp, gauss, lengthName, rand, weighted } from './config.js';
import { ball, clearTrail, signal } from './players.js';
import { crossZ } from './physics.js';
import { M, curBowler, game, input } from './match.js';
import { flash, showTiming } from './hud.js';
import { aiPlan, aimMarker, meterErr } from './bowlmode.js';

// ================= bowling =================
function buildDelivery(spec){
  const b=curBowler(), d={bowler:b}, ballsLeft=M.mode.overs*6-M.balls, death=ballsLeft<=18&&M.mode.overs>=5;
  if(b.type==='pace'){
    d.name=spec?spec.type:weighted([['Good length',30],['Full',16],['Yorker',death?26:8],['Bouncer',9],['Outswinger',13],['Inswinger',11],['Slower ball',death?14:7],['Short of length',12]]);
    let kmh=b.base+rand(-4,4), len=rand(5.8,7.4), swing=rand(-.4,.4), dev=rand(-.45,.45);
    if(d.name==='Full') len=rand(3.4,4.6); if(d.name==='Yorker') len=rand(1.15,1.7); if(d.name==='Bouncer') len=rand(10,11.8);
    if(d.name==='Short of length') len=rand(8,9.2); if(d.name==='Slower ball'){kmh-=rand(22,30); len=rand(4.5,6.2);}
    if(d.name==='Outswinger'){swing=rand(1.6,2.6); len=rand(4.5,6.5);} if(d.name==='Inswinger'){swing=-rand(1.6,2.6); len=rand(4.5,6.5);}
    let line=weighted([[rand(.05,.35),5],[rand(-.12,.05),2],[rand(.35,.6),2],[rand(-.3,-.12),1]]);
    if(d.name==='Outswinger') line-=.25; if(d.name==='Inswinger') line+=.3;
    Object.assign(d,{kmh,len,swing,dev,line,e:.62,zKeep:.93,relY:2.15,relX:.42,keeperZ:13.2});
  } else {
    const off=b.style==='off';
    d.name=spec?spec.type:off?weighted([['Off-break',40],['Flighted',18],['Arm ball',14],['Quicker one',14],['Carrom ball',8]])
              :weighted([['Leg-break',40],['Flighted',18],['Googly',16],['Top-spinner',12],['Quicker one',10]]);
    let kmh=b.base+rand(-3,3), len=rand(4.2,6.2), dev=off?-rand(1.5,2.3):rand(1.5,2.3), e=.55;
    let line=off?rand(.2,.55):rand(-.2,.15);
    if(d.name==='Flighted'){kmh-=rand(6,10); len=rand(3.2,4.4);} if(d.name==='Quicker one'){kmh+=rand(8,12); len=rand(5.5,7); dev*=.4;}
    if(d.name==='Arm ball'){dev=rand(-.1,.3); line=rand(0,.25);} if(d.name==='Googly'){dev=-rand(1.3,2); line=rand(.15,.45);}
    if(d.name==='Carrom ball'){dev=rand(1.2,1.8); line=rand(-.15,.15);} if(d.name==='Top-spinner'){dev=rand(-.2,.2); e=.7; line=rand(-.05,.2);}
    Object.assign(d,{kmh,len,swing:0,dev,line,e,zKeep:.86,relY:1.98,relX:.35,keeperZ:1.0});
  }
  const df=DIFF[game.diff];
  if(spec){
    const e=spec.err; d.userErr=e;
    d.line=spec.line+gauss()*(.03+e*.3); d.len=clamp(spec.len+gauss()*(.12+e*1.1),.3,13);
    d.noBall=e>.9; d.wideTry=false;
    if(spec.type==='Stock') d.name=lengthName(d.len);
  } else {
    d.noBall=Math.random()<(game.diff==='hard'?.015:.025);
    d.wideTry=!d.noBall&&Math.random()<.025;
    if(d.wideTry) d.line+=Math.random()<.6?rand(1.0,1.3):-rand(.7,.9);
  }
  // solve launch velocity for target bounce point
  const rel=new THREE.Vector3(d.relX,d.relY,-PITCH+1.2), bz=-d.len, vz=d.kmh/3.6, t1=(bz-rel.z)/vz;
  const vx=(d.line-rel.x-.5*d.swing*t1*t1)/t1, vy=(BALL_R-rel.y+.5*G*t1*t1)/t1;
  d.rel=rel; d.v0=new THREE.Vector3(vx,vy,vz);
  simulateDelivery(d);
  return d;
}
function simulateDelivery(d){
  const dt=1/240, s=[]; const p=d.rel.clone(), v=d.v0.clone(); let bounced=false, t=0;
  while(t<4){
    s.push({x:p.x,y:p.y,z:p.z});
    if(!bounced) v.x+=d.swing*dt;
    v.y-=G*dt; p.addScaledVector(v,dt);
    if(p.y<=BALL_R&&v.y<0){ p.y=BALL_R; if(!bounced){bounced=true; d.bounce={x:p.x,z:p.z,t}; v.y=-v.y*d.e; v.x+=d.dev; v.z*=d.zKeep;} else {v.y=-v.y*.45; v.z*=.85; v.x*=.85;} }
    if(p.z>=d.keeperZ) break;
    t+=dt;
  }
  s.push({x:p.x,y:p.y,z:p.z});
  d.path={dt,s}; d.tEnd=(s.length-1)*dt;
  d.atStumps=crossZ(d.path,0);
}
function setContactZ(d){
  d.contactZ=input.charge?-2.9:-1.15; d.padZ=d.contactZ+.25;
  d.atContact=crossZ(d.path,d.contactZ); d.atPad=crossZ(d.path,d.padZ);
  d.tContact=d.atContact?d.atContact.t:d.tEnd;
}
function startRunup(){
  game.phase='runup'; game.t=0;
  say(runupLine(curBowler(),M),0);
  if(M.role==='bat'){
    game.preDel=buildDelivery(null);
    if(game.marker) showLanding(game.preDel,{easy:0,normal:.08,hard:.16}[game.diff]);
  }
}
function release(){
  let spec=null;
  if(M.role==='bowl'){
    const m=game.meter||{}; const err=m.locked?m.err:Math.min(1,meterErr()+.25);
    spec={type:DTYPES[curBowler().type==='pace'?'pace':curBowler().style][game.dti]||'Stock',line:game.aim.x,len:game.aim.len,err};
    showTiming(err<.15?'PERFECT RELEASE':err<.45?'GOOD RELEASE':'LOOSE RELEASE',err<.15?'perfect':err<.45?'good':'edge');
    $('meter').hidden=true; aimMarker.visible=false;
  }
  const d=game.preDel||buildDelivery(spec); game.preDel=null; game.del=d; setContactZ(d);
  if(M.role==='bowl') d.ai=aiPlan(d);
  game.phase='delivery'; game.t=0; d.resolved=false; d.miss=null;
  ball.visible=true; clearTrail();
  $('kmh').textContent=d.kmh.toFixed(1); $('dtype').textContent=d.name; $('speed').classList.add('show');
  if(d.noBall){ flash('NO BALL','Free hit next','fx',1.2); signal('nb'); }
}

export { buildDelivery, simulateDelivery, setContactZ, startRunup, release };
