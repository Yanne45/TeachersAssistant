-- ============================================================================
-- Migration 026 : Diaporama JSON + Quiz interactif
--   1. generate_slideshow : passe en output_format='json' avec prompt adapté
--   2. generate_quiz      : nouvelle tâche (QCM exportable Kahoot/Moodle)
-- ============================================================================

-- ── 1. Mise à jour generate_slideshow → JSON ─────────────────────────────────

UPDATE ai_tasks SET
    output_format = 'json',
    system_prompt = 'Tu es un assistant pédagogique expert pour l''enseignement secondaire en France (lycée général).
Tu produis du contenu de haute qualité, structuré et conforme aux programmes du Bulletin Officiel.
Tu t''adresses à des lycéens de Première et Terminale.
Style : clair, rigoureux, pédagogique. Vocabulaire adapté au niveau.
Langue : français.
Spécialité : création de diaporamas pédagogiques structurés.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après le bloc JSON.',
    default_template = 'Génère le plan détaillé d''un diaporama de cours au format JSON.

Matière : {{subject_name}}
Niveau : {{level_name}}
Séance : {{session_title}}
Chapitre : {{chapter_title}}
Durée du cours : {{duration}} heures

Réponds en JSON strict avec cette structure :
{
  "title": "Titre du diaporama",
  "subtitle": "Sous-titre (chapitre / séance)",
  "totalSlides": 12,
  "slides": [
    {
      "number": 1,
      "title": "Titre de la diapositive",
      "content": ["Point clé 1", "Point clé 2", "Point clé 3"],
      "notes": "Notes pour le professeur (ce qu''il doit dire, rappels, transitions)",
      "visualSuggestion": "Description du visuel suggéré (carte, schéma, image, document...)",
      "type": "title"
    }
  ],
  "conclusion": "Synthèse et ouverture",
  "suggestedActivity": "Activité de fin de séance suggérée"
}

Types de diapositives possibles : "title", "content", "document", "activity", "transition", "summary".
Génère entre 8 et 15 diapositives.
Pour chaque diapositive, le champ "content" contient 3 à 5 points clés sous forme de phrases courtes.
Le champ "notes" contient les indications pédagogiques pour le professeur.
Le champ "visualSuggestion" décrit un document, une carte, un schéma ou une image pertinente.

{{document_context}}'
WHERE code = 'generate_slideshow';

-- ── 2. Nouvelle tâche : generate_quiz ─────────────────────────────────────────

INSERT INTO ai_tasks (code, label, description, category, icon, output_format, sort_order, is_custom, target_screens) VALUES
    ('generate_quiz',
     'Générer un quiz interactif',
     'Génère un questionnaire à choix multiples (QCM) exportable en format Kahoot CSV ou Moodle XML. Idéal pour les évaluations formatives et les révisions.',
     'evaluations', '❓', 'json', 13, 0, '["generateur_ia"]');

-- Paramètres communs
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'difficulty_level', 'Niveau de difficulté', 'select',
       '["facile","standard","approfondi","expert"]', 'standard',
       'Niveau de difficulté : {value}.', 1, 1
FROM ai_tasks t WHERE t.code = 'generate_quiz'
UNION ALL
SELECT t.id, 'differentiation', 'Différenciation', 'select',
       '["standard","simplifié","renforcé"]', 'standard',
       'Niveau de différenciation : {value}.', 2, 1
FROM ai_tasks t WHERE t.code = 'generate_quiz'
UNION ALL
SELECT t.id, 'doc_scope', 'Périmètre documentaire', 'select',
       '["documents_only","documents_and_knowledge","web_research"]', 'documents_and_knowledge',
       'Périmètre des sources : {value}.', 3, 1
FROM ai_tasks t WHERE t.code = 'generate_quiz'
UNION ALL
SELECT t.id, 'output_language', 'Langue', 'select',
       '["français","anglais"]', 'français',
       NULL, 5, 1
FROM ai_tasks t WHERE t.code = 'generate_quiz'
UNION ALL
SELECT t.id, 'tone', 'Ton', 'select',
       '["académique","pédagogique","accessible","formel"]', 'pédagogique',
       'Ton attendu : {value}.', 6, 1
FROM ai_tasks t WHERE t.code = 'generate_quiz';

-- Paramètres spécifiques au quiz
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'num_questions', 'Nombre de questions', 'number', NULL, '10',
       'Génère {value} questions.', 10, 0
FROM ai_tasks WHERE code = 'generate_quiz';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'question_type', 'Type de questions', 'select',
       '["qcm_unique","qcm_multiple","vrai_faux","mixte"]', 'mixte',
       'Type de questions : {value}.', 11, 0
FROM ai_tasks WHERE code = 'generate_quiz';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'time_per_question', 'Temps par question (s)', 'number', NULL, '20',
       'Temps de réponse par question : {value} secondes.', 12, 0
FROM ai_tasks WHERE code = 'generate_quiz';

-- Variables contextuelles
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_quiz' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_quiz' UNION ALL
SELECT id, 'chapitre', 'Chapitre', 'Chapitre ou thème du programme', 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_quiz' UNION ALL
SELECT id, 'seance_deroulement', 'Déroulé de la séance', NULL, 'sessions.lesson_plan', 0, 4 FROM ai_tasks WHERE code = 'generate_quiz' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_quiz' UNION ALL
SELECT id, 'documents_contenu', 'Contenu des documents', NULL, 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_quiz';

-- Prompt système et template
UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pédagogique expert pour l''enseignement secondaire en France (lycée général).
Tu produis du contenu de haute qualité, structuré et conforme aux programmes du Bulletin Officiel.
Tu t''adresses à des lycéens de Première et Terminale.
Style : clair, rigoureux, pédagogique. Vocabulaire adapté au niveau.
Langue : français.
Spécialité : création de quiz et QCM pédagogiques.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après le bloc JSON.',
    default_template = 'Génère un quiz pédagogique au format JSON.

Matière : {{subject_name}}
Niveau : {{level_name}}
Chapitre : {{chapter_title}}
Séance : {{session_title}}
Capacités visées : {{skills_list}}

Réponds en JSON strict avec cette structure :
{
  "title": "Titre du quiz",
  "subject": "Matière",
  "chapter": "Chapitre",
  "totalQuestions": 10,
  "questions": [
    {
      "number": 1,
      "type": "qcm",
      "question": "Texte de la question",
      "choices": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "correctAnswers": [0],
      "explanation": "Explication de la bonne réponse",
      "timeLimit": 20,
      "difficulty": "standard",
      "skill": "Capacité évaluée"
    }
  ]
}

Types de questions : "qcm" (choix unique), "qcm_multiple" (choix multiples), "vrai_faux".
Pour chaque question :
- 4 propositions de réponse (ou 2 pour vrai/faux)
- correctAnswers : tableau des indices (base 0) des bonnes réponses
- explanation : explication claire pour l''élève
- difficulty : "facile", "standard" ou "approfondi"
- skill : la capacité ou compétence évaluée

Assure-toi que les distracteurs (mauvaises réponses) sont plausibles et pédagogiquement intéressants.

{{document_context}}'
WHERE code = 'generate_quiz';
