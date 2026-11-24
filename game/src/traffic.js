import {avenues,streets,clearSpace} from './world.js';

export const carModels=[
  {name:'Sunbird',color:'eaa753',top:28,accel:12},
  {name:'Pelican',color:'5cbeb4',top:34,accel:14},
  {name:'Osprey',color:'e56291',top:45,accel:19},
  {name:'Kestrel GT',color:'ff765e',top:57,accel:24}
];

export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const lerp=(a,b,t)=>a+(b-a)*t;

function circuit(x1,z1,x2,z2,lane) {
  return [
    {x:x1+lane,z:z1-lane},{x:x1+lane,z:z2+lane},
    {x:x2-lane,z:z2+lane},{x:x2-lane,z:z1-lane}
  ];
}

export function createTraffic() {
  const cars=[
    {x:156,z:-62,yaw:0,model:0,parked:true,loaner:true},
    {x:158,z:-88,yaw:Math.PI,model:2,parked:true},
    {x:144,z:82,yaw:0,model:3,parked:true},
    {x:79,z:299,yaw:0,model:1,parked:true}
  ];
  for(let i=0;i<24;i++){
    const col=i%6, row=(i*3+Math.floor(i/6))%7;
    const route=circuit(avenues[col],streets[row],avenues[col+1],streets[row+1],i%2?-3.5:3.5);
    if(i%2) route.reverse();
    const segment=i%4;
    const a=route[segment], b=route[(segment+1)%4], t=.12+(i%5)*.16;
    cars.push({x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z),model:i%2,route,segment:(segment+1)%4,cruise:8+i%6});
  }
  const pedestrianRoute=[{x:169,z:-64},{x:169,z:-8}];
  const pedestrians=[-55,-43,-26].map((z,i)=>({
    x:169,z,yaw:0,route:pedestrianRoute,segment:1,cruise:1.1+i*.27,style:i+1,stun:0
  }));
  for(let i=0;i<52;i++){
    const row=i%8, col=(i*3+Math.floor(i/8))%6;
    const x=avenues[col]+37.5, z=streets[row]+37.5;
    const route=i%4===0
      ? [{x:169,z:streets[row]+10},{x:169,z:streets[row+1]-10}]
      : circuit(x-29,z-29,x+29,z+29,1);
    const start=route[Math.floor(i/8)%route.length];
    pedestrians.push({...start,route,segment:(route.indexOf(start)+1)%route.length,yaw:0,cruise:1.25+i%4*.2,style:i%7,stun:0});
  }
  return {cars,pedestrians};
}

function follow(entity,target,speed,dt) {
  const d=distance(entity,target);
  if(d<.001) return;
  const travel=Math.min(d,speed*dt);
  entity.yaw=Math.atan2(target.x-entity.x,target.z-entity.z);
  entity.x+=Math.sin(entity.yaw)*travel;
  entity.z+=Math.cos(entity.yaw)*travel;
}

export function tickTraffic(state,dt) {
  for(const entity of [...state.cars,...state.pedestrians]){
    if(entity.stun>0){entity.stun-=dt;continue;}
    if(!entity.route||entity===state.vehicle||entity.parked) continue;
    const target=entity.route[entity.segment];
    follow(entity,target,entity.cruise,dt);
    if(distance(entity,target)<.2) entity.segment=(entity.segment+1)%entity.route.length;
  }
}

const grid=avenues.flatMap((x,col)=>streets.map((z,row)=>({x,z,col,row})));
function nearestNode(point) {
  return grid.reduce((best,node)=>distance(point,node)<distance(point,best)?node:best,grid[0]);
}

function nextNode(origin,goal) {
  const dx=goal.col-origin.col, dz=goal.row-origin.row;
  if(Math.abs(dx)>=Math.abs(dz)&&dx) return grid[(origin.col+Math.sign(dx))*streets.length+origin.row];
  if(dz) return grid[origin.col*streets.length+origin.row+Math.sign(dz)];
  return origin;
}

export function roadSight(city,a,b) {
  const steps=Math.ceil(distance(a,b)/4);
  for(let i=1;i<steps;i++){
    const x=lerp(a.x,b.x,i/steps),z=lerp(a.z,b.z,i/steps);
    if(!clearSpace(city,x,z,.18)) return false;
  }
  return true;
}

export function tickPolice(state,city,dt) {
  if(!state.wanted){ state.police.length=0; return; }
  const target=state.vehicle||state.player;
  const goal=nearestNode(target);
  const desired=Math.min(7,state.wanted+1);
  state.dispatch-=dt;
  if(state.police.length<desired&&state.dispatch<=0){
    const occupied=state.police.map(car=>car.origin);
    const spawn=grid.filter(node=>distance(node,target)>78&&distance(node,target)<200&&!occupied.includes(node))
      .sort((a,b)=>distance(a,target)-distance(b,target))[0];
    if(spawn){
      state.police.push({...spawn,origin:spawn,node:spawn,yaw:0,model:0,police:true});
      state.dispatch=1.6;
    }
  }
  for(const car of state.police){
    if(car.stun>0){car.stun-=dt;continue;}
    const close=distance(car,target)<33&&roadSight(city,car,target);
    const point=close?target:car.node;
    if(distance(car,point)>.3) follow(car,point,12+state.wanted*3.4,dt);
    else if(!close){
      if(car.node===goal) {
        car.node=nearestNode(car);
        if(roadSight(city,car,target)&&distance(car,target)<46) follow(car,target,13,dt);
      } else car.node=nextNode(car.node,goal);
    }
    if(distance(car,target)<4){
      state.player.health-=dt*(state.vehicle?12:25);
      state.heatTime=Math.max(state.heatTime,4);
    }
  }
}
