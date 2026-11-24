import {clearSpace,spawn} from './world.js';
import {angleDelta,carModels,createTraffic,distance,roadSight,tickPolice,tickTraffic} from './traffic.js';
import {tickContracts} from './contracts.js';

const saveKey='marrow-bay.shift.v1';
const saveFields=['chapter','cash','score'];
export function loadSave() {
  try {
    const data=JSON.parse(localStorage.getItem(saveKey));
    if(!data||!saveFields.every(key=>Number.isSafeInteger(data[key])&&data[key]>=0)||data.chapter>4) return null;
    return data;
  } catch { return null; }
}
export function saveShift(state) {
  try { localStorage.setItem(saveKey,JSON.stringify(Object.fromEntries(saveFields.map(key=>[key,state[key]])))); }
  catch { /* The shift still plays when storage is unavailable. */ }
}

export function createShift(saved=null) {
  return {
    ...createTraffic(),player:{...spawn,y:0,vy:0,health:100},vehicle:null,
    police:[],cash:saved?.cash||0,score:saved?.score||0,chapter:saved?.chapter||0,
    wanted:0,heatTime:0,dispatch:0,collision:0,message:'',messageTime:0,
    race:false,gate:0,clock:0,age:0,pulse:0,shot:null
  };
}

export function switchVehicle(state,city,notify,offense) {
  if(state.vehicle){
    const car=state.vehicle;
    if(Math.abs(car.speed)>8||car.y>.5){notify('Slow down to get out.');return;}
    for(const side of [1,-1]){
      const x=car.x+Math.cos(car.yaw)*2.9*side,z=car.z-Math.sin(car.yaw)*2.9*side;
      if(!clearSpace(city,x,z,.5)) continue;
      Object.assign(state.player,{x,z,y:0,vy:0,yaw:car.yaw});
      car.parked=true;
      state.vehicle=null;
      return;
    }
    return;
  }
  const car=state.cars.reduce((best,next)=>distance(next,state.player)<distance(best,state.player)?next:best);
  if(distance(car,state.player)>6){notify('Move within reach of a car.');return;}
  const price=[0,0,500,1100][car.model];
  if(state.cash<price){notify(carModels[car.model].name+' unlocks at $'+price.toLocaleString());return;}
  state.vehicle=car;
  Object.assign(car,{speed:0,heading:car.yaw,y:0,vy:0,tilt:0,nitro:1});
  if(!car.owned&&!car.loaner) offense(1,'Vehicle reported stolen.');
  car.owned=true;
  notify(carModels[car.model].name);
}

function walk(state,city,input,dt) {
  const p=state.player;
  const front=Number(input.down('KeyW'))-Number(input.down('KeyS'));
  const side=Number(input.down('KeyD'))-Number(input.down('KeyA'));
  if(front||side){
    const heading=input.yaw+Math.atan2(side,front);
    const speed=input.shift()?9.6:5.2;
    p.yaw+=angleDelta(p.yaw,heading)*Math.min(1,dt*15);
    const x=p.x+Math.sin(heading)*speed*dt,z=p.z+Math.cos(heading)*speed*dt;
    if(clearSpace(city,x,p.z,.48)) p.x=x;
    if(clearSpace(city,p.x,z,.48)) p.z=z;
  }
  if(input.take('Space')&&p.y===0) p.vy=6.8;
  p.y=Math.max(0,p.y+p.vy*dt);
  p.vy=p.y>0||p.vy>0?p.vy-18*dt:0;
}

