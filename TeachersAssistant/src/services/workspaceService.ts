// ============================================================================
// Teacher Assistant — Service : Workspace (gestion multi-bases)
//
// Gère un fichier de config local (~/.teacher-assistant/config.json)
// qui stocke la liste des bases récentes et la dernière ouverte.
//
// Chaque "base" est un fichier .ta (SQLite) que l'utilisateur peut
// créer, ouvrir, ou retrouver dans ses récents.
// ============================================================================

import type {
  WorkspaceConfig,
  WorkspaceEntry,
} from '../types';
import {
  DEFAULT_WORKSPACE_CONFIG,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
} from '../types';

const MAX_RECENTS = 10;
const LS_KEY = 'ta_workspace_config';

// ── Cache appDataDir pour résolution chemins relatifs ──

let _appDataDirCache: string | null = null;

async function getAppDataDirCached(): Promise<string> {
  if (_appDataDirCache) return _appDataDirCache;
  const { appDataDir } = await import('@tauri-apps/api/path');
  _appDataDirCache = await appDataDir();
  return _appDataDirCache;
}

/** Normalise un chemin en forward slashes pour comparaison */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Convertit un chemin absolu en chemin relatif par rapport à appDataDir.
 * Si le chemin n'est pas sous appDataDir, le retourne tel quel.
 * Les chemins déjà relatifs sont retournés inchangés.
 */
export async function toRelativePath(absolutePath: string): Promise<string> {
  if (!absolutePath) return absolutePath;
  const norm = normalizePath(absolutePath);
  // Déjà relatif (pas de lettre de lecteur ni de /)
  if (!/^[A-Za-z]:/.test(norm) && !norm.startsWith('/')) return absolutePath;
  const base = normalizePath(await getAppDataDirCached());
  if (norm.startsWith(base + '/')) {
    return norm.slice(base.length + 1);
  }
  return absolutePath;
}

/**
 * Résout un chemin relatif (stocké en DB) en chemin absolu via appDataDir.
 * Les chemins déjà absolus sont retournés inchangés.
 */
export async function resolveDocPath(relativePath: string): Promise<string> {
  if (!relativePath) return relativePath;
  const norm = normalizePath(relativePath);
  // Déjà absolu
  if (/^[A-Za-z]:/.test(norm) || norm.startsWith('/')) return relativePath;
  const { join } = await import('@tauri-apps/api/path');
  return join(await getAppDataDirCached(), relativePath);
}

/**
 * Convertit un chemin fichier (relatif ou absolu) en URL de prévisualisation.
 * Gère aussi les URLs déjà formées (http, data, blob, file).
 */
export async function toPreviewSrc(filePath: string): Promise<string> {
  const trimmed = filePath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  // Résoudre les chemins relatifs en absolus
  const resolved = await resolveDocPath(trimmed);
  const norm = normalizePath(resolved);
  if (/^[A-Za-z]:/.test(norm)) {
    return `file:///${norm}`;
  }
  if (norm.startsWith('/')) {
    return `file://${norm}`;
  }
  return norm;
}

// ── localStorage fallback (fiable même si Tauri FS n'est pas prêt) ──

function readLocalStorage(): WorkspaceConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as WorkspaceConfig;
  } catch { /* ignore */ }
  return { ...DEFAULT_WORKSPACE_CONFIG };
}

function writeLocalStorage(config: WorkspaceConfig): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

// ── Accès filesystem via Tauri ──

let _fs: {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, contents: string) => Promise<void>;
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  remove: (path: string) => Promise<void>;
} | null = null;

let _path: {
  homeDir: () => Promise<string>;
  join: (...parts: string[]) => Promise<string>;
} | null = null;

async function loadTauriModules() {
  if (_fs && _path) return;
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    _fs = {
      readTextFile: fs.readTextFile,
      writeTextFile: fs.writeTextFile,
      mkdir: fs.mkdir,
      exists: fs.exists,
      remove: fs.remove,
    };
    const pathModule = await import('@tauri-apps/api/path');
    _path = {
      homeDir: pathModule.homeDir,
      join: pathModule.join,
    };
  } catch {
    console.warn('[Workspace] Tauri FS non disponible (mode navigateur)');
  }
}

async function getConfigPath(): Promise<string> {
  await loadTauriModules();
  if (!_path || !_fs) throw new Error('Tauri FS non disponible');

  const home = await _path.homeDir();
  const dir = await _path.join(home, CONFIG_DIR_NAME);

  // Créer le dossier si nécessaire
  const dirExists = await _fs.exists(dir);
  if (!dirExists) {
    await _fs.mkdir(dir, { recursive: true });
  }

  return _path.join(dir, CONFIG_FILE_NAME);
}

// ── Lecture / écriture config ──

async function readConfig(): Promise<WorkspaceConfig> {
  try {
    await loadTauriModules();
    if (!_fs) {
      console.warn('[Workspace] Tauri FS indisponible, fallback localStorage');
      return readLocalStorage();
    }

    const configPath = await getConfigPath();
    const exists = await _fs.exists(configPath);
    if (!exists) {
      // Peut-être que localStorage a la config (migration)
      const ls = readLocalStorage();
      if (ls.lastOpened || ls.recents.length > 0) return ls;
      return { ...DEFAULT_WORKSPACE_CONFIG };
    }

    const raw = await _fs.readTextFile(configPath);
    const parsed = JSON.parse(raw) as WorkspaceConfig;

    // Migration si version future
    if (!parsed.version) parsed.version = 1;
    if (!parsed.recents) parsed.recents = [];

    return parsed;
  } catch (err) {
    console.error('[Workspace] Erreur lecture config, fallback localStorage:', err);
    return readLocalStorage();
  }
}

