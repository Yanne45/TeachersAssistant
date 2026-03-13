// ============================================================================
// Teacher Assistant — Service DB : Abstraction Tauri SQL (multi-bases)
//
// Supporte l'ouverture, fermeture et création dynamique de fichiers .ta
// Un seul fichier ouvert à la fois. L'API publique (db.*) opère toujours
// sur la connexion active.
// ============================================================================

// ── Type du plugin Tauri SQL ──

interface TauriDatabase {
  select<T = unknown[]>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  close(): Promise<void>;
}

let _db: TauriDatabase | null = null;
let _currentPath: string | null = null;
let _Database: any = null;

// ── Chargement dynamique du module Tauri ──

async function getTauriSQL() {
  if (!_Database) {
    _Database = await import('@tauri-apps/plugin-sql');
  }
  return _Database;
}

// ── Init pragmas sur une connexion fraîche ──

async function initPragmas(conn: TauriDatabase): Promise<void> {
  await conn.execute('PRAGMA foreign_keys = ON', []);
  await conn.execute('PRAGMA journal_mode = WAL', []);
}

// ── Schéma : vérifier si la base est initialisée ──

async function isSchemaApplied(conn: TauriDatabase): Promise<boolean> {
  const tables = await conn.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='academic_years'"
  );
  return tables.length > 0;
}

// ── API de gestion de connexion ──

/**
 * Ouvre une base de données SQLite existante.
 * Ferme automatiquement la connexion précédente si ouverte.
 *
 * @param filePath Chemin absolu du fichier .ta
 */
export async function openDatabase(filePath: string): Promise<void> {
  if (_db) {
    try { await _db.close(); } catch { /* ignore */ }
    _db = null;
    _currentPath = null;
  }

  try {
    const Database = await getTauriSQL();
    const conn = await Database.default.load(`sqlite:${filePath}`);
    _db = conn;
    _currentPath = filePath;
    await initPragmas(conn);
    console.log(`[DB] Ouvert : ${filePath}`);
  } catch (err) {
    _db = null;
    _currentPath = null;
    console.error('[DB] Erreur ouverture :', err);
    throw err;
  }
}

/**
 * Crée une nouvelle base de données vide et l'ouvre.
 * Retourne true si le schéma doit encore être appliqué.
 *
 * @param filePath Chemin absolu du nouveau fichier .ta
 */
export async function createDatabase(filePath: string): Promise<boolean> {
  await openDatabase(filePath);
  if (_db) {
    const applied = await isSchemaApplied(_db);
    if (!applied) {
      console.log('[DB] Base vierge — schéma à appliquer');
      return true;
    }
  }
  return false;
}

/**
 * Split a SQL script into individual statements, correctly handling
 * string literals, line comments, and block comments.
 */
export function splitSqlStatements(sql: string): string[] {
  const results: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;
  let beginDepth = 0; // Track BEGIN...END nesting (triggers, etc.)

  while (i < len) {
    const ch = sql[i];

    // Skip single-line comments
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      const eol = sql.indexOf('\n', i);
      i = eol === -1 ? len : eol + 1;
      continue;
    }

    // Skip block comments
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }

    // Handle quoted strings (skip ; inside quotes)
    if (ch === "'") {
      current += ch;
      i++;
      while (i < len) {
        if (sql[i] === "'" && i + 1 < len && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // Detect BEGIN keyword (for triggers, CASE, etc.)
    if (/[^a-zA-Z_]/i.test(current.slice(-1) || ' ') || current.length === 0) {
      const rest = sql.slice(i);
      const beginMatch = rest.match(/^BEGIN\b/i);
      if (beginMatch) {
        current += beginMatch[0];
        i += beginMatch[0].length;
        beginDepth++;
        continue;
      }
      const endMatch = rest.match(/^END\s*;/i);
      if (endMatch && beginDepth > 0) {
        current += endMatch[0].replace(/;$/, '');
        i += endMatch[0].length - 1; // leave the ; for the main handler
        beginDepth--;
        continue;
      }
    }

    // Only split on ; when not inside a BEGIN...END block
    if (ch === ';' && beginDepth === 0) {
      const trimmed = current.trim();
      if (trimmed.length > 0) results.push(trimmed + ';');
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) results.push(trimmed + ';');
  return results;
}

/**
 * Ferme la connexion active.
 */
export async function closeDatabase(): Promise<void> {
  if (_db) {
    try { await _db.close(); } catch { /* ignore */ }
    _db = null;
    _currentPath = null;
    console.log('[DB] Connexion fermée');
  }
}

/**
 * Retourne le chemin du fichier actuellement ouvert (ou null).
 */
export function getCurrentPath(): string | null {
  return _currentPath;
}

/**
 * Retourne true si une base est actuellement ouverte.
 */
export function isOpen(): boolean {
  return _db !== null;
}

// ── Accès à la connexion active ──

function getDb(): TauriDatabase {
  if (!_db) {
    throw new Error(
      '[DB] Aucune base ouverte. Appelez openDatabase(path) ou utilisez l\'écran d\'accueil.'
    );
  }
  return _db;
}

// ── API publique ──

export const db = {
  async select<T = unknown[]>(query: string, params: unknown[] = []): Promise<T> {
    return getDb().select<T>(query, params);
  },

  async execute(query: string, params: unknown[] = []): Promise<{ rowsAffected: number; lastInsertId?: number }> {
    return getDb().execute(query, params);
  },

  async insert(query: string, params: unknown[] = []): Promise<number> {
    const result = await getDb().execute(query, params);
    return result.lastInsertId ?? 0;
  },

  async selectOne<T>(query: string, params: unknown[] = []): Promise<T | null> {
    const rows = await getDb().select<T[]>(query, params);
    return rows.length > 0 ? (rows[0] ?? null) : null;
  },

  async transaction(fn: () => Promise<void>): Promise<void> {
    const d = getDb();
    await d.execute('BEGIN TRANSACTION', []);
    try {
      await fn();
      await d.execute('COMMIT', []);
    } catch (err) {
      await d.execute('ROLLBACK', []);
      throw err;
    }
  },

  async close(): Promise<void> {
    await closeDatabase();
  },

  get currentPath(): string | null {
    return _currentPath;
  },

  get isOpen(): boolean {
    return _db !== null;
  },
};

