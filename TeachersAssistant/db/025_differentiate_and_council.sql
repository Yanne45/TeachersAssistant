-- ============================================================================
-- Migration 025 : Deux nouvelles taches IA
--   1. differentiate_document  — Differenciation pedagogique instantanee
--   2. generate_council_report — Rapport de classe pour conseil de classe
-- ============================================================================

-- ── 1. Insertion des taches ───────────────────────────────────────────────

INSERT INTO ai_tasks (code, label, description, category, icon, output_format, sort_order, target_screens) VALUES
    ('differentiate_document',
     'Différencier un document',
     'Génère 3 versions d''un document (simplifié / standard / enrichi) pour différenciation pédagogique instantanée',
     'contenus', '🎯', 'markdown', 21,
     '["generateur_ia"]'),
    ('generate_council_report',
     'Synthèse conseil de classe',
     'Agrège les résultats d''une classe (moyennes, compétences, profils élèves) en un bilan factuel pour le conseil de classe',
     'correction', '🏛️', 'markdown', 22,
     '["generateur_ia","correction_serie"]');

-- ── 2. Parametres communs (meme jeu que les autres taches) ───────────────

INSERT INTO ai_task_params (task_id, param_code, param_label, param_type, param_options, default_value, injection_template, sort_order, is_common)
SELECT t.id, 'difficulty_level',  'Niveau de difficulté',   'select', '["facile","standard","approfondi","expert"]',                'standard',                  'Adapte le contenu pour un niveau de difficulté : {value}.',  1, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report')
UNION ALL
SELECT t.id, 'differentiation',   'Différenciation',        'select', '["standard","simplifié","renforcé"]',                        'standard',                  'Applique une différenciation de type : {value}.',            2, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report')
UNION ALL
SELECT t.id, 'doc_scope',         'Périmètre documentaire', 'select', '["documents_only","documents_and_knowledge","web_research"]','documents_and_knowledge',   NULL,                                                         3, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report')
UNION ALL
SELECT t.id, 'output_length',     'Longueur attendue',      'select', '["court","moyen","long","détaillé"]',                        'moyen',                     'Longueur de sortie attendue : {value}.',                     4, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report')
UNION ALL
SELECT t.id, 'output_language',   'Langue de sortie',       'select', '["français","anglais"]',                                     'français',                  NULL,                                                         5, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report')
UNION ALL
SELECT t.id, 'tone',              'Ton / registre',         'select', '["académique","pédagogique","accessible","formel"]',          'pédagogique',               'Adopte un ton {value}.',                                     6, 1
FROM ai_tasks t WHERE t.code IN ('differentiate_document','generate_council_report');

-- ── 3. Variables de template ─────────────────────────────────────────────

-- differentiate_document
INSERT INTO ai_task_variables (task_id, var_code, var_label, var_description, data_source, is_required, sort_order)
SELECT id, 'matiere',             'Matière',                  NULL,                                         'subjects.name',                  1, 1 FROM ai_tasks WHERE code = 'differentiate_document' UNION ALL
SELECT id, 'niveau',              'Niveau',                   'Niveau de la classe',                        'levels.name',                    1, 2 FROM ai_tasks WHERE code = 'differentiate_document' UNION ALL
SELECT id, 'documents_contenu',   'Contenu du document',      'Texte complet du document à différencier',   'documents (extraction)',          1, 3 FROM ai_tasks WHERE code = 'differentiate_document' UNION ALL
SELECT id, 'chapitre',            'Chapitre / thème',         NULL,                                         'program_topics.title',            0, 4 FROM ai_tasks WHERE code = 'differentiate_document' UNION ALL
SELECT id, 'capacites',           'Capacités visées',         'Objectifs d''apprentissage à préserver',     'skills via sequence_skills',      0, 5 FROM ai_tasks WHERE code = 'differentiate_document';

