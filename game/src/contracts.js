export const contracts=[
  {title:'I. The Duplicate',x:169,z:-35,pay:180,text:'Meet dispatcher Inez Sol on the promenade.',line:'INEZ / Vale diverted the seawall fund. I copied his freight ledger.'},
  {title:'II. Paper Cargo',x:75,z:300,pay:350,text:'Collect the sealed ledger at Bellwether Docks.',line:'INEZ / You have the ledger. The Port Authority scanners saw the pickup.'},
  {title:'III. Dead Air',x:-150,z:75,pay:650,text:'Deliver the ledger to WMBY. Lose the patrols first.',line:'WMBY / We have the files. Vale is on the air in five minutes.'},
  {title:'IV. Breakwater Sprint',x:150,z:155,pay:850,text:'Bring a car to the race start on Canary Boulevard.',line:'INEZ / Tonight the repair fund is back. The boulevard is yours.'}
];
export const raceGates=[
  {x:150,z:75},{x:150,z:0},{x:150,z:-75},{x:75,z:-75},
  {x:0,z:-75},{x:0,z:0},{x:75,z:0},{x:150,z:0},{x:150,z:75}
];
export const objectiveFor=(state)=>state.race?raceGates[state.gate]:contracts[Math.min(state.chapter,3)];

export function tickContracts(state,dt,services) {
  const {notify,save,offense,sound,distance}=services;
  const player=state.vehicle||state.player;
  const job=objectiveFor(state);
  const reached=distance(player,job)<(state.race?12:8);
  if(state.race){
    state.clock-=dt;
    if(state.clock<=0){
      state.race=false;
      notify('Time expired. Return to the boulevard to race again.');
    } else if(reached){
      state.gate++;
      sound('gate');
      if(state.gate===raceGates.length){
        state.race=false;
        state.cash+=850+Math.floor(state.clock)*5;
        state.score+=1300;
        state.chapter=4;
        notify(contracts[3].line);
        save();
      }
    }
    return;
  }
  if(!reached) return;
  if(state.chapter>=3){
    if(!state.vehicle) return;
    state.race=true;
    state.clock=66;
    state.gate=0;
    notify('BREAKWATER SPRINT / Nine checkpoints');
    sound('gate');
    return;
  }
  if(state.chapter===2&&state.wanted) return;
  const previousCash=state.cash;
  state.cash+=job.pay;
  state.score+=job.pay*2;
  state.chapter++;
  const unlock=[500,1100].find(price=>previousCash<price&&state.cash>=price);
  notify(job.line+(unlock===500?' Osprey unlocked.':unlock?' Kestrel GT unlocked.':''));
  if(state.chapter===2) offense(2,'');
  sound('gate');
  save();
}
