import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiCatalogSource, isSearchAbort } from '../../copernix/src/catalog/api-source';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createApiCatalogSource', () => {
  it('debounces search and cancels the previous in-flight request', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((resolve, reject) => {
        const t = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve([
                {
                  name: 'Proxima Centauri',
                  kind: 'target',
                  ra: 217.4,
                  dec: -62.6,
                  score: 1,
                  object_type: 'PM*',
                  description: 'Astronomical object',
                  provenance: {
                    source_url: 'https://example.test',
                    retrieved_at: '2026-01-01T00:00:00Z',
                  },
                },
              ]),
          } as Response);
        }, 50);
        signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const src = createApiCatalogSource({ fetchImpl: fetchImpl as typeof fetch, debounceMs: 250, lang: 'es' });

    const first = src.search('Prox');
    const firstCatch = first.then(
      () => 'resolved' as const,
      (err: unknown) => (isSearchAbort(err) ? 'aborted' : 'other'),
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchImpl).not.toHaveBeenCalled();

    const second = src.search('Proxima');
    await vi.advanceTimersByTimeAsync(250);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calledUrl = fetchImpl.mock.calls[0]?.[0] ?? '';
    expect(calledUrl.includes('q=Proxima')).toBe(true);

    await vi.advanceTimersByTimeAsync(60);
    const rows = await second;
    expect(rows[0]?.name).toBe('Proxima Centauri');
    expect(rows[0]?.kind).toBe('Estrella cercana');
    expect(await firstCatch).toBe('aborted');
  });

  it('surfaces 503 as an error', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: false, status: 503 } as Response));
    const src = createApiCatalogSource({ fetchImpl, debounceMs: 0, lang: 'en' });
    const p = src.search('Sirius');
    const expectation = expect(p).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(1);
    await expectation;
  });
});
