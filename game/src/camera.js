import {angleDelta} from './traffic.js';
import {blocksAt} from './world.js';

const mix=(a,b,t)=>a+(b-a)*t;
const views=[[0,3.2,7.5],[0,4.8,11.6],[0,1.45,-1.28]];

export class CameraController {
  constructor() { this.reset(); }

  reset() {
    this.yaw=0;
    this.pitch=0;
    this.yawVelocity=0;
    this.pitchVelocity=0;
    this.offset=[0,2.2,5.5];
    this.fov=65;
    this.lag=0;
    this.shake=0;
    this.view=0;
  }

  update(state,input,city,dt) {
    const car=state.vehicle;
    const actor=car||state.player;
    const aiming=!car&&input.aim();
    const speed=Math.abs(car?.speed||0);
    const sprint=!car&&input.shift()&&state.walking;
    if(car&&input.take('KeyV')) this.view=(this.view+1)%views.length;
    else if(!car) input.take('KeyV');
    if(car&&state.age-input.lookTime>1.5){
      input.yaw+=angleDelta(input.yaw,speed>3?car.heading:car.yaw)*Math.min(1,dt*2.7);
      input.pitch*=Math.exp(-dt*2.7);
    }
    const steps=Math.max(1,Math.ceil(dt/.012));
    for(let i=0;i<steps;i++){
      const step=dt/steps;
      this.yawVelocity+=(angleDelta(this.yaw,input.yaw)*105-this.yawVelocity*18)*step;
      this.pitchVelocity+=((input.pitch-this.pitch)*105-this.pitchVelocity*18)*step;
      this.yaw+=this.yawVelocity*step;
      this.pitch+=this.pitchVelocity*step;
    }
    const desired=car?views[this.view]:aiming?[.95,1.75,2.6]:[0,2.2,5.5];
    const blend=1-Math.exp(-dt*8);
    this.offset=this.offset.map((n,i)=>mix(n,desired[i],blend));
    const targetFov=car?65+20*Math.min(1,(speed+(input.shift()?8:0))/48):aiming?48:sprint?70:65;
    this.fov=mix(this.fov,targetFov,blend);
    this.lag=mix(this.lag,car&&this.view!==2&&input.down('Space')?angleDelta(car.heading,car.yaw)*1.9:0,blend);
    this.shake=Math.max(this.shake*Math.exp(-dt*12),state.cameraKick||0);
    state.cameraKick=0;

    const sin=Math.sin(this.yaw), cos=Math.cos(this.yaw);
    const pitch=Math.min(65*Math.PI/180,Math.max(-35*Math.PI/180,this.pitch));
    const [side,height,boom]=this.offset;
    const sway=!car&&state.walking?Math.sin(state.player.gait||0)*.035:0;
    const lateral=side+this.lag+sway+Math.sin(state.age*83)*this.shake;
    const reach=boom*Math.cos(pitch);
    const pivot=[actor.x,(actor.y||0)+(car?1.05:1.28),actor.z];
    const wanted=[pivot[0]-sin*reach+cos*lateral,Math.max(.4,(actor.y||0)+height+boom*Math.sin(pitch)+Math.cos(state.age*91)*this.shake),pivot[2]-cos*reach-sin*lateral];
    const length=Math.hypot(...wanted.map((n,i)=>n-pivot[i]));
    let fraction=1;
    for(let t=.18;t<length;t+=.18){
      const step=t/length;
      if(blocksAt(city,mix(pivot[0],wanted[0],step),mix(pivot[1],wanted[1],step),mix(pivot[2],wanted[2],step),.16)){
        fraction=Math.max(.04,(t-.22)/length);
        break;
      }
    }
    const eye=pivot.map((n,i)=>mix(n,wanted[i],fraction));
    const target=aiming
      ? [eye[0]+sin*28,eye[1]-Math.tan(pitch)*28,eye[2]+cos*28]
      : [pivot[0]+sin*7,pivot[1]-Math.tan(pitch)*4,pivot[2]+cos*7];
    return {eye,target,fov:this.fov};
  }
}
