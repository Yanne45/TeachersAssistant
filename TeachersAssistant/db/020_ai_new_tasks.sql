-- ============================================================================
-- Migration 020 : Nouvelles tâches IA
--   1. generate_problematisation — Assistant de problématisation
--   2. convert_level             — Convertisseur de niveaux
--   3. generate_croquis_legend   — Module croquis automatisé (légende)
-- ============================================================================

-- ── 1. Insertion des tâches ─────────────────────────────────────────────────

INSERT INTO ai_tasks (code, label, description, category, icon, output_format, sort_order) VALUES
    ('generate_problematisation',
     'Générer une problématisation',
     'Génère des sujets problématisés (dissertation, question problématisée) avec plans détaillés, limites chrono/spatiales et pistes documentaires',
     'contenus', '🧠', 'markdown', 18),
    ('convert_level',
     'Convertir le niveau d''un document',
     'Transforme un document complexe vers un niveau plus accessible (1ère, allophone, remédiation) en conservant les notions clés',
     'contenus', '🔄', 'markdown', 19),
    ('generate_croquis_legend',
     'Générer une légende de croquis',
     'Extrait d''un texte de géographie une légende organisée (parties, figurés, nomenclature) prête à projeter ou imprimer',
     'contenus', '🗺️', 'markdown', 20);

-- ── 2. Paramètres communs (CROSS JOIN comme les tâches existantes) ──────────

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'difficulty_level', 'Niveau de difficulté', 'select',
       '["facile","standard","approfondi","expert"]', 'standard',
       'Niveau de difficulté : {value}.', 1, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'differentiation', 'Différenciation', 'select',
       '["standard","simplifié","renforcé"]', 'standard',
       'Niveau de différenciation : {value}.', 2, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'doc_scope', 'Périmètre documentaire', 'select',
       '["documents_only","documents_and_knowledge","web_research"]', 'documents_and_knowledge',
       'Périmètre des sources : {value}.', 3, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'output_length', 'Longueur', 'select',
       '["court","moyen","long","détaillé"]', 'moyen',
       'Longueur attendue : {value}.', 4, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'output_language', 'Langue', 'select',
       '["français","anglais"]', 'français',
       NULL, 5, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'tone', 'Ton', 'select',
       '["académique","pédagogique","accessible","formel"]', 'pédagogique',
       'Ton attendu : {value}.', 6, 1
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend');

-- Paramètres catégorie contenus (même logique que 001)
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'content_format', 'Format de sortie', 'select',
       '["texte_continu","plan_structure","fiches","tableau"]', 'texte_continu',
       'Format de sortie demandé : {value}.', 10, 0
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'include_sources', 'Inclure sources/références', 'toggle',
       '["oui","non"]', 'non', NULL, 11, 0
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend')
UNION ALL
SELECT t.id, 'include_student_instructions', 'Inclure consignes élève', 'toggle',
       '["oui","non"]', 'non', NULL, 12, 0
FROM ai_tasks t WHERE t.code IN ('generate_problematisation','convert_level','generate_croquis_legend');

-- ── 3. Paramètres spécifiques ───────────────────────────────────────────────

-- generate_problematisation : type d'exercice cible
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'exercise_type', 'Type d''exercice', 'select',
       '["dissertation","question_problematisee","composition","etude_critique"]', 'dissertation',
       'Type d''exercice visé : {value}.', 13, 0
FROM ai_tasks WHERE code = 'generate_problematisation';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'num_sujets', 'Nombre de sujets', 'number', NULL, '2',
       'Propose {value} sujet(s) problématisé(s).', 14, 0
FROM ai_tasks WHERE code = 'generate_problematisation';

-- convert_level : niveau cible
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'target_level', 'Niveau cible', 'select',
       '["seconde","premiere","terminale","allophone","remediation"]', 'premiere',
       'Adapte le contenu pour un niveau : {value}.', 13, 0
FROM ai_tasks WHERE code = 'convert_level';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'preserve_notions', 'Conserver les notions clés', 'toggle',
       '["oui","non"]', 'oui',
       NULL, 14, 0
