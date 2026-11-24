const keys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','Space','ShiftLeft','ShiftRight','Escape','ArrowLeft','ArrowRight']);

export function createInput(canvas,active) {
  const pressed=new Set();
  const edges=new Set();
  const input={
    yaw:0,pitch:0,
    down:key=>pressed.has(key),
    take:key=>edges.delete(key),
    shift:()=>pressed.has('ShiftLeft')||pressed.has('ShiftRight'),
    clear:()=>{ pressed.clear();edges.clear(); }
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
    if(event.button!==0||!active()) return;
    edges.add('Fire');
    if(document.pointerLockElement!==canvas){
      try { canvas.requestPointerLock()?.catch(()=>{}); } catch {}
    }
  });
  document.addEventListener('mousemove',event=>{
    if(!active()||(document.pointerLockElement!==canvas&&!(event.buttons&1))) return;
    input.yaw+=event.movementX*.0026;
    input.pitch=Math.min(.5,Math.max(-.30,input.pitch+event.movementY*.003));
  });
  return input;
}
