import {createCity,clearSpace} from './world.js';
import {createRenderer} from './render.js';
import {drawActors} from './actors.js';
import {createShift,loadSave,saveShift,tickShift} from './simulation.js';
import {createInput} from './input.js';
import {createSound} from './audio.js';
import {drawHud} from './hud.js';
import {angleDelta} from './traffic.js';

const city=createCity();
const canvas=document.getElementById('scene');
const render=createRenderer(canvas,city.mesh);
const menu=document.getElementById('menu');
const hud=document.getElementById('hud');
const start=document.getElementById('start');
const resume=document.getElementById('resume');
const sound=createSound();
const input=createInput(canvas,()=>screen==='play');
let screen='title';
let state=createShift();
let saved=loadSave();
let cameraYaw=0;
let previous=performance.now();
let accumulator=0;
let lastHud=0;
resume.hidden=!saved;

function showPlay() {
  screen='play';
  menu.hidden=true;
  hud.hidden=false;
  input.clear();
  sound.start();
}

function begin(data) {
  state=createShift(data);
  input.yaw=0;
  input.pitch=0;
  cameraYaw=0;
  accumulator=0;
  showPlay();
}

function pause() {
  if(screen!=='play') return;
  screen='pause';
  menu.hidden=false;
  hud.hidden=true;
  resume.hidden=false;
  resume.firstChild.textContent='Resume shift ';
  start.firstChild.textContent='New shift ';
  if(document.pointerLockElement) document.exitPointerLock();
  saveShift(state);
}

start.addEventListener('click',()=>begin(null));
resume.addEventListener('click',()=>{
  if(screen==='pause') showPlay();
  else begin(saved);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden) pause();});

function camera(dt,time) {
  if(screen==='title') return {eye:[203+Math.sin(time*.2)*4,13,-112],target:[134,6,-36]};
  const actor=state.vehicle||state.player;
  const heading=state.vehicle?actor.yaw:input.yaw;
  cameraYaw+=angleDelta(cameraYaw,heading)*Math.min(1,dt*(state.vehicle?5:14));
  const sin=Math.sin(cameraYaw),cos=Math.cos(cameraYaw);
  let boom=state.vehicle?9.7+Math.abs(actor.speed)*.055:5.9;
  for(let step=1;step<boom;step+=.65){
    if(!clearSpace(city,actor.x-sin*step,actor.z-cos*step,.35)){
      boom=Math.max(1.1,step-.6);
      break;
    }
  }
  const lift=state.vehicle?4.5:3.15+input.pitch*3;
  const y=actor.y||0;
  return {
    eye:[actor.x-sin*boom+cos*.62,y+lift,actor.z-cos*boom-sin*.62],
    target:[actor.x+sin*(state.vehicle?7:12),y+1.6+input.pitch*5,actor.z+cos*(state.vehicle?7:12)]
  };
}

function frame(now) {
  const dt=Math.min(.10,(now-previous)/1000);
  previous=now;
  if(input.take('Escape')) pause();
  if(screen==='play'){
    accumulator+=dt;
    while(accumulator>=1/60){
      input.yaw+=(Number(input.down('ArrowRight'))-Number(input.down('ArrowLeft')))*.028;
      state.walking=['KeyW','KeyA','KeyS','KeyD'].some(input.down);
      const wasDriving=!!state.vehicle;
      tickShift(state,city,input,1/60,sound.effect);
      if(wasDriving&&!state.vehicle) input.yaw=state.player.yaw;
      accumulator-=1/60;
    }
    if(now-lastHud>45){drawHud(state);lastHud=now;}
  }
  sound.update(state,screen==='play');
  render(camera(dt,now/1000),drawActors(state,state.age));
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