async function writeConfig(config: WorkspaceConfig): Promise<void> {
  // Toujours écrire dans localStorage (fiable, synchrone)
  writeLocalStorage(config);

  try {
    await loadTauriModules();
    if (!_fs) return;

    const configPath = await getConfigPath();
    await _fs.writeTextFile(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[Workspace] Erreur écriture config FS (localStorage OK):', err);
  }
}

// ── API publique ──

export const workspaceService = {
  /**
   * Lire la config complète.
   */
  async getConfig(): Promise<WorkspaceConfig> {
    return readConfig();
  },

  /**
   * Récupérer la liste des bases récentes.
   */
  async getRecents(): Promise<WorkspaceEntry[]> {
    const config = await readConfig();
    return config.recents;
  },

  /**
   * Récupérer le chemin de la dernière base ouverte (ou null).
   */
  async getLastOpened(): Promise<string | null> {
    const config = await readConfig();
    return config.lastOpened;
  },

  /**
   * Enregistrer l'ouverture d'une base.
   * Met à jour lastOpened + ajoute/remonte dans les récents.
   */
  async registerOpen(path: string, label: string): Promise<void> {
    const config = await readConfig();

    config.lastOpened = path;

    // Retirer l'entrée existante si présente
    config.recents = config.recents.filter(r => r.path !== path);

    // Ajouter en tête
    config.recents.unshift({
      path,
      label,
      lastOpenedAt: new Date().toISOString(),
    });

    // Garder max N récents
    config.recents = config.recents.slice(0, MAX_RECENTS);

    await writeConfig(config);
  },

  /**
   * Retirer une entrée des récents (ex: fichier supprimé).
   */
  async removeRecent(path: string): Promise<void> {
    const config = await readConfig();
    config.recents = config.recents.filter(r => r.path !== path);
    if (config.lastOpened === path) {
      config.lastOpened = null;
    }
    await writeConfig(config);
  },

  /**
   * Mettre à jour le label d'un récent (ex: après config année).
   */
  async updateLabel(path: string, label: string): Promise<void> {
    const config = await readConfig();
    const entry = config.recents.find(r => r.path === path);
    if (entry) {
      entry.label = label;
      await writeConfig(config);
    }
  },

  /**
   * Effacer lastOpened (forcer l'écran d'accueil au prochain lancement).
   */
  async clearLastOpened(): Promise<void> {
    const config = await readConfig();
    config.lastOpened = null;
    await writeConfig(config);
  },

  /**
   * Ouvrir le dialogue "Ouvrir un fichier" via Tauri.
   * Retourne le chemin sélectionné ou null.
   */
  async pickFileToOpen(): Promise<string | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        title: 'Ouvrir une base Teacher Assistant',
        filters: [{ name: 'Teacher Assistant', extensions: ['ta'] }],
        multiple: false,
      });
      return typeof result === 'string' ? result : null;
    } catch {
      return null;
    }
  },

  /**
   * Ouvrir le dialogue "Enregistrer sous" pour créer une nouvelle base.
   * Retourne le chemin choisi ou null.
   */
  async pickFileToCreate(): Promise<string | null> {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const result = await save({
        title: 'Créer une nouvelle base Teacher Assistant',
        filters: [{ name: 'Teacher Assistant', extensions: ['ta'] }],
        defaultPath: 'teacher-assistant.ta',
      });
      return result ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Retourne un sous-dossier de données applicatives, organisé selon le type
   * et des composants optionnels (classe, matière, niveau…).
   *
   * Structure : <appDataDir>/<type>[/<part1>/<part2>…]
   *
   * Types disponibles :
   *   'copies'        → copies d'élèves, organisées par classe/devoir
   *   'documents'     → bibliothèque pédagogique, par niveau/matière
   *   'exports'       → PDFs générés, par type (bulletins, progressions…)
   *   'generations_ia'→ sorties IA sauvegardées, par niveau/matière
   *   'backups'       → sauvegardes automatiques de la base
   *
   * Chaque composant est sanitizé (caractères spéciaux → _, max 40 chars).
   * Le dossier est créé s'il n'existe pas.
   */
  async getAppSubDir(
    type: 'copies' | 'documents' | 'exports' | 'generations_ia' | 'backups' | 'thumbnails',
    ...parts: (string | null | undefined)[]
  ): Promise<string> {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const { mkdir, exists } = await import('@tauri-apps/plugin-fs');
    const sanitize = (s: string) =>
      s.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').slice(0, 40);
    const validParts = parts.filter((p): p is string => !!p?.trim()).map(sanitize);
    const dir = await join(await appDataDir(), type, ...validParts);
    if (!(await exists(dir))) await mkdir(dir, { recursive: true });
    return dir;
  },

  /**
   * Vérifie si un fichier existe toujours sur disque.
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await loadTauriModules();
      if (!_fs) return false;
      return _fs.exists(path);
    } catch {
      return false;
    }
  },

  /**
   * Supprimer un fichier sur disque (ex: avant recréation d'une base).
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await loadTauriModules();
      if (!_fs) return;
      const exists = await _fs.exists(path);
      if (exists) {
        await _fs.remove(path);
      }
    } catch (err) {
      console.error('[Workspace] Erreur suppression fichier:', err);
    }
  },
};
