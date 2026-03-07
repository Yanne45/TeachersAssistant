-- ============================================================================
-- Teacher Assistant — Migration initiale
-- Version : 1.2
-- Base : SQLite (via Tauri SQL plugin)
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. PARAMÈTRES ET CADRE ANNUEL
-- ============================================================================

-- Années scolaires
CREATE TABLE IF NOT EXISTS academic_years (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT    NOT NULL,                          -- ex: "2025-2026"
    start_date      TEXT    NOT NULL,                          -- ISO 8601 (YYYY-MM-DD)
    end_date        TEXT    NOT NULL,
    timezone        TEXT    NOT NULL DEFAULT 'Europe/Paris',
    is_active       INTEGER NOT NULL DEFAULT 0,               -- 0/1 boolean
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Périodes de calendrier (vacances, fériés, examens)
CREATE TABLE IF NOT EXISTS calendar_periods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    label           TEXT    NOT NULL,                          -- ex: "Vacances de Toussaint"
    period_type     TEXT    NOT NULL CHECK (period_type IN ('vacation', 'holiday', 'exam', 'closure', 'other')),
    start_date      TEXT    NOT NULL,
    end_date        TEXT    NOT NULL,
    impacts_teaching INTEGER NOT NULL DEFAULT 1,              -- 0/1: impacte les heures enseignées
    color           TEXT,                                      -- hex override optionnel
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Semaines exceptionnelles (semaine A/B, semaine banalisée, etc.)
CREATE TABLE IF NOT EXISTS weekly_calendar_overrides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    week_start_date TEXT    NOT NULL,                          -- lundi de la semaine
    override_type   TEXT    NOT NULL CHECK (override_type IN ('cancelled', 'modified', 'special')),
    label           TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Structure de la journée scolaire
CREATE TABLE IF NOT EXISTS school_day_settings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=lundi, 7=dimanche
    is_school_day   INTEGER NOT NULL DEFAULT 1,
    start_time      TEXT    NOT NULL DEFAULT '08:00',          -- HH:MM
    end_time        TEXT    NOT NULL DEFAULT '17:00',
    slot_duration   INTEGER NOT NULL DEFAULT 60,               -- durée d'un créneau en minutes
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Pauses (récréation, déjeuner)
CREATE TABLE IF NOT EXISTS day_breaks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    school_day_setting_id INTEGER NOT NULL REFERENCES school_day_settings(id) ON DELETE CASCADE,
    label           TEXT    NOT NULL,                          -- ex: "Déjeuner"
    start_time      TEXT    NOT NULL,                          -- HH:MM
    end_time        TEXT    NOT NULL,
    break_type      TEXT    NOT NULL CHECK (break_type IN ('lunch', 'recess', 'other'))
);

-- Matières enseignées
CREATE TABLE IF NOT EXISTS subjects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT    NOT NULL UNIQUE,                   -- ex: "HGGSP", "HG", "GEO"
    label           TEXT    NOT NULL,                          -- ex: "Histoire-Géographie-Géopolitique-Sciences politiques"
    short_label     TEXT    NOT NULL,                          -- ex: "HGGSP"
    color           TEXT    NOT NULL,                          -- hex, ex: "#7B3FA0"
    icon            TEXT,                                      -- emoji ou nom d'icône
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Niveaux (Première, Terminale)
CREATE TABLE IF NOT EXISTS levels (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT    NOT NULL UNIQUE,                   -- ex: "TLE", "1ERE"
    label           TEXT    NOT NULL,                          -- ex: "Terminale"
    short_label     TEXT    NOT NULL,                          -- ex: "Tle"
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    name            TEXT    NOT NULL,                          -- ex: "Terminale 2"
    short_name      TEXT    NOT NULL,                          -- ex: "Tle 2"
    student_count   INTEGER,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Volumes horaires (matière × niveau × heures/semaine)
CREATE TABLE IF NOT EXISTS subject_hour_allocations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    hours_per_week  REAL    NOT NULL,                          -- ex: 6.0
    total_annual_hours REAL,                                   -- calculé ou saisi
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(academic_year_id, subject_id, level_id)
);

-- Structure attendue du programme
CREATE TABLE IF NOT EXISTS subject_program_structures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    expected_themes INTEGER,                                   -- nb thèmes attendus
    expected_hours  REAL,                                      -- volume horaire total attendu
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(subject_id, level_id)
);

-- Matières enseignées pour une année (périmètre)
CREATE TABLE IF NOT EXISTS teaching_scopes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(academic_year_id, subject_id, class_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('alert', 'reminder', 'system', 'info')),
    priority        TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    title           TEXT    NOT NULL,
    message         TEXT    NOT NULL,
    link            TEXT,                                      -- route de navigation, ex: "/evaluation/devoirs/8"
    is_read         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    read_at         TEXT
);

-- ============================================================================
-- 2. PROGRAMME ET CONTENUS
-- ============================================================================

