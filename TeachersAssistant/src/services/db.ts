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
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number; lastInsertId: number }>;
  close(): Promise<void>;
}

let _db: TauriDatabase | null = null;
let _currentPath: string | null = null;
let _Database: { default: { load: (uri: string) => Promise<TauriDatabase> } } | null = null;

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
    _db = await Database.default.load(`sqlite:${filePath}`);
    _currentPath = filePath;
    await initPragmas(_db);
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
 * @deprecated Remplacé par migrationRunner.runMigrations().
 */
export async function applySchema(schemaSql: string): Promise<void> {
  if (!_db) throw new Error('[DB] Aucune base ouverte');
  const statements = splitSqlStatements(schemaSql);
  for (const stmt of statements) {
    try {
      await _db.execute(stmt, []);
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('already exists')) {
        console.error('[DB] Erreur migration:', stmt.substring(0, 80), err);
      }
    }
  }
}

/**
 * Split a SQL script into individual statements, correctly handling:
 * - String literals ('...') including escaped quotes ('')
 * - Line comments (-- ...)
 * - Block comments (/* ... *​/)
 * - Semicolons inside strings are NOT treated as delimiters
 */
export function splitSqlStatements(sql: string): string[] {
  const results: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    // Line comment: skip to end of line
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      const eol = sql.indexOf('\n', i);
      i = eol === -1 ? len : eol + 1;
      continue;
    }

    // Block comment: skip to */
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }

    // String literal: consume until closing quote (handle '' escape)
    if (ch === "'") {
      current += ch;
      i++;
      while (i < len) {
        if (sql[i] === "'" && i + 1 < len && sql[i + 1] === "'") {
          // Escaped quote ''
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          // End of string
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

    // Semicolon outside strings = statement delimiter
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        results.push(trimmed + ';');
      }
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Trailing statement without semicolon
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    results.push(trimmed + ';');
  }

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

// ── Rétrocompatibilité ──

/**
 * @deprecated Utiliser openDatabase(path) à la place.
 */
export async function initDatabase(): Promise<void> {
  if (_db) return;
  await openDatabase('teacher-assistant.db');
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

  async execute(query: string, params: unknown[] = []): Promise<{ rowsAffected: number; lastInsertId: number }> {
    return getDb().execute(query, params);
  },

  async insert(query: string, params: unknown[] = []): Promise<number> {
    const result = await getDb().execute(query, params);
    return result.lastInsertId;
  },

  async selectOne<T>(query: string, params: unknown[] = []): Promise<T | null> {
    const rows = await getDb().select<T[]>(query, params);
    return rows.length > 0 ? rows[0] : null;
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
