-- ============================================================================
-- Migration 022 : Module Grand Oral
-- Tables pour le suivi des questions, répétitions et évaluations du Grand Oral
-- ============================================================================

-- Questions de Grand Oral par élève
CREATE TABLE IF NOT EXISTS grand_oral_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL DEFAULT 1 CHECK (question_number IN (1, 2)),
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    title           TEXT    NOT NULL,             -- intitulé de la question
    problematique   TEXT,                         -- problématique formulée
    plan_outline    TEXT,                         -- plan détaillé (markdown)
    status          TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK (status IN ('brouillon', 'en_cours', 'validee', 'presentee')),
    teacher_notes   TEXT,                         -- notes privées du professeur
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, question_number)
);

-- Passages / répétitions (oraux blancs)
CREATE TABLE IF NOT EXISTS grand_oral_passages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER NOT NULL REFERENCES grand_oral_questions(id) ON DELETE CASCADE,
    passage_date    TEXT    NOT NULL,             -- date du passage
    duration_seconds INTEGER,                    -- durée effective
    -- Grille d'évaluation (critères officiels Grand Oral)
    score_argumentation   INTEGER CHECK (score_argumentation BETWEEN 1 AND 4),
    score_expression      INTEGER CHECK (score_expression BETWEEN 1 AND 4),
    score_ecoute          INTEGER CHECK (score_ecoute BETWEEN 1 AND 4),
    score_connaissance    INTEGER CHECK (score_connaissance BETWEEN 1 AND 4),
    score_engagement      INTEGER CHECK (score_engagement BETWEEN 1 AND 4),
    general_comment TEXT,
    strengths       TEXT,                         -- points forts (texte libre)
    improvements    TEXT,                         -- axes d'amélioration
    suggested_score REAL,                        -- note indicative /20
    source          TEXT    DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Questions de jury potentielles (générées par IA ou saisies manuellement)
CREATE TABLE IF NOT EXISTS grand_oral_jury_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER NOT NULL REFERENCES grand_oral_questions(id) ON DELETE CASCADE,
    content         TEXT    NOT NULL,             -- texte de la question de jury
    category        TEXT    DEFAULT 'general'
                        CHECK (category IN ('general', 'approfondissement', 'lien_programme', 'projet_orientation', 'echange')),
    source          TEXT    DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_go_questions_student ON grand_oral_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_go_passages_question ON grand_oral_passages(question_id);
CREATE INDEX IF NOT EXISTS idx_go_jury_question ON grand_oral_jury_questions(question_id);

-- Triggers updated_at
CREATE TRIGGER IF NOT EXISTS trg_grand_oral_questions_updated
AFTER UPDATE ON grand_oral_questions FOR EACH ROW
BEGIN UPDATE grand_oral_questions SET updated_at = datetime('now') WHERE id = OLD.id; END;

-- Tâches IA pour le Grand Oral
INSERT OR IGNORE INTO ai_tasks (code, label, description, category, icon, output_format, sort_order) VALUES
    ('generate_jury_questions',
     'Générer des questions de jury',
     'Génère des questions potentielles de jury pour le Grand Oral à partir de la question et du plan de l''élève',
     'evaluations', '🎤', 'markdown', 21),
    ('evaluate_grand_oral',
     'Évaluer un passage Grand Oral',
     'Analyse la structure argumentative d''une prestation orale et propose une évaluation critériée',
     'correction', '🎤', 'json', 22);

-- Paramètres communs pour les nouvelles tâches
INSERT OR IGNORE INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'difficulty_level', 'Niveau de difficulté', 'select',
       '["facile","standard","approfondi","expert"]', 'standard',
       'Niveau de difficulté : {value}.', 1, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral')
UNION ALL
SELECT t.id, 'differentiation', 'Différenciation', 'select',
       '["standard","simplifié","renforcé"]', 'standard',
       'Niveau de différenciation : {value}.', 2, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral')
UNION ALL
SELECT t.id, 'doc_scope', 'Périmètre documentaire', 'select',
       '["documents_only","documents_and_knowledge","web_research"]', 'documents_and_knowledge',
       'Périmètre des sources : {value}.', 3, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral')
UNION ALL
SELECT t.id, 'output_length', 'Longueur', 'select',
       '["court","moyen","long","détaillé"]', 'moyen',
       'Longueur attendue : {value}.', 4, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral')
UNION ALL
SELECT t.id, 'output_language', 'Langue', 'select',
       '["français","anglais"]', 'français',
       NULL, 5, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral')
UNION ALL
SELECT t.id, 'tone', 'Ton', 'select',
       '["académique","pédagogique","accessible","formel"]', 'pédagogique',
       'Ton attendu : {value}.', 6, 1
FROM ai_tasks t WHERE t.code IN ('generate_jury_questions','evaluate_grand_oral');

-- Paramètres catégorie évaluations pour generate_jury_questions
INSERT OR IGNORE INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'exam_duration', 'Durée épreuve', 'select', '["1h","2h","3h","4h"]', '2h', 'Durée de l''épreuve : {value}.', 10, 0
FROM ai_tasks t WHERE t.code = 'generate_jury_questions'
UNION ALL
SELECT t.id, 'include_marking_scheme', 'Inclure barème détaillé', 'toggle', '["oui","non"]', 'oui', NULL, 11, 0
FROM ai_tasks t WHERE t.code = 'generate_jury_questions'
UNION ALL
SELECT t.id, 'num_parts', 'Nombre de questions', 'number', NULL, '5', 'Nombre de questions de jury à proposer : {value}.', 12, 0
FROM ai_tasks t WHERE t.code = 'generate_jury_questions';