-- Arbre hiérarchique : thèmes → chapitres → points
CREATE TABLE IF NOT EXISTS program_topics (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    parent_id       INTEGER REFERENCES program_topics(id) ON DELETE CASCADE,
    topic_type      TEXT    NOT NULL CHECK (topic_type IN ('theme', 'chapter', 'point', 'sub_point')),
    code            TEXT,                                      -- ex: "T1", "T1-C1", "T1-C1-P1"
    title           TEXT    NOT NULL,
    description     TEXT,
    expected_hours  REAL,                                      -- heures recommandées
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_program_topics_parent ON program_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_program_topics_subject_level ON program_topics(subject_id, level_id);

-- Capacités / compétences
CREATE TABLE IF NOT EXISTS skills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    skill_type      TEXT    NOT NULL CHECK (skill_type IN ('exercise_specific', 'general')),
    category        TEXT,                                      -- ex: "Analyse", "Rédaction", "Argumentation"
    label           TEXT    NOT NULL,                          -- ex: "Problématiser"
    description     TEXT,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    level_id        INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    max_level       INTEGER NOT NULL DEFAULT 4,                -- échelle 1-4 par défaut
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Catalogue des tâches IA (remplace content_types)
-- Chaque tâche = un type de génération avec ses prompts (3 couches) et sa configuration
CREATE TABLE IF NOT EXISTS ai_tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT    NOT NULL UNIQUE,                   -- ex: "generate_course", "analyze_submission"
    label           TEXT    NOT NULL,                          -- ex: "Générer un cours"
    description     TEXT,
    category        TEXT    NOT NULL CHECK (category IN (
                        'contenus', 'evaluations', 'planification', 'correction', 'systeme'
                    )),
    icon            TEXT,
    -- Couche 1 : prompt système (non éditable par l'enseignant)
    system_prompt   TEXT    NOT NULL DEFAULT '',
    -- Couche 2 : prompt template métier (éditable, contient des {{variables}})
    default_template TEXT   NOT NULL DEFAULT '',
    output_format   TEXT    NOT NULL DEFAULT 'text' CHECK (output_format IN ('text', 'json', 'markdown')),
    default_params  TEXT    DEFAULT '{}',                      -- JSON : paramètres par défaut système
    is_active       INTEGER NOT NULL DEFAULT 1,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_code ON ai_tasks(code);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_category ON ai_tasks(category);

-- Variables contextuelles disponibles par tâche IA
-- Définit quelles variables {{xxx}} sont insérables dans le prompt template
CREATE TABLE IF NOT EXISTS ai_task_variables (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id              INTEGER NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
    variable_code        TEXT    NOT NULL,                     -- ex: "matiere", "chapitre", "capacites"
    variable_label       TEXT    NOT NULL,                     -- affiché dans le dropdown d'insertion
    variable_description TEXT,
    data_source          TEXT,                                 -- ex: "subjects.name", "program_topics.title"
    is_required          INTEGER NOT NULL DEFAULT 0,           -- 1 = obligatoire dans le template
    sort_order           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ai_task_variables_task ON ai_task_variables(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_variables_unique ON ai_task_variables(task_id, variable_code);

-- Paramètres de génération disponibles par tâche IA
-- Décrit les contrôles (selects, toggles) affichés dans l'interface de génération
CREATE TABLE IF NOT EXISTS ai_task_params (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id             INTEGER NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
    param_code          TEXT    NOT NULL,                      -- ex: "difficulty_level", "doc_scope"
    param_label         TEXT    NOT NULL,
    param_type          TEXT    NOT NULL CHECK (param_type IN ('select', 'toggle', 'number')),
    param_options       TEXT,                                  -- JSON array, ex: '["facile","standard","approfondi"]'
    default_value       TEXT,
    injection_template  TEXT,                                  -- ex: "Niveau de difficulté : {value}."
    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_common           INTEGER NOT NULL DEFAULT 0             -- 1 = paramètre commun à toutes les tâches
);

CREATE INDEX IF NOT EXISTS idx_ai_task_params_task ON ai_task_params(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_params_unique ON ai_task_params(task_id, param_code);

-- Personnalisations enseignant par tâche IA
-- Couche 2 modifiée + surcharges des paramètres par défaut
CREATE TABLE IF NOT EXISTS ai_task_user_templates (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id                 INTEGER NOT NULL UNIQUE REFERENCES ai_tasks(id) ON DELETE CASCADE,
    template_content        TEXT    NOT NULL,                  -- prompt template couche 2 personnalisé
    default_params_override TEXT    DEFAULT '{}',              -- JSON : surcharges paramètres
    is_active               INTEGER NOT NULL DEFAULT 1,       -- si 0, utilise ai_tasks.default_template
    created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_task_user_templates_task ON ai_task_user_templates(task_id);

-- Templates de séquences réutilisables
CREATE TABLE IF NOT EXISTS sequence_templates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    level_id        INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    description     TEXT,
    total_hours     REAL,
    template_data   TEXT    NOT NULL,                          -- JSON : structure séances, objectifs, etc.
    source_sequence_id INTEGER REFERENCES sequences(id) ON DELETE SET NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 3. SÉQUENCES ET SÉANCES
-- ============================================================================

-- Séquences pédagogiques
CREATE TABLE IF NOT EXISTS sequences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    level_id        INTEGER NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    title           TEXT    NOT NULL,
    description     TEXT,
    total_hours     REAL,                                      -- durée totale prévue
    start_date      TEXT,                                      -- date début planifiée
    end_date        TEXT,                                      -- date fin planifiée
    status          TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'in_progress', 'done')),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    template_id     INTEGER REFERENCES sequence_templates(id) ON DELETE SET NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sequences_year ON sequences(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sequences_subject ON sequences(subject_id, level_id);

-- Liaison N:N séquence ↔ classes
CREATE TABLE IF NOT EXISTS sequence_classes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id     INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sequence_id, class_id)
);

-- Liaison séquence ↔ programme (multi-chapitres)
CREATE TABLE IF NOT EXISTS sequence_program_topics (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id     INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    program_topic_id INTEGER NOT NULL REFERENCES program_topics(id) ON DELETE CASCADE,
    is_primary      INTEGER NOT NULL DEFAULT 0,                -- 0/1: thème principal vs secondaire
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sequence_id, program_topic_id)
);

-- Capacités travaillées par séquence
CREATE TABLE IF NOT EXISTS sequence_skills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id     INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sequence_id, skill_id)
);

-- Séances
CREATE TABLE IF NOT EXISTS sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id     INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT,
    objectives      TEXT,                                      -- objectifs de la séance
    activities      TEXT,                                      -- description des activités
    lesson_plan     TEXT,                                      -- déroulé détaillé
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    session_number  INTEGER NOT NULL DEFAULT 1,                -- ordre dans la séquence
    status          TEXT    NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'done', 'cancelled')),
    session_date    TEXT,                                      -- date effective
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'template', 'duplicate')),
    timetable_slot_id INTEGER REFERENCES timetable_slots(id) ON DELETE SET NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_sequence ON sessions(sequence_id);

-- Capacités travaillées par séance
CREATE TABLE IF NOT EXISTS session_skills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, skill_id)
);

-- Documents utilisés par séance
CREATE TABLE IF NOT EXISTS session_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    usage_note      TEXT,                                      -- comment le doc est utilisé
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, document_id)
);

-- Cahier de textes
CREATE TABLE IF NOT EXISTS lesson_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    log_date        TEXT    NOT NULL,                          -- date de la séance
    title           TEXT    NOT NULL,
    content         TEXT,                                      -- contenu du cours
    activities      TEXT,                                      -- activités réalisées
    homework        TEXT,                                      -- devoirs donnés
    homework_due_date TEXT,                                    -- date de rendu des devoirs
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'session')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lesson_log_class_date ON lesson_log(class_id, log_date);

