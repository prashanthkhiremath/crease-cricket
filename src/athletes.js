// athletes.js — generated from the prototype; edit freely.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { clamp } from './config.js';
import { canvasTex, mat } from './scene.js';
import { BR, NR, POLE_L, POLE_R, SR, _tA, _tB, _v1, _v2, fielders, umpire, umpire2 } from './players.js';
import { applyKits } from './bowlmode.js';

// ================= skinned athletes (retargeted from the pose rigs) =================
const SKIN={src:null,regions:null};
const _w1=new THREE.Vector3(),_w2=new THREE.Vector3(),_w3=new THREE.Vector3(),_wq1=new THREE.Quaternion(),_wq2=new THREE.Quaternion(),_m1=new THREE.Matrix4(),_m2=new THREE.Matrix4();
function regionOf(n){ n=n.replace(/mixamorig:?/,'');
  if(/Head|Neck|Eye/.test(n)) return 0; if(/Hand/.test(n)) return 3; if(/ForeArm/.test(n)) return 2;
  if(/Arm|Shoulder|Spine/.test(n)) return 1; if(/Foot|Toe/.test(n)) return 5; return 4; }
// Realistic squad generated with MakeHuman/MPFB2 (see tools/athletes): seven players and an umpire.
const ROSTER=['p1','p2','p3','p4','p5','p6','p7'];
function loadAthletes(){
  const loader=new GLTFLoader(), base=import.meta.env.BASE_URL+'models/players/';
  Promise.all([...ROSTER,'ump'].map(k=>loader.loadAsync(base+k+'.json').then(g=>[k,g.scene])))
    .then(list=>{
      SKIN.variants=Object.fromEntries(list); SKIN.src=SKIN.variants.p1;
      ALL_RIGS().forEach((r,i)=>{ try{ attachAthlete(r,SKIN.variants[(r===umpire||r===umpire2)?'ump':ROSTER[(i*3+1)%ROSTER.length]],true); }catch(e){ console.warn('player setup failed',e); } });
      applyKits();
    })
    .catch(e=>{ console.warn('squad models unavailable, trying the mannequin',e); loadMannequin(); });
}
function loadMannequin(){
  new GLTFLoader().load(import.meta.env.BASE_URL+'models/xbot.json',g=>{
    try{
      g.scene.traverse(o=>{ if(!o.isSkinnedMesh) return;
        const geo=o.geometry, si=geo.attributes.skinIndex, sw=geo.attributes.skinWeight, bones=o.skeleton.bones, reg=new Float32Array(si.count);
        for(let i=0;i<si.count;i++){ const ws=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)], is=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)]; let best=0,bw=-1; for(let c=0;c<4;c++){ if(ws[c]>bw){bw=ws[c];best=is[c];} } reg[i]=regionOf(bones[best].name); }
        geo.setAttribute('region',new THREE.BufferAttribute(reg,1));
      });
      SKIN.src=g.scene;
      for(const r of ALL_RIGS()) attachAthlete(r,SKIN.src,false);
      applyKits();
    }catch(e){ console.warn('athlete setup failed',e); }
  },undefined,e=>console.warn('athlete model unavailable, using simple players',e));
}
function kitMaterial(pal){
  const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.72,metalness:0});
  const cols=pal.map(c=>new THREE.Color(c));
  m.onBeforeCompile=sh=>{
    cols.forEach((c,i)=>sh.uniforms['kc'+i]={value:c});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float region; varying float vRegion;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRegion=region;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 kc0,kc1,kc2,kc3,kc4,kc5; varying float vRegion;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );','float rg=floor(vRegion+.5); vec3 kc=kc0; if(rg>.5)kc=kc1; if(rg>1.5)kc=kc2; if(rg>2.5)kc=kc3; if(rg>3.5)kc=kc4; if(rg>4.5)kc=kc5; vec4 diffuseColor = vec4( kc, opacity );');
  };
  m.userData.cols=cols; return m;
}
function attachAt(bone,obj,root,off,rotY=0){ // place obj (built in metres, world-aligned) relative to a bone in the rest pose
  root.updateMatrixWorld(true);
  const bw=_w1.setFromMatrixPosition(bone.matrixWorld).add(off);
  _m1.compose(bw,_wq1.setFromAxisAngle(_w2.set(0,1,0),rotY),_w3.set(1,1,1));
  _m2.copy(bone.matrixWorld).invert().multiply(_m1);
  obj.applyMatrix4(_m2); bone.add(obj); obj.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
}
function numberDecal(num,col){ const t=canvasTex(128,128,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle=col;x.font='800 92px "Saira Condensed","Arial Narrow",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(num),w/2,h/2+4);});
  return new THREE.Mesh(new THREE.PlaneGeometry(.2,.2),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})); }
