const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function scrollCompare(page,progress){
  await page.locator('#blink').evaluate((section,p)=>{
    window.scrollTo({top:section.offsetTop+(section.offsetHeight-innerHeight)*p,behavior:'instant'});
  },progress);
}

async function main(){
  const url=new URL(process.env.LANDING_URL||'http://127.0.0.1:4410/');
  url.searchParams.set('lang','es');
  const out=process.env.TEST_OUTPUT_DIR||'test-results/landing-compare-portraits';
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({
    executablePath:process.env.CHROME_PATH||undefined,
    args:['--disable-gpu','--disable-webgl'],
  });
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url.href);
    await scrollCompare(page,.18);
    await page.waitForFunction(()=>Number(document.querySelector('#cmpRange').value)<45);
    await scrollCompare(page,.82);
    await page.waitForFunction(()=>{
      const value=Number(document.querySelector('#cmpRange').value);
      return value>=50&&value<=80;
    });
    await page.waitForFunction(()=>Number(document.querySelector('#cmpRange').value)>90);

    const range=page.locator('#cmpRange');
    await range.evaluate(input=>{input.value='26';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await scrollCompare(page,.4);
    assert.equal(await range.inputValue(),'26');
    await page.screenshot({path:path.join(out,'compare.png')});
    await range.press('Home');
    assert.equal(await range.inputValue(),'0');
    await range.press('End');
    assert.equal(await range.inputValue(),'100');

    const motion=page.locator('#portraitMotion');
    const portrait=page.locator('[data-object="wise"] .portrait-spin');
    const phase=()=>portrait.evaluate(e=>e.currentTime);
    await page.locator('[data-object="wise"] .portrait-preview').scrollIntoViewIfNeeded();
    await portrait.waitFor({state:'visible'});
    const initial=await phase();
    await page.waitForFunction(value=>{
      const layer=document.querySelector('[data-object="wise"] .portrait-spin');
      return layer.currentTime>value;
    },initial);
    assert.equal(await portrait.evaluate(e=>getComputedStyle(e).rotate),'none');
    await page.screenshot({path:path.join(out,'portraits.png')});

    await motion.click();
    assert.equal(await portrait.evaluate(e=>e.paused),true);
    // Inspect the two corrected videos at distinct points in the same rotation.
    for(const id of ['eps','rw']){
      const row=page.locator(`[data-object="${id}"]`);
      await row.scrollIntoViewIfNeeded();
      await motion.evaluate(button=>button.click());
      await page.waitForFunction(id=>{
        const video=document.querySelector(`[data-object="${id}"] video`);
        return video.readyState===4&&!video.paused;
      },id);
      await motion.evaluate(button=>button.click());
      const samples=[];
      for(const time of [.1,1.5,3,4.5]){
        const pixels=await row.locator('video').evaluate(async(video,time)=>{
          await video.play();
          await new Promise(resolve=>{
            const check=()=>{
              if(video.currentTime>=time)resolve();
              else video.requestVideoFrameCallback(check);
            };
            video.requestVideoFrameCallback(check);
          });
          video.pause();
          const canvas=document.createElement('canvas');
          canvas.width=video.videoWidth;canvas.height=video.videoHeight;
          const context=canvas.getContext('2d');
          context.drawImage(video,0,0);
          const image=context.getImageData(0,0,canvas.width,canvas.height);
          let outerDetail=0;
          for(let y=0;y<800;y+=8)for(let x=0;x<800;x+=8){
            if(Math.hypot(x-400,y-390)>120)outerDetail+=image.data[(y*800+x)*4];
          }
          return {width:canvas.width,height:canvas.height,alpha:image.data[3],outerDetail};
        },time);
        assert.equal(pixels.width,800);
        assert.equal(pixels.height,800);
        assert.equal(pixels.alpha,0,'Background must stay transparent');
        samples.push(pixels.outerDetail);
        await row.locator('.portrait').screenshot({path:path.join(out,`${id}-${time}.png`)});
      }
      assert.ok(new Set(samples).size>1,`Surface stays static for ${id}`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await portrait.evaluate(e=>getComputedStyle(e).display),'none');
    assert.equal(await page.locator('[data-object="wise"] img').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.deepEqual(errors,[]);

    const mobile=await browser.newPage({
      viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',
    });
    await mobile.goto(url.href);
    await scrollCompare(mobile,.65);
    const mobileRange=mobile.locator('#cmpRange');
    await mobileRange.focus();
    await mobileRange.press('Home');
    assert.equal(await mobileRange.inputValue(),'0');
    await mobile.screenshot({path:path.join(out,'compare-mobile.png')});
    console.log('PASS: comparador con scroll y teclado; giro axial con pausa y movimiento reducido');
  }finally{
    await browser.close();
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
