-- ============================================================================
-- Teacher Assistant — Migration 003 : Données de référence
-- Niveaux, matières, année scolaire par défaut, programmes officiels, capacités
-- Idempotent : vérifie l'existence avant chaque insertion
-- Robuste : référence les sujets/niveaux par CODE (pas par ID)
-- ============================================================================

-- ── Nettoyage des données de référence mal liées (migration précédente avec IDs hardcodés) ──
-- Supprimer les program_topics dont le subject_id ne correspond à aucun sujet existant
DELETE FROM program_topics WHERE subject_id NOT IN (SELECT id FROM subjects);
-- Supprimer les program_topics dont le level_id ne correspond à aucun niveau existant
DELETE FROM program_topics WHERE level_id NOT IN (SELECT id FROM levels);

-- ── Année scolaire par défaut ──
INSERT OR IGNORE INTO academic_years (id, label, start_date, end_date, is_active)
VALUES (1, '2025-2026', '2025-09-01', '2026-07-04', 1);

-- ── Niveaux (UNIQUE sur code) ──
INSERT OR IGNORE INTO levels (code, label, short_label, sort_order)
VALUES ('1ERE', 'Première', '1ère', 1);
INSERT OR IGNORE INTO levels (code, label, short_label, sort_order)
VALUES ('TLE', 'Terminale', 'Tle', 2);

-- ── Matières (UNIQUE sur code) ──
INSERT OR IGNORE INTO subjects (code, label, short_label, color, icon, sort_order)
VALUES ('HGGSP', 'Histoire-Géographie, Géopolitique et Sciences politiques', 'HGGSP', '#7B3FA0', '🌍', 1);
INSERT OR IGNORE INTO subjects (code, label, short_label, color, icon, sort_order)
VALUES ('HIST', 'Histoire', 'Histoire', '#C0392B', '📜', 2);
INSERT OR IGNORE INTO subjects (code, label, short_label, color, icon, sort_order)
VALUES ('GEO', 'Géographie', 'Géographie', '#27AE60', '🗺️', 3);

-- ============================================================================
-- PROGRAMME OFFICIEL — HGGSP Terminale (6 thèmes)
-- ============================================================================

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T1', 'De nouveaux espaces de conquête', 26, 1
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T2', 'Faire la guerre, faire la paix', 26, 2
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T3', 'Histoire et mémoires', 26, 3
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T4', 'Identifier, protéger et valoriser le patrimoine', 26, 4
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T5', 'L''environnement, entre exploitation et protection', 26, 5
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T5' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T6', 'L''enjeu de la connaissance', 26, 6
FROM subjects s, levels l WHERE s.code = 'HGGSP' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T6' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

-- Chapitres HGGSP Tle (2 axes par thème — parent = thème via code lookup)

-- T1 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-A1', 'Conquêtes, affirmations de puissance et rivalités', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-A2', 'Enjeux diplomatiques et coopérations', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-A2' AND pt.topic_type = 'chapter');

-- T2 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-A1', 'La dimension politique de la guerre', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-A2', 'Le défi de la construction de la paix', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-A2' AND pt.topic_type = 'chapter');

-- T3 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-A1', 'Histoire et mémoires des conflits', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-A2', 'Histoire, mémoire et justice', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-A2' AND pt.topic_type = 'chapter');

-- T4 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-A1', 'Usages sociaux et politiques du patrimoine', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-A2', 'Patrimoine, la préservation entre tensions et conciliations', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-A2' AND pt.topic_type = 'chapter');

-- T5 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T5-A1', 'Exploiter, préserver et protéger', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T5' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T5-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T5-A2', 'Le changement climatique : approches historique et géopolitique', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T5' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T5-A2' AND pt.topic_type = 'chapter');

-- T6 chapitres
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T6-A1', 'Produire et diffuser des connaissances', 12, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T6' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T6-A1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T6-A2', 'La connaissance, enjeu politique et géopolitique', 12, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HGGSP' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T6' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T6-A2' AND pt.topic_type = 'chapter');

-- ============================================================================
-- PROGRAMME OFFICIEL — Histoire Terminale (4 thèmes, 8 chapitres)
-- ============================================================================

-- Thèmes Histoire Tle
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T1', 'Fragilités des démocraties, totalitarismes et Seconde Guerre mondiale', 13, 1
FROM subjects s, levels l WHERE s.code = 'HIST' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T2', 'La multiplication des acteurs internationaux dans un monde bipolaire', 13, 2
FROM subjects s, levels l WHERE s.code = 'HIST' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T3', 'Les remises en cause économiques, politiques et sociales des années 1970 à 1991', 13, 3
FROM subjects s, levels l WHERE s.code = 'HIST' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T4', 'Le monde, l''Europe et la France depuis les années 1990', 13, 4
FROM subjects s, levels l WHERE s.code = 'HIST' AND l.code = 'TLE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

-- Chapitres Histoire Tle
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-C1', 'L''impact de la crise de 1929 : démocraties fragilisées, régimes totalitaires', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-C2', 'La Seconde Guerre mondiale', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-C1', 'La fin de la Seconde Guerre mondiale et les débuts d''un nouvel ordre mondial', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-C2', 'Une nouvelle donne géopolitique : bipolarisation et émergence du Tiers monde', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-C1', 'La modification des grands équilibres économiques et politiques mondiaux', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-C2', 'Un tournant social, politique et culturel', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-C1', 'Nouveaux rapports de puissance et enjeux mondiaux', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-C2', 'La construction européenne entre élargissement et approfondissement', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'HIST' AND l.code = 'TLE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-C2' AND pt.topic_type = 'chapter');

