import {Mesh,rgb} from './mesh.js';
import {carModels,distance} from './traffic.js';
import {objectiveFor} from './contracts.js';

const dark=rgb('251f32'), tire=rgb('241e28'), chrome=rgb('ceb0ac');
const glass=rgb('494761'), light=rgb('fff0b3'), tail=rgb('ff4568');
const clothes=['e66683','67a798','ffcc8b','8794c2','a96db1','ded0be','d88363'].map(rgb);
const skin=['c38369','e7b282','89556b','a76655'].map(rgb);
const aqua=rgb('76ffdf'), amber=rgb('ffd084');

function shadow(mesh,x,z,w,d,yaw) {
  mesh.box(x,.058,z,w,.01,d,rgb('392c45'),yaw);
}

function shape(mesh,actor,offsetX,offsetY,offsetZ,w,h,d,color,tilt=0,pitch=0) {
  const {x,z,yaw}=actor;
  const s=Math.sin(yaw), c=Math.cos(yaw);
  const u=offsetX*Math.cos(tilt)-offsetY*Math.sin(tilt);
  const v=offsetY*Math.cos(tilt)+offsetX*Math.sin(tilt);
  mesh.box(x+u*c+offsetZ*s,(actor.y||0)+v,z-u*s+offsetZ*c,w,h,d,color,yaw,tilt,pitch);
}

function carShape(mesh,car,age,active) {
  const color=rgb(car.police?'d8dfdd':carModels[car.model].color);
  const roll=car.tilt||0;
  const block=(x,y,z,w,h,d,tint,pitch)=>shape(mesh,car,x,y,z,w,h,d,tint,roll,pitch);
  shadow(mesh,car.x,car.z,2.65,4.9,car.yaw);
  block(0,.67,0,2.32,.65,4.72,color);
  block(0,1.03,.39,2.29,.32,3.8,color);
  block(0,1.41,-.28,1.94,.62,2.45,glass);
  block(0,1.75,-.36,1.98,.12,1.74,color);
  block(0,1.43,.8,1.91,.52,.11,glass,-.44);
  block(0,1.42,-1.4,1.91,.48,.11,glass,.42);
  block(0,.49,-2.36,2.19,.14,.15,chrome);
  block(0,.48,2.38,2.19,.14,.14,chrome);
  block(0,.75,2.37,1.03,.21,.1,dark);
  for(const side of [-1,1]){
    for(const z of [-1.44,1.43]){
      block(side*1.14,.43,z,.34,.83,.82,tire);
      block(side*1.33,.43,z,.05,.44,.44,chrome);
    }
    block(side*.76,.77,-2.37,.62,.22,.10,tail);
    block(side*.8,.79,2.37,.58,.23,.10,light);
    block(side*1.12,1.26,.53,.30,.14,.25,color);
  }
  if(car.model>=2) block(0,1.12,-2.04,2.07,.14,.29,color);
  if(car.police){
    const flash=Math.floor(age*8)%2;
    block(0,1.85,-.32,1.44,.17,.4,dark);
    block(-.48,1.98,-.32,.45,.16,.33,rgb(flash?'ff435f':'943a65'));
    block(.48,1.98,-.32,.45,.16,.33,rgb(flash?'395386':'76e2ff'));
  }
  if(active&&car.nitro<.98&&car.speed>carModels[car.model].top){
    for(const side of [-1,1]) block(side*.7,.42,-2.68,.16,.12,.6+Math.sin(age*45)*.2,aqua);
  }
}

function personShape(mesh,person,age,isPlayer,moving) {
  const style=person.style||0;
  const tint=isPlayer?rgb('e86d88'):clothes[style];
  const face=skin[isPlayer?1:style%skin.length];
  if(person.stun>0){
    shape(mesh,person,0,.19,0,.68,.34,1.85,tint);
    return;
  }
  shadow(mesh,person.x,person.z,.86,.67,person.yaw);
  const swing=moving?Math.sin(age*(isPlayer?11:6)+style)*.34:0;
  shape(mesh,person,0,1.13,0,.58,.67,.35,tint);
  shape(mesh,person,0,1.65,0,.35,.42,.32,face);
  shape(mesh,person,0,1.85,-.025,.38,.15,.37,dark);
  if(isPlayer){
    shape(mesh,person,0,1.22,-.22,.35,.39,.13,rgb('f6a281'));
    shape(mesh,person,0,1.24,-.294,.1,.29,.02,amber);
  }
  for(const side of [-1,1]){
    shape(mesh,person,side*.16,.4,side*swing*.55,.22,.72,.26,dark,0,swing*side);
    shape(mesh,person,side*.17,.09,side*swing+.045,.23,.16,.35,chrome);
    shape(mesh,person,side*.38,1.1,side*swing*.4,.15,.51,.18,tint,0,-swing*side);
    shape(mesh,person,side*.39,.84,side*swing*.7,.14,.19,.16,face);
  }
}

function marker(mesh,point,age,race) {
  const color=race?aqua:amber;
  const radius=race?7:4.7;
  for(let i=0;i<28;i++){
    const a=i*Math.PI/14,b=(i+.69)*Math.PI/14;
    mesh.quad([point.x+Math.sin(a)*radius,.075,point.z+Math.cos(a)*radius],
      [point.x+Math.sin(b)*radius,.075,point.z+Math.cos(b)*radius],
      [point.x+Math.sin(b)*(radius-.35),.075,point.z+Math.cos(b)*(radius-.35)],
      [point.x+Math.sin(a)*(radius-.35),.075,point.z+Math.cos(a)*(radius-.35)],color);
  }
  const h=3.6+Math.sin(age*2.6)*.36;
  const top=[point.x,h+1,point.z], bottom=[point.x,h-1,point.z];
  const edge=Array.from({length:4},(_,i)=>[point.x+.66*Math.cos(age+i*Math.PI/2),h,point.z+.66*Math.sin(age+i*Math.PI/2)]);
  for(let i=0;i<4;i++){
    mesh.triangle(top,edge[i],edge[(i+1)%4],color);
    mesh.triangle(bottom,edge[i],edge[(i+1)%4],color,.72);
  }
}

export function drawActors(state,timestamp) {
  const mesh=new Mesh();
  const focus=state.vehicle||state.player;
  for(const car of [...state.cars,...state.police]){
    if(distance(car,focus)<210) carShape(mesh,car,timestamp,car===state.vehicle);
  }
  for(const person of state.pedestrians){
    if(distance(person,focus)<100) personShape(mesh,person,timestamp,false,true);
  }
  if(!state.vehicle) personShape(mesh,state.player,timestamp,true,state.walking);
  marker(mesh,objectiveFor(state),timestamp,state.race);
  if(state.shot&&state.pulse>.28){
    const shot=state.shot;
    shape(mesh,shot,0,0,shot.range/2,.065,.065,shot.range,aqua);
  }
  return mesh;
}
