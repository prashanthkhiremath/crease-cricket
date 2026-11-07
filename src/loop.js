// loop.js — main loop and phase machine.
import { $, PITCH, RUNUP, SPEEDS, lerp } from './config.js';
import { updateLanding, updateMeter } from './assist.js';
import { camera, renderer, scene, updateStumps } from './scene.js';
import { bowler, striker } from './players.js';
import { M, game, input, nextBall, setField } from './match.js';
import { release, setContactZ, startRunup } from './bowling.js';
import { updateDelivery, windows } from './batting.js';
import { updateLive } from './fielding.js';
import { updateHUD } from './scoring.js';
import { showResult } from './hud.js';
import { animatePlayers } from './animation.js';
import { updateCamera } from './camera.js';
import { aimMarker, buildTypeButtons, meterPos, updateAimInfo } from './bowlmode.js';

// ================= main loop =================
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  try{ step(dt); }catch(e){ console.error(e); }
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
function step(dt){
  updateStumps(dt);
  if(game.phase==='menu'||game.phase==='result'){ game.t+=dt; animatePlayers(dt); updateCamera(dt); return; }
  // ball speed setting slows the run-up and delivery (bat mode only)
  const slow=M&&M.role==='bat'&&(game.phase==='runup'||game.phase==='delivery');
  if(slow) dt*=SPEEDS[game.speed]||1;
  game.t+=dt;
  if(input.pressT!==null&&game.swingT!==undefined) game.swingT+=dt;
  switch(game.phase){
    case 'ready':
      if(game.pendingField&&game.t>0){ game.pendingField=false; setField(); updateHUD(); }
      if(game.t>1.2) startRunup(); break;
    case 'aim':
      if(game.pendingField&&game.t>0){ game.pendingField=false; setField(); updateHUD(); buildTypeButtons(); updateAimInfo(); }
      aimMarker.visible=true; aimMarker.position.set(game.aim.x,.015,-game.aim.len); aimMarker.scale.setScalar(1+.08*Math.sin(game.t*5));
      break;
    case 'runup': {
      if(M.role==='bowl'){ aimMarker.position.set(game.aim.x,.015,-game.aim.len); if(!(game.meter&&game.meter.locked)) $('needle').style.left=(meterPos()*100)+'%'; }
      const u=game.t/RUNUP; bowler.position.z=lerp(-PITCH-11,-PITCH+.9,u); bowler.position.x=.75;
      if(game.t>=RUNUP) release();
      break; }
    case 'delivery': {
      bowler.position.z=Math.min(bowler.position.z+dt*Math.max(.5,5-game.t*6),-PITCH+4.5); bowler.position.x=Math.min(2.4,bowler.position.x+dt*2.6);
      updateDelivery(dt); break; }
    case 'live': game.lastLive=true; updateLive(dt); break;
    case 'dead':
      if(game.t>game.deadWait){ game.lastLive=false; game.live=null; if(M.done) showResult(); else nextBall(); }
      break;
  }
  // charge (step out)
  if(input.charge&&game.phase!=='live'){ striker.position.z=Math.max(-2.75,striker.position.z-dt*5); if(game.phase==='delivery'&&!game.del.chargeSet){ game.del.chargeSet=true; setContactZ(game.del);} }
  updateLanding(game.phase,game.t);
  if(game.del&&M) updateMeter(game,M,windows());
  animatePlayers(dt);
  updateCamera(dt);
}

export { last, frame, step };
