// ============================================================================
// Teacher Assistant — Types : Workspace (multi-bases)
// ============================================================================

export interface WorkspaceEntry {
  /** Chemin absolu du fichier .ta (SQLite) */
  path: string;
  /** Nom affiché (ex: "2025-2026 — Lycée Victor Hugo") */
  label: string;
  /** Dernière ouverture (ISO) */
  lastOpenedAt: string;
  /** Taille en octets (optionnel) */
  fileSize?: number;
}

/** Fichier de config locale (~/.teacher-assistant/config.json) */
export interface WorkspaceConfig {
  /** Chemin de la dernière base ouverte (null = afficher l'écran d'accueil) */
  lastOpened: string | null;
  /** Bases récentes (max 10) */
  recents: WorkspaceEntry[];
  /** Version du format de config */
  version: number;
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  lastOpened: null,
  recents: [],
  version: 1,
};

/** Extension des fichiers Teacher Assistant */
export const TA_FILE_EXTENSION = '.ta';

/** Nom du fichier de configuration */
export const CONFIG_FILE_NAME = 'config.json';

/** Dossier de configuration (~/.teacher-assistant/) */
export const CONFIG_DIR_NAME = '.teacher-assistant';