-- ============================================================================
-- PROGRAMME OFFICIEL — Géographie Première (4 thèmes, 8 chapitres)
-- ============================================================================

-- Thèmes Géo 1ère
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T1', 'La métropolisation : un processus mondial différencié', 12, 1
FROM subjects s, levels l WHERE s.code = 'GEO' AND l.code = '1ERE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T2', 'Une diversification des espaces et des acteurs de la production', 12, 2
FROM subjects s, levels l WHERE s.code = 'GEO' AND l.code = '1ERE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T3', 'Les espaces ruraux : multifonctionnalité ou fragmentation ?', 12, 3
FROM subjects s, levels l WHERE s.code = 'GEO' AND l.code = '1ERE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, NULL, 'theme', 'T4', 'La Chine : des recompositions spatiales multiples', 12, 4
FROM subjects s, levels l WHERE s.code = 'GEO' AND l.code = '1ERE'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4' AND pt.topic_type = 'theme' AND pt.parent_id IS NULL);

-- Chapitres Géo 1ère
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-C1', 'Les villes à l''échelle mondiale, le poids croissant des métropoles', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T1-C2', 'Des métropoles inégales et en mutation', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T1' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T1-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-C1', 'Les espaces de production dans le monde', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T2-C2', 'Métropolisation, littoralisation et espaces productifs en France', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T2' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T2-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-C1', 'Des espaces ruraux aux fonctions de plus en plus variées', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T3-C2', 'Fragmentation et recomposition des espaces ruraux français', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T3' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T3-C2' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-C1', 'La Chine : des recompositions spatiales multiples (étude)', 6, 1
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-C1' AND pt.topic_type = 'chapter');

INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order)
SELECT 1, s.id, l.id, p.id, 'chapter', 'T4-C2', 'La Chine : les dynamiques des milieux', 6, 2
FROM subjects s, levels l, program_topics p WHERE s.code = 'GEO' AND l.code = '1ERE' AND p.subject_id = s.id AND p.level_id = l.id AND p.code = 'T4' AND p.topic_type = 'theme'
AND NOT EXISTS (SELECT 1 FROM program_topics pt WHERE pt.subject_id = s.id AND pt.level_id = l.id AND pt.code = 'T4-C2' AND pt.topic_type = 'chapter');

-- ============================================================================
-- CAPACITÉS / COMPÉTENCES (8 spécifiques + 8 générales)
-- ============================================================================

-- Capacités spécifiques (exercices type bac)
INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Composition', 'Problématiser', 'Formuler une problématique pertinente à partir d''un sujet', NULL, 4, 1
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Problématiser' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Composition', 'Organiser un plan', 'Construire un plan structuré et cohérent', NULL, 4, 2
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Organiser un plan' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Composition', 'Rédiger', 'Rédiger une argumentation claire, avec des exemples précis', NULL, 4, 3
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Rédiger' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Analyse document', 'Identifier un document', 'Identifier la nature, l''auteur, le contexte d''un document', NULL, 4, 4
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Identifier un document' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Analyse document', 'Extraire des informations', 'Relever les informations pertinentes dans un document', NULL, 4, 5
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Extraire des informations' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Analyse document', 'Exercer un regard critique', 'Porter un regard critique sur la source et son contenu', NULL, 4, 6
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Exercer un regard critique' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Croquis', 'Réaliser un croquis', 'Réaliser un croquis organisé avec légende structurée', NULL, 4, 7
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Réaliser un croquis' AND skill_type = 'exercise_specific');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'exercise_specific', 'Oral', 'Argumenter à l''oral', 'Présenter et défendre un argumentaire à l''oral', NULL, 4, 8
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Argumenter à l''oral' AND skill_type = 'exercise_specific');

-- Capacités générales (transversales)
INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Maîtriser les connaissances', 'Connaître les repères chronologiques', 'Maîtriser les dates et périodes clés', NULL, 4, 9
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Connaître les repères chronologiques' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Maîtriser les connaissances', 'Connaître les repères spatiaux', 'Localiser et situer sur une carte', NULL, 4, 10
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Connaître les repères spatiaux' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Maîtriser les connaissances', 'Maîtriser le vocabulaire disciplinaire', 'Utiliser le vocabulaire spécifique avec précision', NULL, 4, 11
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Maîtriser le vocabulaire disciplinaire' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Analyser', 'Analyser un sujet', 'Dégager le sens d''un sujet, ses enjeux et ses limites', NULL, 4, 12
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Analyser un sujet' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Analyser', 'Mettre en relation des documents', 'Confronter et mettre en relation des documents différents', NULL, 4, 13
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Mettre en relation des documents' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Raisonner', 'Justifier une démarche', 'Expliquer et justifier ses choix de méthode', NULL, 4, 14
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Justifier une démarche' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Raisonner', 'Exercer son esprit critique', 'Développer un regard critique et nuancé', NULL, 4, 15
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'Exercer son esprit critique' AND skill_type = 'general');

INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, max_level, sort_order)
SELECT 1, 'general', 'Communiquer', 'S''exprimer à l''écrit', 'Rédiger un texte clair et structuré', NULL, 4, 16
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE label = 'S''exprimer à l''écrit' AND skill_type = 'general');
