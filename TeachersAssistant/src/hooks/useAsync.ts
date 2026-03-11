// ============================================================================
// useAsync — Hook générique pour les appels de données asynchrones
// Gère loading, erreur, rafraîchissement
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook générique pour charger des données asynchrones.
 *
 * @param fetcher - Fonction async qui retourne les données
 * @param deps - Dépendances qui déclenchent un rechargement
 *
 * Usage :
 *   const { data: students, loading } = useAsync(() => studentService.getByClass(classId), [classId]);
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { data, loading, error, refresh: load };
}

/**
 * Variante pour un seul élément (peut être null).
 */
export function useAsyncOne<T>(
  fetcher: () => Promise<T | null>,
  deps: unknown[] = []
): AsyncState<T | null> {
  return useAsync(fetcher, deps);
}
