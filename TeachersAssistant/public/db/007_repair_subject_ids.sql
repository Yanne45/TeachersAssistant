-- ============================================================================
-- Teacher Assistant — Migration 007 : Réparation des subject_id
-- Corrige l'association matière ↔ programme en se basant sur le code
-- des thèmes/chapitres (pas sur les IDs hardcodés qui peuvent être faux).
-- Idempotent — peut être relancé sans danger.
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. RÉPARER LES THÈMES (parent_id IS NULL)
--    On identifie la matière par le préfixe du code :
--    T1..T6, SP1..SP5        → HGGSP
--    HT1..HT4, HP1..HP4     → Histoire
--    GT1..GT4, GTle1..GTle4  → Géographie
-- ══════════════════════════════════════════════════════════════════════════════

-- HGGSP themes (codes T1-T6)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'HGGSP')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND (code LIKE 'T_' OR code LIKE 'T__')
  AND code NOT LIKE 'HT%'
  AND code NOT LIKE 'GT%'
  AND code NOT LIKE 'HP%'
  AND code NOT LIKE 'SP%';

-- HGGSP Première themes (codes SP1-SP5)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'HGGSP')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'SP%';

-- Histoire Terminale themes (codes HT1-HT4)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'HIST')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'HT%';

-- Histoire Première themes (codes HP1-HP4)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'HIST')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'HP%';

-- Géographie Première themes (codes GT1-GT4, pas GTle)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'GEO')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'GT%'
  AND code NOT LIKE 'GTle%';

-- Géographie Terminale themes (codes GTle1-GTle4)
UPDATE program_topics
SET subject_id = (SELECT id FROM subjects WHERE code = 'GEO')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'GTle%';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RÉPARER LES CHAPITRES
--    Les chapitres héritent du subject_id de leur thème parent.
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE program_topics
SET subject_id = (
  SELECT p.subject_id
  FROM program_topics p
  WHERE p.id = program_topics.parent_id
)
WHERE parent_id IS NOT NULL
  AND topic_type IN ('chapter', 'point', 'sub_point');

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RÉPARER LES LEVELS
--    Même logique : le code du thème détermine le niveau.
--    T, HT, GTle → Terminale (TLE)
--    SP, HP, GT (pas GTle) → Première (PRE)
-- ══════════════════════════════════════════════════════════════════════════════

-- Terminale : T1-T6, HT1-HT4, GTle1-GTle4
UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'TLE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND (
    (code LIKE 'T_' OR code LIKE 'T__')
    AND code NOT LIKE 'HT%'
    AND code NOT LIKE 'GT%'
    AND code NOT LIKE 'HP%'
    AND code NOT LIKE 'SP%'
  );

UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'TLE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'HT%';

UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'TLE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'GTle%';

-- Première : SP1-SP5, HP1-HP4, GT1-GT4 (pas GTle)
UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'PRE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'SP%';

UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'PRE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'HP%';

UPDATE program_topics
SET level_id = (SELECT id FROM levels WHERE code = 'PRE')
WHERE parent_id IS NULL
  AND topic_type = 'theme'
  AND code LIKE 'GT%'
  AND code NOT LIKE 'GTle%';

-- Chapitres : héritent du level_id de leur parent
UPDATE program_topics
SET level_id = (
  SELECT p.level_id
  FROM program_topics p
  WHERE p.id = program_topics.parent_id
)
WHERE parent_id IS NOT NULL
  AND topic_type IN ('chapter', 'point', 'sub_point');
