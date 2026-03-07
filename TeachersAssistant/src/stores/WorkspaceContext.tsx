// ============================================================================
// Teacher Assistant — WorkspaceContext
// Gère : quel fichier .ta est ouvert, écran d'accueil, open/create/switch
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { WorkspaceEntry } from '../types';
import {
  openDatabase,
  createDatabase,
  closeDatabase,
  applySchema,
  getCurrentPath,
} from '../services/db';
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

  // Init : charger config, tenter réouverture
  useEffect(() => {
    (async () => {
      try {
        const config = await workspaceService.getConfig();
        setRecents(config.recents);

        if (config.lastOpened) {
          const exists = await workspaceService.fileExists(config.lastOpened);
          if (exists) {
            await doOpen(config.lastOpened);
            return;
          } else {
            // Fichier disparu — nettoyer
            await workspaceService.removeRecent(config.lastOpened);
            setRecents(prev => prev.filter(r => r.path !== config.lastOpened));
          }
        }

        setStatus('welcome');
      } catch (err) {
        console.error('[Workspace] Init error:', err);
        setStatus('welcome');
      }
    })();
  }, []);

  const doOpen = useCallback(async (path: string, label?: string) => {
    try {
      setError(null);
      setStatus('loading');

      await openDatabase(path);

      // Apply migrations to ensure existing bases are up-to-date
      // (idempotent — safe to run on already-migrated bases)
      try {
        const resp002 = await fetch('/db/002_ai_prompts.sql');
        if (resp002.ok) {
          await applySchema(await resp002.text());
        }
      } catch { /* non-critical for existing bases */ }

      // Extraire un label depuis la DB si pas fourni
      let finalLabel = label ?? path.split(/[\\/]/).pop()?.replace('.ta', '') ?? 'Sans titre';
      try {
        const { db } = await import('../services/db');
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

  /**
   * Apply all SQL migrations in order.
   * Each migration is fetched from /db/ (Vite public dir).
   * Migrations are idempotent (CREATE IF NOT EXISTS, UPDATE WHERE).
   */
  const applyMigrations = useCallback(async () => {
    const migrations = [
      '/db/001_initial_schema.sql',
      '/db/002_ai_prompts.sql',
    ];

    for (const url of migrations) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const sql = await response.text();
          await applySchema(sql);
          console.log(`[Workspace] Migration applied: ${url}`);
        } else {
          console.warn(`[Workspace] Migration not found: ${url} (${response.status})`);
        }
      } catch (err) {
        console.warn(`[Workspace] Migration failed: ${url}`, err);
      }
    }
  }, []);

  const createNew = useCallback(async () => {
    const path = await workspaceService.pickFileToCreate();
    if (!path) return;

    try {
      setError(null);
      setStatus('loading');

      const needsSchema = await createDatabase(path);

      if (needsSchema) {
        await applyMigrations();
      }

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
  }, [applyMigrations]);

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
