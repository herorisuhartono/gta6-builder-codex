const keys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','Space','ShiftLeft','ShiftRight','Escape','ArrowLeft','ArrowRight','Digit1','Digit2','KeyV']);

export function createInput(canvas,active) {
  const pressed=new Set();
  const edges=new Set();
  const buttons=new Set();
  const input={
    yaw:0,pitch:0,lookTime:-99,age:0,
    aim:()=>buttons.has(2),
    fireHeld:()=>buttons.has(0),
    down:key=>pressed.has(key),
    take:key=>edges.delete(key),
    shift:()=>pressed.has('ShiftLeft')||pressed.has('ShiftRight'),
    clear:()=>{ pressed.clear();edges.clear();buttons.clear(); }
  };
  window.addEventListener('keydown',event=>{
    if(!keys.has(event.code)||!active()) return;
    event.preventDefault();
    if(!pressed.has(event.code)) edges.add(event.code);
    pressed.add(event.code);
  });
  window.addEventListener('keyup',event=>pressed.delete(event.code));
  window.addEventListener('blur',input.clear);
  canvas.addEventListener('mousedown',event=>{
    if(!active()||(event.button!==0&&event.button!==2)) return;
    buttons.add(event.button);
    if(event.button===0) edges.add('Fire');
    if(document.pointerLockElement!==canvas){
      try { canvas.requestPointerLock()?.catch(()=>{}); } catch {}
    }
  });
  window.addEventListener('mouseup',event=>buttons.delete(event.button));
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  document.addEventListener('mousemove',event=>{
    if(!active()||(document.pointerLockElement!==canvas&&!(event.buttons&3))) return;
    input.yaw+=event.movementX*.0026;
    input.pitch=Math.min(65*Math.PI/180,Math.max(-35*Math.PI/180,input.pitch+event.movementY*.003));
    input.lookTime=input.age;
  });
  return input;
}