-- Paramètres catégorie correction pour evaluate_grand_oral
INSERT OR IGNORE INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'grading_strictness', 'Sévérité de l''évaluation', 'select', '["bienveillant","équilibré","exigeant"]', 'équilibré', 'Adopte un niveau de sévérité : {value}.', 10, 0
FROM ai_tasks t WHERE t.code = 'evaluate_grand_oral'
UNION ALL
SELECT t.id, 'include_progression_tips', 'Inclure conseils de progression', 'toggle', '["oui","non"]', 'oui', NULL, 11, 0
FROM ai_tasks t WHERE t.code = 'evaluate_grand_oral'
UNION ALL
SELECT t.id, 'appreciation_length', 'Longueur appréciation', 'select', '["courte","standard","détaillée"]', 'standard', 'Longueur d''appréciation attendue : {value}.', 12, 0
FROM ai_tasks t WHERE t.code = 'evaluate_grand_oral';

-- Variables contextuelles
INSERT OR IGNORE INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_jury_questions' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_jury_questions' UNION ALL
SELECT id, 'question_eleve', 'Question de l''élève', 'Intitulé de la question Grand Oral', 'grand_oral_questions.title', 1, 3 FROM ai_tasks WHERE code = 'generate_jury_questions' UNION ALL
SELECT id, 'problematique', 'Problématique', NULL, 'grand_oral_questions.problematique', 0, 4 FROM ai_tasks WHERE code = 'generate_jury_questions' UNION ALL
SELECT id, 'plan_eleve', 'Plan de l''élève', NULL, 'grand_oral_questions.plan_outline', 0, 5 FROM ai_tasks WHERE code = 'generate_jury_questions' UNION ALL
SELECT id, 'chapitre', 'Chapitre lié', NULL, 'program_topics.title', 0, 6 FROM ai_tasks WHERE code = 'generate_jury_questions';

INSERT OR IGNORE INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'evaluate_grand_oral' UNION ALL
SELECT id, 'question_eleve', 'Question de l''élève', NULL, 'grand_oral_questions.title', 1, 2 FROM ai_tasks WHERE code = 'evaluate_grand_oral' UNION ALL
SELECT id, 'plan_eleve', 'Plan de l''élève', NULL, 'grand_oral_questions.plan_outline', 0, 3 FROM ai_tasks WHERE code = 'evaluate_grand_oral' UNION ALL
SELECT id, 'transcription_oral', 'Transcription / notes', 'Notes prises pendant le passage', 'manual', 0, 4 FROM ai_tasks WHERE code = 'evaluate_grand_oral';

-- System prompts et templates
UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu produis du contenu de haute qualite, structure et conforme aux programmes du Bulletin Officiel.
Tu t''adresses a des lyceens de Terminale.
Style : clair, rigoureux, pedagogique. Vocabulaire adapte au niveau.
Langue : francais. Reponse en {{output_format}} sauf indication contraire.
Specialite : preparation au Grand Oral du baccalaureat.
Tu connais parfaitement les attendus du Grand Oral : 5 min de presentation + 10 min d''echange avec le jury.
Les questions doivent tester la maitrise du sujet, la capacite a argumenter, et le lien avec le projet d''orientation.',
    default_template = 'Genere des questions de jury potentielles pour la question de Grand Oral suivante.

Matiere : {{subject_name}}
Niveau : {{level_name}}
Question de l''eleve : {{question_eleve}}
Problematique : {{problematique}}
Plan de l''eleve : {{plan_eleve}}
Chapitre du programme : {{chapter_title}}

Pour chaque question, precise :
- La question formulee clairement
- La categorie (approfondissement / lien programme / projet orientation / echange)
- Ce que le jury cherche a evaluer
- Des elements de reponse attendus

{{document_context}}'
WHERE code = 'generate_jury_questions';

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu produis du contenu de haute qualite, structure et conforme aux programmes du Bulletin Officiel.
Tu t''adresses a des lyceens de Terminale.
Style : clair, rigoureux, pedagogique. Vocabulaire adapte au niveau.
Langue : francais. Reponse en {{output_format}} sauf indication contraire.
Specialite : evaluation de prestations orales au Grand Oral du baccalaureat.
Tu evalues selon les 5 criteres officiels :
1. Qualite de l''argumentation (structure, logique, exemples)
2. Qualite de l''expression (clarte, fluidite, registre)
3. Qualite de l''ecoute et de l''echange (reactivite, reformulation)
4. Connaissance du sujet (maitrise, precision)
5. Engagement et conviction (posture, regard, voix)
Chaque critere est note de 1 a 4.
Reponds UNIQUEMENT en JSON valide :
{"scores":{"argumentation":N,"expression":N,"ecoute":N,"connaissance":N,"engagement":N},"strengths":["..."],"improvements":["..."],"general_comment":"...","suggested_score":N}',
    default_template = 'Evalue la prestation Grand Oral suivante.

Matiere : {{subject_name}}
Question : {{question_eleve}}
Plan : {{plan_eleve}}

--- Notes du passage ---
{{transcription_oral}}

Evalue selon les 5 criteres officiels (1-4) et propose une note /20.
Reponds en JSON structure.'
WHERE code = 'evaluate_grand_oral';
