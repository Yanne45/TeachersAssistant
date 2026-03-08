-- ============================================================================
-- Teacher Assistant — Migration 004 : Mots-clés des chapitres du programme
-- Table de jonction program_topic_keywords + données de référence
-- ============================================================================
PRAGMA foreign_keys = ON;

-- Table mots-clés associés aux topics du programme
CREATE TABLE IF NOT EXISTS program_topic_keywords (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    program_topic_id INTEGER NOT NULL REFERENCES program_topics(id) ON DELETE CASCADE,
    keyword         TEXT    NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(program_topic_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_ptk_topic ON program_topic_keywords(program_topic_id);

-- ══════════════════════════════════════════════
-- HGGSP Terminale — Mots-clés par chapitre
-- ══════════════════════════════════════════════

-- T1-C1 Conquêtes, affirmations de puissance et rivalités (id=7)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (7, 'conquête spatiale', 1),
  (7, 'course à l''espace', 2),
  (7, 'rivalités géopolitiques', 3),
  (7, 'océans', 4),
  (7, 'fonds marins', 5),
  (7, 'puissance', 6),
  (7, 'souveraineté', 7);

-- T1-C2 Enjeux diplomatiques et coopérations (id=8)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (8, 'coopération internationale', 1),
  (8, 'ISS', 2),
  (8, 'droit de la mer', 3),
  (8, 'CNUDM', 4),
  (8, 'Antarctique', 5),
  (8, 'gouvernance mondiale', 6),
  (8, 'multilatéralisme', 7);

-- T2-C1 La dimension politique de la guerre (id=9)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (9, 'Clausewitz', 1),
  (9, 'guerre totale', 2),
  (9, 'guerre asymétrique', 3),
  (9, 'terrorisme', 4),
  (9, 'conflit armé', 5),
  (9, 'stratégie militaire', 6);

-- T2-C2 Le défi de la construction de la paix (id=10)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (10, 'ONU', 1),
  (10, 'maintien de la paix', 2),
  (10, 'justice internationale', 3),
  (10, 'CPI', 4),
  (10, 'traités de paix', 5),
  (10, 'réconciliation', 6),
  (10, 'sécurité collective', 7);

-- T3-C1 Histoire et mémoires des conflits (id=11)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (11, 'mémoire collective', 1),
  (11, 'commémoration', 2),
  (11, 'devoir de mémoire', 3),
  (11, 'génocide', 4),
  (11, 'Shoah', 5),
  (11, 'guerre d''Algérie', 6),
  (11, 'travail de l''historien', 7);

-- T3-C2 Histoire, mémoire et justice (id=12)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (12, 'justice transitionnelle', 1),
  (12, 'tribunal de Nuremberg', 2),
  (12, 'TPIY', 3),
  (12, 'amnistie', 4),
  (12, 'réparation', 5),
  (12, 'vérité et réconciliation', 6);

-- T4-C1 Usages sociaux et politiques du patrimoine (id=13)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (13, 'patrimoine', 1),
  (13, 'UNESCO', 2),
  (13, 'patrimoine mondial', 3),
  (13, 'patrimonialisation', 4),
  (13, 'identité nationale', 5),
  (13, 'soft power', 6);

-- T4-C2 Patrimoine, la préservation entre tensions et concurrences (id=14)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (14, 'restauration', 1),
  (14, 'destruction', 2),
  (14, 'conflit armé et patrimoine', 3),
  (14, 'tourisme de masse', 4),
  (14, 'restitution', 5),
  (14, 'pillage', 6);

-- T5-C1 Exploiter, préserver et protéger (id=15)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (15, 'ressources naturelles', 1),
  (15, 'développement durable', 2),
  (15, 'exploitation', 3),
  (15, 'biodiversité', 4),
  (15, 'forêt amazonienne', 5),
  (15, 'transition écologique', 6);

-- T5-C2 Le changement climatique (id=16)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (16, 'changement climatique', 1),
  (16, 'COP', 2),
  (16, 'accords de Paris', 3),
  (16, 'GIEC', 4),
  (16, 'réchauffement', 5),
  (16, 'géopolitique du climat', 6),
  (16, 'justice climatique', 7);

-- T6-C1 Produire et diffuser des connaissances (id=17)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (17, 'recherche scientifique', 1),
  (17, 'universités', 2),
  (17, 'diffusion du savoir', 3),
  (17, 'big data', 4),
  (17, 'société de la connaissance', 5),
  (17, 'liberté académique', 6);

-- T6-C2 La connaissance, enjeu politique et géopolitique (id=18)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (18, 'cyberespace', 1),
  (18, 'guerre de l''information', 2),
  (18, 'fake news', 3),
  (18, 'espionnage', 4),
  (18, 'soft power culturel', 5),
  (18, 'intelligence artificielle', 6),
  (18, 'souveraineté numérique', 7);

-- ══════════════════════════════════════════════
-- Histoire Terminale — Mots-clés par chapitre
-- ══════════════════════════════════════════════

-- HT1-C1 La Guerre froide (id=23)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (23, 'Guerre froide', 1),
  (23, 'bipolarisation', 2),
  (23, 'rideau de fer', 3),
  (23, 'endiguement', 4),
  (23, 'crise de Cuba', 5),
  (23, 'course aux armements', 6),
  (23, 'détente', 7);

-- HT1-C2 Modèles et contre-modèles (id=24)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (24, 'modèle américain', 1),
  (24, 'modèle soviétique', 2),
  (24, 'capitalisme', 3),
  (24, 'communisme', 4),
  (24, 'société de consommation', 5),
  (24, 'propagande', 6),
  (24, 'contre-culture', 7);

-- HT2-C1 La fin des empires et les nouveaux États (id=25)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (25, 'décolonisation', 1),
  (25, 'tiers-monde', 2),
  (25, 'non-alignement', 3),
  (25, 'Bandung', 4),
  (25, 'indépendance', 5),
  (25, 'néocolonialisme', 6);

-- HT2-C2 Enjeux et conflits dans le monde après 1945 (id=26)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (26, 'conflits régionaux', 1),
  (26, 'Proche-Orient', 2),
  (26, 'Moyen-Orient', 3),
  (26, 'guerre du Vietnam', 4),
  (26, 'conflit israélo-arabe', 5),
  (26, 'guerre par procuration', 6);

-- HT3-C1 La modification des grands équilibres (id=27)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (27, 'choc pétrolier', 1),
  (27, 'crise économique', 2),
  (27, 'néolibéralisme', 3),
  (27, 'Reagan', 4),
  (27, 'Thatcher', 5),
  (27, 'mondialisation', 6),
  (27, 'stagflation', 7);

-- HT3-C2 Un tournant social, politique et culturel (id=28)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (28, 'Mai 68', 1),
  (28, 'féminisme', 2),
  (28, 'droits civiques', 3),
  (28, 'écologie politique', 4),
  (28, 'société civile', 5),
  (28, 'contestation', 6);

-- HT4-C1 Le monde après 1989 (id=29)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (29, 'chute du mur de Berlin', 1),
  (29, 'nouvel ordre mondial', 2),
  (29, 'hyperpuissance américaine', 3),
  (29, '11 septembre', 4),
  (29, 'multipolarité', 5),
  (29, 'guerre du Golfe', 6);

-- HT4-C2 La construction européenne (id=30)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (30, 'Union européenne', 1),
  (30, 'traité de Maastricht', 2),
  (30, 'élargissement', 3),
  (30, 'approfondissement', 4),
  (30, 'euro', 5),
  (30, 'Brexit', 6),
  (30, 'souveraineté européenne', 7);

-- ══════════════════════════════════════════════
-- Géographie Première — Mots-clés par chapitre
-- ══════════════════════════════════════════════

-- GT1-C1 Les villes à l'échelle mondiale (id=35)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (35, 'métropolisation', 1),
  (35, 'ville mondiale', 2),
  (35, 'mégapole', 3),
  (35, 'réseau urbain', 4),
  (35, 'urbanisation', 5),
  (35, 'hiérarchie urbaine', 6);

-- GT1-C2 Des métropoles inégales et en mutation (id=36)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (36, 'gentrification', 1),
  (36, 'fragmentation socio-spatiale', 2),
  (36, 'ségrégation', 3),
  (36, 'étalement urbain', 4),
  (36, 'ville durable', 5),
  (36, 'mobilités', 6);

-- GT2-C1 Les espaces de production dans le monde (id=37)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (37, 'mondialisation', 1),
  (37, 'chaîne de valeur', 2),
  (37, 'firmes transnationales', 3),
  (37, 'division internationale du travail', 4),
  (37, 'compétitivité', 5),
  (37, 'désindustrialisation', 6);

-- GT2-C2 Métropolisation, littoralisation (id=38)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (38, 'littoralisation', 1),
  (38, 'ZIP', 2),
  (38, 'façade maritime', 3),
  (38, 'hub', 4),
  (38, 'logistique', 5),
  (38, 'conteneurisation', 6);

-- GT3-C1 La fragmentation des espaces ruraux (id=39)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (39, 'espace rural', 1),
  (39, 'agriculture productiviste', 2),
  (39, 'déprise rurale', 3),
  (39, 'périurbanisation', 4),
  (39, 'désertification', 5),
  (39, 'PAC', 6);

-- GT3-C2 Fonctions non agricoles et conflits d'usage (id=40)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (40, 'multifonctionnalité', 1),
  (40, 'tourisme rural', 2),
  (40, 'conflit d''usage', 3),
  (40, 'néo-ruraux', 4),
  (40, 'circuits courts', 5),
  (40, 'transition agricole', 6);

-- GT4-C1 Urbanisation et métropolisation en Chine (id=41)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (41, 'Chine', 1),
  (41, 'mégalopole', 2),
  (41, 'exode rural', 3),
  (41, 'ZES', 4),
  (41, 'Nouvelles Routes de la Soie', 5),
  (41, 'smart city', 6);

-- GT4-C2 Développement et recompositions territoriales en Chine (id=42)
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (42, 'inégalités territoriales', 1),
  (42, 'littoral chinois', 2),
  (42, 'Chine intérieure', 3),
  (42, 'développement', 4),
  (42, 'aménagement du territoire', 5),
  (42, 'puissance émergente', 6);
