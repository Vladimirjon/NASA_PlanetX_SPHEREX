import asyncio, os, time, json, subprocess
from pathlib import Path
from playwright.async_api import async_playwright
EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
INSTR = (Path(__file__).parent / 'instrument.js').read_text()
def rss():
    out = subprocess.run(['ps', '-eo', 'pid,rss,args'], capture_output=True, text=True).stdout
    r = {'gpu': 0, 'renderer': 0}
    for line in out.splitlines():
        if 'chromium-1228' not in line: continue
        kb = int(line.split()[1])
        if '--type=gpu-process' in line: r['gpu'] += kb
        elif '--type=renderer' in line: r['renderer'] += kb
    return {k: round(v / 1024) for k, v in r.items()}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':1280,'height':800}); await ctx.add_init_script(INSTR)
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await pg.goto('http://127.0.0.1:5175/?ra=0&dec=0&fov=3&plane=19'); await asyncio.sleep(4)
        async def snap(tag):
            await cdp.send('HeapProfiler.collectGarbage'); h = await cdp.send('Runtime.getHeapUsage')
            s = await pg.evaluate('({live: __perf.bitmapsLive, created: __perf.bitmapsCreated, req: __perf.fetches.length, aborted: __perf.aborted, up: __perf.gl.texSubImage3D, cov: __perf.coverage()})')
            print(tag, round(h['usedSize']/1e6, 2), 'MB heap', s, rss(), flush=True)
        await snap('start')
        for i in range(70):
            # one view-width drag, then let it load (~1.2 s) so tiles complete
            await pg.mouse.move(1200, 400); await pg.mouse.down(); await pg.mouse.move(80, 400 + (60 if i % 10 == 0 else 0), steps=8); await pg.mouse.up()
            await asyncio.sleep(1.2)
            if i % 10 == 9: await snap(f'drag{i+1}')
        # go back to origin area: are tiles re-requested (evicted) ?
        await b.close()
asyncio.run(main())