-- ============================================================================
-- 4. EMPLOI DU TEMPS
-- ============================================================================

-- Créneaux structurels
CREATE TABLE IF NOT EXISTS timetable_slots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TEXT    NOT NULL,                          -- HH:MM
    end_time        TEXT    NOT NULL,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    class_id        INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    room            TEXT,
    recurrence      TEXT    NOT NULL DEFAULT 'all' CHECK (recurrence IN ('all', 'q1', 'q2')),
    color           TEXT,                                      -- override couleur
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(academic_year_id, day_of_week);

-- Événements importés (Google Calendar, ICS)
CREATE TABLE IF NOT EXISTS calendar_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    external_id     TEXT,                                      -- ID Google Calendar ou UID ICS
    source          TEXT    NOT NULL CHECK (source IN ('google', 'ics', 'manual')),
    title           TEXT    NOT NULL,
    description     TEXT,
    start_datetime  TEXT    NOT NULL,
    end_datetime    TEXT    NOT NULL,
    location        TEXT,
    is_recurring    INTEGER NOT NULL DEFAULT 0,
    recurrence_rule TEXT,
    raw_data        TEXT,                                      -- JSON brut de l'événement source
    last_synced_at  TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Mapping événement → classe/matière/salle
CREATE TABLE IF NOT EXISTS calendar_event_mapping (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    calendar_event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    class_id        INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    room            TEXT,
    is_confirmed    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 5. BIBLIOTHÈQUE DOCUMENTAIRE
-- ============================================================================

-- Types de documents
CREATE TABLE IF NOT EXISTS document_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT    NOT NULL UNIQUE,                   -- ex: "cours", "diaporama", "fiche", "sujet", "corrige"
    label           TEXT    NOT NULL,
    icon            TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    file_path       TEXT    NOT NULL,                          -- chemin relatif dans le dossier app
    file_name       TEXT    NOT NULL,                          -- nom original du fichier
    file_type       TEXT    NOT NULL,                          -- extension: pdf, docx, pptx, png, jpg
    file_size       INTEGER,                                   -- taille en octets
    file_hash       TEXT,                                      -- SHA-256 pour déduplication
    mime_type       TEXT,
    document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    level_id        INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    thumbnail_path  TEXT,                                      -- chemin miniature générée
    extracted_text  TEXT,                                      -- texte extrait (OCR ou parsing)
    source          TEXT    NOT NULL DEFAULT 'import' CHECK (source IN ('import', 'ai', 'scan', 'manual')),
    generated_from_ai_generation_id INTEGER REFERENCES ai_generations(id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject_id, level_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash);

-- Dossiers surveillés
CREATE TABLE IF NOT EXISTS document_sources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path     TEXT    NOT NULL,
    label           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_scanned_at TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Tags libres
CREATE TABLE IF NOT EXISTS document_tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT    NOT NULL UNIQUE,
    color           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Liaison document ↔ tags
CREATE TABLE IF NOT EXISTS document_tag_map (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(document_id, tag_id)
);

-- File d'import (ingestion)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id     INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    source_path     TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
    error_message   TEXT,
    started_at      TEXT,
    completed_at    TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Suggestions IA de classification
CREATE TABLE IF NOT EXISTS ingestion_suggestions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ingestion_job_id INTEGER NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    field           TEXT    NOT NULL,                          -- ex: "subject", "level", "document_type", "tags"
    suggested_value TEXT    NOT NULL,
    confidence      REAL,                                      -- 0.0 - 1.0
    is_accepted     INTEGER,                                   -- NULL=pending, 0=rejected, 1=accepted
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 6. IA ET GÉNÉRATION
-- ============================================================================

-- Configuration globale IA
CREATE TABLE IF NOT EXISTS ai_settings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Connexion
    model           TEXT    NOT NULL DEFAULT 'gpt-4o',
    api_endpoint    TEXT    DEFAULT '',                        -- URL endpoint (compatibilité multi-fournisseurs)
    -- Anciens champs conservés
    style           TEXT    NOT NULL DEFAULT 'pedagogique',
    detail_level    TEXT    NOT NULL DEFAULT 'standard' CHECK (detail_level IN ('concise', 'standard', 'detailed')),
    language        TEXT    NOT NULL DEFAULT 'fr',
    target_audience TEXT,
    citation_style  TEXT,
    custom_instructions TEXT,
    -- Défauts globaux (surchargeables par tâche puis ponctuellement)
    default_doc_scope TEXT  DEFAULT 'documents_and_knowledge'
        CHECK (default_doc_scope IN ('documents_only', 'documents_and_knowledge', 'web_research')),
    default_tone    TEXT    DEFAULT 'pédagogique',
    default_output_length TEXT DEFAULT 'moyen',
    default_difficulty TEXT DEFAULT 'standard',
    default_language TEXT   DEFAULT 'français',
    default_grading_strictness TEXT DEFAULT 'équilibré',
    -- Paramètres techniques du modèle
    max_tokens_per_request INTEGER DEFAULT 4096,
    temperature     REAL    DEFAULT 0.7,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Historique des générations IA (traçabilité complète)
CREATE TABLE IF NOT EXISTS ai_generations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Lien vers la tâche IA (nouveau système)
    task_id         INTEGER REFERENCES ai_tasks(id) ON DELETE SET NULL,
    user_template_id INTEGER REFERENCES ai_task_user_templates(id) ON DELETE SET NULL,
    -- Anciens liens contextuels conservés pour compatibilité
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    level_id        INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    sequence_id     INTEGER REFERENCES sequences(id) ON DELETE SET NULL,
    session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    -- Contexte polymorphique (nouveau)
    context_entity_type TEXT DEFAULT '',                       -- ex: "session", "sequence", "assignment", "student"
    context_entity_id INTEGER,
    -- Prompts et instructions (3 couches assemblées)
    full_prompt_snapshot TEXT DEFAULT '',                      -- prompt final complet envoyé (couches 1+2+params+3)
    prompt_used     TEXT    NOT NULL DEFAULT '',               -- conservé pour compatibilité (= full_prompt_snapshot)
    system_prompt   TEXT,                                      -- couche 1 seule (debug)
    user_instructions TEXT  DEFAULT '',                        -- couche 3 : consignes libres enseignant
    params_snapshot TEXT    DEFAULT '{}',                      -- JSON : tous les paramètres effectifs
    input_context   TEXT,                                      -- JSON : métadonnées d'entrée
    -- Résultat
    raw_response    TEXT    DEFAULT '',                        -- réponse brute du modèle
    processed_result TEXT   DEFAULT '',                        -- résultat traité / formaté
    output_content  TEXT    NOT NULL DEFAULT '',               -- conservé pour compatibilité (= processed_result)
    output_format   TEXT    NOT NULL DEFAULT 'text' CHECK (output_format IN ('text', 'markdown', 'html', 'json')),
    -- Statut et validation
    status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending', 'processing', 'completed', 'accepted', 'modified', 'rejected', 'failed'
                    )),
    error_message   TEXT,
    is_saved        INTEGER NOT NULL DEFAULT 0,               -- sauvé dans bibliothèque ?
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),   -- évaluation enseignant
    -- Métriques
    model_used      TEXT    NOT NULL DEFAULT '',
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    duration_ms     INTEGER DEFAULT 0,
    -- Horodatage
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_task ON ai_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_context ON ai_generations(context_entity_type, context_entity_id);

