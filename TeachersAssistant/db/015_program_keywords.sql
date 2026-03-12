-- ============================================================================
-- Migration 015 — Create program_topic_keywords table
-- (referenced by ProgrammeOfficielPage but was missing from schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS program_topic_keywords (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    program_topic_id    INTEGER NOT NULL REFERENCES program_topics(id) ON DELETE CASCADE,
    keyword             TEXT    NOT NULL,
    sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ptk_topic ON program_topic_keywords(program_topic_id);
