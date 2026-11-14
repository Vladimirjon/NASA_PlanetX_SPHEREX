import asyncio, os
from playwright.async_api import async_playwright
EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1280,'height':800}); msgs=[]
        pg.on('console', lambda m: msgs.append((m.type, m.text[:160])))
        await pg.add_init_script("""(()=>{const o=history.replaceState;window.__rs=0;history.replaceState=function(){window.__rs++;return o.apply(this,arguments)}})()""")
        await pg.goto('http://127.0.0.1:5175/?ra=133.7951&dec=-7.2451&fov=10&plane=19'); await asyncio.sleep(3)
        await pg.mouse.move(640,400); await pg.mouse.down()
        for i in range(600):
            await pg.mouse.move(640+(i%50)*4, 400+(i%13)*3); await asyncio.sleep(1/120)
        await pg.mouse.up(); await asyncio.sleep(1)
        print('replaceState calls', await pg.evaluate('__rs'), 'url', pg.url[-60:])
        print('console', msgs[:5], len(msgs))
        await b.close()
asyncio.run(main())
