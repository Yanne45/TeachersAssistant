-- ============================================================================
-- Teacher Assistant — Données de référence (003_reference_data.sql)
-- Niveaux, matières, programmes officiels, compétences
-- Idempotent : INSERT OR IGNORE — peut être relancé sans danger
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ══════════════════════════════════════════════
-- 1. NIVEAUX
-- ══════════════════════════════════════════════
INSERT OR IGNORE INTO levels (id, code, label, short_label, sort_order) VALUES
  (1, 'PRE', 'Première',  '1ère', 1),
  (2, 'TLE', 'Terminale', 'Tle',  2);

-- ══════════════════════════════════════════════
-- 2. MATIÈRES
-- ══════════════════════════════════════════════
INSERT OR IGNORE INTO subjects (id, code, label, short_label, color, icon, sort_order) VALUES
  (1, 'HIST','Histoire','Histoire','#2C3E7B','📘',1),
  (2, 'GEO','Géographie','Géo','#27774E','🌍',2),
  (3, 'HGGSP','Histoire-Géo, Géopolitique et Sciences Politiques','HGGSP','#7B3FA0','🏛',3);

-- ══════════════════════════════════════════════
-- 3. PROGRAMMES OFFICIELS
-- ══════════════════════════════════════════════

-- HGGSP Terminale — Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (1, 1, 3, 2, NULL, 'theme', 'T1', 'De nouveaux espaces de conquête', 24, 1),
  (2, 1, 3, 2, NULL, 'theme', 'T2', 'Faire la guerre, faire la paix', 24, 2),
  (3, 1, 3, 2, NULL, 'theme', 'T3', 'Histoire et mémoires', 24, 3),
  (4, 1, 3, 2, NULL, 'theme', 'T4', 'Identifier, protéger et valoriser le patrimoine', 24, 4),
  (5, 1, 3, 2, NULL, 'theme', 'T5', 'L''environnement, entre exploitation et protection', 24, 5),
  (6, 1, 3, 2, NULL, 'theme', 'T6', 'L''enjeu de la connaissance', 24, 6);

-- HGGSP Terminale — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (7,  1, 3, 2, 1, 'chapter', 'T1-C1', 'Conquêtes, affirmations de puissance et rivalités', 12, 1),
  (8,  1, 3, 2, 1, 'chapter', 'T1-C2', 'Enjeux diplomatiques et coopérations', 12, 2),
  (9,  1, 3, 2, 2, 'chapter', 'T2-C1', 'La dimension politique de la guerre', 12, 1),
  (10, 1, 3, 2, 2, 'chapter', 'T2-C2', 'Le défi de la construction de la paix', 12, 2),
  (11, 1, 3, 2, 3, 'chapter', 'T3-C1', 'Histoire et mémoires des conflits', 12, 1),
  (12, 1, 3, 2, 3, 'chapter', 'T3-C2', 'Histoire, mémoire et justice', 12, 2),
  (13, 1, 3, 2, 4, 'chapter', 'T4-C1', 'Usages sociaux et politiques du patrimoine', 12, 1),
  (14, 1, 3, 2, 4, 'chapter', 'T4-C2', 'Patrimoine, la préservation entre tensions et concurrences', 12, 2),
  (15, 1, 3, 2, 5, 'chapter', 'T5-C1', 'Exploiter, préserver et protéger', 12, 1),
  (16, 1, 3, 2, 5, 'chapter', 'T5-C2', 'Le changement climatique : approches historique et géopolitique', 12, 2),
  (17, 1, 3, 2, 6, 'chapter', 'T6-C1', 'Produire et diffuser des connaissances', 12, 1),
  (18, 1, 3, 2, 6, 'chapter', 'T6-C2', 'La connaissance, enjeu politique et géopolitique', 12, 2);

-- Histoire Terminale — Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (19, 1, 1, 2, NULL, 'theme', 'HT1', 'Les relations entre les puissances et l''opposition des modèles politiques', 22, 1),
  (20, 1, 1, 2, NULL, 'theme', 'HT2', 'La multiplication des acteurs internationaux dans un monde bipolaire', 22, 2),
  (21, 1, 1, 2, NULL, 'theme', 'HT3', 'Les remises en cause économiques, politiques et sociales des années 1970 à 1991', 22, 3),
  (22, 1, 1, 2, NULL, 'theme', 'HT4', 'Le monde, l''Europe et la France depuis les années 1990', 22, 4);

-- Histoire Terminale — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (23, 1, 1, 2, 19, 'chapter', 'HT1-C1', 'La Guerre froide (1947-1991)', 11, 1),
  (24, 1, 1, 2, 19, 'chapter', 'HT1-C2', 'Modèles et contre-modèles', 11, 2),
  (25, 1, 1, 2, 20, 'chapter', 'HT2-C1', 'La fin des empires et les nouveaux États', 11, 1),
  (26, 1, 1, 2, 20, 'chapter', 'HT2-C2', 'Enjeux et conflits dans le monde après 1945', 11, 2),
  (27, 1, 1, 2, 21, 'chapter', 'HT3-C1', 'La modification des grands équilibres économiques et politiques', 11, 1),
  (28, 1, 1, 2, 21, 'chapter', 'HT3-C2', 'Un tournant social, politique et culturel', 11, 2),
  (29, 1, 1, 2, 22, 'chapter', 'HT4-C1', 'Le monde après 1989 : nouvel ordre ou nouveau désordre ?', 11, 1),
  (30, 1, 1, 2, 22, 'chapter', 'HT4-C2', 'La construction européenne entre élargissement et approfondissement', 11, 2);

