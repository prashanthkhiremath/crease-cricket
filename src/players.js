// players.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { buildBat, buildGlove, GRIP_TOP, GRIP_BOT } from './batgear.js';
import { FIELD_PACE, PITCH, clamp, lerp, pick, smooth } from './config.js';
import { canvasTex, mat, scene } from './scene.js';

// ================= players: jointed rigs =================
const TEAM_BAT={shirt:'#1f4fa8',trim:'#ffc23d',pants:0x1a2f66,helmet:0x0d1b3d};
const TEAM_FIELD={shirt:'#8a1c2b',trim:'#f2f2f2',pants:0x5a1020,cap:0x3a0b14};
const SKINS=[0xc68a5e,0x8d5a3b,0xe0b08a,0x6b4228,0xb27650];
const DOWN=new THREE.Vector3(0,-1,0);
function capsule(r1,r2,len,seg=12){ // top radius r1 at y=0, bottom radius r2 at y=-len
  const pts=[]; const n=6;
  for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*r2, -len+Math.sin(a)*r2));}
  for(let i=0;i<=n;i++){const a=i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*r1, Math.sin(a)*r1));}
  return new THREE.LatheGeometry(pts,seg);
}
function shirtTex(base,trim,num){ return canvasTex(512,256,(x,w,h)=>{
  x.fillStyle=base; x.fillRect(0,0,w,h);
  const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(0,0,0,.18)'); x.fillStyle=g; x.fillRect(0,0,w,h);
  x.fillStyle=trim; x.fillRect(w*.23,0,w*.035,h); x.fillRect(w*.735,0,w*.035,h); x.fillRect(0,0,w,h*.06);
  x.fillStyle=trim; x.font='800 120px "Saira Condensed","Arial Narrow",Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(num),w*.5,h*.45);
  x.font='700 30px Arial'; x.fillText('XI',w*.02,h*.35); x.fillText('XI',w*.98,h*.35);
}); }
let rigCount=0;
class Rig{
  constructor(o){
    this.o=o; const root=this.root=new THREE.Group(); root.rotation.order='YXZ';
    this.skinHex=o.skin||pick(SKINS); const skin=mat(this.skinHex,{roughness:.6});
    const shirt=mat(0xffffff,{map:shirtTex(o.shirt,o.trim,o.num||(++rigCount%40)+1),roughness:.8});
    const sleeve=mat(new THREE.Color(o.shirt).getHex(),{roughness:.8});
    const pants=mat(o.pants,{roughness:.85});
    const pad=mat(0xf3f1ea,{roughness:.6}), shoe=mat(0xf5f5f5,{roughness:.5});
    const J=this.j={};
    const add=(parent,name,x,y,z)=>{const g=new THREE.Group(); g.position.set(x,y,z); parent.add(g); if(name) J[name]=g; return g;};
    const mesh=(parent,geo,m,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const me=new THREE.Mesh(geo,m); me.position.set(x,y,z); me.scale.set(sx,sy,sz); me.castShadow=true; me.userData.drv=true; parent.add(me); return me;};
    this.dim={thigh:.44,shin:.44,foot:.105,hipDrop:0,upper:.3,fore:.31};
    const hips=add(root,'hips',0,.98,0);
    mesh(hips,new THREE.SphereGeometry(.16,16,12),pants,0,-.02,0,1.15,.75,.85);
    for(const s of [1,-1]){
      const side=s>0?'l':'r';
      const th=add(hips,side+'Thigh',.1*s,-.03,0);
      mesh(th,capsule(.085,.065,.44),o.pads?pad:pants);
      if(o.pads){ mesh(th,new THREE.BoxGeometry(.13,.2,.04),pad,0,-.25,.07); }
      const sh=add(th,side+'Shin',0,-.44,0);
      mesh(sh,capsule(.064,.048,.43),o.pads?pad:pants);
      if(o.pads){ mesh(sh,new THREE.BoxGeometry(.17,.5,.09),pad,0,-.22,.055); for(const px of [-.05,0,.05]) mesh(sh,new THREE.CylinderGeometry(.012,.012,.46,6),pad,px,-.22,.105); mesh(sh,new THREE.BoxGeometry(.18,.1,.11),pad,0,.02,.05); }
      const ft=add(sh,side+'Foot',0,-.44,0);
      mesh(ft,new THREE.BoxGeometry(.1,.07,.26),shoe,0,-.035,.06);
    }
    const spine=add(hips,'spine',0,.06,0);
    mesh(spine,new THREE.CylinderGeometry(.15,.155,.24,14),sleeve,0,.1,0,1.15,1,.82);
    const chest=add(spine,'chest',0,.2,0);
    { const prof=[[.0,-.04],[.155,-.04],[.175,.08],[.2,.22],[.205,.3],[.175,.37],[.09,.42],[.055,.43]].map(p=>new THREE.Vector2(p[0],p[1]));
      const tg=new THREE.LatheGeometry(prof,20); mesh(chest,tg,shirt,0,0,0,1.15,1,.8); }
    const neck=add(chest,'neck',0,.41,0);
    mesh(neck,new THREE.CylinderGeometry(.05,.055,.1,10),skin,0,.03,0);
    const head=add(neck,'head',0,.09,0);
    mesh(head,new THREE.SphereGeometry(.105,18,14),skin,0,.06,.005,.92,1.1,1);
    mesh(head,new THREE.BoxGeometry(.03,.04,.03),skin,0,.05,.1);              // nose
    mesh(head,new THREE.SphereGeometry(.104,16,10,0,Math.PI*2,0,Math.PI*.45),mat(0x1c1410,{roughness:.9}),0,.075,-.01,.95,1.05,1.02); // hair
    if(o.helmet){
      const hm=mat(o.helmet,{roughness:.35,metalness:.1});
      mesh(head,new THREE.SphereGeometry(.13,18,12,0,Math.PI*2,0,Math.PI*.55),hm,0,.07,-.01,1,1.05,1.08);
      mesh(head,new THREE.BoxGeometry(.2,.015,.08),hm,0,.1,.13);
      const gr=mat(0xb8bcc4,{metalness:.8,roughness:.3});
      for(const gy of [.03,-.01,-.05]){ const t=new THREE.Mesh(new THREE.TorusGeometry(.12,.006,6,16,Math.PI),gr); t.rotation.x=Math.PI/2; t.rotation.z=Math.PI; t.position.set(0,gy+.02,.02); t.scale.set(1,1.15,1); head.add(t);}
    } else if(o.cap){
      const cm=mat(o.cap,{roughness:.7});
      mesh(head,new THREE.SphereGeometry(.112,16,10,0,Math.PI*2,0,Math.PI*.5),cm,0,.08,0,1,.9,1.05);
      mesh(head,new THREE.CylinderGeometry(.09,.09,.01,16,1,false,-Math.PI/2,Math.PI),cm,0,.085,.07,1,1,1.1);
    } else if(o.hat){
      const hm=mat(o.hat,{roughness:.8}); mesh(head,new THREE.CylinderGeometry(.17,.17,.012,20),hm,0,.11,0); mesh(head,new THREE.CylinderGeometry(.1,.11,.08,16),hm,0,.15,0);
    }
    for(const s of [1,-1]){
      const side=s>0?'l':'r';
      const up=add(chest,side+'Upper',.205*s,.33,0);
      mesh(up,new THREE.SphereGeometry(.07,12,10),sleeve,0,0,0,1,.9,1);
      mesh(up,capsule(.058,.047,.3),sleeve);
      const fo=add(up,side+'Fore',0,-.3,0);
      mesh(fo,capsule(.046,.038,.27),o.longSleeve?sleeve:skin);
      const hd=add(fo,side+'Hand',0,-.28,0);
      mesh(hd,new THREE.SphereGeometry(o.gloves?.058:.045,10,8),o.gloves?mat(o.gloves,{roughness:.6}):skin,0,-.02,0,1,1.2,.85);
    }
    this.cur={};
    this.legs=[['lThigh','lShin'],['rThigh','rShin']];
    scene.add(root);
  }
  pose(p,k){
    for(const n in this.j){ if(n==='hips') continue; const t=p[n]||ZERO3, r=this.j[n].rotation; r.x+=(t[0]-r.x)*k; r.y+=(t[1]-r.y)*k; r.z+=(t[2]-r.z)*k; }
    const hr=p.hipsR||ZERO3, h=this.j.hips.rotation; h.x+=(hr[0]-h.x)*k; h.y+=(hr[1]-h.y)*k; h.z+=(hr[2]-h.z)*k;
    // keep the lower foot on the ground
    let hy=0; for(const [a,b] of this.legs){ const ta=this.j[a].rotation, tb=this.j[b].rotation; const c=Math.cos(ta.z)*Math.cos(h.x*.5); const D=this.dim, v=D.hipDrop+D.thigh*Math.cos(ta.x)*c+D.shin*Math.cos(ta.x+tb.x)*c+D.foot; if(v>hy) hy=v; }
    this.j.hips.position.y=hy+(p.lift||0);
  }
  // match the rig's proportions to a character model (joint positions measured in its rest pose, metres)
  fitTo(m){
    const J=this.j, D=this.dim;
    for(const [s,k] of [[1,'l'],[-1,'r']]){
      J[k+'Thigh'].position.set(m.upLegX*s,-m.hipDrop,0); J[k+'Shin'].position.y=-m.thigh; J[k+'Foot'].position.y=-m.shin;
      J[k+'Upper'].position.set(m.shoulderX*s,m.shoulderY-m.chestY,m.shoulderZ); J[k+'Fore'].position.y=-m.upper; J[k+'Hand'].position.y=-m.fore;
    }
    J.spine.position.y=.06; J.chest.position.y=m.chestY-m.hipY-.06;
    J.neck.position.y=m.neckY-m.chestY; J.head.position.y=m.headY-m.neckY;
    Object.assign(D,{thigh:m.thigh,shin:m.shin,foot:m.ankleY,hipDrop:m.hipDrop,upper:m.upper,fore:m.fore});
  }
  face(x,z){ this.root.rotation.y=Math.atan2(x-this.root.position.x,z-this.root.position.z); }
  ik(side,target,pole){
    const up=this.j[side+'Upper'], fo=this.j[side+'Fore'], chest=up.parent;
    const t=chest.worldToLocal(_v1.copy(target)), s=up.position;
    const d=_v2.copy(t).sub(s); const L1=this.dim.upper, L2=this.dim.fore; let len=clamp(d.length(),.08,L1+L2-.002); d.setLength(len);
    const A=Math.acos(clamp((L1*L1+len*len-L2*L2)/(2*L1*len),-1,1));
    const n=_v3.copy(d).cross(pole).normalize();
    const ud=_v4.copy(d).normalize().applyAxisAngle(n,A);
    up.quaternion.setFromUnitVectors(DOWN,ud);
    const elbow=_v5.copy(s).addScaledVector(ud,L1);
    const fd=_v6.copy(s).add(d).sub(elbow).normalize().applyQuaternion(_q1.copy(up.quaternion).invert());
    fo.quaternion.setFromUnitVectors(DOWN,fd);
  }
}
const ZERO3=[0,0,0];
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3(),_v4=new THREE.Vector3(),_v5=new THREE.Vector3(),_v6=new THREE.Vector3(),_q1=new THREE.Quaternion();
// ---- pose library (Euler XYZ, radians; +x rotation swings a limb backwards)
const POSE={
  stand:()=>({lUpper:[.05,0,.1],rUpper:[.05,0,-.1],lFore:[-.2,0,0],rFore:[-.2,0,0],lThigh:[0,0,.04],rThigh:[0,0,-.04]}),
  run(ph,a){ const s=Math.sin(ph), c=Math.cos(ph);
    return {spine:[.2*a,0,0],neck:[-.1*a,0,0],lThigh:[-s*.95*a,0,0],rThigh:[s*.95*a,0,0],lShin:[(Math.max(0,c)*1.5+.2)*a,0,0],rShin:[(Math.max(0,-c)*1.5+.2)*a,0,0],
      lFoot:[-.2*a,0,0],rFoot:[-.2*a,0,0],lUpper:[s*.9*a,0,.12],rUpper:[-s*.9*a,0,-.12],lFore:[-1.35*a,0,0],rFore:[-1.35*a,0,0],lift:Math.abs(c)*.05*a}; },
  ready:()=>({spine:[.55,0,0],neck:[-.5,0,0],lThigh:[-.55,0,.22],rThigh:[-.55,0,-.22],lShin:[.95,0,0],rShin:[.95,0,0],lFoot:[-.4,0,0],rFoot:[-.4,0,0],lUpper:[-.55,0,.25],rUpper:[-.55,0,-.25],lFore:[-.6,0,0],rFore:[-.6,0,0]}),
  keeper:()=>({spine:[.5,0,0],neck:[-.55,0,0],lThigh:[-1.35,0,.38],rThigh:[-1.35,0,-.38],lShin:[2.05,0,0],rShin:[2.05,0,0],lFoot:[-.7,0,0],rFoot:[-.7,0,0],lUpper:[-1.0,0,.15],rUpper:[-1.0,0,-.15],lFore:[-.5,0,-.4],rFore:[-.5,0,.4]}),
  catchHigh:()=>({spine:[-.1,0,0],neck:[-.5,0,0],lUpper:[-2.7,0,.15],rUpper:[-2.7,0,-.15],lFore:[-.3,0,0],rFore:[-.3,0,0],lThigh:[-.2,0,.1],rThigh:[.1,0,-.1],lShin:[.3,0,0],rShin:[.3,0,0]}),
  catchLow:()=>({spine:[.8,0,0],neck:[-.6,0,0],lUpper:[-1.2,0,.1],rUpper:[-1.2,0,-.1],lFore:[-.2,0,0],rFore:[-.2,0,0],lThigh:[-.9,0,.2],rThigh:[-.3,0,-.2],lShin:[1.3,0,0],rShin:[1.3,0,0]}),
  throw(u){ const a=u<.45?u/.45:1, b=u<.45?0:(u-.45)/.55;
    return {spine:[lerp(-.1,.45,b),lerp(.5,-.4,b),0],chest:[0,lerp(.5,-.5,b),0],lUpper:[lerp(0,-1.4,a)+b*1.4,0,.3],rUpper:[lerp(0,2.4,a)+b*2.6,0,-.25],rFore:[lerp(0,-1.2,a)+b*1.2,0,0],
      lThigh:[lerp(0,-.6,a),0,.15],rThigh:[lerp(0,.3,a),0,-.1],lShin:[.3,0,0],rShin:[.5,0,0]}; },
  ump(sig,t){ const w=Math.sin(t*9)*.5;
    if(sig==='out') return {lUpper:[.05,0,.1],rUpper:[Math.PI,0,0],rFore:[0,0,0],lFore:[-.2,0,0]};
    if(sig==='six') return {lUpper:[Math.PI,0,0],rUpper:[Math.PI,0,0]};
    if(sig==='four') return {rUpper:[w,0,-Math.PI/2],rFore:[0,0,0],lUpper:[.05,0,.1]};
    if(sig==='wide') return {lUpper:[0,0,Math.PI/2],rUpper:[0,0,-Math.PI/2]};
    if(sig==='nb') return {rUpper:[0,0,-Math.PI/2],lUpper:[.05,0,.1]};
    return {lUpper:[.05,0,.12],rUpper:[.05,0,-.12],lFore:[-.9,0,-.4],rFore:[-.9,0,.4],spine:[.08,0,0]}; },
  // batter lower body; arms are solved by IK onto the bat handle
  bat(kind,u){
    const S={spine:[.32,0,0],chest:[0,-.15,0],neck:[0,1.1,0],head:[-.05,.2,0],lThigh:[-.2,0,.22],rThigh:[-.15,0,-.2],lShin:[.42,0,0],rShin:[.36,0,0],lFoot:[-.2,-.4,0],rFoot:[-.2,-.3,0],hipsR:[0,-.1,0]};
    if(kind==='stance') return S;
    if(kind==='trigger') return Object.assign({},S,{lThigh:[-.25,0,.3],rThigh:[-.2,0,-.24],lShin:[.5,0,0],rShin:[.45,0,0],spine:[.36,0,0]});
    if(kind==='front') { const k=smooth(u); return Object.assign({},S,{spine:[.32+.26*k,0,-.2*k],chest:[0,-.15-.3*k,0],lThigh:[-.25-.28*k,0,.22+.62*k],lShin:[.42+.32*k,0,0],lFoot:[-.2-.25*k,-.4,0],rThigh:[-.1,0,-.2-.26*k],rShin:[.36+.55*k,0,0],rFoot:[.45*k,-.3,0],neck:[0,1.1-.15*k,0],head:[-.05-.12*k,.2,0]}); }
    if(kind==='backdef') { const k=smooth(u); return Object.assign({},S,{spine:[.22,0,.06*k],chest:[0,-.12,0],lThigh:[-.08,0,.14],lShin:[.25,0,0],rThigh:[-.22*k,0,-.22-.22*k],rShin:[.3,0,0],neck:[0,1.05,0],head:[-.12*k,.2,0],hipsR:[0,-.1,0]}); }
    if(kind==='cut') { const k=smooth(u); return Object.assign({},S,{spine:[.38,0,.1*k],chest:[0,-.15-.28*k,0],lThigh:[-.06,0,.14],lShin:[.3,0,0],rThigh:[-.42*k,0,-.24-.2*k],rShin:[.42,0,0],rFoot:[-.2,-.3-.4*k,0],neck:[0,1.05,0],head:[-.1*k,.2,0]}); }
    if(kind==='pull') { const k=smooth(u); return Object.assign({},S,{spine:[.16,0,.12*k],chest:[0,-.15+.65*k,0],lThigh:[-.05,0,.15+.25*k],lShin:[.25,0,0],rThigh:[-.12*k,0,-.36*k],rShin:[.3,0,0],neck:[0,1.0-.55*k,0],hipsR:[0,-.1+.65*k,0]}); }
    if(kind==='sweep') { const k=smooth(u); return Object.assign({},S,{spine:[.32+.38*k,0,-.12*k],chest:[0,-.15-.2*k,0],lThigh:[-.22-1.1*k,0,.22+.25*k],lShin:[.42+1.25*k,0,0],lFoot:[-.2,-.4,0],rThigh:[.32*k,0,-.2-.12*k],rShin:[.36+1.55*k,0,0],rFoot:[.4*k,-.3,0],neck:[0,1.05,0],head:[-.18*k,.2,0]}); }
    if(kind==='back') { const k=smooth(u); return Object.assign({},S,{spine:[.15,0,.12*k],chest:[0,-.15+.6*k,0],lThigh:[-.05,0,.15],lShin:[.2,0,0],rThigh:[-.1,0,-.45*k],rShin:[.25,0,0],neck:[0,1.0-.5*k,0],hipsR:[0,-.1+.5*k,0]}); }
    if(kind==='charge') return Object.assign({},S,{lThigh:[-.4,0,.45],rThigh:[.1,0,-.1],lShin:[.6,0,0],rShin:[.8,0,0]});
    return S;
  },
};
// bat pieces live on the batter root so the shot plane can be steered; hands follow by IK
function makeBatter(){
  const r=new Rig({shirt:TEAM_BAT.shirt,trim:TEAM_BAT.trim,pants:TEAM_BAT.pants,pads:true,helmet:TEAM_BAT.helmet,gloves:0xf4f4f4,longSleeve:true,num:rigCount+7});
  const yaw=new THREE.Group(); yaw.position.set(-.02,1.18,.3); r.root.add(yaw);
  const sw=new THREE.Group(); yaw.add(sw);
  const wrist=new THREE.Group(); wrist.position.set(0,-.42,0); sw.add(wrist);
  buildBat(wrist);
  const top=buildGlove(wrist,GRIP_TOP,0x16295a), bot=buildGlove(wrist,GRIP_BOT,0x16295a);
  // IK targets are the gloves' cuffs, so the hands always stay on the handle
  r.bat={yaw,sw,wrist,gTop:top.anchor,gBot:bot.anchor,gloveTop:top.glove,gloveBot:bot.glove,a:-.2,w:-.4,tilt:0,yawv:0,piv:1.18};
  return r;
}
function setBatAngles(r,a,w,yaw,tilt,k=1,piv=1.18){ const b=r.bat; b.a+=(a-b.a)*k; b.w+=(w-b.w)*k; b.yawv+=(yaw-b.yawv)*k; b.tilt+=((tilt||0)-b.tilt)*k; b.piv+=(piv-b.piv)*k; b.sw.rotation.z=b.a; b.wrist.rotation.z=b.w; b.yaw.rotation.y=b.yawv; b.yaw.rotation.x=b.tilt; b.yaw.position.y=b.piv; }
const POLE_L=new THREE.Vector3(1,-.6,.4), POLE_R=new THREE.Vector3(-.4,-1,.3), POLE_RUN=new THREE.Vector3(0,-1,-.5);
function solveBatterArms(r,oneHand){
  r.oneHand=!!oneHand;
  r.root.updateMatrixWorld(true);
  const top=r.bat.gTop.getWorldPosition(_tA), bot=r.bat.gBot.getWorldPosition(_tB);
  r.ik('r',bot,POLE_R); if(!oneHand) r.ik('l',top,POLE_L);
}
const _tA=new THREE.Vector3(), _tB=new THREE.Vector3();
const SR=makeBatter(), NR=makeBatter();
 const striker=SR.root, nonStriker=NR.root;
