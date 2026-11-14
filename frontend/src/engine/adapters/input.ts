export interface InputHandlers {
  move(dx: number, dy: number): void;
  zoom(factor: number): void;
  band(delta: number): void;
  cursor(x: number, y: number): void;
  pick(x: number, y: number): void;
}
export function bindInput(canvas: HTMLCanvasElement, handlers: InputHandlers): () => void {
  let dragging: {x:number;y:number;moved:boolean}|null = null, pinchDistance = 0;
  const pointers = new Map<number, {x:number;y:number}>();
  let rect=canvas.getBoundingClientRect();
  const resize=new ResizeObserver(()=>{rect=canvas.getBoundingClientRect();}); resize.observe(canvas);
  const down = (event: PointerEvent): void => {
    rect=canvas.getBoundingClientRect(); canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pointers.size===1) dragging={x:event.clientX,y:event.clientY,moved:false};
    if (pointers.size===2) {const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);dragging=null;}
  };
  const move = (event: PointerEvent): void => {
    handlers.cursor(event.clientX-rect.left,event.clientY-rect.top);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pointers.size===2) {const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0 && distance>0) handlers.zoom(pinchDistance/distance);pinchDistance=distance;return;}
    if (dragging) {const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;dragging={x:event.clientX,y:event.clientY,moved:dragging.moved || Math.abs(dx)+Math.abs(dy)>1};handlers.move(dx,dy);}
  };
  const up = (event: PointerEvent): void => {pointers.delete(event.pointerId);if(dragging && !dragging.moved && event.type !== 'pointercancel'){handlers.pick(event.clientX-rect.left,event.clientY-rect.top);}dragging=null;};
  const wheel = (event: WheelEvent): void => {event.preventDefault();handlers.zoom(Math.exp(event.deltaY*.001));};
  const key = (event: KeyboardEvent): void => {
    let handled=true;
    switch(event.key){
      case 'ArrowLeft':handlers.move(-30,0);break;case 'ArrowRight':handlers.move(30,0);break;
      case 'ArrowUp':handlers.move(0,-30);break;case 'ArrowDown':handlers.move(0,30);break;
      case '+':case '=':handlers.zoom(.8);break;case '-':handlers.zoom(1.25);break;
      case 'Enter':handlers.pick(canvas.clientWidth/2,canvas.clientHeight/2);break;
      case 'PageUp':handlers.band(1);break;case 'PageDown':handlers.band(-1);break;default:handled=false;
    }
    if(handled)event.preventDefault();
  };
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
  return () => {resize.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);};
}
