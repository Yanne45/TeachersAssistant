/**
 * Generic single-flight cache for async requests.
 * Mirrors the pattern used in FicheElevePage (gradesCacheRef + gradesInflightRef).
 * Extracted for testability and reuse.
 */
export class RequestCache<K, V> {
  private cache = new Map<K, V>();
  private inflight = new Map<K, Promise<V>>();

  /** Get from cache, or fetch and cache the result. Deduplicates concurrent calls. */
  async get(key: K, fetcher: () => Promise<V>): Promise<V> {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const request = fetcher()
      .then((value) => {
        this.cache.set(key, value);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, request);
    return request;
  }

  /** Invalidate a specific key (cache + inflight). */
  invalidate(key: K): void {
    this.cache.delete(key);
    this.inflight.delete(key);
  }

  /** Clear everything. */
  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /** Check if a key is cached (not inflight). */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /** Get the cached size (not counting inflight). */
  get size(): number {
    return this.cache.size;
  }
}
