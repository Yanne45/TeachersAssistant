-- ============================================================================
-- Migration 014 — Relax timetable_slots.recurrence CHECK to support
-- trimester (t1/t2/t3) and semester (s1/s2) modes
-- ============================================================================

-- SQLite cannot ALTER CHECK constraints. Recreate the table.

CREATE TABLE timetable_slots_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TEXT    NOT NULL,
    end_time        TEXT    NOT NULL,
    subject_id      INTEGER REFERENCES subjects,
    class_id        INTEGER REFERENCES classes,
    room            TEXT,
    recurrence      TEXT    NOT NULL DEFAULT 'all'
                    CHECK (recurrence IN ('all','q1','q2','t1','t2','t3','s1','s2')),
    color           TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

INSERT INTO timetable_slots_new
  SELECT * FROM timetable_slots;

DROP TABLE timetable_slots;

ALTER TABLE timetable_slots_new RENAME TO timetable_slots;

CREATE INDEX idx_timetable_day ON timetable_slots(academic_year_id, day_of_week);