const BR=new Rig({shirt:TEAM_FIELD.shirt,trim:TEAM_FIELD.trim,pants:TEAM_FIELD.pants,num:9});
 const bowler=BR.root;
const bowlerF={rig:BR,m:bowler,home:new THREE.Vector3(),def:{n:'Bowler'},ph:0};
const umpire=new Rig({shirt:'#f2f2ee',trim:'#d9d9d2',pants:0x15151a,hat:0xf2f2ee,num:''});
 umpire.root.position.set(0,0,-PITCH-2.6);
const umpire2=new Rig({shirt:'#f2f2ee',trim:'#d9d9d2',pants:0x15151a,hat:0xf2f2ee,num:''});
 umpire2.root.position.set(-29,0,-1.2);
 umpire2.root.rotation.y=Math.PI/2;
const fielders=FIELD_PACE.map((f,i)=>{ const r=new Rig(i===0?{shirt:'#2b2b2b',trim:'#ffc23d',pants:0x2b2b2b,pads:true,helmet:0x2b2b2b,gloves:0xf0f0f0,num:1}:{shirt:TEAM_FIELD.shirt,trim:TEAM_FIELD.trim,pants:TEAM_FIELD.pants,cap:TEAM_FIELD.cap,num:i+10}); return {rig:r,m:r.root,home:new THREE.Vector3(),def:f,st:'ready',ph:Math.random()*6}; });
const ump={sig:null,t:0};
function signal(s){ ump.sig=s; ump.t=0; }
// ball, shadow, trail
const ball=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x777777,roughness:.35}));
ball.castShadow=true;
 scene.add(ball);
