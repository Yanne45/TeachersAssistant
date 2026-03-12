// ============================================================================
// Teacher Assistant — Télémétrie légère dev (no-op en production)
// ============================================================================

import { useEffect, useRef } from 'react';

const IS_DEV = (import.meta as any).env?.DEV ?? false;

// ── Compteurs cache hit/miss ──

const cacheCounters = new Map<string, { hits: number; misses: number }>();

export function trackCacheHit(cacheName: string): void {
  if (!IS_DEV) return;
  const c = cacheCounters.get(cacheName) ?? { hits: 0, misses: 0 };
  c.hits++;
  cacheCounters.set(cacheName, c);
}

export function trackCacheMiss(cacheName: string): void {
  if (!IS_DEV) return;
  const c = cacheCounters.get(cacheName) ?? { hits: 0, misses: 0 };
  c.misses++;
  cacheCounters.set(cacheName, c);
}

export function logCacheMetrics(): void {
  if (!IS_DEV || cacheCounters.size === 0) return;
  console.groupCollapsed('[Telemetry] Cache metrics');
  for (const [name, { hits, misses }] of cacheCounters) {
    const total = hits + misses;
    const rate = total > 0 ? ((hits / total) * 100).toFixed(0) : '-';
    console.log(`  ${name}: ${hits} hits / ${misses} misses (${rate}% hit rate)`);
  }
  console.groupEnd();
}

// ── Temps de chargement page ──

export function usePageLoadTelemetry(pageName: string, loading: boolean): void {
  const mountTime = useRef<number>(0);
  const reported = useRef(false);

  useEffect(() => {
    if (!IS_DEV) return;
    mountTime.current = performance.now();
    reported.current = false;
  }, [pageName]);

  useEffect(() => {
    if (!IS_DEV || loading || reported.current || !mountTime.current) return;
    const elapsed = performance.now() - mountTime.current;
    console.groupCollapsed(`[Telemetry] ${pageName} loaded`);
    console.log(`  Temps de chargement: ${elapsed.toFixed(0)}ms`);
    logCacheMetrics();
    console.groupEnd();
    reported.current = true;
  }, [pageName, loading]);
}
