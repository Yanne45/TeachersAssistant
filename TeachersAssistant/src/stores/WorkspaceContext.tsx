// ============================================================================
// Teacher Assistant — WorkspaceContext
// Gère : quel fichier .ta est ouvert, écran d'accueil, open/create/switch
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { WorkspaceEntry } from '../types';
import {
  db,
  openDatabase,
  createDatabase,
  closeDatabase,
} from '../services/db';
import { runMigrations } from '../services/migrationRunner';
import { workspaceService } from '../services/workspaceService';

// ── Types ──

type WorkspaceStatus = 'loading' | 'welcome' | 'open' | 'error';

interface WorkspaceState {
  status: WorkspaceStatus;
  currentPath: string | null;
  currentLabel: string | null;
  recents: WorkspaceEntry[];
  error: string | null;

  /** Ouvrir une base existante par chemin */
  openFile: (path: string, label?: string) => Promise<void>;
  /** Créer une nouvelle base (dialogue fichier) */
  createNew: () => Promise<void>;
  /** Ouvrir le dialogue pour sélectionner un fichier */
  openPicker: () => Promise<void>;
  /** Fermer la base active → retour écran d'accueil */
  closeCurrent: () => Promise<void>;
  /** Retirer un récent */
  removeRecent: (path: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

// ── Provider ──

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WorkspaceStatus>('loading');
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [recents, setRecents] = useState<WorkspaceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Init : charger config, tenter réouverture (avec retry si Tauri pas prêt)
  useEffect(() => {
    let cancelled = false;

    const tryInit = async (attempt: number) => {
      try {
        const config = await workspaceService.getConfig();
        if (cancelled) return;

        setRecents(config.recents);
        console.log('[Workspace] Config chargée, lastOpened:', config.lastOpened, 'recents:', config.recents.length);

        if (config.lastOpened) {
          // Tenter directement l'ouverture plutôt que fileExists
          // (fileExists échoue si Tauri FS pas encore prêt)
          try {
            await doOpen(config.lastOpened);
            return;
          } catch (openErr) {
            console.warn('[Workspace] Impossible de réouvrir la dernière base:', openErr);
            // Ne pas supprimer des récents — le fichier existe peut-être mais Tauri pas prêt
            if (attempt < 3 && !cancelled) {
              console.log(`[Workspace] Retry dans 500ms (attempt ${attempt})`);
              setTimeout(() => tryInit(attempt + 1), 500);
              return;
            }
          }
        }

        if (!cancelled) setStatus('welcome');
      } catch (err) {
        console.error(`[Workspace] Init error (attempt ${attempt}):`, err);
        if (attempt < 3 && !cancelled) {
          setTimeout(() => tryInit(attempt + 1), 500);
          return;
        }
        if (!cancelled) setStatus('welcome');
      }
    };

    tryInit(1);
    return () => { cancelled = true; };
  // doOpen est défini plus bas et reste stable (useCallback []).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doOpen = useCallback(async (path: string, label?: string) => {
    try {
      setError(null);
      setStatus('loading');

      await openDatabase(path);
      await runMigrations();

      // Extraire un label depuis la DB si pas fourni
      let finalLabel = label ?? path.split(/[\\/]/).pop()?.replace('.ta', '') ?? 'Sans titre';
      try {
        const year = await db.selectOne<{ label: string }>(
          'SELECT label FROM academic_years WHERE is_active = 1'
        );
        if (year?.label) {
          finalLabel = year.label;
        }
      } catch { /* base peut être vierge */ }

      await workspaceService.registerOpen(path, finalLabel);

      setCurrentPath(path);
      setCurrentLabel(finalLabel);
      setStatus('open');

      const config = await workspaceService.getConfig();
      setRecents(config.recents);
    } catch (err) {
      console.error('[Workspace] Erreur ouverture:', err);
      setError(`Impossible d'ouvrir : ${String(err)}`);
      setStatus('error');
    }
  }, []);

  const openFile = useCallback(async (path: string, label?: string) => {
    await doOpen(path, label);
  }, [doOpen]);

  const openPicker = useCallback(async () => {
    const path = await workspaceService.pickFileToOpen();
    if (path) {
      await doOpen(path);
    }
  }, [doOpen]);

  const createNew = useCallback(async () => {
    const path = await workspaceService.pickFileToCreate();
    if (!path) return;

    try {
      setError(null);
      setStatus('loading');

      // Supprimer le fichier existant pour garantir une base vierge
      await workspaceService.deleteFile(path);

      await createDatabase(path);
      await runMigrations();

      const label = path.split(/[\\/]/).pop()?.replace('.ta', '') ?? 'Nouvelle base';
      await workspaceService.registerOpen(path, label);

      setCurrentPath(path);
      setCurrentLabel(label);
      setStatus('open');

      const config = await workspaceService.getConfig();
      setRecents(config.recents);
    } catch (err) {
      console.error('[Workspace] Erreur création:', err);
      setError(`Impossible de créer : ${String(err)}`);
      setStatus('error');
    }
  }, []);

  const closeCurrent = useCallback(async () => {
    await closeDatabase();
    await workspaceService.clearLastOpened();
    setCurrentPath(null);
    setCurrentLabel(null);
    setStatus('welcome');
  }, []);

  const removeRecent = useCallback(async (path: string) => {
    await workspaceService.removeRecent(path);
    setRecents(prev => prev.filter(r => r.path !== path));
  }, []);

  const value: WorkspaceState = {
    status, currentPath, currentLabel, recents, error,
    openFile, createNew, openPicker, closeCurrent, removeRecent,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

// ── Hook ──

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
