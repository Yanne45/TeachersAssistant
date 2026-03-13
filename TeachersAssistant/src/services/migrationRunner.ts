// ============================================================================
// Teacher Assistant — Migration Runner
//
// Exécute les migrations SQL de manière fiable :
//  - Table schema_migrations pour ne jouer chaque migration qu'une seule fois
//  - Chaque migration tourne dans une transaction (rollback si erreur)
//  - Détection automatique des bases legacy (pré-runner) : stamp sans rejouer
//  - Les PRAGMA sont exécutés hors transaction (contrainte SQLite)
// ============================================================================

import { db, splitSqlStatements } from './db';

// ── Registre des migrations ──

interface MigrationDescriptor {
  filename: string;
  url: string;
}

const MIGRATIONS: MigrationDescriptor[] = [
  { filename: '001_initial_schema.sql', url: '/db/001_initial_schema.sql' },
  { filename: '002_ai_prompts.sql', url: '/db/002_ai_prompts.sql' },
  { filename: '003_reference_data.sql', url: '/db/003_reference_data.sql' },
  { filename: '004_program_keywords.sql', url: '/db/004_program_keywords.sql' },
  { filename: '005_program_descriptions.sql', url: '/db/005_program_descriptions.sql' },
  { filename: '006_complete_programmes.sql', url: '/db/006_complete_programmes.sql' },
  { filename: '007_repair_subject_ids.sql', url: '/db/007_repair_subject_ids.sql' },
  { filename: '008_clean_programmes.sql', url: '/db/008_clean_programmes.sql' },
  { filename: '009_dedup_levels.sql', url: '/db/009_dedup_levels.sql' },
  { filename: '010_merge_1ere_level.sql', url: '/db/010_merge_1ere_level.sql' },
  { filename: '011_sequence_documents.sql', url: '/db/011_sequence_documents.sql' },
  { filename: '012_ai_custom_tasks.sql', url: '/db/012_ai_custom_tasks.sql' },
  { filename: '013_ai_provider_settings.sql', url: '/db/013_ai_provider_settings.sql' },
  { filename: '014_timetable_recurrence.sql', url: '/db/014_timetable_recurrence.sql' },
  { filename: '015_program_keywords.sql', url: '/db/015_program_keywords.sql' },
  { filename: '016_correction_workflow.sql', url: '/db/016_correction_workflow.sql' },
  { filename: '017_competencies.sql', url: '/db/017_competencies.sql' },
  { filename: '018_skill_descriptors.sql', url: '/db/018_skill_descriptors.sql' },
  { filename: '019_rubric_templates.sql', url: '/db/019_rubric_templates.sql' },
  { filename: '020_ai_new_tasks.sql', url: '/db/020_ai_new_tasks.sql' },
  { filename: '021_embeddings.sql', url: '/db/021_embeddings.sql' },
  { filename: '022_grand_oral.sql', url: '/db/022_grand_oral.sql' },
  { filename: '023_ai_task_screens.sql', url: '/db/023_ai_task_screens.sql' },
];

// ── Bootstrap : créer la table de suivi ──

async function ensureMigrationsTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// ── Détection d'une base legacy (tables existantes mais pas de schema_migrations) ──

async function isLegacyDatabase(): Promise<boolean> {
  const tables = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='academic_years'"
  );
  return tables.length > 0;
}

// Migrations qui existaient avant le runner — à stamper sans rejouer sur une base legacy.
// Les migrations ajoutées APRÈS le runner (009+) doivent s'exécuter normalement.
const LEGACY_MIGRATIONS = new Set([
  '001_initial_schema.sql',
  '002_ai_prompts.sql',
  '003_reference_data.sql',
  '004_program_keywords.sql',
  '005_program_descriptions.sql',
  '006_complete_programmes.sql',
  '007_repair_subject_ids.sql',
  '008_clean_programmes.sql',
]);

