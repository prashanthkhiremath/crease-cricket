// config.js — generated from the prototype; edit freely.

// ================= constants =================
const G = 9.81, BALL_R = 0.036, PITCH = 20.12;
const FC = {x:0, z:-PITCH/2};
           // field centre
const R_BOUND = 63;
                      // boundary radius from field centre
const K_DRAG = 0.0052, ROLL_DEC = 3.3;
const RUNUP = 1.55;
const MODES = [
  {name:'Quick chase', overs:2, wkts:3, tgt:[19,27]},
  {name:'Powerplay', overs:5, wkts:5, tgt:[46,60]},
  {name:'Full T20', overs:20, wkts:10, tgt:[152,186]},
  {name:'Nets', overs:99, wkts:99, tgt:[9999,9999], nets:true},
];
const SPEEDS = {real:1, slower:.8, learner:.62};
const DIFF = {
  easy:{win:1.5, field:0.85, catchM:0.8, label:'Club'},
  normal:{win:1.15, field:1, catchM:1, label:'Domestic'},
  hard:{win:0.82, field:1.1, catchM:1.06, label:'International'},
};
const BATTERS = ['A. Sharma','D. Fernando','K. Brooks','M. Qureshi','P. Nair','L. Hart','V. Iyer','C. Bennett','R. Joshi','O. Grant','N. Patel'];
const OPP_BATTERS = ['J. Whitfield','S. Mendis','T. Okoro','B. Lawson','H. Khan','F. Duval','G. Pillai','E. Marsh','R. Tembo','Z. Ahmed','I. Cole'];
const YOUR_BOWLERS = [
  {name:'P. Nair', type:'pace', base:144},
  {name:'V. Iyer', type:'spin', style:'leg', base:84},
  {name:'L. Hart', type:'pace', base:138},
  {name:'C. Bennett', type:'spin', style:'off', base:87},
  {name:'O. Grant', type:'pace', base:141},
];
const DTYPES={pace:['Stock','Outswinger','Inswinger','Slower ball'],off:['Off-break','Arm ball','Flighted','Quicker one','Carrom ball'],leg:['Leg-break','Googly','Flighted','Top-spinner','Quicker one']};
const KIT_YOU={shirt:'#1f4fa8',pants:0x1a2f66,cap:0x0d1b3d}, KIT_OPP={shirt:'#8a1c2b',pants:0x5a1020,cap:0x3a0b14};
function gauss(){ return Math.sqrt(-2*Math.log(1-Math.random()))*Math.cos(2*Math.PI*Math.random()); }
function lengthName(l){ return l<.9?'Full toss':l<1.9?'Yorker':l<4.4?'Full':l<7.4?'Good length':l<9.4?'Short of length':'Bouncer'; }
function lineName(x){ return x>.55?'wide of off':x>.2?'outside off':x>.05?'off stump':x>-.05?'middle':x>-.16?'leg stump':'down leg'; }
const BOWLERS = [
  {name:'R. Mehta', type:'pace', base:142},
  {name:'J. Clarke', type:'spin', style:'off', base:86},
  {name:'S. Okafor', type:'pace', base:137},
  {name:'A. Rahim', type:'spin', style:'leg', base:83},
  {name:'T. Walsh', type:'pace', base:146},
];
const FIELD_PACE = [
  {n:'Keeper', x:0, z:13.5, keeper:true}, {n:'Slip', x:1.7, z:14.5, slip:true},
  {n:'Point', x:23, z:-2}, {n:'Cover', x:21, z:-15}, {n:'Mid-off', x:9, z:-31},
  {n:'Mid-on', x:-9, z:-31}, {n:'Midwicket', x:-23, z:-14}, {n:'Square leg', x:-25, z:1},
  {n:'Fine leg', x:-24, z:46}, {n:'Third man', x:26, z:44},
];
const FIELD_SPIN = [
  {n:'Keeper', x:0, z:1.1, keeper:true}, {n:'Long-on', x:-20, z:-67}, {n:'Long-off', x:20, z:-67},
  {n:'Point', x:22, z:-3}, {n:'Cover', x:20, z:-16}, {n:'Mid-off', x:10, z:-27},
  {n:'Mid-on', x:-10, z:-27}, {n:'Deep midwicket', x:-46, z:-30}, {n:'Square leg', x:-24, z:2},
  {n:'Short fine', x:-14, z:20},
];
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function weighted(list){let s=0;for(const it of list)s+=it[1];let r=Math.random()*s;for(const it of list){if((r-=it[1])<=0)return it[0];}return list[0][0];}
const $=id=>document.getElementById(id);

export { G, BALL_R, PITCH, FC, R_BOUND, K_DRAG, ROLL_DEC, RUNUP, MODES, DIFF, BATTERS, OPP_BATTERS, YOUR_BOWLERS, DTYPES, KIT_YOU, KIT_OPP, gauss, lengthName, lineName, BOWLERS, FIELD_PACE, FIELD_SPIN, rand, pick, clamp, lerp, smooth, weighted, $, SPEEDS };
