/* One render per invalidation. Only explicit playback schedules another frame.
   Render returns a delay in ms (true defaults to 50); hidden pages cancel both handles. */
export function createRenderScheduler(render, clock = globalThis) {
  let frameId = null;
  let timerId = null;
  let suspended = false;
  let lastRender = -Infinity;
  let smooth = false;

  function invalidate() {
    if (suspended || frameId !== null) return;
    if (timerId !== null) { clock.clearTimeout(timerId); timerId = null; }
    frameId = clock.requestAnimationFrame(now => {
      frameId = null;
      if (suspended) return;
      if(smooth && now-lastRender<16){invalidate();return;}
      lastRender=now;
      const next = render(now);
      smooth=next==='smooth';
      if(smooth && !suspended){invalidate();}
      else if (next && !suspended && frameId === null) {
        timerId = clock.setTimeout(() => { timerId = null; invalidate(); }, typeof next === 'number' ? next : 50);
      }
    });
  }
  function suspend() {
    suspended = true;
    if (frameId !== null) clock.cancelAnimationFrame(frameId);
    if (timerId !== null) clock.clearTimeout(timerId);
    frameId = timerId = null;
  }
  function resume() { suspended = false; invalidate(); }
  return { invalidate, suspend, resume };
}
