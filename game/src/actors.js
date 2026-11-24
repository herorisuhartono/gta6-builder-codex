import {Mesh,rgb} from './mesh.js';
import {carModels,distance} from './traffic.js';
import {objectiveFor} from './contracts.js';
import {muzzleOf} from './combat.js';

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
  const tint=person.officer?rgb('394967'):isPlayer?rgb('e86d88'):clothes[style];
  const face=skin[isPlayer?1:style%skin.length];
  if(person.stun>0||person.health===0){
    shape(mesh,person,0,.18,0,.65,.33,1.88,tint);
    return;
  }
  shadow(mesh,person.x,person.z,.86,.67,person.yaw);
  const phase=person.gait??(age*6+style);
  const blend=person.walkBlend??(moving?.57:0);
  const swing=Math.sin(phase)*blend*.62;
  const bob=Math.sin(phase*2)*blend*.027;
  const hip=.83+bob;
  const lean=person.aiming?0:Math.min(.08,person.lean||0);
  function upper(x,y,z,w,h,d,color) {
    const u=y-.83;
    shape(mesh,person,x,hip+u*Math.cos(lean)-z*Math.sin(lean),u*Math.sin(lean)+z*Math.cos(lean),w,h,d,color,0,lean);
  }
  upper(0,1.17,0,.57,.67,.35,tint);
  upper(0,1.67,0,.35,.42,.32,face);
  upper(0,1.89,-.025,.38,.15,.37,dark);
  if(person.officer){
    upper(0,1.93,.08,.41,.06,.45,tint);
    upper(-.15,1.32,.179,.089,.10,.029,amber);
  }
  if(isPlayer){
    upper(0,1.25,-.22,.35,.39,.13,rgb('f6a281'));
    upper(0,1.27,-.294,.10,.29,.02,amber);
  }
  for(const side of [-1,1]){
    const stride=swing*side;
    const sole=Math.max(0,Math.sin(phase)*side)*blend*.13;
    shape(mesh,person,side*.15,(hip+sole)/2,Math.sin(stride)*.34,.22,Math.hypot(hip-sole,.62*Math.sin(stride)),.25,dark,0,-stride);
    shape(mesh,person,side*.16,sole+.085,Math.sin(stride)*.67+.065,.23,.17,.35,chrome);
    if(side===1&&person.aiming){
      const pitch=person.aimPitch||0;
      shape(mesh,person,.39,1.42-Math.sin(pitch)*.25,.255*Math.cos(pitch),.17,.17,.53,tint,0,pitch);
      shape(mesh,person,.39,1.42-Math.sin(pitch)*.55,.54*Math.cos(pitch),.15,.15,.18,face);
    } else {
      shape(mesh,person,side*.38,hip+.32,-stride*.25,.16,.54,.17,tint,0,stride);
      shape(mesh,person,side*.39,hip+.02,-stride*.49,.14,.18,.16,face);
    }
  }
  if(isPlayer||person.officer){
    const aimed=person.aiming;
    const pitch=aimed?(person.aimPitch||0):Math.PI/2;
    const height=aimed?1.43-Math.sin(pitch)*.62:hip-.035;
    const forward=aimed?.68*Math.cos(pitch):-.49*swing;
    const length=person.weapon===1?.45:.28;
    shape(mesh,person,.39,height,forward,.13,.14,length,dark,0,pitch);
    shape(mesh,person,.39,height-.09,forward-.06,.105,.19,.10,chrome,0,pitch);
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

function drawAirSupport(mesh,air,age) {
  const block=(x,y,z,w,h,d,color)=>shape(mesh,air,x,y,z,w,h,d,rgb(color));
  block(0,0,0,3.7,2.2,6.4,'cedbd9');
  block(0,.24,1.89,3.36,1.25,2.68,'263953');
  block(0,-.7,2.3,3.2,.46,1.56,'a1b7bd');
  block(0,.15,-4.9,.69,.64,5.2,'425572');
  block(0,.89,-7.1,.3,2.36,1.48,'4c5b76');
  block(0,1.42,-.54,.45,1.03,.44,'353146');
  for(const side of [-1,1]){
    block(side*1.25,-1.49,0,.23,.23,5.6,'353146');
    for(const z of [-1.88,1.77]) block(side*1.25,-1.15,z,.2,.79,.2,'353146');
    block(side*1.93,.11,-1.25,.21,.55,.78,Math.floor(age*8)%2===(side+1)/2?(side===1?'75eeff':'ff517d'):'75829b');
  }
  for(let i=0;i<2;i++){
    const angle=age*28+i*Math.PI/2;
    mesh.box(air.x,air.y+1.92,air.z+.08,12,.07,.33,rgb('30324a'),angle);
    const tail={...air,yaw:air.yaw};
    shape(mesh,tail,.26,.96,-7.38,.07,2.6,.24,rgb('33324b'),0,angle);
  }
  if(air.retreat) return;
  mesh.beam=new Mesh();
  const lightColor=rgb('fffbc2');
  const top=[air.x,air.y-1,air.z];
  const foot=[air.spotX,.095,air.spotZ];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    const rim=[foot[0]+Math.sin(a)*6.5,foot[1],foot[2]+Math.cos(a)*6.5];
    const next=[foot[0]+Math.sin(b)*6.5,foot[1],foot[2]+Math.cos(b)*6.5];
    mesh.beam.triangle(top,rim,next,lightColor);
    mesh.beam.triangle(foot,rim,next,lightColor);
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
  for(const person of state.officers) personShape(mesh,person,timestamp,false,true);
  if(!state.vehicle){
    state.player.weapon=state.weapon;
    personShape(mesh,state.player,timestamp,true,state.walking);
    if(state.muzzle>0){
      const point=muzzleOf(state.player);
      mesh.box(point.x,point.y,point.z,.24,.24,.35,amber,timestamp*35);
    }
  }
  marker(mesh,objectiveFor(state),timestamp,state.race);
  for(const shot of state.bullets){
    const yaw=Math.atan2(shot.vx,shot.vz);
    const pitch=-Math.atan2(shot.vy,Math.hypot(shot.vx,shot.vz));
    mesh.box(shot.x,shot.y,shot.z,.075,.075,shot.friendly?2.9:2.2,shot.friendly?amber:rgb('ff5b7d'),yaw,0,pitch);
  }
  for(const spark of state.sparks){
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+timestamp*10;
      const spread=(.24-spark.life)*2.8;
      mesh.box(spark.x+Math.sin(a)*spread,spark.y+spread*.7,spark.z+Math.cos(a)*spread,.07,.07,.24,amber,a);
    }
  }
  for(const item of state.pickups){
    const color=item.type==='cash'?aqua:item.type==='ammo'?amber:rgb('ff7094');
    const y=.51+Math.sin(timestamp*4+item.x)*.12;
    mesh.box(item.x,y,item.z,.54,.25,.49,color,timestamp*2);
    if(item.type==='health') mesh.box(item.x,y+.2,item.z,.17,.28,.17,color,timestamp*2);
  }
  if(state.chopper) drawAirSupport(mesh,state.chopper,timestamp);
  return mesh;
}
