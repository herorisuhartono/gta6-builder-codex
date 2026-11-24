import {avenues,streets,districtAt} from './world.js';
import {carModels,distance} from './traffic.js';
import {contracts,objectiveFor,raceGates} from './contracts.js';

const byId=(id)=>document.getElementById(id);
const radar=byId('radar').getContext('2d');
const center=90, scale=.66;

function drawRadar(state,point,objective) {
  const x=(world)=>center+(world-point.x)*scale;
  const z=(world)=>center+(world-point.z)*scale;
  radar.clearRect(0,0,180,180);
  radar.fillStyle='#31596b';
  radar.fillRect(x(231),0,180,180);
  radar.fillStyle='#ac8270';
  radar.fillRect(x(176),0,(231-176)*scale,180);
  radar.strokeStyle='#c8959c80';
  for(const road of avenues){
    radar.lineWidth=road===150?8:5;
    radar.beginPath();
    radar.moveTo(x(road),z(-332));
    radar.lineTo(x(road),z(332));
    radar.stroke();
  }
  radar.lineWidth=5;
  for(const road of streets){
    radar.beginPath();
    radar.moveTo(x(-318),z(road));
    radar.lineTo(x(160),z(road));
    radar.stroke();
  }
  function dot(entity,color,radius){
    radar.beginPath();
    radar.arc(x(entity.x),z(entity.z),radius,0,Math.PI*2);
    radar.fillStyle=color;
    radar.fill();
  }
  for(const vehicle of state.cars) dot(vehicle,'#a9c1ce',1.9);
  for(const officer of state.police) dot(officer,Math.floor(state.age*6)%2?'#ff6388':'#77d9ff',3.3);
  const dx=objective.x-point.x,dz=objective.z-point.z;
  const factor=Math.min(1,117/Math.max(1,Math.hypot(dx,dz)));
  dot({x:point.x+dx*factor,z:point.z+dz*factor},'#ffcb76',4.6);
  radar.save();
  radar.translate(center,center);
  radar.rotate(-point.yaw);
  radar.fillStyle='#fff5d1';
  radar.beginPath();
  radar.moveTo(0,8);
  radar.lineTo(-5,-6);
  radar.lineTo(0,-3);
  radar.lineTo(5,-6);
  radar.fill();
  radar.restore();
  radar.fillStyle='#ffe0ab';
  radar.font='bold 11px monospace';
  radar.fillText('N',86,15);
}

export function drawHud(state) {
  const point=state.vehicle||state.player;
  const target=objectiveFor(state);
  const meters=Math.round(distance(point,target));
  byId('district').textContent=districtAt(point.x,point.z);
  byId('stars').textContent='★'.repeat(state.wanted)+'☆'.repeat(5-state.wanted);
  byId('cash').textContent='$'+state.cash.toLocaleString('en-US');
  byId('score').textContent=state.score.toLocaleString('en-US')+' REP';
  byId('title').textContent=state.race?'Breakwater Sprint':state.chapter===4?'Free Roam':contracts[state.chapter].title;
  const text=state.race?'Gate '+(state.gate+1)+'/'+raceGates.length+' · '+Math.ceil(state.clock)+' s':
    state.chapter===4?'Revisit the boulevard to race again.':contracts[state.chapter].text;
  byId('objective').textContent=text+'  ·  '+meters+' m';
  byId('notice').textContent=state.messageTime>0?state.message:'';
  byId('speed').textContent=state.vehicle?String(Math.round(Math.abs(state.vehicle.speed)*3.6)).padStart(2,'0')+' km/h':'ON FOOT';
  byId('hint').textContent=state.vehicle?carModels[state.vehicle.model].name+' · N₂O '+Math.round(state.vehicle.nitro*100)+'%':'E / F vehicle · click to aim';
  byId('health').value=state.player.health;
  drawRadar(state,point,target);
}
