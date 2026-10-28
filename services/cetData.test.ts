import { afterEach, describe, expect, it, vi } from 'vitest';
const words = [{ id: 'a', word: 'apple', level: 4, meaning: 'n. 苹果' }];
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('CET data loading', () => {
  it('loads official data and shares the cached request', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(words)));
    vi.stubGlobal('fetch', fetcher);
    const { loadCetData } = await import('./cetData');
    const [first, second] = await Promise.all([loadCetData(), loadCetData()]);
    expect(first).toEqual({ words, sample: false });
    expect(second).toBe(first);
    expect(await loadCetData()).toBe(first);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/data/cet-words.json');
  });
  it('falls back to the sample when official data fails', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(words)));
    vi.stubGlobal('fetch', fetcher);
    const { loadCetData } = await import('./cetData');
    const data = await loadCetData();
    expect(data).toEqual({ words, sample: true });
    expect(await loadCetData()).toBe(data);
    expect(fetcher).toHaveBeenNthCalledWith(1, '/data/cet-words.json');
    expect(fetcher).toHaveBeenNthCalledWith(2, '/data/cet-words.sample.json');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('allows retry after both datasets fail', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('unavailable'))
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(new Response(JSON.stringify(words)));
    vi.stubGlobal('fetch', fetcher);
    const { loadCetData } = await import('./cetData');
    await expect(loadCetData()).rejects.toThrow();
    expect(await loadCetData()).toEqual({ words, sample: false });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