const bshadow=new THREE.Mesh(new THREE.CircleGeometry(.08,12),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false}));
bshadow.rotation.x=-Math.PI/2;
 scene.add(bshadow);
const TRAIL=24, trailPos=new Float32Array(TRAIL*3), trailGeo=new THREE.BufferGeometry();
trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.45}));
trail.frustumCulled=false;
 scene.add(trail);
let trailN=0;
function pushTrail(p){ trailPos.copyWithin(3,0,(TRAIL-1)*3); trailPos[0]=p.x;trailPos[1]=p.y;trailPos[2]=p.z; trailN=Math.min(TRAIL,trailN+1); for(let i=trailN;i<TRAIL;i++){trailPos[i*3]=p.x;trailPos[i*3+1]=p.y;trailPos[i*3+2]=p.z;} trailGeo.attributes.position.needsUpdate=true; }
function clearTrail(){ trailN=0; }
// ball-tracking projection line
const trackGeo=new THREE.BufferGeometry();
 const trackLine=new THREE.Line(trackGeo,new THREE.LineBasicMaterial({color:0xff4d4d,linewidth:2}));
 trackLine.visible=false;
 trackLine.frustumCulled=false;
 scene.add(trackLine);
function setBallPos(v){ ball.position.copy(v); bshadow.position.set(v.x,.012,v.z); bshadow.visible=ball.visible; }

export { TEAM_BAT, TEAM_FIELD, SKINS, DOWN, capsule, shirtTex, rigCount, Rig, ZERO3, _v1, _v2, _v3, _v4, _v5, _v6, _q1, POSE, makeBatter, setBatAngles, POLE_L, POLE_R, POLE_RUN, solveBatterArms, _tA, _tB, SR, NR, striker, nonStriker, BR, bowler, bowlerF, umpire, umpire2, fielders, ump, signal, ball, bshadow, TRAIL, trailPos, trailGeo, trail, trailN, pushTrail, clearTrail, trackGeo, trackLine, setBallPos };
