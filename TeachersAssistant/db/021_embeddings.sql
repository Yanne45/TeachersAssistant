-- ============================================================================
-- Migration 021 : Table embeddings pour la recherche sémantique vectorielle
-- Stocke les vecteurs d'embedding en JSON (compatible sans extension sqlite-vec)
-- ============================================================================

CREATE TABLE IF NOT EXISTS embeddings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type  TEXT    NOT NULL,  -- 'sequence', 'session', 'document', 'assignment', 'lesson_log', 'program_topic'
    entity_id    INTEGER NOT NULL,
    text_hash    TEXT    NOT NULL,  -- SHA-256 du texte source (invalidation cache)
    embedding    TEXT    NOT NULL,  -- JSON array de floats
    model        TEXT    NOT NULL,  -- modèle d'embedding utilisé
    dimensions   INTEGER NOT NULL,  -- nombre de dimensions du vecteur
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id);