function drive(state,city,input,dt,services) {
  const car=state.vehicle;
  const model=carModels[car.model];
  const throttle=Number(input.down('KeyW')), brake=Number(input.down('KeyS'));
  const steering=Number(input.down('KeyD'))-Number(input.down('KeyA'));
  const drift=input.down('Space')&&Math.abs(car.speed)>8;
  const boost=input.shift()&&throttle&&car.nitro>.015;
  car.nitro=Math.min(1,Math.max(0,car.nitro+(boost?-.42:.17)*dt));
  const accel=throttle*model.accel*(boost?1.85:1)-brake*(car.speed>1?29:8);
  car.speed+=accel*dt;
  car.speed*=Math.exp(-(drift?.95:throttle||brake?.12:.58)*dt);
  if(input.down('Space')&&!drift) car.speed*=Math.exp(-5*dt);
  car.speed=Math.max(-9,Math.min(model.top+(boost?13:0),car.speed));
  const grip=car.y>.5?.25:1;
  car.yaw+=steering*Math.sign(car.speed)*Math.min(1,Math.abs(car.speed)/6)*(drift?2.55:1.75)*dt*grip;
  car.heading+=angleDelta(car.heading,car.yaw)*Math.min(1,dt*(drift?2.1:9)*grip);
  car.tilt+=(-steering*Math.min(.19,Math.abs(car.speed)*.012)-car.tilt)*dt*7;
  const x=car.x+Math.sin(car.heading)*car.speed*dt,z=car.z+Math.cos(car.heading)*car.speed*dt;
  const hit=[...state.cars,...state.police].find(other=>other!==car&&distance(other,{x,z})<3.25&&car.y<1.45);
  if(hit||!clearSpace(city,x,z,1.55)){
    if(Math.abs(car.speed)>5&&state.collision<=0){
      state.collision=1.4;
      state.player.health-=hit?5:3;
      services.sound('hit');
      if(hit) services.offense(1,'Collision reported.');
    }
    car.speed*=-.22;
  } else {
    const ramp=city.ramps.find(item=>Math.abs(item.x-x)<2.9&&z>=item.z-4&&z<=item.z+4);
    const lastRamp=car.ramp;
    car.x=x;car.z=z;car.ramp=ramp;
    if(ramp&&car.y<=2.55&&car.vy<=0) car.y=Math.max(car.y,(z-ramp.z+4)*.304);
    if(lastRamp&&!ramp&&z>lastRamp.z+4&&car.speed>8){
      car.vy=5+car.speed*.23;
      state.score+=150;
      services.notify('Dock jump / +150 style');
      services.sound('gate');
    }
    for(const person of state.pedestrians){
      if(person.stun<=0&&car.y<1.2&&Math.abs(car.speed)>5&&distance(car,person)<1.7){
        person.stun=4;
        services.offense(1,'Pedestrian collision reported.');
        car.speed*=.75;
      }
    }
  }
  if(!car.ramp){
    car.y=Math.max(0,car.y+car.vy*dt);
    car.vy=car.y>0||car.vy>0?car.vy-18*dt:0;
  }
  if(drift&&Math.abs(car.speed)>13&&steering) state.score+=Math.floor(Math.abs(car.speed)/12);
}

function fire(state,input,services) {
  if(!input.take('Fire')||state.vehicle||state.pulse>0) return;
  state.pulse=.4;
  const p=state.player;
  p.yaw=input.yaw;
  const targets=[...state.police,...state.pedestrians];
  const hit=targets.filter(entity=>distance(p,entity)<38&&Math.abs(angleDelta(p.yaw,Math.atan2(entity.x-p.x,entity.z-p.z)))<.125)
    .sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const range=hit?distance(p,hit):28;
  state.shot={x:p.x,z:p.z,y:p.y+1.2,yaw:p.yaw,range};
  if(hit){hit.stun=hit.police?7:4;state.score+=hit.police?100:20;}
  services.offense(1,hit?.police?'Patrol disabled.':'Pulse discharge reported.');
  services.sound('pulse');
}

export function tickShift(state,city,input,dt,sound) {
  state.age+=dt;
  state.collision-=dt;
  state.pulse-=dt;
  state.messageTime-=dt;
  const notify=(message)=>{state.message=message;state.messageTime=5.6;};
  const offense=(level,message)=>{
    state.wanted=Math.min(5,state.wanted+level);
    state.heatTime=15+state.wanted*4;
    if(message) notify(message);
  };
  const services={notify,offense,sound,distance,save:()=>saveShift(state)};
  if(input.take('KeyE')||input.take('KeyF')) switchVehicle(state,city,notify,offense);
  if(state.vehicle) drive(state,city,input,dt,services);
  else walk(state,city,input,dt);
  fire(state,input,services);
  tickTraffic(state,dt);
  tickPolice(state,city,dt);
  const player=state.vehicle||state.player;
  if(state.wanted&&state.police.every(car=>distance(car,player)>34||car.stun>0||!roadSight(city,car,player))){
    state.heatTime-=dt;
    if(state.heatTime<=0){
      state.wanted--;
      state.heatTime=6;
      if(!state.wanted) notify('Dispatch lost your trail.');
    }
  }
  if(state.player.health<=0){
    state.vehicle=null;
    Object.assign(state.player,{...spawn,health:100,y:0,vy:0});
    state.cash=Math.max(0,state.cash-100);
    state.wanted=0;
    state.police.length=0;
    state.race=false;
    notify('Back at the promenade / booking fee up to $100');
    saveShift(state);
  } else if(!state.wanted) state.player.health=Math.min(100,state.player.health+4*dt);
  tickContracts(state,dt,services);
}
