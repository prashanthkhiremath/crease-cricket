// scene.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { $, FC, G, PITCH, R_BOUND, clamp, pick, rand } from './config.js';
import { Snd } from './audio.js';

// ================= renderer & scene =================
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.8;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x141d38,170,420);
const camera=new THREE.PerspectiveCamera(14,1,.5,900);
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.75,metalness:0},o));
function canvasTex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
function glowTex(){return canvasTex(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,252,240,1)');g.addColorStop(.25,'rgba(255,245,215,.55)');g.addColorStop(1,'rgba(255,240,200,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});}
// sky dome: night sky with a warm glow above the stands
function skyMesh(){
  const g=new THREE.SphereGeometry(600,48,24), col=[], pos=g.attributes.position;
  const top=new THREE.Color(0x050a1c), mid=new THREE.Color(0x15224a), hor=new THREE.Color(0x4a4a6a);
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/600; const c=y>0.12?mid.clone().lerp(top,clamp((y-.12)/.5,0,1)):hor.clone().lerp(mid,clamp((y+.02)/.14,0,1)); col.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
}
scene.add(skyMesh());
// environment map for soft image-based light
{
  const env=new THREE.Scene(); env.add(skyMesh());
  const panel=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2; const m=new THREE.Mesh(new THREE.PlaneGeometry(90,50),panel); m.position.set(Math.cos(a)*300,260,Math.sin(a)*300); m.lookAt(0,0,0); env.add(m);}
  const gnd=new THREE.Mesh(new THREE.CircleGeometry(500,32),new THREE.MeshBasicMaterial({color:0x2d5a2c})); gnd.rotation.x=-Math.PI/2; gnd.position.y=-5; env.add(gnd);
  const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(env,.04).texture; pm.dispose();
}
scene.add(new THREE.HemisphereLight(0xb8c8ff,0x1e3a1c,.22*Math.PI));
// four floodlight towers: each lights the field, two cast shadows
const TOWERS=[0,1,2,3].map(i=>{const a=Math.PI/4+i*Math.PI/2+.12; return new THREE.Vector3(FC.x+Math.cos(a)*112,62,FC.z+Math.sin(a)*112);});
TOWERS.forEach((p,i)=>{
  const l=new THREE.DirectionalLight(0xfff4e2,(i<2?.62:.42)*Math.PI); l.position.copy(p); l.target.position.set(0,0,-8); scene.add(l.target); scene.add(l);
  if(i<2){ l.castShadow=true; l.shadow.mapSize.set(2048,2048); l.shadow.bias=-.0004; l.shadow.normalBias=.02; Object.assign(l.shadow.camera,{left:-72,right:72,top:72,bottom:-72,near:20,far:260}); }
});
// a tight, sharp shadow light over the pitch so the batter and bowler read clearly
const keyLight=new THREE.DirectionalLight(0xfff2dc,.38*Math.PI);
 keyLight.position.set(-25,60,-5);
 keyLight.target.position.set(0,0,-6);
keyLight.castShadow=true;
 keyLight.shadow.mapSize.set(2048,2048);
 keyLight.shadow.bias=-.0003;
 keyLight.shadow.normalBias=.015;
Object.assign(keyLight.shadow.camera,{left:-16,right:16,top:22,bottom:-22,near:20,far:120});
 scene.add(keyLight.target);
 scene.add(keyLight);
