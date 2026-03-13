// ============================================================================
// Teacher Assistant — AppContext : état global de l'application
// Gère : année active, tab actif, navigation sidebar, toasts, notifications
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AcademicYear, ThemeValue, UIDensity } from '../types';
import type { ToastData } from '../hooks';
import { useOnlineStatus } from '../hooks';
import { academicYearService, preferenceService, notificationService } from '../services';
import { generateNotifications } from '../services';

// ── Types ──

export type TabId = 'dashboard' | 'programme' | 'preparation' | 'planning' | 'cahier' | 'classes' | 'evaluation' | 'bibliotheque' | 'parametres';

interface AppState {
  // Année
  activeYear: AcademicYear | null;
  activeYearLoading: boolean;

  // Navigation
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  sidebarPath: string | null;
  setSidebarPath: (path: string | null) => void;

  // UI
  theme: ThemeValue;
  setTheme: (t: ThemeValue) => void;
  uiDensity: UIDensity;
  setUIDensity: (d: UIDensity) => void;
  isOnline: boolean;

  // Toasts
  toasts: ToastData[];
  addToast: (type: ToastData['type'], message: string) => void;
  dismissToast: (id: string) => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

const AppContext = createContext<AppState | null>(null);

// ── Provider ──

let _toastId = 0;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Année active
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [activeYearLoading, setActiveYearLoading] = useState(true);

  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarPath, setSidebarPath] = useState<string | null>(null);

  // UI
  const [theme, setThemeState] = useState<ThemeValue>('light');
  const [uiDensity, setUIDensityState] = useState<UIDensity>('standard');
  const isOnline = useOnlineStatus();

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);

  // Init
  useEffect(() => {
    (async () => {
      try {
        const year = await academicYearService.getActive();
        setActiveYear(year);

        const prefs = await preferenceService.getAll();
        setThemeState(prefs.theme);
        setUIDensityState(prefs.ui_density);
        document.documentElement.setAttribute('data-theme', prefs.theme);
        if (prefs.ui_density !== 'standard') {
          document.documentElement.setAttribute('data-ui', prefs.ui_density);
        }
        if (prefs.default_tab) {
          setActiveTab(prefs.default_tab as TabId);
        }

        // Notifications contextuelles
        if (year) {
          generateNotifications(year.id).catch(() => {});
          notificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
        }
      } catch (err) {
        console.error('[App] Init error:', err);
      } finally {
        setActiveYearLoading(false);
      }
    })();
  }, []);

  // Refresh notification count every 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      notificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setTheme = useCallback((t: ThemeValue) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    preferenceService.set('theme', t);
  }, []);

  const setUIDensity = useCallback((d: UIDensity) => {
    setUIDensityState(d);
    if (d === 'standard') {
      document.documentElement.removeAttribute('data-ui');
    } else {
      document.documentElement.setAttribute('data-ui', d);
    }
    preferenceService.set('ui_density', d);
  }, []);

  const addToast = useCallback((type: ToastData['type'], message: string) => {
    const id = `toast-${++_toastId}`;
    const toast: ToastData = { id, type, message, duration: 3000 };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: AppState = {
    activeYear, activeYearLoading,
    activeTab, setActiveTab,
    sidebarPath, setSidebarPath,
    theme, setTheme,
    uiDensity, setUIDensity,
    isOnline,
    toasts, addToast, dismissToast,
    unreadCount, setUnreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ── Hook d'accès ──

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
