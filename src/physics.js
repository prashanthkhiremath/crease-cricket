// physics.js — generated from the prototype; edit freely.
import { lerp } from './config.js';

// ================= paths =================
function pathPos(path,t,out){ const s=path.s, f=t/path.dt; let i=Math.floor(f); if(i>=s.length-1){const q=s[s.length-1];return out.set(q.x,q.y,q.z);} if(i<0)i=0; const a=s[i],b=s[i+1],u=f-i; return out.set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u); }
function crossZ(path,z){ const s=path.s; for(let i=1;i<s.length;i++){ if(s[i].z>=z && s[i-1].z<z){ const u=(z-s[i-1].z)/(s[i].z-s[i-1].z); return {t:(i-1+u)*path.dt, x:lerp(s[i-1].x,s[i].x,u), y:lerp(s[i-1].y,s[i].y,u)}; } } return null; }

export { pathPos, crossZ };