// outfield: mowing stripes, the square, worn areas
{
  const S=2048, R2=R_BOUND+14, ppm=S/(2*R2);
  const tex=canvasTex(S,S,(x,w,h)=>{
    x.fillStyle='#2f7a33'; x.fillRect(0,0,w,h);
    const sw=6*ppm; for(let i=0;i*sw<w;i++){ x.fillStyle=i%2?'rgba(255,255,255,.055)':'rgba(0,0,0,.05)'; x.fillRect(i*sw,0,sw,h); }
    for(let i=0;i*sw<h;i++){ x.fillStyle=i%2?'rgba(255,255,255,.025)':'rgba(0,0,0,.025)'; x.fillRect(0,i*sw,w,sw); }
    for(let i=0;i<60000;i++){ const v=Math.random(); x.fillStyle=v<.5?`rgba(20,60,20,${.05+Math.random()*.08})`:`rgba(150,200,90,${.03+Math.random()*.05})`; x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2); }
    // the square (block of pitches) around the match pitch
    const cx=w/2, cy=h/2; x.fillStyle='rgba(150,175,100,.12)'; x.fillRect(cx-11*ppm,cy-14*ppm,22*ppm,28*ppm);
    for(let k=-3;k<=3;k++){ if(!k) continue; x.fillStyle=`rgba(${k%2?170:140},${k%2?170:160},100,.1)`; x.fillRect(cx+(k*3.05-1.5)*ppm,cy-11*ppm,3*ppm,22*ppm); }
    // fielding wear in the ring
    for(const [dx,dz] of [[23,-8],[21,5],[-23,-4],[-9,21],[9,21],[-25,-11]]){ const g=x.createRadialGradient(cx+dx*ppm,cy+dz*ppm,0,cx+dx*ppm,cy+dz*ppm,3*ppm); g.addColorStop(0,'rgba(120,120,60,.18)'); g.addColorStop(1,'rgba(120,120,60,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); }
    // vignette near the rope
    const vg=x.createRadialGradient(cx,cy,R_BOUND*ppm*.8,cx,cy,R2*ppm); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(10,30,10,.35)'); x.fillStyle=vg; x.fillRect(0,0,w,h);
  });
  const g=new THREE.Mesh(new THREE.CircleGeometry(R2,128),mat(0xffffff,{map:tex,roughness:.95}));
  g.rotation.x=-Math.PI/2; g.position.set(FC.x,0,FC.z); g.receiveShadow=true; scene.add(g);
  const dg=new THREE.CircleGeometry(.2,10), dm=new THREE.MeshBasicMaterial({color:0xe8e8e2});
  for(let i=0;i<80;i++){const a=i/80*Math.PI*2, m=new THREE.Mesh(dg,dm); m.rotation.x=-Math.PI/2; m.position.set(FC.x+Math.cos(a)*27.4,.012,FC.z+Math.sin(a)*27.4); scene.add(m);}
}
// pitch: rolled clay, grass tint, cracks, foot marks, creases
{
  const W=3.05, L=24, zTop=FC.z-L/2; const px=512/W, pz=4096/L;
  const tex=canvasTex(512,4096,(x,w,h)=>{
    const gr=x.createLinearGradient(0,0,w,0); gr.addColorStop(0,'#a69866');gr.addColorStop(.18,'#c9b27c');gr.addColorStop(.5,'#d8c08a');gr.addColorStop(.82,'#c9b27c');gr.addColorStop(1,'#a69866');
    x.fillStyle=gr; x.fillRect(0,0,w,h);
    for(let i=0;i<40000;i++){const g=Math.random()<.35; x.fillStyle=g?`rgba(110,140,60,${Math.random()*.12})`:`rgba(90,62,32,${Math.random()*.1})`; x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2.5,1+Math.random()*2.5);}
    x.strokeStyle='rgba(80,55,30,.35)'; x.lineWidth=1.2;
    for(let i=0;i<70;i++){ let cx=Math.random()*w, cy=Math.random()*h; x.beginPath(); x.moveTo(cx,cy); for(let k=0;k<6;k++){cx+=rand(-14,14); cy+=rand(-30,30); x.lineTo(cx,cy);} x.stroke(); }
    for(const zc of [-1.9,-3.2,-PITCH+2.4]){ const g=x.createRadialGradient(w/2,(zc-zTop)*pz,0,w/2,(zc-zTop)*pz,1.1*pz); g.addColorStop(0,'rgba(120,85,45,.45)'); g.addColorStop(1,'rgba(120,85,45,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); }
    x.fillStyle='rgba(115,80,42,.3)'; for(let i=0;i<40;i++){ x.beginPath(); x.ellipse(w/2+rand(-.9,.9)*px,(rand(-PITCH+.6,-PITCH+3.5)-zTop)*pz,.09*px,.16*pz,0,0,7); x.fill(); }
    x.fillStyle='#fbfbf4'; const lw=.05*pz;
    const X=v=>(v+W/2)*px, Z=v=>(v-zTop)*pz;
    for(const zs of [0,-PITCH]){
      x.fillRect(X(-1.32),Z(zs)-lw/2,2.64*px,lw);
      const zp=zs===0?-1.22:-PITCH+1.22; x.fillRect(0,Z(zp)-lw/2,w,lw);
      for(const sx of [-1.32,1.32]){ const a=zs===0?Z(-1.22):Z(-PITCH-1.94), b=zs===0?Z(1.94):Z(-PITCH+1.22); x.fillRect(X(sx)-lw*.5,Math.min(a,b),lw,Math.abs(b-a)); }
      for(const sx of [-0.89,0.89]){ const z0=zs===0?Z(-1.22):Z(-PITCH+1.22); x.fillRect(X(sx)-lw/2,z0-(zs===0?0:.3*pz),lw,.3*pz); }
    }
  });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(W,L),mat(0xffffff,{map:tex,roughness:.9}));
  p.rotation.x=-Math.PI/2; p.position.set(0,.008,FC.z); p.receiveShadow=true; scene.add(p);
}
// stumps
const stumpSets=[];
function makeStumps(z){
  const grp=new THREE.Group(), sm=mat(0xf4efe2,{roughness:.45}), parts=[];
  const logo=mat(0x1f4fa8,{roughness:.4});
  for(const x of [-.095,0,.095]){const s=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.71,12),sm); s.position.set(x,.355,0); s.castShadow=true; const band=new THREE.Mesh(new THREE.CylinderGeometry(.0195,.0195,.12,12),logo); band.position.y=.08; s.add(band); grp.add(s); parts.push(s);}
  for(const x of [-.048,.048]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.105,8),mat(0xe9c46a,{roughness:.4})); b.rotation.z=Math.PI/2; b.position.set(x,.722,0); b.castShadow=true; grp.add(b); parts.push(b);}
  grp.position.z=z; scene.add(grp);
  const set={grp,parts,base:parts.map(p=>({p:p.position.clone(),r:p.rotation.clone()})),vel:null};
  stumpSets.push(set); return set;
}
const stumpsNear=makeStumps(0), stumpsFar=makeStumps(-PITCH);
function breakStumps(set,dir=1){ set.vel=set.parts.map((p,i)=>({v:new THREE.Vector3(rand(-1.5,1.5),rand(2,4)+(i>2?2:0),dir*rand(2.5,5)),w:new THREE.Vector3(rand(-8,8),rand(-8,8),rand(-8,8))})); Snd.stumps(); }
function resetStumps(set){ set.vel=null; set.parts.forEach((p,i)=>{p.position.copy(set.base[i].p);p.rotation.copy(set.base[i].r);}); }
function updateStumps(dt){ for(const s of stumpSets){ if(!s.vel) continue; s.parts.forEach((p,i)=>{const v=s.vel[i]; if(p.position.y<=.02&&v.v.y<0){v.v.multiplyScalar(.3);v.v.y=0;v.w.multiplyScalar(.3);} else v.v.y-=G*dt; p.position.addScaledVector(v.v,dt); p.position.y=Math.max(.02,p.position.y); p.rotation.x+=v.w.x*dt; p.rotation.z+=v.w.z*dt;}); } }
// stadium: rope, boards, two-tier stands with crowd, roof, floodlights, sightscreens
{
  const rope=new THREE.Mesh(new THREE.TorusGeometry(R_BOUND,.14,8,200),mat(0xf0f0f0,{roughness:.5}));
  rope.rotation.x=Math.PI/2; rope.position.set(FC.x,.12,FC.z); rope.castShadow=true; scene.add(rope);
  const boardTex=canvasTex(4096,96,(x,w,h)=>{
    const cols=['#0d1b3d','#ffc23d','#14532d','#c2342b','#16295a','#5b2178','#0f6e78','#e8e8e8'];const words=['CREASE CRICKET','FOUR','T20 NIGHTS','SIX','RUN CHASE','PLAY ON','BOUNDARY','FREE HIT'];
    for(let i=0;i<8;i++){x.fillStyle=cols[i];x.fillRect(i*w/8,0,w/8,h);const dark=i===1||i===7;x.fillStyle=dark?'#0d1b3d':'#ffffff';x.font='italic 800 58px "Arial Narrow", Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(words[i],i*w/8+w/16,h/2+3);}
  });
  boardTex.wrapS=THREE.RepeatWrapping; boardTex.repeat.set(-4,1);
  const boards=new THREE.Mesh(new THREE.CylinderGeometry(R_BOUND+4,R_BOUND+4,1.1,160,1,true),new THREE.MeshBasicMaterial({map:boardTex,side:THREE.DoubleSide,toneMapped:false}));
  boards.position.set(FC.x,.55,FC.z); scene.add(boards);
  const apron=new THREE.Mesh(new THREE.RingGeometry(R_BOUND+4,R_BOUND+11,128),mat(0x2a5530,{roughness:.95})); apron.rotation.x=-Math.PI/2; apron.position.set(FC.x,.02,FC.z); apron.receiveShadow=true; scene.add(apron);
  const crowdTex=(seed)=>{const t=canvasTex(2048,512,(x,w,h)=>{
    const seat=['#1c2a52','#7a1d2a','#1c2a52','#20304f'][seed%4]; x.fillStyle='#0d1222'; x.fillRect(0,0,w,h);
    const shirts=['#e8443a','#ffc23d','#3d7bff','#f4f4f4','#34c777','#ff8a3d','#9b4dff','#1f4fa8','#1f4fa8','#1f4fa8','#ffd23d','#e6e6e6','#2a2a2a'];
    const skins=['#c68a5e','#8d5a3b','#e0b08a','#6b4228','#f0c8a0'];
    const rows=24, rh=h/rows;
    for(let r=0;r<rows;r++){ x.fillStyle=seat; x.fillRect(0,r*rh+rh*.55,w,rh*.45); x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,r*rh+rh-2,w,2);
      for(let i=0;i<w/9;i++){ if(Math.random()<.12) continue; const cx=i*9+rand(-1.5,1.5), by=r*rh+rh*.9; x.fillStyle=pick(shirts); x.beginPath(); x.ellipse(cx,by-rh*.32,3.6,rh*.32,0,0,7); x.fill(); x.fillStyle=pick(skins); x.beginPath(); x.arc(cx,by-rh*.72,2.5,0,7); x.fill(); if(Math.random()<.05){x.fillStyle=pick(['#ffc23d','#ffffff','#3d7bff']); x.fillRect(cx-5,by-rh*1.15,10,6);} } }
  }); t.wrapS=THREE.RepeatWrapping; return t;};
  const tier=(r0,r1,y0,y1,rep,seed)=>{const g=new THREE.CylinderGeometry(r1,r0,y1-y0,160,1,true); const tx=crowdTex(seed); tx.repeat.set(-rep,1); const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:tx,side:THREE.BackSide,color:0x7d849a,roughness:1,emissive:0x111522,emissiveIntensity:.2})); m.position.set(FC.x,(y0+y1)/2,FC.z); scene.add(m); return m;};
  // perimeter wall
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(R_BOUND+11,R_BOUND+11,2.2,160,1,true),mat(0x1a2440,{side:THREE.BackSide})); wall.position.set(FC.x,1.1,FC.z); scene.add(wall);
  tier(R_BOUND+11,R_BOUND+33,2.2,14,9,0);
  const conc=new THREE.Mesh(new THREE.CylinderGeometry(R_BOUND+34,R_BOUND+33,2.4,160,1,true),new THREE.MeshBasicMaterial({color:0x0b1020,side:THREE.BackSide})); conc.position.set(FC.x,15.2,FC.z); scene.add(conc);
  // glowing LED ribbon along the tier front
  const ribTex=canvasTex(2048,32,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);for(let i=0;i<=8;i++)g.addColorStop(i/8,i%2?'#ffc23d':'#2a6bff');x.fillStyle=g;x.fillRect(0,0,w,h);}); ribTex.wrapS=THREE.RepeatWrapping; ribTex.repeat.set(-6,1);
  const rib=new THREE.Mesh(new THREE.CylinderGeometry(R_BOUND+33.5,R_BOUND+33.5,.9,160,1,true),new THREE.MeshBasicMaterial({map:ribTex,side:THREE.BackSide,toneMapped:false})); rib.position.set(FC.x,14.6,FC.z); scene.add(rib);
  tier(R_BOUND+34,R_BOUND+52,16.4,31,8,1);
  const roof=new THREE.Mesh(new THREE.CylinderGeometry(R_BOUND+40,R_BOUND+56,2.5,160,1,true),mat(0x1b2238,{side:THREE.DoubleSide})); roof.position.set(FC.x,35,FC.z); scene.add(roof);
  const roofUnder=new THREE.Mesh(new THREE.RingGeometry(R_BOUND+40,R_BOUND+56,160),new THREE.MeshBasicMaterial({color:0x0c111f,side:THREE.DoubleSide})); roofUnder.rotation.x=-Math.PI/2; roofUnder.position.set(FC.x,33.8,FC.z); scene.add(roofUnder);
  const gt=glowTex();
  for(const p of TOWERS){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.6,p.y,10),mat(0x3a4256,{metalness:.4,roughness:.5})); pole.position.set(p.x,p.y/2,p.z); scene.add(pole);
    const head=new THREE.Group(); head.position.copy(p); head.lookAt(FC.x,0,FC.z); scene.add(head);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(14,8,.8),mat(0x2a3040,{metalness:.5})); head.add(frame);
    for(let r=0;r<3;r++)for(let c=0;c<6;c++){ const b=new THREE.Mesh(new THREE.CircleGeometry(.85,16),new THREE.MeshBasicMaterial({color:0xfffbea,toneMapped:false})); b.position.set(-5.5+c*2.2,-2.4+r*2.4,.45); head.add(b); }
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,transparent:true,depthWrite:false,fog:false,toneMapped:false,blending:THREE.AdditiveBlending,opacity:.9}));
    glow.scale.set(46,46,1); glow.position.copy(p); scene.add(glow);
  }
  for(const zz of [FC.z+R_BOUND+7, FC.z-R_BOUND-7]){const s=new THREE.Mesh(new THREE.BoxGeometry(18,8,.5),mat(0x0c0e14,{roughness:.9})); s.position.set(0,4,zz); scene.add(s);}
}

export { canvas, renderer, scene, camera, mat, canvasTex, glowTex, skyMesh, TOWERS, keyLight, stumpSets, makeStumps, stumpsNear, stumpsFar, breakStumps, resetStumps, updateStumps };