-- Documents source pour une génération
CREATE TABLE IF NOT EXISTS ai_generation_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_generation_id INTEGER NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL DEFAULT 'context' CHECK (role IN ('context', 'reference', 'template')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ai_generation_id, document_id)
);

-- File d'attente des requêtes IA hors-ligne
CREATE TABLE IF NOT EXISTS ai_request_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Nouveau système de tâches
    task_code       TEXT    DEFAULT '',                        -- code ai_tasks (ex: "generate_course")
    full_prompt     TEXT    DEFAULT '',                        -- prompt complet prêt à envoyer
    params          TEXT    DEFAULT '{}',                      -- JSON : paramètres de génération
    context_entity_type TEXT DEFAULT '',
    context_entity_id INTEGER,
    -- Anciens champs conservés pour compatibilité
    request_type    TEXT    NOT NULL DEFAULT '',               -- ex: "generate", "analyze", "correct"
    payload         TEXT    NOT NULL DEFAULT '',               -- JSON : paramètres de la requête
    -- Gestion de la file
    priority        INTEGER NOT NULL DEFAULT 5,               -- 1=urgent, 10=basse priorité
    status          TEXT    NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'error')),
    result          TEXT,                                      -- JSON : résultat une fois traité
    result_generation_id INTEGER REFERENCES ai_generations(id) ON DELETE SET NULL,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_request_queue_status ON ai_request_queue(status, priority);

-- ============================================================================
-- 7. CORRECTIONS ET ÉVALUATIONS
-- ============================================================================

-- Types d'exercice
CREATE TABLE IF NOT EXISTS assignment_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT    NOT NULL UNIQUE,                   -- ex: "dissertation", "commentaire", "croquis"
    label           TEXT    NOT NULL,
    description     TEXT,
    default_max_score REAL  NOT NULL DEFAULT 20,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Sets de compétences par défaut par type d'exercice
CREATE TABLE IF NOT EXISTS exercise_type_skill_map (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_type_id INTEGER NOT NULL REFERENCES assignment_types(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    weight          REAL    NOT NULL DEFAULT 1.0,              -- poids relatif
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(assignment_type_id, skill_id)
);

-- Devoirs
CREATE TABLE IF NOT EXISTS assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    sequence_id     INTEGER REFERENCES sequences(id) ON DELETE SET NULL,
    assignment_type_id INTEGER REFERENCES assignment_types(id) ON DELETE SET NULL,
    title           TEXT    NOT NULL,
    description     TEXT,
    instructions    TEXT,                                      -- consignes
    max_score       REAL    NOT NULL DEFAULT 20,
    coefficient     REAL    NOT NULL DEFAULT 1.0,
    assignment_date TEXT,                                      -- date du devoir
    due_date        TEXT,                                      -- date de rendu
    status          TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'assigned', 'collecting', 'correcting', 'corrected', 'returned')),
    is_graded       INTEGER NOT NULL DEFAULT 1,                -- noté ou non
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_sequence ON assignments(sequence_id);

-- Compétences évaluées par devoir
CREATE TABLE IF NOT EXISTS assignment_skill_map (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    weight          REAL    NOT NULL DEFAULT 1.0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(assignment_id, skill_id)
);

-- Copies élèves
CREATE TABLE IF NOT EXISTS submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_path       TEXT,                                      -- chemin vers la copie scannée/uploadée
    score           REAL,                                      -- note obtenue
    status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'to_confirm', 'final')),
    submitted_at    TEXT,
    graded_at       TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);

-- Corrections
CREATE TABLE IF NOT EXISTS corrections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id   INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    content         TEXT,                                      -- texte de la correction
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'mixed')),
    ai_generation_id INTEGER REFERENCES ai_generations(id) ON DELETE SET NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Niveau par compétence par copie (1-4)
CREATE TABLE IF NOT EXISTS submission_skill_evaluations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id   INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'mixed')),
    comment         TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(submission_id, skill_id)
);

-- Critères / dimensions de feedback
CREATE TABLE IF NOT EXISTS feedback_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT    NOT NULL,                          -- ex: "Qualité de l'introduction"
    category        TEXT    NOT NULL CHECK (category IN ('strength', 'weakness', 'suggestion')),
    is_default      INTEGER NOT NULL DEFAULT 0,                -- item réutilisable
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Réussites / lacunes qualitatives par copie
CREATE TABLE IF NOT EXISTS submission_feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id   INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    feedback_item_id INTEGER REFERENCES feedback_items(id) ON DELETE SET NULL,
    feedback_type   TEXT    NOT NULL CHECK (feedback_type IN ('strength', 'weakness', 'suggestion')),
    content         TEXT    NOT NULL,                          -- texte libre ou issu du feedback_item
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 8. SUIVI ÉLÈVES
-- ============================================================================

