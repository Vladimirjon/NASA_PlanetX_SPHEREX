"""R3 performance measurements for the SkyShift sky engine. Usage: measure.py <mode> <test...>"""
import asyncio, os, sys, json, random, statistics, time
from pathlib import Path
from playwright.async_api import async_playwright

EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
MODES = {'swiftshader': [], 'angle-gl': ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'],
         'angle-vulkan': ['--use-angle=vulkan', '--enable-features=Vulkan', '--enable-gpu', '--ignore-gpu-blocklist']}
BASE = 'http://127.0.0.1:5175/'
INSTR = (Path(__file__).parent / 'instrument.js').read_text()
W, H = 1280, 800

def pct(xs, q):
    if not xs: return None
    xs = sorted(xs); i = min(len(xs) - 1, max(0, round(q / 100 * (len(xs) - 1)))); return round(xs[i], 2)

def stats(xs):
    return {'n': len(xs), 'p50': pct(xs, 50), 'p95': pct(xs, 95), 'p99': pct(xs, 99), 'max': round(max(xs), 2) if xs else None}

async def frames_since(pg, t0):
    fr = await pg.evaluate('t => __perf.frames.filter(x => x >= t)', t0)
    return [b - a for a, b in zip(fr, fr[1:])]

async def wait_full(pg, t_nav, timeout=30):
    """Full frame: no tile fetch in flight for 600 ms, then one rAF. Returns ms since t_nav (page clock)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        s = await pg.evaluate('() => ({inflight: __perf.inflight, n: __perf.fetches.length, last: Math.max(0, ...__perf.fetches.map(f => f.end || 0)), now: performance.now()})')
        if s['n'] > 0 and s['inflight'] == 0 and s['now'] - s['last'] > 600:
            await pg.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
            return round(s['last'] - t_nav, 1)
        await asyncio.sleep(0.1)
    return None

async def new_page(ctx):
    pg = await ctx.new_page(); await pg.set_viewport_size({'width': W, 'height': H}); return pg

async def summary(pg):
    return await pg.evaluate('''() => { const u = __perf.urls; const d = Object.entries(u).filter(([k,v]) => v > 1);
      return { requests: __perf.fetches.length, unique: Object.keys(u).length, duplicateUrls: d.length, duplicateExtra: d.reduce((s,[k,v]) => s+v-1, 0),
        aborted: __perf.aborted, maxInflight: __perf.maxInflight, failed: __perf.fetches.filter(f => typeof f.status === 'number' && f.status >= 400).length,
        gl: {...__perf.gl, texStorage3D: __perf.gl.texStorage3D}, bitmapsLive: __perf.bitmapsLive, bitmapsCreated: __perf.bitmapsCreated,
        longtasks: __perf.longtasks.length, longtaskMax: Math.max(0, ...__perf.longtasks.map(l => l.dur)), coverage: __perf.coverage() } }''')

async def drag(pg, seconds=5.0, radius=250):
    t0 = await pg.evaluate('performance.now()')
    await pg.mouse.move(W / 2, H / 2); await pg.mouse.down()
    start = time.time(); i = 0
    import math
    while time.time() - start < seconds:
        a = i * 0.05; await pg.mouse.move(W / 2 + radius * math.cos(a), H / 2 + radius * math.sin(a)); i += 1
        await asyncio.sleep(1 / 120)
    await pg.mouse.up()
    return t0, i

async def run(mode, tests):
    out = {'mode': mode}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=MODES[mode])
        ctx = await b.new_context(viewport={'width': W, 'height': H})
        await ctx.add_init_script(INSTR)
        if 'cold' in tests:
            pg = await new_page(ctx)
            await pg.goto(BASE, wait_until='commit'); t_nav = 0
            out['renderer'] = None
            full = await wait_full(pg, t_nav)
            out['renderer'] = await pg.evaluate('__perf.renderer()')
            nav = await pg.evaluate('performance.getEntriesByType("navigation")[0].toJSON()')
            out['cold_allsky'] = {'full_frame_ms': full, 'domContentLoaded': round(nav['domContentLoadedEventEnd'], 1), **await summary(pg)}
            # warm: reload same context (HTTP cache, heuristic freshness: IRSA sends no Cache-Control)
            await pg.reload(wait_until='commit')
            full = await wait_full(pg, 0)
            out['warm_allsky'] = {'full_frame_ms': full, **await summary(pg)}
            await pg.close()
        if 'drag' in tests:
            pg = await new_page(ctx)
            await pg.goto(BASE + '?ra=133.7951&dec=-7.2451&fov=10&plane=19&proj=SIN')
            await wait_full(pg, 0)
            cdp = await ctx.new_cdp_session(pg); await cdp.send('Performance.enable')
            if os.environ.get('THROTTLE'): await cdp.send('Emulation.setCPUThrottlingRate', {'rate': float(os.environ['THROTTLE'])})
            m0 = {x['name']: x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
            g0 = await pg.evaluate('({...__perf.gl, gpu: __perf.gpuMs.length, lt: __perf.longtasks.length})')
            t0, moves = await drag(pg, 5.0)
            await asyncio.sleep(0.3)
            m1 = {x['name']: x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
            g1 = await pg.evaluate('({...__perf.gl, gpu: __perf.gpuMs.length, lt: __perf.longtasks.length})')
            gpu = await pg.evaluate('n => __perf.gpuMs.slice(n)', g0['gpu'])
            lts = await pg.evaluate('n => __perf.longtasks.slice(n)', g0['lt'])
            dt = await frames_since(pg, t0)
            dup = await pg.evaluate('Object.entries(__perf.urls).filter(([k,v])=>v>1).map(([k,v])=>[k.split("/").slice(-3).join("/"),v, __perf.fetches.filter(f=>f.url===k).map(f=>f.status)])')
            out['drag_dupes'] = dup
            out['drag_5s'] = {'pointer_moves': moves, 'frame_interval_ms': stats(dt), 'fps_p95_equiv': round(1000 / pct(dt, 95), 1),
                'frames_over_18ms': sum(1 for x in dt if x > 18), 'gpu_draw_ms': stats(gpu),
                'texImage2D_lookup_uploads': g1['texImage2D'] - g0['texImage2D'], 'lookup_upload_cpu_ms': round(g1['lookupMs'] - g0['lookupMs'], 1),
                'texSubImage3D': g1['texSubImage3D'] - g0['texSubImage3D'], 'getUniformLocation_calls': g1['getUniformLocation'] - g0['getUniformLocation'],
                'drawArrays': g1['drawArrays'] - g0['drawArrays'],
                'script_ms': round((m1['ScriptDuration'] - m0['ScriptDuration']) * 1000, 1), 'task_ms': round((m1['TaskDuration'] - m0['TaskDuration']) * 1000, 1),
                'layout_count': m1['LayoutCount'] - m0['LayoutCount'], 'recalc_style': m1['RecalcStyleCount'] - m0['RecalcStyleCount'],
                'longtasks': [round(l['dur'], 1) for l in lts], **await summary(pg)}
            await pg.close()
        if 'zoom' in tests:
            pg = await new_page(ctx)
            await pg.goto(BASE + '?ra=133.7951&dec=-7.2451&fov=180&plane=19&proj=SIN')
            await wait_full(pg, 0)
            r0 = await summary(pg)
            t0 = await pg.evaluate('performance.now()'); await pg.mouse.move(W / 2, H / 2)
            g0 = await pg.evaluate('__perf.gpuMs.length')
            steps = 0
            while True:
                fov = await pg.evaluate("Number(new URL(location.href).searchParams.get('fov'))")
                if fov <= 0.5: break
                await pg.mouse.wheel(0, -40); steps += 1; await asyncio.sleep(1 / 60)
            t_end = await pg.evaluate('performance.now()')
            dt = await frames_since(pg, t0)
            full = await wait_full(pg, 0)
            full = None if full is None else round(full - t_end, 1)
            await pg.screenshot(path='zoom-end-%s.png' % mode)
            gpu = await pg.evaluate('n => __perf.gpuMs.slice(n)', g0)
            s = await summary(pg)
            out['zoom_180_to_0.5'] = {'wheel_steps': steps, 'duration_ms': round(t_end - t0), 'frame_interval_ms': stats(dt),
                'fps_p95_equiv': round(1000 / pct(dt, 95), 1), 'gpu_draw_ms': stats(gpu), 'settle_after_last_wheel_ms': full,
                'requests_during': s['requests'] - r0['requests'], **s}
            await pg.close()
        if 'abort' in tests:
            # fresh context = cold cache; fly quickly across the sky at FOV 1
            c2 = await b.new_context(viewport={'width': W, 'height': H}); await c2.add_init_script(INSTR)
            pg = await c2.new_page()
            await pg.goto(BASE + '?ra=133.7951&dec=-7.2451&fov=1&plane=19&proj=SIN', wait_until='commit')
            await asyncio.sleep(0.4)
            net = {'canceled': 0, 'finished': 0, 'diskcache': 0}
            cdp = await c2.new_cdp_session(pg); await cdp.send('Network.enable')
            cdp.on('Network.loadingFailed', lambda e: net.__setitem__('canceled', net['canceled'] + (1 if e.get('canceled') else 0)))
            cdp.on('Network.loadingFinished', lambda e: net.__setitem__('finished', net['finished'] + 1))
            # 25 fast drags of 1100 px (~0.86 deg each at FOV 1) in ~1.5 s: ~21 deg away
            for _ in range(25):
                await pg.mouse.move(1180, 400); await pg.mouse.down(); await pg.mouse.move(80, 400, steps=3); await pg.mouse.up()
                await asyncio.sleep(0.03)
            t_stop = await pg.evaluate('performance.now()')
            inflight_at_stop = await pg.evaluate('__perf.inflight')
            full = await wait_full(pg, 0)
            out['fast_pan_net'] = {**net, 'inflight_at_stop': inflight_at_stop, 'settle_ms': None if full is None else round(full - t_stop)}
            s = await summary(pg)
            dupes = await pg.evaluate('Object.entries(__perf.urls).filter(([k,v])=>v>1).slice(0,5)')
            out['fast_pan_away'] = {**s, 'dupe_examples': dupes}
            await c2.close()
        if 'memory' in tests:
            pg = await new_page(ctx)
            await pg.goto(BASE + '?ra=133.7951&dec=-7.2451&fov=5&plane=19&proj=SIN')
            await wait_full(pg, 0)
            cdp = await ctx.new_cdp_session(pg)
            async def heap():
                await cdp.send('HeapProfiler.collectGarbage')
                h = await cdp.send('Runtime.getHeapUsage'); return round(h['usedSize'] / 1e6, 2)
            samples = [(0, await heap(), await pg.evaluate('__perf.bitmapsLive'))]
            rnd = random.Random(7); start = time.time(); dur = float(os.environ.get('MEM_SECONDS', 120))
            await pg.mouse.move(W / 2, H / 2)
            while time.time() - start < dur:
                op = rnd.random()
                if op < 0.6:
                    await pg.mouse.down(); x, y = W / 2, H / 2
                    for _ in range(10):
                        x += rnd.uniform(-60, 60); y += rnd.uniform(-60, 60); await pg.mouse.move(x, y); await asyncio.sleep(1 / 60)
                    await pg.mouse.up(); await pg.mouse.move(W / 2, H / 2)
                elif op < 0.8:
                    fov = await pg.evaluate("Number(new URL(location.href).searchParams.get('fov'))")
                    d = -200 if fov > 3 else 200 if fov < 0.6 else rnd.choice([-200, 200])
                    await pg.mouse.wheel(0, d); await asyncio.sleep(0.05)
                elif op < 0.9:
                    await pg.focus('canvas'); await pg.keyboard.press(rnd.choice(['PageUp', 'PageDown']))
                else:
                    await asyncio.sleep(0.3)
                el = time.time() - start
                if el > len(samples) * 30:
                    samples.append((round(el), await heap(), await pg.evaluate('__perf.bitmapsLive')))
            await asyncio.sleep(3)
            samples.append(('end', await heap(), await pg.evaluate('__perf.bitmapsLive')))
            s = await summary(pg)
            dom = await cdp.send('Memory.getDOMCounters')
            out['memory_random_pan'] = {'seconds': dur, 'heap_MB_gc_bitmapsLive': samples, 'dom': dom, **s}
            await pg.close()
        await b.close()
    print(json.dumps(out, indent=1))

asyncio.run(run(sys.argv[1], set(sys.argv[2:])))
