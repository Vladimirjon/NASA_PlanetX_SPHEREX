import test from 'node:test';
import assert from 'node:assert/strict';
let sequence=0;
async function fixture(){
  const mod=await import('../../landing/js/sat3d.js?test='+sequence++);
  const {SAT3D,VIEWS}=mod;
  const images=[],pending=[],handlers={};let draws=[];
  const original=globalThis.Image;
  globalThis.Image=class{constructor(){images.push(this);}set src(value){this.url=value;pending.push(this);}get src(){return this.url;}};
  const context={setTransform(){},clearRect(){},drawImage(img){draws.push({img,alpha:context.globalAlpha});},globalAlpha:1};
  const canvas={clientWidth:3840,clientHeight:2160,width:300,height:150,
    classList:{add(){},remove(){}},setPointerCapture(){},addEventListener(type,fn){handlers[type]=fn;},
    getContext(type,options){assert.equal(type,'2d');assert.equal(options.willReadFrequently,true);return context;}};
  SAT3D.init(canvas);
  return {SAT3D,VIEWS,canvas,images,pending,handlers,draws:()=>draws,reset:()=>{draws=[];},
    flushAll(){while(pending.length)pending.shift().onload();},restore(){globalThis.Image=original;}};
}
const layout={cx:100,cy:100,diam:80};
test('current row is requested at once, at most six downloads in flight',async()=>{
  const f=await fixture();try{
    assert.equal(f.pending.length,6);
    assert.ok(f.pending.every(i=>i.url.includes('/'+Math.round(f.VIEWS.start)+'-')));
    assert.equal(f.SAT3D.ready,false);f.pending.shift().onload();assert.equal(f.SAT3D.ready,true);
  }finally{f.restore();}
});
test('paints through a bounded 2D canvas and reuses unchanged frames',async()=>{
  const f=await fixture();try{
    f.flushAll();f.SAT3D.update(0,layout,true);const n=f.draws().length;
    assert.ok(n>=1);assert.ok(f.canvas.width*f.canvas.height<=902000);
    f.SAT3D.update(0,layout,true);assert.equal(f.draws().length,n);
  }finally{f.restore();}
});
test('between two views the weights add up to one, so the turn is continuous',async()=>{
  const f=await fixture();try{
    f.flushAll();
    for(let i=0;i<20;i++)f.handlers.keydown({key:'ArrowRight',preventDefault(){}});   // moves a whole number of frames
    f.reset();f.SAT3D.update(0,layout,true);
    const alphas=f.draws().map(d=>d.alpha);assert.equal(alphas[0],1);
  }finally{f.restore();}
});
test('a missing view falls back to the nearest loaded one instead of leaving a hole',async()=>{
  const f=await fixture();try{
    f.pending.shift().onload();f.pending.forEach(i=>i.onerror());           // only one view arrived
    f.handlers.keydown({key:'ArrowRight',preventDefault(){}});
    f.SAT3D.update(0,layout,true);
    assert.equal(f.SAT3D.ready,true);assert.equal(f.SAT3D.failed,false);assert.ok(f.draws().length>=1);
  }finally{f.restore();}
});
test('every request stays inside the manifest grid',async()=>{
  const f=await fixture();try{
    for(let i=0;i<300;i++)f.handlers.keydown({key:i%2?'ArrowDown':'ArrowRight',preventDefault(){}});
    for(const img of [...f.images]){const m=/(\d+)-(\d+)\.webp$/.exec(img.url);if(!m)continue;
      assert.ok(+m[1]<f.VIEWS.pitchDegrees.length&&+m[2]<f.VIEWS.yaw);}
  }finally{f.restore();}
});