// MakeHuman's eye texture keeps the clear cornea in a transparent circle (bottom right); the JPEG export loses
// that alpha, so cut the cornea out with a matching mask (glTF UVs: image top-left origin, no flip)
let _cornea=null;
function corneaMask(){ if(_cornea) return _cornea;
  const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,256,256); x.fillStyle='#000'; x.beginPath(); x.arc(256*.94,256*.94,256*.075,0,7); x.fill();
  _cornea=new THREE.CanvasTexture(c); _cornea.flipY=false; return _cornea; }
function attachAthlete(r,src,roster){
  const o=r.o, sc=SkeletonUtils.clone(src); sc.updateMatrixWorld(true);
  const B={}; sc.traverse(n=>{ if(n.isBone) B[n.name.replace(/mixamorig:?/,'')]=n; });
  if(!B.Hips||!B.LeftArm) return;
  const shirt=new THREE.Color(o.shirt).getHex(); let m=null, kit=null;
  if(roster){
    // textured body; clothing meshes get the team colours
    const umpireKit=r===umpire||r===umpire2;
    kit={shirt:mat(shirt,{roughness:.82,side:THREE.DoubleSide}),pants:mat(o.pants,{roughness:.85,side:THREE.DoubleSide}),shoes:mat(umpireKit?0x1a1a1a:0xf2f2f2,{roughness:.5,side:THREE.DoubleSide})};
    sc.traverse(n=>{ if(!n.isSkinnedMesh) return; n.castShadow=true; n.frustumCulled=false;
      const nm=(n.name+' '+(n.parent?n.parent.name:'')).toLowerCase();
      if(nm.includes('shirt')) n.material=kit.shirt; else if(nm.includes('pants')) n.material=kit.pants; else if(nm.includes('shoes')) n.material=kit.shoes;
      else if(n.material&&n.material.name==='eyes'){ n.material.alphaMap=corneaMask(); n.material.alphaTest=.5; n.material.roughness=.2; }
      else if(n.material){ n.material.roughness=Math.max(.5,n.material.roughness||0); n.material.metalness=0; } });
  } else {
    const skin=r.skinHex;
    m=kitMaterial([skin, shirt, o.longSleeve?shirt:skin, o.gloves||skin, o.pants, o.shoes||0xf2f2f2]);
    sc.traverse(n=>{ if(n.isSkinnedMesh){ n.material=m; n.castShadow=true; n.frustumCulled=false; } });
  }
  // measure this model in its rest pose so kit pieces fit any head and body size
  const H=B.Head; let capMat=null;
  const hb=H.getWorldPosition(new THREE.Vector3()), v=new THREE.Vector3();
  let headTop=-1, hx=0, hz=0, hn=0, backZ=1e9; const chestY=B.Spine2.getWorldPosition(new THREE.Vector3()).y;
  sc.traverse(n=>{ if(!n.isSkinnedMesh) return; const pa=n.geometry.attributes.position, nm=(n.name+' '+(n.parent?n.parent.name:'')).toLowerCase();
    for(let i=0;i<pa.count;i+=3){ v.fromBufferAttribute(pa,i); n.applyBoneTransform(i,v); v.applyMatrix4(n.matrixWorld);
      if(v.y>headTop) headTop=v.y;
      if(v.y>hb.y+.04){ hx+=v.x; hz+=v.z; hn++; }
      if((nm.includes('shirt')||!roster)&&Math.abs(v.y-chestY)<.06&&Math.abs(v.x)<.06&&v.z<backZ) backZ=v.z; } });
  const headC=new THREE.Vector3(hn?hx/hn-hb.x:0,0,hn?hz/hn-hb.z:0);
  const fitY=(below)=>headTop-below-hb.y;
  if(o.helmet){ const g=new THREE.Group(), hm=mat(o.helmet,{roughness:.35,metalness:.1}), gr=mat(0xb8bcc4,{metalness:.8,roughness:.3});
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.128,20,14,0,Math.PI*2,0,Math.PI*.56),hm); dome.scale.set(1,1.02,1.12); g.add(dome);
    const peak=new THREE.Mesh(new THREE.BoxGeometry(.2,.014,.08),hm); peak.position.set(0,.02,.15); peak.rotation.x=.18; g.add(peak);
    const gb=roster?[[-.05,.106],[-.092,.096]]:[[-.03,.118],[-.07,.118],[-.11,.118]];
    for(const [gy,rr] of gb){ const t=new THREE.Mesh(new THREE.TorusGeometry(rr,.005,6,18,Math.PI),gr); t.rotation.x=Math.PI/2; t.position.set(0,gy,.012); t.scale.set(.95,1.22,1); g.add(t); }
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.01,roster?.06:.1,.01),gr); bar.position.set(0,roster?-.07:-.07,roster?.13:.165); g.add(bar);
    attachAt(H,g,sc,new THREE.Vector3(headC.x,fitY(.085),headC.z+.005)); }
  else if(o.cap){ const g=new THREE.Group(), cm=mat(o.cap,{roughness:.7}); capMat=cm;
    const cr=roster?.098:.112;
    const d=new THREE.Mesh(new THREE.SphereGeometry(cr,18,10,0,Math.PI*2,0,Math.PI*.5),cm); d.scale.set(1,.82,1.1); g.add(d);
    const br=new THREE.Mesh(new THREE.CylinderGeometry(cr*.8,cr*.8,.008,18,1,false,-Math.PI/2,Math.PI),cm); br.position.set(0,.004,cr*.72); br.scale.set(1,1,1.15); br.rotation.x=.12; g.add(br);
    attachAt(H,g,sc,new THREE.Vector3(headC.x,fitY(roster?.08:.07),headC.z+.008)); }
  else if(o.hat){ const g=new THREE.Group(), hm=mat(o.hat,{roughness:.8});
    const b1=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.012,22),hm); g.add(b1); const b2=new THREE.Mesh(new THREE.CylinderGeometry(.1,.112,.08,18),hm); b2.position.y=.04; g.add(b2);
    attachAt(H,g,sc,new THREE.Vector3(headC.x,fitY(.035),headC.z)); }
  if(o.pads){ const pm=mat(0xf4f2ea,{roughness:.6});
    for(const s of ['Left','Right']){ const g=new THREE.Group();
      const sh=new THREE.Mesh(new THREE.BoxGeometry(.16,.46,.075),pm); g.add(sh);
      for(const px of [-.045,0,.045]){ const rb=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.42,6),pm); rb.position.set(px,0,.04); g.add(rb); }
      const knee=new THREE.Mesh(new THREE.BoxGeometry(.17,.13,.11),pm); knee.position.set(0,.27,.01); g.add(knee);
      attachAt(B[s+'Leg'],g,sc,new THREE.Vector3(0,-.21,.075)); }
  }
  if(o.gloves){ const gm=mat(o.gloves,{roughness:.6});
    for(const s of ['Left','Right']){ const g=new THREE.Mesh(new THREE.BoxGeometry(.13,.06,.1),gm); attachAt(B[s+'Hand'],g,sc,new THREE.Vector3(s==='Left'?.06:-.06,0,0)); } }
  if(o.num!==''&&o.num!==undefined){ const d=numberDecal(o.num,o.trim||'#ffffff'); attachAt(B.Spine2,d,sc,new THREE.Vector3(0,.03,(backZ<1e8?backZ-.006:-.135)-B.Spine2.getWorldPosition(new THREE.Vector3()).z),Math.PI); }
  // fit the pose rig to this model's proportions (rest pose, model space)
  { const w=n=>B[n].getWorldPosition(new THREE.Vector3()), hip=w('Hips'), ul=w('LeftUpLeg'), kn=w('LeftLeg'), an=w('LeftFoot'), sp=w('Spine2'), nk=w('Neck'), hd=w('Head'), sh=w('LeftArm'), el=w('LeftForeArm'), wr=w('LeftHand');
    r.fitTo({hipY:hip.y,hipDrop:hip.y-ul.y,upLegX:Math.abs(ul.x),thigh:ul.distanceTo(kn),shin:kn.distanceTo(an),ankleY:an.y,
      chestY:sp.y,neckY:nk.y,headY:hd.y,shoulderX:Math.abs(sh.x),shoulderY:sh.y,shoulderZ:sh.z-sp.z,upper:sh.distanceTo(el),fore:el.distanceTo(wr)}); }
  // rest data for retargeting
  const rest={};
  for(const k in B){ const b=B[k]; rest[k]={q:b.quaternion.clone(), wq:b.getWorldQuaternion(new THREE.Quaternion())}; }
  const dirTo=(a,c)=>{ const v=B[c].position.clone().normalize().applyQuaternion(B[a].quaternion); return v; };
  const aims={LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',RightArm:'RightForeArm',RightForeArm:'RightHand',LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',RightUpLeg:'RightLeg',RightLeg:'RightFoot'};
  for(const a in aims) rest[a].dir=dirTo(a,aims[a]);
  const len=n=>B[n].getWorldPosition(new THREE.Vector3()).distanceTo(B[aims[n]].getWorldPosition(new THREE.Vector3()));
  r.skin={sc,B,rest,cols:m?m.userData.cols:null,kit,capMat,hipOff:0,len:{LeftArm:len('LeftArm'),LeftForeArm:len('LeftForeArm'),RightArm:len('RightArm'),RightForeArm:len('RightForeArm')}};
  r.root.add(sc);
  r.root.traverse(n=>{ if(n.isMesh&&n.userData.drv) n.visible=false; });
}
// rotate a bone (keeping its rest twist) so that it points at a world position
function aimBone(b,restDir,target){
  const bp=b.getWorldPosition(_w1), d=_w2.copy(target).sub(bp).normalize();
  b.parent.getWorldQuaternion(_wq1); d.applyQuaternion(_wq1.invert());
  _wq2.setFromUnitVectors(restDir,d); b.quaternion.copy(_wq2).multiply(restDirBase(b));
}
let _restLookup=null;
 function restDirBase(b){ return b.userData.restQ; }
