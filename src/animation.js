// animation.js — generated from the prototype; edit freely.
import { RUNUP, clamp, lerp, smooth } from './config.js';
import { BR, NR, POSE, SR, bowlerF, fielders, setBatAngles, solveBatterArms, ump, umpire, umpire2 } from './players.js';
import { game, input } from './match.js';
import { retargetAll } from './athletes.js';
import { BACKLIFT, strokeBat } from './strokes.js';

// ================= player animation =================
const prevPos=new Map();
function speedOf(root,dt){ let p=prevPos.get(root); if(!p){p=root.position.clone();prevPos.set(root,p);} const s=dt>0?Math.hypot(root.position.x-p.x,root.position.z-p.z)/dt:0; p.copy(root.position); return s; }
function bowlAction(s){ // 0 gather, .6 release, 1 end of follow-through
  const g=clamp(s/.6,0,1), f=clamp((s-.6)/.4,0,1);
  return {spine:[lerp(-.25,.25,g)+f*.5,0,0], chest:[0,lerp(1.0,0,g)-f*.45,0], neck:[-.15,lerp(-.8,0,g),0],
    rUpper:[lerp(.7,Math.PI*1.05,g)+f*1.9,0,-.12], rFore:[0,0,0], lUpper:[lerp(-2.9,-2.5,g)+f*2.7,0,.25], lFore:[-.2,0,0],
    lThigh:[lerp(-.9,-.45,g)-f*.15,0,.05], lShin:[lerp(1.0,.12,g),0,0], rThigh:[lerp(.35,.55,g)-f*1.2,0,-.05], rShin:[lerp(1.3,.7,g)+f*.3,0,0],
    lift:g<.4?Math.sin(g/.4*Math.PI)*.22:0};
}
function animatePlayers(dt){
  const ph=game.phase, k=1-Math.pow(1e-5,dt), ks=1-Math.pow(.01,dt), L=game.live, d=game.del;
  const active=ph==='delivery'||ph==='live'||ph==='dead';
  for(const r of [SR,NR]){
    const isS=r===SR, sp=speedOf(r.root,dt);
    if(sp>.8){ r.runPh=(r.runPh||0)+dt*sp*1.25; r.pose(POSE.run(r.runPh,clamp(sp/7,.45,1)),k); setBatAngles(r,.6,-1.5,0,0,ks); r.root.updateMatrixWorld(true); solveBatterArms(r,true); continue; }
    if(!isS){ r.pose(POSE.stand(),ks); setBatAngles(r,.3,.2,0,0,ks); solveBatterArms(r,false); continue; }
    let bat, legs='stance', legsU=0, kb=ks, kl=ks;
    const miss=d&&d.resolved&&d.miss;
    if(game.debugStroke){ const D=game.debugStroke; bat=D.kind==='stance'?{a:-.2,w:-.45,tilt:0,piv:1.18,yaw:0}:D.kind==='backlift'?{...BACKLIFT,tilt:0,piv:1.18,yaw:0}:strokeBat(D.kind,D.t,.2,D.yaw||0); if(bat.legs){legs=bat.legs;legsU=bat.legsU;} else legs=D.kind==='backlift'?'trigger':'stance'; kb=kl=1; }
    else if(active&&input.pressT!==null&&game.swingT!==undefined&&game.stroke){
      bat=strokeBat(game.stroke,game.swingT,game.swingC||.15,game.swingYaw||0); legs=bat.legs; legsU=bat.legsU; kb=1; kl=k; }
    else if(active&&miss&&!miss.offered){ bat={a:-1.75,w:-1.6,tilt:0,piv:1.22,yaw:0}; legs='trigger'; kb=1-Math.pow(1e-4,dt); }   // leave: bat lifted out of the way
    else if(input.charge&&(ph==='runup'||ph==='delivery'||ph==='ready')){ bat={...BACKLIFT,tilt:0,piv:1.18,yaw:0}; legs='charge'; }
    else if(ph==='delivery'||(ph==='runup'&&game.t/RUNUP>.55)){ bat={...BACKLIFT,tilt:0,piv:1.18,yaw:0}; legs='trigger'; kb=1-Math.pow(1e-3,dt); }   // backlift as the bowler releases
    else { const tap=ph==='ready'||ph==='runup'?Math.max(0,Math.sin(game.t*4.2))*.06:0; bat={a:-.2-tap,w:-.45+tap,tilt:0,piv:1.18,yaw:0}; }   // stance, tapping the bat
    r.pose(POSE.bat(legs,legsU),kl);
    setBatAngles(r,bat.a,bat.w,bat.yaw,bat.tilt,kb,bat.piv); solveBatterArms(r,false);
  }
  // bowler
  if(ph==='runup'){ const u=game.t/RUNUP; if(u<.72){ BR.runPh=(BR.runPh||0)+dt*lerp(8,12,u); BR.pose(POSE.run(BR.runPh,lerp(.7,1,u)),k); } else BR.pose(bowlAction((u-.72)/.28*.6),1-Math.pow(1e-7,dt)); }
  else if(ph==='delivery'&&game.t<.7){ BR.pose(bowlAction(.6+clamp(game.t/.45,0,1)*.4),1-Math.pow(1e-6,dt)); }
  else if(ph==='ready'||ph==='menu'||ph==='result'){ BR.pose(POSE.stand(),ks); }
  // fielders, keeper and the bowler once the ball is in play
  const list=(ph==='live'||ph==='dead'||(ph==='delivery'&&game.t>=.7))?[...fielders,bowlerF]:fielders;
  for(const f of list){
    const r=f.rig, sp=speedOf(r.root,dt), isCh=L&&L.chaser===f&&(ph==='live'||ph==='dead'); let p, roll=0;
    if(isCh&&L.collectT!==undefined&&Math.abs(L.t-L.collectT)<.45&&(L.caught||L.dropped||L.caughtFree||L.fe.air)){ p=L.path.s[L.fe.i].y>1.3?POSE.catchHigh():POSE.catchLow(); }
    else if(isCh&&L.throwStart!==undefined&&L.t>L.collectT&&L.t<L.throwStart+.5){ p=POSE.throw(clamp((L.t-(L.throwStart-.35))/.8,0,1)); }
    else if(sp>.6){ f.ph+=dt*sp*1.25; p=POSE.run(f.ph,clamp(sp/7,.35,1)); }
    else if(f.def.keeper&&(ph==='runup'||ph==='delivery')) p=POSE.keeper();
    else if(ph==='runup'||ph==='delivery') p=POSE.ready();
    else if(isCh&&L.collectT!==undefined&&L.t>L.collectT) p=POSE.ready();
    else p=POSE.stand();
    if(isCh&&L.fe&&L.fe.margin<.9&&!f.def.keeper) roll=L.diveSide*1.25*clamp(1-Math.abs(L.t-L.collectT)/.55,0,1);
    r.pose(p,k); r.root.rotation.z=roll;
  }
  ump.t+=dt;
  umpire.pose(POSE.ump(ump.sig&&ump.t<2.6?ump.sig:null,ump.t),1-Math.pow(1e-4,dt));
  umpire2.pose(POSE.ump(null,0),ks);
  retargetAll();
}

export { prevPos, speedOf, bowlAction, animatePlayers };