-- Élèves
CREATE TABLE IF NOT EXISTS students (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    last_name       TEXT    NOT NULL,
    first_name      TEXT    NOT NULL,
    birth_year      INTEGER,                                   -- année de naissance
    gender          TEXT    CHECK (gender IN ('M', 'F', 'X')),
    email           TEXT,
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Liaison N:N élève ↔ classe (gère changements d'année)
CREATE TABLE IF NOT EXISTS student_class_enrollments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrollment_date TEXT    NOT NULL DEFAULT (date('now')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON student_class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_class_enrollments(student_id);

-- Périodes de bulletin (T1, T2, T3)
CREATE TABLE IF NOT EXISTS report_periods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    code            TEXT    NOT NULL,                          -- "T1", "T2", "T3"
    label           TEXT    NOT NULL,                          -- "Trimestre 1"
    start_date      TEXT    NOT NULL,
    end_date        TEXT    NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(academic_year_id, code)
);

-- Profil par période (comportement, travail, etc.)
CREATE TABLE IF NOT EXISTS student_period_profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_period_id INTEGER NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
    behavior        INTEGER CHECK (behavior BETWEEN 1 AND 5),        -- comportement
    work_ethic      INTEGER CHECK (work_ethic BETWEEN 1 AND 5),      -- travail
    participation   INTEGER CHECK (participation BETWEEN 1 AND 5),
    autonomy        INTEGER CHECK (autonomy BETWEEN 1 AND 5),
    methodology     INTEGER CHECK (methodology BETWEEN 1 AND 5),     -- méthode
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, report_period_id)
);

-- Observations longitudinales par compétence
CREATE TABLE IF NOT EXISTS student_skill_observations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    report_period_id INTEGER NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
    level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    observation     TEXT,
    source          TEXT    NOT NULL DEFAULT 'computed' CHECK (source IN ('computed', 'manual', 'ai')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, skill_id, report_period_id)
);

-- Appréciations bulletin
CREATE TABLE IF NOT EXISTS bulletin_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_period_id INTEGER NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
    entry_type      TEXT    NOT NULL CHECK (entry_type IN ('discipline', 'class_teacher', 'council')),
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    content         TEXT    NOT NULL,                          -- appréciation courante
    status          TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'mixed')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bulletin_student_period ON bulletin_entries(student_id, report_period_id);

-- Historique des versions d'appréciations
CREATE TABLE IF NOT EXISTS bulletin_entry_versions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    bulletin_entry_id INTEGER NOT NULL REFERENCES bulletin_entries(id) ON DELETE CASCADE,
    content         TEXT    NOT NULL,
    version_number  INTEGER NOT NULL,
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Rapports d'orientation
CREATE TABLE IF NOT EXISTS orientation_reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_period_id INTEGER REFERENCES report_periods(id) ON DELETE SET NULL,
    title           TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    strengths       TEXT,                                      -- JSON array
    areas_for_improvement TEXT,                                -- JSON array
    recommendations TEXT,                                      -- JSON array
    source          TEXT    NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'mixed')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Entretiens d'orientation
CREATE TABLE IF NOT EXISTS orientation_interviews (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interview_date  TEXT    NOT NULL,
    attendees       TEXT,                                      -- ex: "Élève, Parents, PP"
    summary         TEXT    NOT NULL,
    decisions       TEXT,                                      -- décisions prises
    next_steps      TEXT,
    parcoursup_wishes TEXT,                                    -- JSON: vœux Parcoursup
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Documents attachés à un élève
CREATE TABLE IF NOT EXISTS student_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    report_period_id INTEGER REFERENCES report_periods(id) ON DELETE SET NULL,
    label           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, document_id)
);

-- ============================================================================
-- 9. EXPORT ET SYSTÈME
-- ============================================================================

-- Identité PDF (en-tête, pied de page)
CREATE TABLE IF NOT EXISTS export_settings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_name    TEXT,
    teacher_title   TEXT,                                      -- ex: "Professeur d'Histoire-Géographie"
    school_name     TEXT,
    school_address  TEXT,
    school_logo_path TEXT,
    footer_text     TEXT,
    header_color    TEXT,                                      -- hex
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Journal des sauvegardes
CREATE TABLE IF NOT EXISTS backup_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type     TEXT    NOT NULL CHECK (backup_type IN ('auto', 'manual', 'export')),
    file_path       TEXT    NOT NULL,
    file_size       INTEGER,
    scope           TEXT    NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'year', 'sequences', 'library')),
    status          TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'error')),
    error_message   TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Préférences interface
CREATE TABLE IF NOT EXISTS user_preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    preference_key  TEXT    NOT NULL UNIQUE,                   -- ex: "theme", "ui_density", "default_view"
    preference_value TEXT   NOT NULL,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 10. DONNÉES INITIALES (seed)
-- ============================================================================

-- Insérer la config IA par défaut
INSERT INTO ai_settings (model, style, detail_level, language, default_doc_scope, default_tone, default_output_length, default_difficulty, default_language, default_grading_strictness)
VALUES ('gpt-4o', 'pedagogique', 'standard', 'fr', 'documents_and_knowledge', 'pédagogique', 'moyen', 'standard', 'français', 'équilibré');

-- Types de documents par défaut
INSERT INTO document_types (code, label, icon, sort_order) VALUES
    ('cours',      'Cours',       '📄', 1),
    ('diaporama',  'Diaporama',   '📊', 2),
    ('fiche',      'Fiche',       '📋', 3),
    ('sujet',      'Sujet',       '📝', 4),
    ('corrige',    'Corrigé',     '✅', 5),
    ('document',   'Document',    '📁', 6),
    ('image',      'Image',       '🖼', 7),
    ('autre',      'Autre',       '📎', 8);

-- Types d'exercice par défaut
INSERT INTO assignment_types (code, label, default_max_score, sort_order) VALUES
    ('dissertation',     'Dissertation',                20, 1),
    ('commentaire',      'Commentaire de document(s)',  20, 2),
    ('composition',      'Composition',                 20, 3),
    ('croquis',          'Croquis / Schéma',            20, 4),
    ('etude_doc',        'Étude de document',           20, 5),
    ('oral',             'Oral / Exposé',               20, 6),
    ('qcm',              'QCM',                         20, 7),
    ('travail_maison',   'Travail maison',              20, 8),
    ('autre',            'Autre',                       20, 9);

