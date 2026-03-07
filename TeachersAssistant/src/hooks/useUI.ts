// ============================================================================
// Teacher Assistant — Hooks UI (toast, thème, raccourcis clavier)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ThemeValue, UIDensity } from '../types';

// ── Toast ──

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warn' | 'info';
  message: string;
  duration?: number;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((type: ToastData['type'], message: string, duration = 3000) => {
    const id = `toast-${++toastId}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warn: (msg: string) => addToast('warn', msg),
    info: (msg: string) => addToast('info', msg),
    dismiss: dismissToast,
  };
}

// ── Thème ──

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeValue>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-theme') as ThemeValue) || 'light';
    }
    return 'light';
  });

  const setTheme = useCallback((newTheme: ThemeValue) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    setThemeState(newTheme);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}

// ── Densité UI ──

export function useUIDensity() {
  const [density, setDensityState] = useState<UIDensity>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-ui') as UIDensity) || 'standard';
    }
    return 'standard';
  });

  const setDensity = useCallback((d: UIDensity) => {
    if (d === 'standard') {
      document.documentElement.removeAttribute('data-ui');
    } else {
      document.documentElement.setAttribute('data-ui', d);
    }
    setDensityState(d);
  }, []);

  return { density, setDensity };
}

// ── Raccourcis clavier ──

type KeyHandler = (e: KeyboardEvent) => void;

export function useKeyboardShortcuts(shortcuts: Record<string, KeyHandler>, enabled = true) {
  const handlersRef = useRef(shortcuts);
  handlersRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignorer si focus dans un input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      const combo = [
        e.ctrlKey ? 'ctrl' : '',
        e.shiftKey ? 'shift' : '',
        e.altKey ? 'alt' : '',
        key,
      ].filter(Boolean).join('+');

      if (handlersRef.current[combo]) {
        e.preventDefault();
        handlersRef.current[combo](e);
      } else if (handlersRef.current[key]) {
        e.preventDefault();
        handlersRef.current[key](e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

// ── Debounce ──

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ── Connectivité ──

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

// ── Correction shortcuts (spec §5.9) ──

export interface CorrectionShortcutHandlers {
  onPrevStudent: () => void;
  onNextStudent: () => void;
  onSetLevel: (level: number) => void;
  onNextSkill: () => void;
  onFinalize: () => void;
  onAnalyzeAI: () => void;
  onSave: () => void;
}

/** Wrapper spécialisé pour la correction en série. J/K/1-4/Tab/F/A/Ctrl+S */
export function useCorrectionShortcuts(h: CorrectionShortcutHandlers, enabled = true) {
  useKeyboardShortcuts({
    'k': () => h.onPrevStudent(),
    'j': () => h.onNextStudent(),
    '1': () => h.onSetLevel(1),
    '2': () => h.onSetLevel(2),
    '3': () => h.onSetLevel(3),
    '4': () => h.onSetLevel(4),
    'tab': () => h.onNextSkill(),
    'f': () => h.onFinalize(),
    'a': () => h.onAnalyzeAI(),
    'ctrl+s': () => h.onSave(),
  }, enabled);
}
