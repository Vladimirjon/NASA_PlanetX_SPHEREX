import asyncio, os, time, json
from playwright.async_api import async_playwright
EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
ARGS = ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']
TARGETS = {
 'irsa-aladin': 'https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/?ra=133.7951&dec=-7.2451&fov=1&frame=19',
 'skyshift': 'http://127.0.0.1:5175/?ra=133.7951&dec=-7.2451&fov=1&plane=19&proj=SIN',
}
async def one(b, name, url, warm):
    ctx = await b.new_context(viewport={'width':1280,'height':800}); pg = await ctx.new_page()
    reqs = []; t0 = None
    def onreq(r):
        if 'Norder' in r.url or 'Allsky' in r.url: reqs.append({'url': r.url.split('spherex_allsky_cube/')[-1], 't': time.perf_counter(), 'end': None, 'st': None})
    def onfin(r):
        for x in reqs:
            if x['end'] is None and r.url.endswith(x['url']): x['end'] = time.perf_counter(); x['st'] = 'ok'; break
    def onfail(r):
        for x in reqs:
            if x['end'] is None and r.url.endswith(x['url']): x['end'] = time.perf_counter(); x['st'] = r.failure; break
    pg.on('request', onreq); pg.on('requestfinished', onfin); pg.on('requestfailed', onfail)
    runs = []
    for i in range(2 if warm else 1):
        reqs.clear(); t0 = time.perf_counter()
        await pg.goto(url, wait_until='commit') if i == 0 else await pg.reload(wait_until='commit')
        while True:
            await asyncio.sleep(0.2)
            now = time.perf_counter(); pend = [x for x in reqs if x['end'] is None]
            last = max([x['end'] for x in reqs if x['end']] or [t0])
            if reqs and not pend and now - last > 1.5: break
            if now - t0 > 40: break
        urls = [x['url'] for x in reqs]
        runs.append({'run': 'cold' if i == 0 else 'reload', 'tile_requests': len(reqs), 'unique': len(set(urls)), 'failed_or_aborted': sum(1 for x in reqs if x['st'] not in ('ok', None)),
                     'last_tile_ms': round((last - t0) * 1000), 'orders': sorted({u.split('/')[0] for u in urls})})
        await pg.screenshot(path=f'cmp-{name}-{i}.png')
    await ctx.close(); return runs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=ARGS)
        for name, url in TARGETS.items():
            print(name, json.dumps(await one(b, name, url, True)))
        await b.close()
asyncio.run(main())
