// Injected before the app: records rAF frames, fetch concurrency, WebGL calls, bitmaps, long tasks.
(() => {
  const S = window.__perf = {
    frames: [], fetches: [], inflight: 0, maxInflight: 0, aborted: 0, urls: {},
    gl: { texImage2D: 0, texSubImage3D: 0, getUniformLocation: 0, drawArrays: 0, uniform: 0, texStorage3D: [], uploadMs: 0, lookupMs: 0 },
    bitmapsLive: 0, bitmapsCreated: 0, longtasks: [], gpuMs: [],
  };
  const loop = (t) => { S.frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) S.longtasks.push({ start: e.startTime, dur: e.duration }); })
      .observe({ type: 'longtask', buffered: true });
  } catch (e) { S.longtaskError = String(e); }
  const of = window.fetch;
  window.fetch = function (input, init) {
    const url = String(input && input.url || input);
    if (!url.includes('Norder') && !url.includes('/hips/')) return of.apply(this, arguments);
    S.urls[url] = (S.urls[url] || 0) + 1;
    const rec = { url, start: performance.now(), end: null, status: null };
    S.fetches.push(rec);
    S.inflight++; S.maxInflight = Math.max(S.maxInflight, S.inflight);
    const sig = init && init.signal;
    let done = false;
    const finish = (st) => { if (done) return; done = true; S.inflight--; rec.end = performance.now(); rec.status = st; };
    if (sig) sig.addEventListener('abort', () => { if (!done) { S.aborted++; finish('aborted'); } });
    // A fetch is "in flight" until the body is read; approximate with the blob() consumption.
    return of.apply(this, arguments).then(r => {
      const ob = r.blob.bind(r);
      r.blob = () => ob().then(b => { finish(r.status); return b; }, e => { finish('bodyerr'); throw e; });
      if (!r.ok) finish(r.status);
      return r;
    }, e => { finish(sig && sig.aborted ? 'aborted' : 'neterr'); throw e; });
  };
  const ocib = window.createImageBitmap;
  window.createImageBitmap = function () { return ocib.apply(this, arguments).then(b => { S.bitmapsCreated++; S.bitmapsLive++; return b; }); };
  const oclose = ImageBitmap.prototype.close;
  ImageBitmap.prototype.close = function () { if (!this.__closed) { this.__closed = true; S.bitmapsLive--; } return oclose.call(this); };
  const P = WebGL2RenderingContext.prototype;
  const wrap = (name, fn) => { const o = P[name]; P[name] = function () { return fn.call(this, o, arguments); }; };
  wrap('texImage2D', function (o, a) { S.gl.texImage2D++; const t = performance.now(); const r = o.apply(this, a); S.gl.lookupMs += performance.now() - t; return r; });
  wrap('texSubImage3D', function (o, a) { S.gl.texSubImage3D++; const t = performance.now(); const r = o.apply(this, a); S.gl.uploadMs += performance.now() - t; return r; });
  wrap('getUniformLocation', function (o, a) { S.gl.getUniformLocation++; return o.apply(this, a); });
  wrap('uniform4f', function (o, a) { S.gl.uniform++; return o.apply(this, a); });
  wrap('texStorage3D', function (o, a) { S.gl.texStorage3D.push([...a].slice(1)); return o.apply(this, a); });
  wrap('drawArrays', function (o, a) {
    S.gl.drawArrays++;
    if (this.__timer === undefined) this.__timer = this.getExtension('EXT_disjoint_timer_query_webgl2');
    const ext = this.__timer;
    if (!ext || this.__q) return o.apply(this, a);
    const q = this.createQuery(); this.beginQuery(ext.TIME_ELAPSED_EXT, q);
    const r = o.apply(this, a); this.endQuery(ext.TIME_ELAPSED_EXT); this.__q = q;
    const gl = this;
    const poll = () => {
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { setTimeout(poll, 5); return; }
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) S.gpuMs.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q); gl.__q = null;
    };
    setTimeout(poll, 5);
    return r;
  });
  S.renderer = () => {
    const c = document.querySelector('canvas'); const gl = c && c.getContext('webgl2');
    if (!gl) return null; const e = gl.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  };
  // Fraction of canvas samples that are non-black (proxy for "full frame"), within drawable region.
  S.coverage = () => {
    const c = document.querySelector('canvas'); const o = document.createElement('canvas'); o.width = 64; o.height = 40;
    const x = o.getContext('2d'); x.drawImage(c, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data;
    let nb = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 6) nb++; return nb / (64 * 40);
  };
})();