FROM ai_tasks WHERE code = 'convert_level';

-- generate_croquis_legend : type de croquis
INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'croquis_type', 'Type de croquis', 'select',
       '["croquis_synthese","schema_spatial","carte_mentale","organigramme_spatial"]', 'croquis_synthese',
       'Type de production cartographique : {value}.', 13, 0
FROM ai_tasks WHERE code = 'generate_croquis_legend';

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT id, 'include_figures', 'Proposer des figurés', 'toggle',
       '["oui","non"]', 'oui',
       NULL, 14, 0
FROM ai_tasks WHERE code = 'generate_croquis_legend';

-- ── 4. Variables contextuelles ──────────────────────────────────────────────

-- generate_problematisation
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'chapitre', 'Chapitre', 'Chapitre ou thème du programme', 'program_topics.title', 1, 3 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'points_programme', 'Points du programme', 'Jalons / PPO concernés', 'program_topics (type=point)', 0, 4 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 5 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'corpus_texte', 'Corpus / texte source', 'Texte ou corpus à partir duquel problématiser', 'documents (extraction)', 0, 6 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'limites_chrono', 'Limites chronologiques', 'Bornes temporelles souhaitées (ex: 1945-1991)', 'manual', 0, 7 FROM ai_tasks WHERE code = 'generate_problematisation' UNION ALL
SELECT id, 'limites_spatiales', 'Limites spatiales', 'Cadre géographique (ex: Europe, monde)', 'manual', 0, 8 FROM ai_tasks WHERE code = 'generate_problematisation';

-- convert_level
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'convert_level' UNION ALL
SELECT id, 'niveau', 'Niveau d''origine', 'Niveau actuel du document', 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'convert_level' UNION ALL
SELECT id, 'documents_contenu', 'Contenu du document', 'Texte du document à adapter', 'documents (extraction)', 1, 3 FROM ai_tasks WHERE code = 'convert_level' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 0, 4 FROM ai_tasks WHERE code = 'convert_level' UNION ALL
SELECT id, 'points_programme', 'Notions clés à conserver', 'Points du programme à garder impérativement', 'program_topics (type=point)', 0, 5 FROM ai_tasks WHERE code = 'convert_level' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 6 FROM ai_tasks WHERE code = 'convert_level';

-- generate_croquis_legend
INSERT INTO ai_task_variables (task_id, variable_code, variable_label, variable_description, data_source, is_required, sort_order)
SELECT id, 'matiere', 'Matière', NULL, 'subjects.name', 1, 1 FROM ai_tasks WHERE code = 'generate_croquis_legend' UNION ALL
SELECT id, 'niveau', 'Niveau', NULL, 'levels.name', 1, 2 FROM ai_tasks WHERE code = 'generate_croquis_legend' UNION ALL
SELECT id, 'chapitre', 'Chapitre', NULL, 'program_topics.title', 0, 3 FROM ai_tasks WHERE code = 'generate_croquis_legend' UNION ALL
SELECT id, 'sujet_croquis', 'Sujet du croquis', 'Intitulé du croquis (ex: Les dynamiques territoriales en France)', 'manual', 1, 4 FROM ai_tasks WHERE code = 'generate_croquis_legend' UNION ALL
SELECT id, 'texte_source', 'Texte source', 'Texte de géographie à partir duquel extraire la légende', 'documents (extraction)', 1, 5 FROM ai_tasks WHERE code = 'generate_croquis_legend' UNION ALL
SELECT id, 'capacites', 'Capacités visées', NULL, 'skills via sequence_skills', 0, 6 FROM ai_tasks WHERE code = 'generate_croquis_legend';

-- ── 5. System prompts et templates ──────────────────────────────────────────

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu produis du contenu de haute qualite, structure et conforme aux programmes du Bulletin Officiel.
Tu t''adresses a des lyceens de Premiere et Terminale.
Style : clair, rigoureux, pedagogique. Vocabulaire adapte au niveau.
Langue : francais. Reponse en {{output_format}} sauf indication contraire.
Specialite : problematisation en histoire, geographie et HGGSP.
Tu maitrises parfaitement les exercices du baccalaureat (dissertation, composition, question problematisee, etude critique de documents).
Pour chaque sujet propose, tu fournis une problematique, un plan detaille et les limites chrono-spatiales.',
    default_template = 'Genere des sujets problematises pour le chapitre suivant.