-- generate_council_report
INSERT INTO ai_task_variables (task_id, var_code, var_label, var_description, data_source, is_required, sort_order)
SELECT id, 'classe',              'Classe',                   NULL,                                         'classes.name',                   1, 1 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'matiere',             'Matière',                  NULL,                                         'subjects.name',                  1, 2 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'periode',             'Période',                  'Trimestre ou semestre',                      'report_periods.label',           1, 3 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'moyenne_classe',      'Moyenne de classe',        'Moyenne générale de la classe',              'submissions agrégé',             1, 4 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'repartition_notes',   'Répartition des notes',    'Distribution des résultats',                 'submissions (histogram)',         1, 5 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'competences_bilan',   'Bilan compétences',        'Compétences acquises / en cours / non acquises', 'submission_skill_evaluations agrégé', 1, 6 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'effectif',            'Effectif',                 'Nombre d''élèves',                           'students count',                 0, 7 FROM ai_tasks WHERE code = 'generate_council_report' UNION ALL
SELECT id, 'mentions_eleves',     'Mentions par élève',       'Résumé indicatif par élève (prénom, moyenne, tendance)', 'student_period_profiles', 0, 8 FROM ai_tasks WHERE code = 'generate_council_report';

-- ── 4. Prompts (system + template) ──────────────────────────────────────

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert pour l''enseignement secondaire en France (lycee general).
Tu maitrises la differenciation pedagogique : tu sais adapter un meme contenu a trois niveaux d''accessibilite sans perdre la rigueur disciplinaire.
Langue : francais. Reponse en markdown.',
    default_template = 'Genere TROIS versions du document ci-dessous, adaptees a trois niveaux de differenciation :

1. **VERSION SIMPLIFIEE** : lexique accessible, phrases courtes, notions cles mises en evidence, aide a la comprehension (definitions en marge, schema mental). Pour les eleves en difficulte ou allophones.

2. **VERSION STANDARD** : le document tel quel, eventuellement legerement restructure pour la clarte.

3. **VERSION ENRICHIE** : approfondissements, mise en perspective historiographique ou geopolitique, vocabulaire expert, ouvertures vers le superieur. Pour les eleves avances.

Matiere : {{matiere}}
Niveau : {{niveau}}
Chapitre : {{chapitre}}
Capacites visees : {{capacites}}

--- Document source ---
{{documents_contenu}}
---

Pour chaque version, conserve :
- Les notions cles du programme
- La structure logique (introduction, developpement, conclusion)
- Les references documentaires

Separe clairement les 3 versions avec des titres ## VERSION SIMPLIFIEE, ## VERSION STANDARD, ## VERSION ENRICHIE.'
WHERE code = 'differentiate_document';

UPDATE ai_tasks SET
    system_prompt = 'Tu es un assistant pedagogique expert en bilans de classe pour les conseils de classe du secondaire en France.
Tu produis des syntheses factuelles, equilibrees et constructives.
Ton : professionnel, bienveillant, factuel. Evite les jugements de valeur excessifs.
Langue : francais. Reponse en markdown structure.',
    default_template = 'Redige la synthese pour le conseil de classe.

Classe : {{classe}}
Matiere : {{matiere}}
Periode : {{periode}}
Effectif : {{effectif}}

Resultats :
- Moyenne de classe : {{moyenne_classe}}
- Repartition des notes : {{repartition_notes}}

Bilan competences :
{{competences_bilan}}

Profils eleves (indicatif) :
{{mentions_eleves}}

Structure attendue :
1. **Bilan general** (2-3 phrases) : niveau global, dynamique de classe, ambiance de travail
2. **Points forts** : competences bien acquises, progres notables
3. **Axes d''amelioration** : lacunes recurrentes, competences a renforcer
4. **Recommandations** : pistes de remediation, objectifs pour la periode suivante
5. **Mentions indicatives** (optionnel, si donnees disponibles) : eleves a feliciter, a encourager, a alerter

Le texte doit etre directement utilisable en conseil de classe et exportable PDF.'
WHERE code = 'generate_council_report';