-- ============================================================================
-- Catalogue des 17 tâches IA
-- system_prompt et default_template laissés vides : rédigés lors de l'implémentation
-- ============================================================================

INSERT INTO ai_tasks (code, label, description, category, icon, output_format, sort_order) VALUES
    ('generate_course',          'Générer un cours',                  'Génère un cours complet (trace écrite) à partir du programme et des documents',   'contenus',       '📝', 'markdown',  1),
    ('generate_revision_sheet',  'Générer une fiche de révision',     'Génère une fiche synthétique pour les élèves',                                    'contenus',       '📝', 'markdown',  2),
    ('generate_activity',        'Générer une activité',              'Génère une activité pédagogique (étude de doc, travail de groupe, etc.)',          'contenus',       '📝', 'markdown',  3),
    ('generate_written_trace',   'Générer une trace écrite',          'Génère la trace écrite élève d''une séance',                                      'contenus',       '📝', 'markdown',  4),
    ('generate_slideshow',       'Générer un plan de diaporama',      'Génère la structure et le contenu d''un diaporama de cours',                      'contenus',       '📝', 'markdown',  5),
    ('generate_exam_subject',    'Générer un sujet d''évaluation',    'Génère un sujet complet avec consignes et documents',                             'evaluations',    '📋', 'markdown',  6),
    ('generate_exam_answer',     'Générer un corrigé',                'Génère un corrigé type détaillé avec barème',                                     'evaluations',    '📋', 'markdown',  7),
    ('generate_session_plan',    'Proposer un découpage en séances',  'Propose un plan de séances pour une séquence donnée',                             'planification',  '📅', 'json',      8),
    ('generate_session_outline', 'Générer le déroulé d''une séance',  'Génère le déroulé détaillé d''une séance (phases, durées, activités)',             'planification',  '📅', 'markdown',  9),
    ('generate_lesson_log',      'Synthétiser pour le cahier de textes', 'Génère l''entrée du cahier de textes à partir de la séance réalisée',          'planification',  '📅', 'text',     10),
    ('classify_document',        'Classifier un document',            'Analyse un document importé pour proposer matière, niveau, type et tags',         'systeme',        '⚙️', 'json',     11),
    ('analyze_submission',       'Analyser une copie',                'Analyse une copie d''élève : compétences, forces, lacunes, note suggérée',        'correction',     '✏️', 'json',     12),
    ('generate_class_report',    'Commentaire synthétique classe',    'Génère un bilan de classe après correction d''un devoir',                         'correction',     '✏️', 'text',     13),
    ('generate_appreciation',    'Appréciation discipline',           'Génère l''appréciation bulletin pour un élève dans une discipline',               'correction',     '✏️', 'text',     14),
    ('generate_pp_appreciation', 'Appréciation professeur principal', 'Génère l''appréciation PP pour un élève (synthèse toutes disciplines)',           'correction',     '✏️', 'text',     15),
    ('generate_orientation',     'Synthèse orientation',              'Génère une synthèse orientation : forces, axes de progrès, recommandations',      'correction',     '✏️', 'text',     16),
    ('parse_official_program',   'Parser le programme officiel (BO)', 'Extrait la structure d''un programme depuis un PDF du Bulletin Officiel',         'systeme',        '⚙️', 'json',     17);

-- ============================================================================
-- Paramètres communs (injectés pour toutes les tâches via CROSS JOIN)
-- ============================================================================

CREATE TEMP TABLE _common_params (
    param_code         TEXT,
    param_label        TEXT,
    param_type         TEXT,
    param_options      TEXT,
    default_value      TEXT,
    injection_template TEXT,
    sort_order         INTEGER
);

INSERT INTO _common_params VALUES
    ('difficulty_level',  'Niveau de difficulté',   'select', '["facile","standard","approfondi","expert"]',                'standard',                  'Adapte le contenu pour un niveau de difficulté : {value}.',  1),
    ('differentiation',   'Différenciation',        'select', '["standard","simplifié","renforcé"]',                        'standard',                  'Applique une différenciation de type : {value}.',            2),
    ('doc_scope',         'Périmètre documentaire', 'select', '["documents_only","documents_and_knowledge","web_research"]','documents_and_knowledge',   NULL,                                                         3),
    ('output_length',     'Longueur attendue',      'select', '["court","moyen","long","détaillé"]',                        'moyen',                     'Longueur de sortie attendue : {value}.',                     4),
    ('output_language',   'Langue de sortie',       'select', '["français","anglais"]',                                     'français',                  NULL,                                                         5),
    ('tone',              'Ton / registre',         'select', '["académique","pédagogique","accessible","formel"]',          'pédagogique',               'Adopte un ton {value}.',                                     6);

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, cp.param_code, cp.param_label, cp.param_type, cp.param_options, cp.default_value, cp.injection_template, cp.sort_order, 1
FROM ai_tasks t CROSS JOIN _common_params cp;

DROP TABLE _common_params;

-- ============================================================================
-- Paramètres spécifiques par catégorie
-- ============================================================================

-- Contenus pédagogiques
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'content_format', 'Format de sortie', 'select', '["texte_continu","plan_structure","fiches","tableau"]', 'texte_continu', 'Format de sortie demandé : {value}.', 10, 0
FROM ai_tasks t WHERE t.category = 'contenus';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'include_sources', 'Inclure sources/références', 'toggle', '["oui","non"]', 'non', NULL, 11, 0
FROM ai_tasks t WHERE t.category = 'contenus';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'include_student_instructions', 'Inclure consignes élève', 'toggle', '["oui","non"]', 'non', NULL, 12, 0
FROM ai_tasks t WHERE t.category = 'contenus';

-- Évaluations
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'exam_duration', 'Durée épreuve', 'select', '["1h","2h","3h","4h"]', '2h', 'Durée de l''épreuve : {value}.', 10, 0
FROM ai_tasks t WHERE t.category = 'evaluations';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'include_marking_scheme', 'Inclure barème détaillé', 'toggle', '["oui","non"]', 'oui', NULL, 11, 0
FROM ai_tasks t WHERE t.category = 'evaluations';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'num_parts', 'Nombre de parties/questions', 'number', NULL, '3', 'Nombre de parties ou questions : {value}.', 12, 0
FROM ai_tasks t WHERE t.category = 'evaluations';

