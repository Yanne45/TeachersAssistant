-- Migration 017 : Compétences générales, liens capacités, liens types évaluation

CREATE TABLE IF NOT EXISTS general_competencies (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    label            TEXT    NOT NULL,
    description      TEXT,
    color            TEXT    NOT NULL DEFAULT '#6366f1',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lien M:N capacité ↔ compétence générale
CREATE TABLE IF NOT EXISTS skill_competency_map (
    skill_id       INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    competency_id  INTEGER NOT NULL REFERENCES general_competencies(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, competency_id)
);

-- Lien M:N type d'évaluation ↔ capacité
CREATE TABLE IF NOT EXISTS assignment_type_skill_map (
    assignment_type_id INTEGER NOT NULL REFERENCES assignment_types(id) ON DELETE CASCADE,
    skill_id           INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_type_id, skill_id)
);

-- Lien M:N type d'évaluation ↔ compétence générale
CREATE TABLE IF NOT EXISTS assignment_type_competency_map (
    assignment_type_id INTEGER NOT NULL REFERENCES assignment_types(id) ON DELETE CASCADE,
    competency_id      INTEGER NOT NULL REFERENCES general_competencies(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_type_id, competency_id)
);
