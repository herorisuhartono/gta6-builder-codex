export function createSound() {
  let context,oscillator,engine,siren,alarm,rotor,rotorGain;
  function start() {
    if(!context){
      context=new AudioContext();
      function loop(type,frequency) {
        const oscillator=context.createOscillator(), gain=context.createGain();
        oscillator.type=type;
        oscillator.frequency.value=frequency;
        gain.gain.value=0;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        return [oscillator,gain];
      }
      [oscillator,engine]=loop('triangle',45);
      [siren,alarm]=loop('sine',610);
      [rotor,rotorGain]=loop('square',31);
    }
    if(context.state==='suspended') context.resume().catch(()=>{});
  }

  function effect(kind) {
    if(!context) return;
    const tones={hit:[92,35,.18,'sawtooth'],gate:[430,790,.27,'triangle'],pulse:[210,45,.13,'sawtooth'],hostile:[138,40,.12,'square']};
    const [from,to,length,type]=tones[kind];
    const tone=context.createOscillator(), volume=context.createGain(), now=context.currentTime;
    tone.type=type;
    tone.frequency.setValueAtTime(from,now);
    tone.frequency.exponentialRampToValueAtTime(to,now+length);
    volume.gain.setValueAtTime(.09,now);
    volume.gain.exponentialRampToValueAtTime(.001,now+length);
    tone.connect(volume).connect(context.destination);
    tone.start(now);
    tone.stop(now+length);
    tone.addEventListener('ended',()=>{tone.disconnect();volume.disconnect();});
  }

  function update(state,playing) {
    if(!context) return;
    const speed=Math.abs(state.vehicle?.speed||0);
    const point=state.vehicle||state.player;
    const near=Math.min(130,...state.police.filter(car=>!(car.stun>0)).map(car=>Math.hypot(car.x-point.x,car.z-point.z)));
    const t=context.currentTime;
    oscillator.frequency.setTargetAtTime(36+speed*3.5,t,.08);
    engine.gain.setTargetAtTime(playing&&state.vehicle?.speed!==undefined?.027+speed*.0007:0,t,.1);
    rotor.frequency.setTargetAtTime(30+Math.sin(t*19)*3,t,.03);
    rotorGain.gain.setTargetAtTime(playing&&state.chopper?.009:0,t,.15);
    siren.frequency.setTargetAtTime(620+Math.sin(t*6)*180,t,.025);
    alarm.gain.setTargetAtTime(playing?Math.max(0,1-near/115)*.045:0,t,.09);
  }

  return {start,effect,update};
}