-- Correction & suivi
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'grading_strictness', 'Sévérité de l''évaluation', 'select', '["bienveillant","équilibré","exigeant"]', 'équilibré', 'Adopte un niveau de sévérité : {value}.', 10, 0
FROM ai_tasks t WHERE t.category = 'correction';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'include_progression_tips', 'Inclure conseils de progression', 'toggle', '["oui","non"]', 'oui', NULL, 11, 0
FROM ai_tasks t WHERE t.category = 'correction';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'appreciation_length', 'Longueur appréciation', 'select', '["courte","standard","détaillée"]', 'standard', 'Longueur d''appréciation attendue : {value}.', 12, 0
FROM ai_tasks t WHERE t.category = 'correction';

-- ============================================================================
-- Variables contextuelles par tâche
-- ============================================================================

-- generate_course
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', 'Nom de la matière', 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'niveau', 'Niveau', 'Niveau de classe', 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'chapitre', 'Chapitre', 'Chapitre du programme', 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'points_programme', 'Points du programme', 'Points du programme liés', 'program_topics (type=point)', 0, 4 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'capacites', 'Capacités visées', 'Capacités et compétences visées', 'skills via sequence_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', 'Texte extrait des documents associés', 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'seance_duree', 'Durée de la séance', 'Durée prévue', 'sessions.duration_minutes', 0, 7 FROM ai_tasks WHERE code = 'generate_course' UNION ALL
SELECT id, 'sequence_objectifs', 'Objectifs de la séquence', 'Objectifs pédagogiques', 'sequences.description', 0, 8 FROM ai_tasks WHERE code = 'generate_course';

-- generate_revision_sheet
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_revision_sheet' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_revision_sheet' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_revision_sheet' UNION ALL
SELECT id, 'points_programme', 'Points du programme', NULL, 'program_topics (type=point)', 0, 4 FROM ai_tasks WHERE code = 'generate_revision_sheet' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_revision_sheet' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_revision_sheet';

-- generate_activity
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 4 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 5 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'documents_titres', 'Titres des documents', NULL, 'documents.title', 0, 6 FROM ai_tasks WHERE code = 'generate_activity' UNION ALL
SELECT id, 'seance_duree', 'Durée de la séance', NULL, 'sessions.duration_minutes', 0, 7 FROM ai_tasks WHERE code = 'generate_activity';

-- generate_written_trace
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_written_trace' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_written_trace' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_written_trace' UNION ALL
SELECT id, 'seance_deroulement', 'Déroulé de la séance', 'Déroulé existant', 'sessions.lesson_plan', 0, 4 FROM ai_tasks WHERE code = 'generate_written_trace' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via session_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_written_trace' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_written_trace';

-- generate_slideshow
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_slideshow' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_slideshow' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_slideshow' UNION ALL
SELECT id, 'seance_deroulement', 'Déroulé de la séance', NULL, 'sessions.lesson_plan', 0, 4 FROM ai_tasks WHERE code = 'generate_slideshow' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via session_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_slideshow' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_slideshow';

-- generate_exam_subject
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_exam_subject' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_exam_subject' UNION ALL
SELECT id, 'devoir_competences', 'Compétences évaluées', 'Compétences ciblées par le devoir', 'assignment_skill_map', 1, 3 FROM ai_tasks WHERE code = 'generate_exam_subject' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 0, 4 FROM ai_tasks WHERE code = 'generate_exam_subject' UNION ALL
SELECT id, 'points_programme', 'Points du programme', NULL, 'program_topics (type=point)', 0, 5 FROM ai_tasks WHERE code = 'generate_exam_subject' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_exam_subject';

-- generate_exam_answer
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_exam_answer' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_exam_answer' UNION ALL
SELECT id, 'devoir_consigne', 'Consigne du devoir', NULL, 'assignments.instructions', 1, 3 FROM ai_tasks WHERE code = 'generate_exam_answer' UNION ALL
SELECT id, 'devoir_competences', 'Compétences évaluées', NULL, 'assignment_skill_map', 0, 4 FROM ai_tasks WHERE code = 'generate_exam_answer' UNION ALL
SELECT id, 'devoir_bareme', 'Barème', NULL, 'assignments.max_score', 0, 5 FROM ai_tasks WHERE code = 'generate_exam_answer' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_exam_answer';

-- generate_session_plan
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_session_plan' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_session_plan' UNION ALL
SELECT id, 'sequence_titre', 'Titre de la séquence', NULL, 'sequences.title', 1, 3 FROM ai_tasks WHERE code = 'generate_session_plan' UNION ALL
SELECT id, 'sequence_objectifs', 'Objectifs de la séquence', NULL, 'sequences.description', 0, 4 FROM ai_tasks WHERE code = 'generate_session_plan' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 0, 5 FROM ai_tasks WHERE code = 'generate_session_plan' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 6 FROM ai_tasks WHERE code = 'generate_session_plan';

-- generate_session_outline
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'seance_titre', 'Titre de la séance', NULL, 'sessions.title', 1, 3 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'seance_duree', 'Durée de la séance', NULL, 'sessions.duration_minutes', 0, 4 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via session_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_session_outline' UNION ALL
SELECT id, 'documents_titres', 'Titres des documents', NULL, 'documents.title', 0, 7 FROM ai_tasks WHERE code = 'generate_session_outline';

-- generate_lesson_log
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_lesson_log' UNION ALL
SELECT id, 'classe', 'Classe', NULL, 'classes.name', 1, 2 FROM ai_tasks WHERE code = 'generate_lesson_log' UNION ALL
SELECT id, 'seance_titre', 'Titre de la séance', NULL, 'sessions.title', 1, 3 FROM ai_tasks WHERE code = 'generate_lesson_log' UNION ALL
SELECT id, 'seance_deroulement', 'Déroulé de la séance', NULL, 'sessions.lesson_plan', 0, 4 FROM ai_tasks WHERE code = 'generate_lesson_log' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via session_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_lesson_log';

-- classify_document
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'documents_contenu', 'Contenu du document', 'Texte extrait du document importé', 'documents.extracted_text', 1, 1 FROM ai_tasks WHERE code = 'classify_document' UNION ALL
SELECT id, 'documents_titres', 'Nom du fichier', NULL, 'documents.file_name', 0, 2 FROM ai_tasks WHERE code = 'classify_document';

