import {blocksAt,clearSpace} from './world.js';
import {distance,angleDelta} from './traffic.js';

export const weapons=[
  {name:'Pistol',delay:.31,damage:45,speed:115},
  {name:'Micro-SMG',delay:.089,damage:22,speed:132},
];
export const hospital={x:-143,z:-150,yaw:0};
const aimAt=(from,to)=>Math.atan2(to.x-from.x,to.z-from.z);
const point=(entity,y)=>({x:entity.x,z:entity.z,y:(entity.y||0)+y});

function bullet(state,from,to,speed,damage,friendly) {
  const x=to.x-from.x,y=to.y-from.y,z=to.z-from.z;
  const mag=Math.hypot(x,y,z)||1;
  state.bullets.push({...from,vx:x*speed/mag,vy:y*speed/mag,vz:z*speed/mag,life:1.3,damage,friendly});
}

export function muzzleOf(player) {
  const yaw=player.aimYaw??player.yaw;
  const pitch=player.aimPitch||0;
  const forward=.92*Math.cos(pitch),side=.39;
  return {
    x:player.x+Math.sin(yaw)*forward+Math.cos(yaw)*side,
    z:player.z+Math.cos(yaw)*forward-Math.sin(yaw)*side,
    y:(player.y||0)+1.43-.78*Math.sin(pitch)
  };
}

function firePlayer(state,input,services) {
  if(input.take('Digit1')) state.weapon=0;
  if(input.take('Digit2')) state.weapon=1;
  const click=input.take('Fire');
  state.player.aiming=!state.vehicle&&(input.aim?.()||state.muzzle>0);
  if(!state.vehicle&&(state.player.aiming||click)) {
    state.player.aimYaw=input.yaw;
    state.player.yaw=input.yaw;
    state.player.aimPitch=input.cameraPitch??input.pitch??0;
  }
  if(state.vehicle||state.shotCooldown>0||!(click||(state.weapon===1&&input.fireHeld?.()))) return;
  if(state.weapon===1&&state.ammo===0){
    if(click) services.notify('Micro-SMG is out of ammo.');
    return;
  }
  if(state.weapon===1) state.ammo--;
  const weapon=weapons[state.weapon], yaw=input.yaw;
  const pitch=state.player.aimPitch||0;
  const from=muzzleOf(state.player);
  bullet(state,from,{x:from.x+Math.sin(yaw)*60,z:from.z+Math.cos(yaw)*60,y:from.y-Math.tan(pitch)*60},weapon.speed,weapon.damage,true);
  state.shotCooldown=weapon.delay;
  state.muzzle=.075;
  state.player.aiming=true;
  state.cameraKick=.045;
  if(state.age>=state.reportAt){
    services.offense(1,'Gunfire reported.');
    state.reportAt=state.age+1.25;
  }
  services.sound('pulse');
}

function retireOfficer(state,officer) {
  officer.health=0;
  officer.down=2.1;
  state.score+=150;
  for(const [i,type] of ['cash','ammo','health'].entries()){
    state.pickups.push({type,x:officer.x+(i-1)*1.25,z:officer.z+(i%2)*1.1,life:45});
  }
}

function moveBullets(state,city,dt,services) {
  const player=state.vehicle||state.player;
  const opponents=[...state.officers,...state.police,...state.cars,...state.pedestrians];
  for(const shot of state.bullets){
    const speed=Math.hypot(shot.vx,shot.vy,shot.vz);
    const steps=Math.ceil(speed*dt/.32);
    shot.life-=dt;
    for(let i=0;i<steps&&shot.life>0;i++){
      shot.x+=shot.vx*dt/steps;
      shot.y+=shot.vy*dt/steps;
      shot.z+=shot.vz*dt/steps;
      const targets=shot.friendly?opponents:[player];
      const hit=targets.find(a=>{
        if(a.health===0) return false;
        const car=a.model!==undefined;
        return distance(a,shot)<(car?1.58:.56)&&shot.y>=(a.y||0)&&shot.y<=(a.y||0)+(car?1.58:1.92);
      });
      if(!hit&&!blocksAt(city,shot.x,shot.y,shot.z,.04)) continue;
      shot.life=0;
      state.sparks.push({...shot,life:.22});
      if(!hit) continue;
      if(!shot.friendly){state.player.health-=shot.damage;state.cameraKick=.07;continue;}
      if(hit.health!==undefined){
        hit.health-=shot.damage;
        if(hit.health<=0) retireOfficer(state,hit);
      } else if(hit.model!==undefined){
        hit.stun=Math.max(hit.stun||0,hit.police?3:2);
        hit.speed=hit.speed===undefined?undefined:hit.speed*.75;
      } else hit.stun=4;
      if(state.age>=state.hitReportAt){
        services.offense(hit.police?2:1,'Dispatch responding to a reported hit.');
        state.hitReportAt=state.age+.8;
      }
    }
  }
  state.bullets=state.bullets.filter(shot=>shot.life>0);
}

