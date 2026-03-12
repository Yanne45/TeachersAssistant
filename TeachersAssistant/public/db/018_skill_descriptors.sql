-- Migration 018 : Descripteurs de niveaux de maîtrise des capacités

CREATE TABLE IF NOT EXISTS skill_level_descriptors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id    INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level       INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
    label       TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(skill_id, level)
);
