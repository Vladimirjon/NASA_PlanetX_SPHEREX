/* Copernix on Cloudflare: static site + a read-only proxy for the backend (ADR 0011).
   The browser keeps calling /api/v1/... on its own origin, so the backend needs no CORS setup and the
   viewer needs no change. Only GET/HEAD under /api/v1/ is forwarded; cookies and credentials never are.
   Static files never reach this code (assets.run_worker_first covers /api/* only). */

const UPSTREAM_TIMEOUT_MS = 60_000; // the first analysis of a new object takes 8-20 s

const problem = (status, title) =>
  new Response(JSON.stringify({ type: 'about:blank', title, status }), {
    status,
    headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/v1/')) return env.ASSETS.fetch(request); // other /api paths: the 404 page
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const target = new URL(url.pathname + url.search, env.API_ORIGIN);
    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers: { accept: request.headers.get('accept') ?? '*/*' },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const response = new Response(upstream.body, upstream);
      response.headers.delete('set-cookie');
      response.headers.set('x-content-type-options', 'nosniff');
      return response;
    } catch {
      // 5xx makes the viewer fall back to the recorded demo of the five objects
      return problem(502, 'The data service could not be reached');
    }
  },
};