-- Géographie Première — Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (31, 1, 2, 1, NULL, 'theme', 'GT1', 'La métropolisation : un processus mondial différencié', 12, 1),
  (32, 1, 2, 1, NULL, 'theme', 'GT2', 'Une diversification des espaces et des acteurs de la production', 12, 2),
  (33, 1, 2, 1, NULL, 'theme', 'GT3', 'Les espaces ruraux : multifonctionnalité ou fragmentation ?', 12, 3),
  (34, 1, 2, 1, NULL, 'theme', 'GT4', 'La Chine : des recompositions spatiales multiples', 12, 4);

-- Géographie Première — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (35, 1, 2, 1, 31, 'chapter', 'GT1-C1', 'Les villes à l''échelle mondiale : le poids croissant des métropoles', 6, 1),
  (36, 1, 2, 1, 31, 'chapter', 'GT1-C2', 'Des métropoles inégales et en mutation', 6, 2),
  (37, 1, 2, 1, 32, 'chapter', 'GT2-C1', 'Les espaces de production dans le monde', 6, 1),
  (38, 1, 2, 1, 32, 'chapter', 'GT2-C2', 'Métropolisation, littoralisation des espaces productifs', 6, 2),
  (39, 1, 2, 1, 33, 'chapter', 'GT3-C1', 'La fragmentation des espaces ruraux', 6, 1),
  (40, 1, 2, 1, 33, 'chapter', 'GT3-C2', 'Affirmation des fonctions non agricoles et conflits d''usage', 6, 2),
  (41, 1, 2, 1, 34, 'chapter', 'GT4-C1', 'Urbanisation et métropolisation en Chine', 6, 1),
  (42, 1, 2, 1, 34, 'chapter', 'GT4-C2', 'Développement et recompositions territoriales en Chine', 6, 2);

-- ══════════════════════════════════════════════
-- 4. COMPÉTENCES / CAPACITÉS
-- ══════════════════════════════════════════════

-- Compétences spécifiques exercice
INSERT OR IGNORE INTO skills (id, academic_year_id, skill_type, category, label, description, subject_id, level_id, max_level, sort_order) VALUES
  (1, 1, 'exercise_specific', 'Analyse',     'Problématiser',            'Formuler une problématique pertinente à partir d''un sujet', NULL, NULL, 4, 1),
  (2, 1, 'exercise_specific', 'Structure',    'Construire un plan',       'Organiser un raisonnement logique et structuré', NULL, NULL, 4, 2),
  (3, 1, 'exercise_specific', 'Savoir',       'Mobiliser connaissances',  'Utiliser des connaissances précises et contextualisées', NULL, NULL, 4, 3),
  (4, 1, 'exercise_specific', 'Expression',   'Rédaction',               'Qualité de l''expression écrite, orthographe et syntaxe', NULL, NULL, 4, 4),
  (5, 1, 'exercise_specific', 'Analyse',      'Analyser un document',    'Prélever des informations, confronter, exercer son esprit critique', NULL, NULL, 4, 5),
  (6, 1, 'exercise_specific', 'Carto',        'Réaliser un croquis',     'Représenter spatialement des phénomènes géographiques', 2, NULL, 4, 6),
  (7, 1, 'exercise_specific', 'Argumentation','Argumenter',              'Développer un raisonnement appuyé sur des exemples', NULL, NULL, 4, 7),
  (8, 1, 'exercise_specific', 'Analyse',      'Étude critique de documents', 'Analyser, contextualiser et confronter un corpus documentaire', NULL, NULL, 4, 8);

-- Compétences générales (transversales)
INSERT OR IGNORE INTO skills (id, academic_year_id, skill_type, category, label, description, subject_id, level_id, max_level, sort_order) VALUES
  (9,  1, 'general', 'Méthode',     'Prise de notes',            'Prendre des notes efficacement en cours', NULL, NULL, 4, 9),
  (10, 1, 'general', 'Méthode',     'Travail en groupe',         'Collaborer en équipe et répartir les tâches', NULL, NULL, 4, 10),
  (11, 1, 'general', 'Oral',        'Expression orale',          'S''exprimer clairement à l''oral devant un groupe', NULL, NULL, 4, 11),
  (12, 1, 'general', 'Numérique',   'Recherche documentaire',    'Rechercher, sélectionner et trier l''information', NULL, NULL, 4, 12),
  (13, 1, 'general', 'Autonomie',   'Travail personnel',         'Organiser son travail et gérer son temps', NULL, NULL, 4, 13),
  (14, 1, 'general', 'Esprit crit.','Esprit critique',           'Porter un regard critique sur les sources et les discours', NULL, NULL, 4, 14),
  (15, 1, 'general', 'Oral',        'Grand oral',                'Préparer et présenter une argumentation structurée', NULL, NULL, 4, 15),
  (16, 1, 'general', 'Numérique',   'Outils numériques',         'Utiliser les outils numériques de manière raisonnée', NULL, NULL, 4, 16);
