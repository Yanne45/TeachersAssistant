import { describe, it, expect, vi } from 'vitest';
import { RequestCache } from './requestCache';

describe('RequestCache', () => {
  it('appelle le fetcher au premier accès', async () => {
    const cache = new RequestCache<string, number>();
    const fetcher = vi.fn().mockResolvedValue(42);
    const result = await cache.get('key1', fetcher);
    expect(result).toBe(42);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('retourne le cache au second accès sans rappeler le fetcher', async () => {
    const cache = new RequestCache<string, number>();
    const fetcher = vi.fn().mockResolvedValue(42);
    await cache.get('key1', fetcher);
    const result = await cache.get('key1', fetcher);
    expect(result).toBe(42);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('déduplique les appels concurrents (single-flight)', async () => {
    const cache = new RequestCache<string, number>();
    let resolvePromise: (v: number) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<number>((resolve) => { resolvePromise = resolve; }),
    );

    const p1 = cache.get('key1', fetcher);
    const p2 = cache.get('key1', fetcher);

    // Both promises should be the same inflight request
    expect(fetcher).toHaveBeenCalledOnce();

    resolvePromise!(99);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(99);
    expect(r2).toBe(99);
  });

  it('invalidate supprime le cache et permet un nouveau fetch', async () => {
    const cache = new RequestCache<string, string>();
    const fetcher1 = vi.fn().mockResolvedValue('old');
    await cache.get('k', fetcher1);
    expect(cache.has('k')).toBe(true);

    cache.invalidate('k');
    expect(cache.has('k')).toBe(false);

    const fetcher2 = vi.fn().mockResolvedValue('new');
    const result = await cache.get('k', fetcher2);
    expect(result).toBe('new');
    expect(fetcher2).toHaveBeenCalledOnce();
  });

  it('clear vide tout le cache', async () => {
    const cache = new RequestCache<string, number>();
    await cache.get('a', () => Promise.resolve(1));
    await cache.get('b', () => Promise.resolve(2));
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('a')).toBe(false);
  });

  it('gère les erreurs du fetcher sans polluer le cache', async () => {
    const cache = new RequestCache<string, number>();
    const fetcher = vi.fn().mockRejectedValue(new Error('DB error'));

    await expect(cache.get('k', fetcher)).rejects.toThrow('DB error');
    // Après erreur, ni le cache ni l'inflight ne doivent retenir la clé
    expect(cache.has('k')).toBe(false);

    // Un second appel doit retenter
    const fetcher2 = vi.fn().mockResolvedValue(42);
    const result = await cache.get('k', fetcher2);
    expect(result).toBe(42);
  });

  it('gère des clés composites (tuples sérialisés)', async () => {
    const cache = new RequestCache<string, number>();
    const key = (id: number, period: number) => `${id}:${period}`;

    await cache.get(key(1, 3), () => Promise.resolve(10));
    await cache.get(key(1, 4), () => Promise.resolve(20));

    expect(await cache.get(key(1, 3), () => Promise.resolve(999))).toBe(10); // cached
    expect(await cache.get(key(1, 4), () => Promise.resolve(999))).toBe(20); // cached

    cache.invalidate(key(1, 3));
    expect(cache.has(key(1, 3))).toBe(false);
    expect(cache.has(key(1, 4))).toBe(true);
  });
});
