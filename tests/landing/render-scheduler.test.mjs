import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderScheduler} from '../../landing/js/render-scheduler.js';
function fakeClock(){
  let id=0;const frames=new Map(),timers=new Map();
  return {frames,timers,
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},
    cancelAnimationFrame:key=>frames.delete(key),
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},
    clearTimeout:key=>timers.delete(key),
    frame(now=100){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));},
    tick(){const pending=[...timers.values()];timers.clear();pending.forEach(t=>t.fn());}
  };
}
test('idle landing leaves no queued work after first paint',()=>{
  const clock=fakeClock();let draws=0;
  const scheduler=createRenderScheduler(()=>{draws++;return false;},clock);
  scheduler.invalidate();clock.frame();
  assert.equal(draws,1);assert.equal(clock.frames.size+clock.timers.size,0);
});
test('many events are coalesced into a single render',()=>{
  const clock=fakeClock();let draws=0;
  const scheduler=createRenderScheduler(()=>{draws++;return false;},clock);
  for(let i=0;i<100;i++)scheduler.invalidate();
  assert.equal(clock.frames.size,1);clock.frame();assert.equal(draws,1);
});
test('explicit playback is capped and stopping leaves no timer',()=>{
  const clock=fakeClock();let playing=true;
  const scheduler=createRenderScheduler(()=>playing,clock);
  scheduler.invalidate();clock.frame();
  assert.equal(clock.frames.size,0);assert.equal([...clock.timers.values()][0].delay,50);
  playing=false;scheduler.invalidate();clock.frame();
  assert.equal(clock.frames.size+clock.timers.size,0);
});
test('hidden page cancels animation and timeout handles',()=>{
  const clock=fakeClock();const scheduler=createRenderScheduler(()=>true,clock);
  scheduler.invalidate();scheduler.suspend();clock.frame();
  assert.equal(clock.frames.size+clock.timers.size,0);
  scheduler.resume();clock.frame();assert.equal(clock.timers.size,1);
  scheduler.suspend();assert.equal(clock.timers.size,0);
  scheduler.invalidate();assert.equal(clock.frames.size,0);
});
test('visible page resumes with one fresh frame',()=>{
  const clock=fakeClock();let draws=0;
  const scheduler=createRenderScheduler(()=>{draws++;return false;},clock);
  scheduler.suspend();scheduler.resume();scheduler.resume();clock.frame();
  assert.equal(draws,1);assert.equal(clock.frames.size+clock.timers.size,0);
});

test('smooth playback uses a single RAF, caps at 60 Hz and suspends',()=>{
 const clock=fakeClock();let draws=0;
 const scheduler=createRenderScheduler(()=>{draws++;return 'smooth';},clock);
 scheduler.invalidate();clock.frame(100);clock.frame(108);
 assert.equal(draws,1);assert.equal(clock.frames.size,1);assert.equal(clock.timers.size,0);
 clock.frame(117);assert.equal(draws,2);
 scheduler.suspend();assert.equal(clock.frames.size+clock.timers.size,0);
});
test('invalidation during render does not leave an orphan playback timer',()=>{
 const clock=fakeClock();const scheduler=createRenderScheduler(()=>{scheduler.invalidate();return true;},clock);
 scheduler.invalidate();clock.frame();assert.equal(clock.frames.size,1);assert.equal(clock.timers.size,0);
 scheduler.suspend();assert.equal(clock.frames.size+clock.timers.size,0);
});
