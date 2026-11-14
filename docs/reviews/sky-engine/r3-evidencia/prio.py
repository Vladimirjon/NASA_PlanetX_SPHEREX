import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright
EXE = os.path.expanduser('~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome')
INSTR = (Path(__file__).parent / 'instrument.js').read_text()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist'])
        for url in ['?ra=133.7951&dec=-7.2451&fov=1&plane=19', '?ra=133.7951&dec=-7.2451&fov=4&plane=19']:
            ctx = await b.new_context(viewport={'width':1280,'height':800}); await ctx.add_init_script(INSTR)
            pg = await ctx.new_page(); sizes = {}
            async def onfin(r):
                if 'Norder' in r.url:
                    s = await r.sizes(); sizes[r.url] = s['responseBodySize']
            pg.on('requestfinished', lambda r: asyncio.ensure_future(onfin(r)))
            await pg.goto('http://127.0.0.1:5175/' + url); await asyncio.sleep(8)
            f = await pg.evaluate('__perf.fetches.map(f => [f.url.split("/").slice(-3).join("/"), Math.round(f.start), Math.round(f.end), f.status])')
            print(url, 'n=', len(f), 'bytes_total_KB=', round(sum(sizes.values())/1024), 'order0_KB=', round(sum(v for k,v in sizes.items() if 'Norder0' in k)/1024))
            for row in f:
                if 'Norder0' not in row[0] or row[0].startswith('Norder0/Dir0/Npix0'): print('  ', row)
            o0 = [r for r in f if 'Norder0' in r[0]]; o5 = [r for r in f if 'Norder5' in r[0]]
            print('   order0 last end', max(r[2] for r in o0), '| order5 first start', min(r[1] for r in o5) if o5 else None, 'last end', max(r[2] for r in o5) if o5 else None)
            await ctx.close()
        await b.close()
asyncio.run(main())
