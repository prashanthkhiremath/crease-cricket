// main.js — entry point: wires the modules together and starts the render loop.
import './style.css';
import { PITCH } from './config.js';
import { camera, renderer } from './scene.js';
import { ball, bowler, bshadow, nonStriker, striker } from './players.js';
import { M, game, input, newMatch, setField } from './match.js';
import { shot } from './batting.js';
import { callRun } from './fielding.js';
import { SKIN, loadAthletes } from './athletes.js';
import { frame } from './loop.js';
import { setDir } from './input.js';
import './bowlmode.js';

function resize(){
  const w=window.innerWidth, h=window.innerHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w/h<1?20:12.5; camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();

// idle scene behind the menu
setField();
striker.position.set(-.38,0,-1.05); striker.rotation.y=Math.PI/2;
nonStriker.position.set(-1.1,0,-PITCH-.9);
bowler.position.set(.9,0,-PITCH-11);
ball.visible=false; bshadow.visible=false;
loadAthletes();

// test hook used by scripts/smoke.cjs
window.__game={game,input,SKIN,get M(){return M;},newMatch,shot,callRun,setDir};
requestAnimationFrame(frame);
