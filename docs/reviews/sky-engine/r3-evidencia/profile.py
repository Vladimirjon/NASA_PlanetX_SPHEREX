import asyncio, os, sys, json, collections
from pathlib import Path
from playwright.async_api import async_playwright
EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
ARGS = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist']
INSTR = (Path(__file__).parent / 'instrument.js').read_text()

def top(profile, n=15):
    nodes = {x['id']: x for x in profile['nodes']}
    self_us = collections.Counter()
    dts = profile['timeDeltas']; samples = profile['samples']
    for sid, dt in zip(samples, dts[1:] + [0]):
        cf = nodes[sid]['callFrame']
        self_us[(cf['functionName'] or '(anon)', cf['url'].split('/')[-1], cf['lineNumber'] + 1, cf['columnNumber'] + 1)] += dt
    return [(k, round(v / 1000, 1)) for k, v in self_us.most_common(n)]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800}); await ctx.add_init_script(INSTR)
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {'interval': 200})
        # Tracing for long tasks attribution
        events = []
        cdp.on('Tracing.dataCollected', lambda e: events.extend(e['value']))
        done = asyncio.Event(); cdp.on('Tracing.tracingComplete', lambda e: done.set())
        await cdp.send('Tracing.start', {'categories': 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,gpu', 'transferMode': 'ReportEvents'})
        await cdp.send('Profiler.start')
        await pg.goto('http://127.0.0.1:5175/?ra=133.7951&dec=-7.2451&fov=180&plane=19&proj=SIN')
        await asyncio.sleep(4)
        await pg.mouse.move(640, 400)
        for _ in range(150):
            await pg.mouse.wheel(0, -40); await asyncio.sleep(1 / 60)
        await pg.mouse.down()
        for i in range(200):
            await pg.mouse.move(640 + (i % 40) * 10, 400 + (i % 7) * 5); await asyncio.sleep(1 / 120)
        await pg.mouse.up()
        prof = (await cdp.send('Profiler.stop'))['profile']
        await cdp.send('Tracing.end'); await done.wait()
        lts = await pg.evaluate('__perf.longtasks')
        print('longtasks', [(round(l['start']), round(l['dur'])) for l in lts])
        # main thread top-level tasks > 50 ms with their heaviest child events
        main = [e for e in events if e.get('name') == 'RunTask' and e.get('dur', 0) > 50000 and e.get('ph') == 'X']
        for t in main:
            kids = [e for e in events if e.get('tid') == t['tid'] and e.get('ph') == 'X' and t['ts'] <= e['ts'] <= t['ts'] + t['dur'] and e is not t and e.get('dur', 0) > 5000]
            kids.sort(key=lambda e: -e['dur'])
            print('TASK %.1f ms' % (t['dur'] / 1000), [(k['name'], round(k['dur'] / 1000, 1), (k.get('args', {}).get('data') or {}).get('functionName') or (k.get('args', {}).get('data') or {}).get('url', '')[-40:]) for k in kids[:6]])
        print('TOP self time (ms):')
        for row in top(prof, 20): print(' ', row)
        await b.close()
asyncio.run(main())
