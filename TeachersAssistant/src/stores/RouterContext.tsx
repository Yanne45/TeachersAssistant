// ============================================================================
// Teacher Assistant — RouterContext
// Routage interne sans react-router. Gère un chemin hiérarchique
// synchronisé avec le tab actif et la sidebar.
// ============================================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TabId } from './AppContext';

// ── Types ──

export interface Route {
  /** Tab actif (niveau 1) */
  tab: TabId;
  /** Sous-page dans le tab (niveau 2) — ex: 'progression', 'sequences', 'devoirs' */
  page: string;
  /** ID d'entité sélectionnée (niveau 3) — ex: sequenceId, studentId */
  entityId?: number | string | null;
  /** Sous-vue de l'entité (niveau 4) — ex: 'competences', 'correction-serie' */
  subView?: string | null;
  /** Filtre optionnel (ex: sidebar subject filter) */
  filter?: string | null;
}

interface RouterState {
  route: Route;
  /** Navigation complète */
  navigate: (route: Partial<Route> & { tab: TabId }) => void;
  /** Changer juste la sous-page dans le tab actif */
  setPage: (page: string, filter?: string | null) => void;
  /** Sélectionner une entité */
  setEntity: (id: number | string | null, subView?: string | null) => void;
  /** Retour : effacer subView → entityId → page par défaut */
  goBack: () => void;
  /** Chemin complet sous forme de string (pour debug / breadcrumb) */
  pathString: string;
}

// ── Pages par défaut par tab ──

export const DEFAULT_PAGES: Record<TabId, string> = {
  dashboard: 'home',
  programme: 'officiel',
  preparation: 'sequences',
  planning: 'edt',
  cahier: 'all',
  classes: 'overview',
  evaluation: 'devoirs',
};

const RouterContext = createContext<RouterState | null>(null);

// ── Provider ──

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<Route>({
    tab: 'dashboard',
    page: 'home',
    entityId: null,
    subView: null,
    filter: null,
  });

  const navigate = useCallback((partial: Partial<Route> & { tab: TabId }) => {
    setRoute({
      tab: partial.tab,
      page: partial.page ?? DEFAULT_PAGES[partial.tab] ?? 'home',
      entityId: partial.entityId ?? null,
      subView: partial.subView ?? null,
      filter: partial.filter ?? null,
    });
  }, []);

  const setPage = useCallback((page: string, filter?: string | null) => {
    setRoute(prev => ({ ...prev, page, entityId: null, subView: null, filter: filter ?? null }));
  }, []);

  const setEntity = useCallback((id: number | string | null, subView?: string | null) => {
    setRoute(prev => ({ ...prev, entityId: id, subView: subView ?? null }));
  }, []);

  const goBack = useCallback(() => {
    setRoute(prev => {
      if (prev.subView) return { ...prev, subView: null };
      if (prev.entityId) return { ...prev, entityId: null };
      return { ...prev, page: DEFAULT_PAGES[prev.tab] };
    });
  }, []);

  const pathString = [
    route.tab,
    route.page,
    route.entityId != null ? String(route.entityId) : null,
    route.subView,
  ].filter(Boolean).join('/');

  const value: RouterState = { route, navigate, setPage, setEntity, goBack, pathString };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

// ── Hook ──

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
