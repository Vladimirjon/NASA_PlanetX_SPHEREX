const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--disable-webgl','--disable-gpu-compositing','--disable-accelerated-2d-canvas']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
 await page.addInitScript(()=>{
   window.probe={frames:0,gl:0};const raf=requestAnimationFrame.bind(window);
   window.requestAnimationFrame=f=>raf(t=>{probe.frames++;f(t);});
   const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl|webgpu/.test(type))probe.gl++;return get.call(this,type,...args);};
 });
 const errors=[],bad=[],urls=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});page.on('request',r=>urls.push(r.url()));
 const base=process.env.LANDING_URL||'http://127.0.0.1:4410/';
 const out=process.env.TEST_OUTPUT_DIR||'test-results/landing-restored';fs.mkdirSync(out,{recursive:true});
 const url=new URL(base);url.searchParams.set('lang','es');url.searchParams.set('gl','0');
 await page.goto(url.href);await page.waitForTimeout(600);
 await page.screenshot({path:out+'/hero.png',scale:'css'});
 assert.equal(await page.locator('#hero img, #heroArt').count(),0);
 assert.equal(urls.some(u=>u.includes('hero-deep-field')),false);
 const sections=await page.locator('.scene').evaluateAll(es=>es.map(e=>({id:e.id,len:e.style.getPropertyValue('--len')})));
 const expectedScenes=[['hero','1.7'],['problem','2.6'],['blink','2.2'],['data','1.6'],['colors','2'],['method',''],['how','2.4'],['why','1.6'],['who',''],['go','1']];
 assert.deepEqual(sections.map(e=>[e.id,e.len]),expectedScenes);
 const start=await page.evaluate(()=>probe.frames);await page.waitForTimeout(1000);const fps=await page.evaluate(n=>probe.frames-n,start);assert.ok(fps<=65,'Visible animation frame budget exceeded: '+fps);
 const jump=async(id,p=.5)=>{await page.evaluate(({id,p})=>{const e=document.getElementById(id);window.scrollTo({top:e.offsetTop+Math.max(0,e.offsetHeight-innerHeight)*p,behavior:'instant'});},{id,p});await page.waitForTimeout(150);};
 await jump('hero',.7);assert.ok(Number(await page.locator('#heroTxt').evaluate(e=>getComputedStyle(e).opacity))<.1);
 await jump('problem',.1);assert.ok(Number(await page.locator('#p1a').evaluate(e=>getComputedStyle(e).opacity))>.9);
 await jump('problem',.7);assert.ok(Number(await page.locator('#p1b').evaluate(e=>getComputedStyle(e).opacity))>.9);
 await jump('blink');await page.locator('#cmpRange').focus();await page.keyboard.press('End');assert.equal(await page.locator('#cmpRange').inputValue(),'100');
 await jump('data');await page.waitForFunction(()=>document.querySelector('#loadmsg').classList.contains('hide'));
 await page.screenshot({path:out+'/satellite.png',scale:'css'});
 await page.emulateMedia({reducedMotion:'reduce'});await jump('data');
 const before=await page.locator('#satGL').evaluate(c=>c.toDataURL());
 await page.locator('#satGL').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
 const after=await page.locator('#satGL').evaluate(c=>c.toDataURL());assert.notEqual(before,after,'Satellite rotation did not change image');
 await page.keyboard.press('ArrowUp');await page.waitForTimeout(150);
 assert.notEqual(after,await page.locator('#satGL').evaluate(c=>c.toDataURL()));
 // Newly requested satellite views may still invalidate the canvas after a tilt.
 await page.waitForLoadState('networkidle');
 await page.waitForFunction(()=>{
   const now=performance.now();
   if(probe.settledFrames!==probe.frames){probe.settledFrames=probe.frames;probe.settledAt=now;}
   return now-probe.settledAt>=500;
 },null,{polling:100,timeout:10000});
 const idle=await page.evaluate(()=>probe.frames);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>probe.frames),idle);
 await page.emulateMedia({reducedMotion:'no-preference'});await jump('colors');await page.locator('#bars').focus();await page.keyboard.press('End');assert.equal(await page.locator('#bars').getAttribute('aria-valuenow'),'102');
 await jump('how');await page.locator('#pp').click();await page.locator('#tm').focus();await page.keyboard.press('End');assert.equal(await page.locator('#tm').inputValue(),'1000');
 await page.locator('#showMe').click();assert.equal(await page.locator('#hstack > div.on').count(),1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await page.evaluate(()=>probe.frames);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>probe.frames),hidden);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.setViewportSize({width:390,height:844});await jump('hero',0);await page.waitForTimeout(100);
 await page.screenshot({path:out+'/mobile.png',scale:'css'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('[data-lang=en]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
 const pixels=await page.locator('canvas').evaluateAll(es=>es.map(e=>({id:e.id,pixels:e.width*e.height})));
 assert.ok(pixels.every(c=>c.pixels<=902000));
 assert.equal(await page.evaluate(()=>probe.gl),0);assert.equal(urls.filter(u=>/\/lib\/|\/model\//.test(u)).length,0);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 const report={sections,framesPerSecondAtRest:fps,hiddenFrames:0,webglCalls:0,modelAndThreeRequests:0,pixels,errors,bad,interactions:'PASS: original scroll progression, compare, satellite yaw/pitch, reduced motion, spectrum, timeline, reveal, hidden/resume, language, mobile'};
 fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