function copyOrient(b,restWQ,drv){ drv.getWorldQuaternion(_wq1).multiply(restWQ); b.parent.getWorldQuaternion(_wq2); b.quaternion.copy(_wq2.invert().multiply(_wq1)); }
const _hand=new THREE.Vector3(), _pole=new THREE.Vector3(), _elb=new THREE.Vector3(), _tgt=new THREE.Vector3();
function ikSkin(S,side,target,poleW){
  const up=S.B[side+'Arm'], fo=S.B[side+'ForeArm'], L1=S.len[side+'Arm'], L2=S.len[side+'ForeArm']+.06;
  const s=up.getWorldPosition(_w3).clone(); const d=_tgt.copy(target).sub(s); const len=clamp(d.length(),.06,L1+L2-.002); d.setLength(len);
  const A=Math.acos(clamp((L1*L1+len*len-L2*L2)/(2*L1*len),-1,1));
  const n=_pole.copy(d).cross(poleW).normalize(); const ud=_elb.copy(d).normalize().applyAxisAngle(n,A);
  const hand=_hand.copy(s).add(d); const elbow=ud.multiplyScalar(L1).add(s);
  aimBone(up,S.rest[side+'Arm'].dir,elbow); aimBone(fo,S.rest[side+'ForeArm'].dir,hand);
}
const _dp=new THREE.Vector3();
function retarget(r){
  const S=r.skin; if(!S) return; const B=S.B, R=S.rest, J=r.j;
  if(!B.Hips.userData.restQ) for(const k in B) B[k].userData.restQ=R[k].q;
  r.root.updateMatrixWorld(true);
  J.hips.getWorldPosition(_dp); _dp.y+=S.hipOff; B.Hips.position.copy(B.Hips.parent.worldToLocal(_dp));
  copyOrient(B.Hips,R.Hips.wq,J.hips);
  copyOrient(B.Spine,R.Spine.wq,J.spine); copyOrient(B.Spine1,R.Spine1.wq,J.spine); copyOrient(B.Spine2,R.Spine2.wq,J.chest);
  copyOrient(B.Neck,R.Neck.wq,J.neck); copyOrient(B.Head,R.Head.wq,J.head);
  for(const [s,d] of [['Left','l'],['Right','r']]){
    aimBone(B[s+'UpLeg'],R[s+'UpLeg'].dir,J[d+'Shin'].getWorldPosition(_w3));
    aimBone(B[s+'Leg'],R[s+'Leg'].dir,J[d+'Foot'].getWorldPosition(_w3));
    copyOrient(B[s+'Foot'],R[s+'Foot'].wq,J[d+'Foot']);
  }
  if(r.bat){
    J.chest.getWorldQuaternion(_wq1);
    const pl=_v1.copy(POLE_L).applyQuaternion(_wq1), pr=_v2.copy(POLE_R).applyQuaternion(_wq1);
    ikSkin(S,'Right',r.bat.gBot.getWorldPosition(_tA),pr);
    if(!r.oneHand) ikSkin(S,'Left',r.bat.gTop.getWorldPosition(_tB),pl); else { aimBone(B.LeftArm,R.LeftArm.dir,J.lFore.getWorldPosition(_w3)); aimBone(B.LeftForeArm,R.LeftForeArm.dir,J.lHand.getWorldPosition(_w3)); }
  } else {
    for(const [s,d] of [['Left','l'],['Right','r']]){
      aimBone(B[s+'Arm'],R[s+'Arm'].dir,J[d+'Fore'].getWorldPosition(_w3));
      aimBone(B[s+'ForeArm'],R[s+'ForeArm'].dir,J[d+'Hand'].getWorldPosition(_w3));
    }
  }
}
const ALL_RIGS=()=>[SR,NR,BR,umpire,umpire2,...fielders.map(f=>f.rig)];
function retargetAll(){ for(const r of ALL_RIGS()) if(r.skin) retarget(r); }

export { SKIN, _w1, _w2, _w3, _wq1, _wq2, _m1, _m2, regionOf, loadAthletes, kitMaterial, attachAt, numberDecal, attachAthlete, aimBone, _restLookup, restDirBase, copyOrient, _hand, _pole, _elb, _tgt, ikSkin, _dp, retarget, ALL_RIGS, retargetAll };