async function stampLegacyMigrations(): Promise<void> {
  let count = 0;
  for (const m of MIGRATIONS) {
    if (LEGACY_MIGRATIONS.has(m.filename)) {
      await db.execute(
        'INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)',
        [m.filename]
      );
      count++;
    }
  }
  console.log(`[Migrations] Base legacy détectée — ${count} migrations marquées comme appliquées`);
}

// ── Récupérer les migrations déjà appliquées ──

async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await db.select<{ filename: string }[]>(
    'SELECT filename FROM schema_migrations'
  );
  return new Set(rows.map(r => r.filename));
}

// ── Exécuter une migration dans une transaction ──

async function executeMigration(descriptor: MigrationDescriptor, sql: string): Promise<void> {
  const allStatements = splitSqlStatements(sql);

  // Séparer PRAGMA (hors transaction) et le reste (dans transaction)
  const pragmas: string[] = [];
  const transactional: string[] = [];

  for (const stmt of allStatements) {
    if (/^\s*PRAGMA\s/i.test(stmt)) {
      pragmas.push(stmt);
    } else {
      transactional.push(stmt);
    }
  }

  // Exécuter les PRAGMA hors transaction
  for (const pragma of pragmas) {
    await db.execute(pragma);
  }

  // Exécuter le reste dans une transaction
  await db.transaction(async () => {
    for (const stmt of transactional) {
      await db.execute(stmt);
    }

    // Marquer comme appliquée (dans la même transaction)
    await db.execute(
      'INSERT INTO schema_migrations (filename) VALUES (?)',
      [descriptor.filename]
    );
  });
}

// ── Point d'entrée public ──

export async function runMigrations(): Promise<void> {
  // 1. S'assurer que la table de suivi existe
  //    (avant la détection legacy, car on vérifie sa présence indirectement)
  const hasMigrationsTable = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
  );

  if (hasMigrationsTable.length === 0) {
    // Première utilisation du runner
    await ensureMigrationsTable();

    // Vérifier si c'est une base legacy (tables existantes sans schema_migrations)
    if (await isLegacyDatabase()) {
      await stampLegacyMigrations();
      // Ne pas sortir : les migrations post-runner (009+) doivent s'exécuter
    }
  }

  // 2. Réparer le stamp erroné de 009 (bug corrigé : l'ancien code stampait tout, y compris 009)
  //    Si 009 est marquée mais que des doublons existent encore, la retirer pour forcer l'exécution.
  const levelsExists = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='levels'"
  );
  if (levelsExists.length > 0) {
    const dupCheck = await db.select<{ cnt: number }[]>(
      'SELECT COUNT(*) - COUNT(DISTINCT code) as cnt FROM levels'
    );
    if ((dupCheck[0]?.cnt ?? 0) > 0) {
      await db.execute(
        "DELETE FROM schema_migrations WHERE filename = '009_dedup_levels.sql'"
      );
      console.log('[Migrations] Doublons détectés — 009 sera rejouée');
    }
  }

  // 3. Déterminer quelles migrations restent à jouer
  const applied = await getAppliedMigrations();
  const pending = MIGRATIONS.filter(m => !applied.has(m.filename));

  if (pending.length === 0) {
    console.log('[Migrations] Toutes les migrations sont à jour');
    return;
  }

  // 3. Jouer chaque migration pendante en séquence
  for (const migration of pending) {
    console.log(`[Migrations] Application de ${migration.filename}...`);

    const resp = await fetch(migration.url);
    if (!resp.ok) {
      throw new Error(`[Migrations] Fichier introuvable : ${migration.url} (${resp.status})`);
    }

    const sql = await resp.text();

    try {
      await executeMigration(migration, sql);
      console.log(`[Migrations] ✓ ${migration.filename} appliquée`);
    } catch (err) {
      // La transaction a été rollback par db.transaction()
      console.error(`[Migrations] ✗ ${migration.filename} échouée :`, err);
      throw new Error(
        `Migration ${migration.filename} échouée : ${String(err)}`
      );
    }
  }

  console.log(`[Migrations] ${pending.length} migration(s) appliquée(s)`);
}
