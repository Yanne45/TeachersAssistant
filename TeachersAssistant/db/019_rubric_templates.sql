-- ============================================================================
-- Migration 019 — Rubric Templates (banque de grilles réutilisables)
-- ============================================================================

-- Template de grille (nom, description, type de devoir associé optionnel)
CREATE TABLE IF NOT EXISTS rubric_templates (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id   INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    assignment_type_id INTEGER REFERENCES assignment_types(id) ON DELETE SET NULL,
    title              TEXT    NOT NULL,
    description        TEXT,
    subject_id         INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    level_id           INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    max_score          REAL    NOT NULL DEFAULT 20,
    is_shared          INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Critères (lignes de la grille) avec pondération
CREATE TABLE IF NOT EXISTS rubric_template_criteria (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    rubric_template_id INTEGER NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
    skill_id           INTEGER REFERENCES skills(id) ON DELETE SET NULL,
    label              TEXT    NOT NULL,
    weight             REAL    NOT NULL DEFAULT 1.0,
    sort_order         INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Descripteurs de niveaux par critère (4 niveaux)
CREATE TABLE IF NOT EXISTS rubric_template_descriptors (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    rubric_template_criteria_id INTEGER NOT NULL REFERENCES rubric_template_criteria(id) ON DELETE CASCADE,
    level                  INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
    label                  TEXT    NOT NULL DEFAULT '',
    description            TEXT    NOT NULL DEFAULT '',
    UNIQUE(rubric_template_criteria_id, level)
);