-- analyze_submission
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'copie_contenu', 'Contenu de la copie', 'Texte extrait de la copie élève', 'submissions (extraction)', 1, 1 FROM ai_tasks WHERE code = 'analyze_submission' UNION ALL
SELECT id, 'devoir_consigne', 'Consigne du devoir', NULL, 'assignments.instructions', 1, 2 FROM ai_tasks WHERE code = 'analyze_submission' UNION ALL
SELECT id, 'devoir_competences', 'Compétences évaluées', NULL, 'assignment_skill_map', 1, 3 FROM ai_tasks WHERE code = 'analyze_submission' UNION ALL
SELECT id, 'devoir_bareme', 'Barème', NULL, 'assignments.max_score', 0, 4 FROM ai_tasks WHERE code = 'analyze_submission' UNION ALL
SELECT id, 'documents_contenu', 'Documents de référence', 'Documents associés au devoir', 'documents (extraction)', 0, 5 FROM ai_tasks WHERE code = 'analyze_submission';

-- generate_class_report
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'classe_resultats', 'Résultats classe', 'Statistiques (moyenne, distribution)', 'submissions agrégé', 1, 1 FROM ai_tasks WHERE code = 'generate_class_report' UNION ALL
SELECT id, 'classe_competences_moyennes', 'Compétences moyennes', 'Moyennes compétences classe', 'submission_skill_evaluations agrégé', 1, 2 FROM ai_tasks WHERE code = 'generate_class_report' UNION ALL
SELECT id, 'devoir_consigne', 'Consigne du devoir', NULL, 'assignments.instructions', 0, 3 FROM ai_tasks WHERE code = 'generate_class_report' UNION ALL
SELECT id, 'devoir_competences', 'Compétences évaluées', NULL, 'assignment_skill_map', 0, 4 FROM ai_tasks WHERE code = 'generate_class_report';

-- generate_appreciation
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'eleve_nom', 'Nom de l''élève', NULL, 'students', 1, 1 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'eleve_competences', 'Compétences de l''élève', 'Niveaux actuels', 'student_skill_observations', 1, 2 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'eleve_notes', 'Notes de l''élève', 'Historique notes période', 'submissions', 1, 3 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'periode', 'Période', 'Trimestre courant', 'report_periods', 1, 4 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'eleve_profil', 'Profil élève', 'Comportement, travail, participation', 'student_period_profiles', 0, 5 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'appreciation_precedente', 'Appréciation précédente', NULL, 'bulletin_entry_versions', 0, 6 FROM ai_tasks WHERE code = 'generate_appreciation' UNION ALL
SELECT id, 'classe_competences_moyennes', 'Compétences moyennes classe', 'Pour situer l''élève', 'submission_skill_evaluations agrégé', 0, 7 FROM ai_tasks WHERE code = 'generate_appreciation';

-- generate_pp_appreciation
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'eleve_nom', 'Nom de l''élève', NULL, 'students', 1, 1 FROM ai_tasks WHERE code = 'generate_pp_appreciation' UNION ALL
SELECT id, 'eleve_competences', 'Compétences de l''élève', NULL, 'student_skill_observations', 1, 2 FROM ai_tasks WHERE code = 'generate_pp_appreciation' UNION ALL
SELECT id, 'eleve_notes', 'Notes de l''élève', NULL, 'submissions', 1, 3 FROM ai_tasks WHERE code = 'generate_pp_appreciation' UNION ALL
SELECT id, 'eleve_profil', 'Profil élève', NULL, 'student_period_profiles', 1, 4 FROM ai_tasks WHERE code = 'generate_pp_appreciation' UNION ALL
SELECT id, 'periode', 'Période', NULL, 'report_periods', 1, 5 FROM ai_tasks WHERE code = 'generate_pp_appreciation' UNION ALL
SELECT id, 'appreciation_precedente', 'Appréciation précédente', NULL, 'bulletin_entry_versions', 0, 6 FROM ai_tasks WHERE code = 'generate_pp_appreciation';

-- generate_orientation
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'eleve_nom', 'Nom de l''élève', NULL, 'students', 1, 1 FROM ai_tasks WHERE code = 'generate_orientation' UNION ALL
SELECT id, 'eleve_competences', 'Compétences de l''élève', NULL, 'student_skill_observations', 1, 2 FROM ai_tasks WHERE code = 'generate_orientation' UNION ALL
SELECT id, 'eleve_notes', 'Notes de l''élève', NULL, 'submissions', 1, 3 FROM ai_tasks WHERE code = 'generate_orientation' UNION ALL
SELECT id, 'eleve_profil', 'Profil élève', NULL, 'student_period_profiles', 1, 4 FROM ai_tasks WHERE code = 'generate_orientation' UNION ALL
SELECT id, 'periode', 'Période', NULL, 'report_periods', 0, 5 FROM ai_tasks WHERE code = 'generate_orientation';

-- parse_official_program
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'documents_contenu', 'Contenu du PDF', 'Texte extrait du PDF du BO', 'documents.extracted_text', 1, 1 FROM ai_tasks WHERE code = 'parse_official_program' UNION ALL
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 0, 2 FROM ai_tasks WHERE code = 'parse_official_program' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 0, 3 FROM ai_tasks WHERE code = 'parse_official_program';

-- ============================================================================
-- Triggers updated_at pour les nouvelles tables
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS trg_ai_tasks_updated
AFTER UPDATE ON ai_tasks FOR EACH ROW
BEGIN UPDATE ai_tasks SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TRIGGER IF NOT EXISTS trg_ai_task_user_templates_updated
AFTER UPDATE ON ai_task_user_templates FOR EACH ROW
BEGIN UPDATE ai_task_user_templates SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TRIGGER IF NOT EXISTS trg_ai_generations_updated
AFTER UPDATE ON ai_generations FOR EACH ROW
BEGIN UPDATE ai_generations SET updated_at = datetime('now') WHERE id = OLD.id; END;

-- Préférences par défaut
INSERT INTO user_preferences (preference_key, preference_value) VALUES
    ('theme',           'light'),
    ('ui_density',      'standard'),
    ('sidebar_width',   '260'),
    ('default_tab',     'dashboard');
