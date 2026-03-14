/**
 * Toast deduplication logic — extracted for testability.
 * Mirrors the logic in AppContext.tsx addToast.
 */
export interface ToastEntry {
  id: string;
  type: string;
  message: string;
}

let _counter = 0;

/**
 * Given the current toast list, returns the new list after attempting
 * to add a toast. If an identical (type+message) toast exists, returns
 * the same array (no duplicate).
 */
export function addToastDedup(
  prev: ToastEntry[],
  type: string,
  message: string,
): { list: ToastEntry[]; added: ToastEntry | null } {
  if (prev.some(t => t.type === type && t.message === message)) {
    return { list: prev, added: null };
  }
  const toast: ToastEntry = { id: `toast-${++_counter}`, type, message };
  return { list: [...prev, toast], added: toast };
}

/** Reset counter (for tests) */
export function _resetCounter() {
  _counter = 0;
}