function footPatrol(state,city,dt,services) {
  const target=state.vehicle||state.player;
  if(state.wanted){
    for(const car of state.police){
      if(car.officerDeployed) continue;
      const d=distance(car,target);
      if(d>95||d<16) continue;
      const yaw=aimAt(car,target);
      const sideX=car.x+Math.cos(yaw)*2.4,sideZ=car.z-Math.sin(yaw)*2.4;
      if(!clearSpace(city,sideX,sideZ,.48)) continue;
      state.officers.push({x:sideX,z:sideZ,yaw,aimYaw:yaw,officer:true,police:true,health:80,cooldown:.8+state.officers.length*.29,gait:0,walkBlend:0});
      car.officerDeployed=true;
    }
  }
  for(const officer of state.officers){
    if(officer.health<=0){officer.down-=dt;continue;}
    if(!state.wanted){officer.leaving=(officer.leaving||0)+dt;continue;}
    officer.yaw=aimAt(officer,target);
    officer.aimYaw=officer.yaw;
    const d=distance(officer,target);
    const speed=d>13?4.2:0;
    officer.walkBlend+=(speed/5-officer.walkBlend)*Math.min(1,dt*9);
    officer.gait+=dt*8*officer.walkBlend;
    if(speed){
      const x=officer.x+Math.sin(officer.yaw)*speed*dt,z=officer.z+Math.cos(officer.yaw)*speed*dt;
      if(clearSpace(city,x,officer.z,.5)) officer.x=x;
      if(clearSpace(city,officer.x,z,.5)) officer.z=z;
    }
    officer.cooldown-=dt;
    officer.aiming=d<38;
    if(d<31&&officer.cooldown<=0&&lineClear(city,officer,target)){
      officer.cooldown=1.25;
      const from=muzzleOf(officer);
      const spread=Math.sin(state.age*13+officer.x)*1.25;
      bullet(state,from,{x:target.x+Math.cos(officer.yaw)*spread,z:target.z-Math.sin(officer.yaw)*spread,y:(target.y||0)+1},22,11,false);
      if(d<27) services.sound('hostile');
    }
  }
  state.officers=state.officers.filter(a=>a.health>0?(a.leaving||0)<2:a.down>0);
}

function lineClear(city,a,b) {
  const steps=Math.ceil(distance(a,b));
  for(let i=1;i<steps;i++) if(!clearSpace(city,a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,.08)) return false;
  return true;
}

function helicopter(state,dt,services) {
  const actor=state.vehicle||state.player;
  if(state.wanted>=3&&!state.chopper){
    state.chopper={x:actor.x-41,z:actor.z+44,y:45,yaw:0,spotX:actor.x-7,spotZ:actor.z+7,tracked:0,cooldown:0,burst:0};
    services.notify('Dispatch / Air unit inbound');
  }
  const air=state.chopper;
  if(!air) return;
  if(state.wanted<3){
    air.y+=dt*10;
    air.x-=dt*19;
    if(air.y>69) state.chopper=null;
    air.retreat=true;
    air.tracked=0;
    air.burst=0;
    return;
  }
  air.retreat=false;
  const angle=state.age*.43;
  const dest={x:actor.x+Math.sin(angle)*23,z:actor.z+Math.cos(angle)*23};
  const heading=aimAt(air,dest);
  air.yaw+=angleDelta(air.yaw,heading)*Math.min(1,dt*3);
  const travel=Math.min(distance(air,dest),dt*26);
  air.x+=Math.sin(heading)*travel;
  air.z+=Math.cos(heading)*travel;
  air.y+=(39+Math.sin(angle*2)*3.2-air.y)*Math.min(1,dt);
  air.spotX+=(actor.x-air.spotX)*Math.min(1,dt*.95);
  air.spotZ+=(actor.z-air.spotZ)*Math.min(1,dt*.95);
  const near=distance({x:air.spotX,z:air.spotZ},actor)<6.5;
  air.tracked=near?air.tracked+dt:Math.max(0,air.tracked-dt*2);
  air.cooldown-=dt;
  if(air.tracked<2||air.cooldown>0) return;
  if(!air.burst) air.burst=3;
  const spread=Math.sin(state.age*21)*1.8;
  bullet(state,point(air,-.6),{x:actor.x+spread,z:actor.z-spread*.9,y:(actor.y||0)+.8},30,12,false);
  air.burst--;
  air.cooldown=air.burst?.19:1.7;
  state.cameraKick=Math.max(state.cameraKick,.055);
  services.sound('hostile');
}

export function tickCombat(state,city,input,dt,services) {
  state.shotCooldown-=dt;
  state.muzzle-=dt;
  firePlayer(state,input,services);
  footPatrol(state,city,dt,services);
  helicopter(state,dt,services);
  moveBullets(state,city,dt,services);
  for(const spark of state.sparks) spark.life-=dt;
  state.sparks=state.sparks.filter(spark=>spark.life>0);
  const player=state.vehicle||state.player;
  for(const item of state.pickups){
    item.life-=dt;
    if(distance(item,player)>2.2) continue;
    if(item.type==='cash') state.cash+=65;
    if(item.type==='ammo') state.ammo+=24;
    if(item.type==='health') state.player.health=Math.min(100,state.player.health+28);
    item.life=0;
    services.sound('gate');
  }
  state.pickups=state.pickups.filter(item=>item.life>0);
}