Matiere : {{subject_name}}
Niveau : {{level_name}}
Chapitre : {{chapter_title}}
Points du programme (jalons/PPO) : {{program_points}}
Competences visees : {{skills_list}}
Limites chronologiques : {{limites_chrono}}
Limites spatiales : {{limites_spatiales}}

Pour chaque sujet, fournis :
- L''intitule exact du sujet
- Une problematique claire
- Un plan detaille (2-3 parties avec sous-parties)
- Les limites chronologiques et spatiales precises
- Les notions cles a mobiliser
- Des pistes documentaires (types de documents exploitables)
- Les pieges a eviter

{{document_context}}'
WHERE code = 'generate_problematisation';

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu produis du contenu de haute qualite, structure et conforme aux programmes du Bulletin Officiel.
Tu t''adresses a des lyceens de Premiere et Terminale.
Style : clair, rigoureux, pedagogique. Vocabulaire adapte au niveau.
Langue : francais. Reponse en {{output_format}} sauf indication contraire.
Specialite : adaptation de contenus pedagogiques a differents niveaux.
Tu sais simplifier un texte complexe (terminale, universitaire) pour le rendre accessible a un niveau inferieur (premiere, seconde, allophone, remediation) tout en preservant les notions essentielles et la rigueur disciplinaire.
Tu remplaces le vocabulaire technique par des equivalents accessibles et ajoutes des definitions si necessaire.',
    default_template = 'Adapte le document suivant au niveau cible.

Matiere : {{subject_name}}
Niveau d''origine : {{level_name}}
Chapitre : {{chapter_title}}
Notions cles a conserver absolument : {{program_points}}
Competences visees : {{skills_list}}

--- Document source ---
{{document_content}}

Consignes d''adaptation :
- Conserver toutes les notions cles listees ci-dessus
- Simplifier le vocabulaire et les tournures complexes
- Ajouter des definitions entre parentheses pour les termes techniques maintenus
- Raccourcir les phrases longues
- Ajouter des connecteurs logiques pour faciliter la comprehension
- Garder la structure globale du document (parties, sous-parties)
- Signaler en fin de document les notions simplifiees ou supprimees

{{document_context}}'
WHERE code = 'convert_level';

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu produis du contenu de haute qualite, structure et conforme aux programmes du Bulletin Officiel.
Tu t''adresses a des lyceens de Premiere et Terminale.
Style : clair, rigoureux, pedagogique. Vocabulaire adapte au niveau.
Langue : francais. Reponse en {{output_format}} sauf indication contraire.
Specialite : cartographie scolaire et croquis de geographie.
Tu maitrises les conventions cartographiques (figures ponctuels, lineaires, de surface), la semiologie graphique et l''organisation classique d''une legende de croquis de synthese en geographie (I. ..., II. ..., III. ...).
Tu proposes des figures adaptes (couleurs, hachures, fleches) avec leur signification.',
    default_template = 'A partir du texte suivant, genere une legende de croquis organisee.

Matiere : {{subject_name}}
Niveau : {{level_name}}
Chapitre : {{chapter_title}}
Sujet du croquis : {{sujet_croquis}}

--- Texte source ---
{{texte_source}}

La legende doit comporter :
- Un titre pour le croquis
- 2 a 3 grandes parties thematiques (I., II., III.)
- Pour chaque partie : 3-5 elements de legende avec :
  - Le figure propose (type : ponctuel/lineaire/surface, couleur, forme)
  - La signification / ce qu''il represente
  - Des exemples de localisation a placer sur le croquis
- Une nomenclature (noms de lieux, pays, villes a placer)

Format : Markdown structure, pret a etre projete ou imprime pour que les eleves le completent.

{{document_context}}'
WHERE code = 'generate_croquis_legend';
