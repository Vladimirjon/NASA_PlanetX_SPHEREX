export interface InputHandlers {
  /** Begin a grab at the pointer (stores the sky point under the finger). */
  grab(x: number, y: number): void;
  /** Keep the grabbed sky point under the current pointer. */
  dragTo(x: number, y: number): void;
  /** Keyboard / button nudge in pixels (north-up). */
  nudge(dx: number, dy: number): void;
  /** Zoom factor; optional cursor anchor in canvas CSS pixels. */
  zoom(factor: number, x?: number, y?: number): void;
  band(delta: number): void;
  cursor(x: number, y: number): void;
  pick(x: number, y: number): void;
  /** Pointer released after a drag; velocity in CSS px/ms and last position for inertia. */
  release(vx: number, vy: number, x: number, y: number): void;
  /** Cancel flyTo / inertia (not an in-flight zoom damp). */
  interrupt(): void;
}

export function bindInput(canvas: HTMLCanvasElement, handlers: InputHandlers): () => void {
  let dragging: { x: number; y: number; moved: boolean; lastT: number; vx: number; vy: number } | null = null;
  let pinchDistance = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let rect = canvas.getBoundingClientRect();
  const resize = new ResizeObserver(() => { rect = canvas.getBoundingClientRect(); });
  resize.observe(canvas);
  const local = (clientX: number, clientY: number): { x: number; y: number } => ({
    x: clientX - rect.left,
    y: clientY - rect.top,
  });
  const down = (event: PointerEvent): void => {
    handlers.interrupt();
    rect = canvas.getBoundingClientRect();
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      const p = local(event.clientX, event.clientY);
      handlers.grab(p.x, p.y);
      dragging = { x: p.x, y: p.y, moved: false, lastT: performance.now(), vx: 0, vy: 0 };
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      dragging = null;
    }
  };
  const move = (event: PointerEvent): void => {
    const p = local(event.clientX, event.clientY);
    handlers.cursor(p.x, p.y);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      handlers.interrupt();
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0 && distance > 0) {
        const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
        handlers.zoom(pinchDistance / distance, mid.x, mid.y);
      }
      pinchDistance = distance;
      return;
    }
    if (dragging) {
      const now = performance.now();
      const dt = Math.max(1, now - dragging.lastT);
      const dx = p.x - dragging.x;
      const dy = p.y - dragging.y;
      handlers.dragTo(p.x, p.y);
      dragging = {
        x: p.x,
        y: p.y,
        moved: dragging.moved || Math.abs(dx) + Math.abs(dy) > 1,
        lastT: now,
        vx: dx / dt,
        vy: dy / dt,
      };
    }
  };
  const up = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    if (dragging) {
      const p = local(event.clientX, event.clientY);
      if (!dragging.moved && event.type !== 'pointercancel') handlers.pick(p.x, p.y);
      else handlers.release(dragging.vx, dragging.vy, dragging.x, dragging.y);
    }
    dragging = null;
  };
  const wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const p = local(event.clientX, event.clientY);
    // Zoom handler cancels flight/inertia and composes the damp target; do not stopZoom here.
    handlers.zoom(Math.exp(event.deltaY * 0.001), p.x, p.y);
  };
  const key = (event: KeyboardEvent): void => {
    let handled = true;
    handlers.interrupt();
    switch (event.key) {
      case 'ArrowLeft': handlers.nudge(-30, 0); break;
      case 'ArrowRight': handlers.nudge(30, 0); break;
      case 'ArrowUp': handlers.nudge(0, -30); break;
      case 'ArrowDown': handlers.nudge(0, 30); break;
      case '+': case '=': handlers.zoom(0.8, canvas.clientWidth / 2, canvas.clientHeight / 2); break;
      case '-': handlers.zoom(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2); break;
      case 'Enter': handlers.pick(canvas.clientWidth / 2, canvas.clientHeight / 2); break;
      case 'PageUp': handlers.band(1); break;
      case 'PageDown': handlers.band(-1); break;
      default: handled = false;
    }
    if (handled) event.preventDefault();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('keydown', key);
  return () => {
    resize.disconnect();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('keydown', key);
  };
}
