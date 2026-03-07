-- ============================================================================
-- Teacher Assistant — Données de démonstration (002_seed_demo.sql)
-- Année 2025-2026, Zone C — À exécuter APRÈS 001_initial_schema.sql
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ══════════════════════════════════════════════
-- 1. ANNÉE SCOLAIRE
-- ══════════════════════════════════════════════
INSERT INTO academic_years (label, start_date, end_date, timezone, is_active)
VALUES ('2025-2026', '2025-09-01', '2026-07-04', 'Europe/Paris', 1);

-- ══════════════════════════════════════════════
-- 2. NIVEAUX
-- ══════════════════════════════════════════════
INSERT INTO levels (code, label, short_label, sort_order) VALUES
  ('PRE', 'Première',  '1ère', 1),
  ('TLE', 'Terminale', 'Tle',  2);

-- ══════════════════════════════════════════════
-- 3. MATIÈRES
-- ══════════════════════════════════════════════
INSERT INTO subjects (code, label, short_label, color, icon, sort_order) VALUES
  ('HIST','Histoire','Histoire','#2C3E7B','📘',1),
  ('GEO','Géographie','Géo','#27774E','🌍',2),
  ('HGGSP','Histoire-Géo, Géopolitique et Sciences Politiques','HGGSP','#7B3FA0','🏛',3);

-- ══════════════════════════════════════════════
-- 4. CLASSES
-- ══════════════════════════════════════════════
INSERT INTO classes (academic_year_id, level_id, name, short_name, student_count, sort_order) VALUES
  (1, 2, 'Terminale 2', 'Tle 2', 28, 1),
  (1, 2, 'Terminale 4', 'Tle 4', 30, 2),
  (1, 1, 'Première 3',  '1ère 3', 32, 3);

-- ══════════════════════════════════════════════
-- 5. VOLUMES HORAIRES
-- ══════════════════════════════════════════════
INSERT INTO subject_hour_allocations (academic_year_id, subject_id, level_id, hours_per_week, total_annual_hours) VALUES
  (1, 1, 2, 3, 90), (1, 2, 2, 3, 90), (1, 3, 2, 6, 180), (1, 2, 1, 3, 90);

-- ══════════════════════════════════════════════
-- 6. PÉRIMÈTRE ENSEIGNÉ
-- ══════════════════════════════════════════════
INSERT INTO teaching_scopes (academic_year_id, subject_id, level_id, class_id, is_active) VALUES
  (1,3,2,1,1),(1,3,2,2,1),(1,1,2,1,1),(1,1,2,2,1),(1,2,1,3,1);

-- ══════════════════════════════════════════════
-- 7. STRUCTURE JOURNÉE
-- ══════════════════════════════════════════════
INSERT INTO school_day_settings (academic_year_id, day_of_week, is_school_day, start_time, end_time, slot_duration) VALUES
  (1,1,1,'08:00','17:00',60),(1,2,1,'08:00','17:00',60),(1,3,1,'08:00','12:00',60),
  (1,4,1,'08:00','17:00',60),(1,5,1,'08:00','17:00',60),(1,6,0,'08:00','12:00',60),(1,7,0,'08:00','12:00',60);

INSERT INTO day_breaks (school_day_setting_id, label, start_time, end_time, break_type) VALUES
  (1,'Déjeuner','12:00','13:00','lunch'),(2,'Déjeuner','12:00','13:00','lunch'),
  (4,'Déjeuner','12:00','13:00','lunch'),(5,'Déjeuner','12:00','13:00','lunch');

-- ══════════════════════════════════════════════
-- 8. CALENDRIER SCOLAIRE (Zone C)
-- ══════════════════════════════════════════════
INSERT INTO calendar_periods (academic_year_id, label, period_type, start_date, end_date, impacts_teaching) VALUES
  (1,'Vacances Toussaint','vacation','2025-10-18','2025-11-03',1),
  (1,'Vacances Noël','vacation','2025-12-20','2026-01-05',1),
  (1,'Vacances hiver','vacation','2026-02-14','2026-03-02',1),
  (1,'Vacances printemps','vacation','2026-04-11','2026-04-27',1),
  (1,'Armistice','holiday','2025-11-11','2025-11-11',1),
  (1,'Noël','holiday','2025-12-25','2025-12-25',1),
  (1,'Jour de l''an','holiday','2026-01-01','2026-01-01',1),
  (1,'Lundi de Pâques','holiday','2026-04-06','2026-04-06',1),
  (1,'Fête du travail','holiday','2026-05-01','2026-05-01',1),
  (1,'Victoire 1945','holiday','2026-05-08','2026-05-08',1),
  (1,'Ascension','holiday','2026-05-14','2026-05-14',1),
  (1,'Pentecôte','holiday','2026-05-25','2026-05-25',1),
  (1,'Bac blanc 1','exam','2026-01-19','2026-01-23',0),
  (1,'Bac blanc 2','exam','2026-04-28','2026-04-30',0);

-- ══════════════════════════════════════════════
-- 9. PÉRIODES BULLETIN
-- ══════════════════════════════════════════════
INSERT INTO report_periods (academic_year_id, code, label, start_date, end_date, sort_order) VALUES
  (1,'T1','Trimestre 1','2025-09-01','2025-12-05',1),
  (1,'T2','Trimestre 2','2025-12-06','2026-03-13',2),
  (1,'T3','Trimestre 3','2026-03-14','2026-07-04',3);

-- ══════════════════════════════════════════════
-- 10. EMPLOI DU TEMPS
-- ══════════════════════════════════════════════
INSERT INTO timetable_slots (academic_year_id, day_of_week, start_time, end_time, subject_id, class_id, room, recurrence) VALUES
  (1,1,'08:00','10:00',3,1,'A102','all'),(1,1,'10:00','11:00',1,2,'B205','all'),
  (1,1,'14:00','16:00',3,2,'A102','all'),(1,2,'08:00','10:00',2,3,'C108','all'),
  (1,2,'10:00','12:00',1,1,'B205','all'),(1,3,'08:00','10:00',3,1,'A102','q1'),
  (1,4,'08:00','10:00',3,1,'A102','all'),(1,4,'10:00','12:00',3,2,'A102','all'),
  (1,4,'14:00','16:00',1,1,'B205','all'),(1,5,'08:00','10:00',2,3,'C108','all'),
  (1,5,'10:00','11:00',1,2,'B205','all');

-- ══════════════════════════════════════════════
-- 11. COMPÉTENCES
-- ══════════════════════════════════════════════
INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, level_id, max_level, sort_order) VALUES
  (1,'exercise_specific','Analyse','Problématiser','Formuler une problématique pertinente',NULL,NULL,4,1),
  (1,'exercise_specific','Structure','Construire un plan','Organiser un raisonnement logique',NULL,NULL,4,2),
  (1,'exercise_specific','Savoir','Mobiliser connaissances','Utiliser des connaissances précises',NULL,NULL,4,3),
  (1,'exercise_specific','Expression','Rédaction','Qualité de l''expression écrite',NULL,NULL,4,4),
  (1,'exercise_specific','Analyse','Analyser un document','Prélever, confronter, critiquer',NULL,NULL,4,5),
  (1,'exercise_specific','Carto','Réaliser un croquis','Représenter spatialement',2,NULL,4,6),
  (1,'general','Méthode','Prise de notes','Prendre des notes efficacement',NULL,NULL,4,7),
  (1,'general','Méthode','Travail en groupe','Collaborer en équipe',NULL,NULL,4,8),
  (1,'general','Oral','Expression orale','S''exprimer clairement',NULL,NULL,4,9),
  (1,'general','Numérique','Recherche documentaire','Rechercher et trier l''info',NULL,NULL,4,10),
  (1,'general','Autonomie','Travail personnel','Organiser son travail',NULL,NULL,4,11),
  (1,'general','Esprit crit.','Esprit critique','Regard critique sur les sources',NULL,NULL,4,12);

-- ══════════════════════════════════════════════
-- 12. PROGRAMME OFFICIEL
-- ══════════════════════════════════════════════

-- HGGSP Tle — Thèmes (id 1..6)
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (1,3,2,NULL,'theme','T1','De nouveaux espaces de conquête',24,1),
  (1,3,2,NULL,'theme','T2','Faire la guerre, faire la paix',24,2),
  (1,3,2,NULL,'theme','T3','Histoire et mémoires',24,3),
  (1,3,2,NULL,'theme','T4','Identifier, protéger et valoriser le patrimoine',24,4),
  (1,3,2,NULL,'theme','T5','L''environnement, entre exploitation et protection',24,5),
  (1,3,2,NULL,'theme','T6','L''enjeu de la connaissance',24,6);

-- Chapitres HGGSP (id 7..12)
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (1,3,2,1,'chapter','T1-C1','Conquêtes, affirmations de puissance et rivalités',12,1),
  (1,3,2,1,'chapter','T1-C2','Enjeux diplomatiques et coopérations',12,2),
  (1,3,2,2,'chapter','T2-C1','La dimension politique de la guerre',12,1),
  (1,3,2,2,'chapter','T2-C2','Le défi de la construction de la paix',12,2),
  (1,3,2,3,'chapter','T3-C1','Histoire et mémoires des conflits',12,1),
  (1,3,2,3,'chapter','T3-C2','Histoire, mémoire et justice',12,2);

-- Histoire Tle — Thèmes (id 13..14), Chapitres (id 15..16)
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (1,1,2,NULL,'theme','HT1','Les relations entre les puissances et l''opposition des modèles',20,1),
  (1,1,2,NULL,'theme','HT2','La multiplication des acteurs internationaux',20,2),
  (1,1,2,13,'chapter','HT1-C1','La Guerre froide (1947-1991)',10,1),
  (1,1,2,13,'chapter','HT1-C2','Modèles et contre-modèles',10,2);

-- Géo 1ère — Thèmes (id 17..18)
INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, expected_hours, sort_order) VALUES
  (1,2,1,NULL,'theme','GT1','La métropolisation : un processus mondial',18,1),
  (1,2,1,NULL,'theme','GT2','Une diversification des espaces productifs',18,2);

-- ══════════════════════════════════════════════
-- 13. SÉQUENCES
-- ══════════════════════════════════════════════
INSERT INTO sequences (academic_year_id, subject_id, level_id, title, description, total_hours, start_date, end_date, status, sort_order) VALUES
  (1,3,2,'De nouveaux espaces de conquête','Rivalités géopolitiques dans les espaces maritimes, aériens, spatiaux et numériques.',24,'2025-09-01','2025-10-17','done',1),
  (1,3,2,'Faire la guerre, faire la paix','Dimension politique et stratégique de la Guerre froide.',16,'2025-11-04','2025-12-19','in_progress',2),
  (1,3,2,'Histoire et mémoires','Comment l''histoire et la mémoire se construisent et s''affrontent.',20,'2026-01-06',NULL,'planned',3),
  (1,1,2,'La Guerre froide (1947-1991)','Monde bipolaire, crises majeures, effondrement soviétique.',10,'2025-09-15','2025-11-07','done',1),
  (1,2,1,'La métropolisation à l''échelle mondiale','Processus, acteurs et conséquences.',12,'2025-09-01','2025-10-31','in_progress',1);

INSERT INTO sequence_classes (sequence_id, class_id) VALUES
  (1,1),(1,2),(2,1),(2,2),(3,1),(3,2),(4,1),(4,2),(5,3);

INSERT INTO sequence_program_topics (sequence_id, program_topic_id, is_primary) VALUES
  (1,1,1),(1,7,0),(1,8,0),(2,2,1),(2,9,0),(2,10,0),(3,3,1),(4,13,1),(4,15,0),(5,17,1);

INSERT INTO sequence_skills (sequence_id, skill_id) VALUES
  (1,1),(1,3),(1,5),(2,1),(2,2),(2,3),(2,5),(4,1),(4,3),(4,4),(5,3),(5,5),(5,6);

-- ══════════════════════════════════════════════
-- 14. SÉANCES
-- ══════════════════════════════════════════════

-- Séquence 2 (HGGSP Guerre froide) — 4 séances
INSERT INTO sessions (sequence_id, title, objectives, activities, lesson_plan, duration_minutes, session_number, status, session_date, source, sort_order) VALUES
  (2,'Introduction — Le monde bipolaire',
   'Comprendre la mise en place du système bipolaire après 1945.',
   'Analyse discours Churchill. Chronologie Guerre froide.',
   '1. Accroche : discours Churchill (15 min)\n2. Cours dialogué : origines (30 min)\n3. Analyse docs en binôme (45 min)\n4. Trace écrite (30 min)',
   120,1,'done','2025-11-04','manual',1),
  (2,'Berlin, symbole de la Guerre froide',
   'Analyser Berlin comme lieu symbolique de l''affrontement Est-Ouest.',
   'Étude de cas : mur de Berlin. Photographies et témoignages.',
   '1. Rappel (10 min)\n2. Étude de cas Berlin 1948-1989 (40 min)\n3. Travail de groupe (40 min)\n4. Synthèse (30 min)',
   120,2,'done','2025-11-10','manual',2),
  (2,'Crises et détente (1962-1985)',
   'Identifier moments de tension et de détente.',
   'Frise chronologique collaborative. Crise de Cuba.',
   '1. Construction frise (20 min)\n2. Cuba 1962 (30 min)\n3. Débat guidé (30 min)\n4. Trace écrite (10 min)',
   120,3,'ready','2025-11-17','manual',3),
  (2,'Effondrement du bloc soviétique',
   'Comprendre les facteurs de l''effondrement.',
   'Discours Gorbatchev. Images d''archives.',
   '',120,4,'planned','2025-11-24','manual',4);

-- Séquence 4 (Histoire) — 3 séances
INSERT INTO sessions (sequence_id, title, objectives, activities, duration_minutes, session_number, status, session_date, source, sort_order) VALUES
  (4,'Un monde bipolaire','Identifier les deux blocs.','Carte + documents',120,1,'done','2025-09-15','manual',1),
  (4,'Les crises de la Guerre froide','Localiser les principales crises.','Frise + études de cas',120,2,'done','2025-09-29','manual',2),
  (4,'La fin de la Guerre froide','Comprendre l''effondrement.','Documents + débat',120,3,'done','2025-10-13','manual',3);

-- Séquence 5 (Géo 1ère) — 3 séances
INSERT INTO sessions (sequence_id, title, objectives, activities, duration_minutes, session_number, status, session_date, source, sort_order) VALUES
  (5,'Qu''est-ce qu''une métropole ?','Définir et caractériser.','Données statistiques',120,1,'done','2025-09-02','manual',1),
  (5,'Métropolisation et inégalités','Montrer les effets inégaux.','Croquis + analyse',120,2,'ready','2025-09-16','manual',2),
  (5,'Étude de cas : Londres','Analyser une métropole mondiale.','Dossier documentaire',120,3,'planned','2025-09-30','manual',3);

-- ══════════════════════════════════════════════
-- 15. ÉLÈVES
-- ══════════════════════════════════════════════

-- Tle 2 (28 élèves, id 1..28)
INSERT INTO students (last_name, first_name, birth_year, gender) VALUES
  ('ADRIEN','Camille',2007,'F'),('BAUMONT','Lucas',2007,'M'),('BERNARD','Emma',2008,'F'),
  ('BROSSARD','Nathan',2007,'M'),('CHEN','Mei',2008,'F'),('CLÉMENT','Hugo',2007,'M'),
  ('DA SILVA','Ana',2008,'F'),('DUBOIS','Théo',2007,'M'),('DUPONT','Léa',2008,'F'),
  ('FAURE','Mathis',2007,'M'),('GARNIER','Chloé',2008,'F'),('GIRARD','Raphaël',2007,'M'),
  ('HENRY','Louise',2008,'F'),('LAURENT','Enzo',2007,'M'),('LEBLANC','Manon',2008,'F'),
  ('MARTIN','Arthur',2007,'M'),('MOREAU','Jade',2008,'F'),('NGUYEN','Khanh',2008,'M'),
  ('PETIT','Thomas',2007,'M'),('ROBERT','Sarah',2008,'F'),('ROUX','Gabriel',2007,'M'),
  ('SIMON','Alice',2008,'F'),('THOMAS','Maxime',2007,'M'),('VASSEUR','Clara',2008,'F'),
  ('VIDAL','Paul',2007,'M'),('WEBER','Juliette',2008,'F'),('YAMADA','Kenji',2008,'M'),
  ('ZIANI','Inès',2008,'F');

INSERT INTO student_class_enrollments (student_id, class_id, enrollment_date, is_active)
SELECT id, 1, '2025-09-01', 1 FROM students WHERE id BETWEEN 1 AND 28;

-- Tle 4 (12 élèves, id 29..40)
INSERT INTO students (last_name, first_name, birth_year, gender) VALUES
  ('ALLARD','Mathilde',2007,'F'),('BONNET','Ethan',2007,'M'),('CARPENTIER','Lisa',2008,'F'),
  ('DESCHAMPS','Axel',2007,'M'),('FOURNIER','Eva',2008,'F'),('GUILLOT','Romain',2007,'M'),
  ('HUBERT','Nina',2008,'F'),('JOLIVET','Adam',2007,'M'),('LACROIX','Zoé',2008,'F'),
  ('MARCHAND','Léo',2007,'M'),('PERRIN','Lina',2008,'F'),('RENAUD','Jules',2007,'M');

INSERT INTO student_class_enrollments (student_id, class_id, enrollment_date, is_active)
SELECT id, 2, '2025-09-01', 1 FROM students WHERE id BETWEEN 29 AND 40;

-- ══════════════════════════════════════════════
-- 16. CAHIER DE TEXTES
-- ══════════════════════════════════════════════
INSERT INTO lesson_log (session_id, class_id, subject_id, log_date, title, content, activities, homework, homework_due_date, source) VALUES
  (1,1,3,'2025-11-04','Introduction — Le monde bipolaire',
   'Mise en place du système bipolaire après 1945.',
   'Analyse discours Churchill. Chronologie.',
   'Lire chapitre 1 p. 24-35.','2025-11-10','session'),
  (2,1,3,'2025-11-10','Berlin, symbole de la Guerre froide',
   'Berlin comme lieu symbolique.',
   'Photographies et témoignages du mur.',
   'Rédiger intro commentaire pour le 17/11.','2025-11-17','session'),
  (5,1,1,'2025-09-15','Un monde bipolaire',
   'Les deux blocs et leurs logiques.',
   'Analyse carte + documents.',NULL,NULL,'session');

-- ══════════════════════════════════════════════
-- 17. DEVOIR + NOTES (28 copies)
-- ══════════════════════════════════════════════
INSERT INTO assignments (academic_year_id, class_id, subject_id, sequence_id, assignment_type_id, title, max_score, coefficient, assignment_date, due_date, status, is_graded) VALUES
  (1,1,3,2,1,'Dissertation — La Guerre froide, conflit idéologique et géopolitique',20,1.0,'2025-11-14','2025-11-28','correcting',1);

INSERT INTO assignment_skill_map (assignment_id, skill_id, weight) VALUES
  (1,1,1.0),(1,2,1.0),(1,3,1.0),(1,4,1.0),(1,5,0.5);

INSERT INTO submissions (assignment_id, student_id, score, status, submitted_at, graded_at) VALUES
  (1,1,14,'final','2025-11-28','2025-12-05'),(1,2,11,'final','2025-11-28','2025-12-05'),
  (1,3,16,'final','2025-11-28','2025-12-05'),(1,4,8,'final','2025-11-28','2025-12-05'),
  (1,5,15,'final','2025-11-28','2025-12-05'),(1,6,10,'final','2025-11-28','2025-12-05'),
  (1,7,13,'final','2025-11-28','2025-12-05'),(1,8,9,'final','2025-11-28','2025-12-05'),
  (1,9,14,'final','2025-11-28','2025-12-05'),(1,10,12,'final','2025-11-28','2025-12-05'),
  (1,11,11,'final','2025-11-28','2025-12-05'),(1,12,7,'final','2025-11-28','2025-12-05'),
  (1,13,15,'final','2025-11-28','2025-12-05'),(1,14,13,'to_confirm','2025-11-28',NULL),
  (1,15,10,'to_confirm','2025-11-28',NULL),(1,16,18,'final','2025-11-28','2025-12-05'),
  (1,17,12,'final','2025-11-28','2025-12-05'),(1,18,11,'final','2025-11-28','2025-12-05'),
  (1,19,6,'to_confirm','2025-11-28',NULL),(1,20,13,'final','2025-11-28','2025-12-05'),
  (1,21,9,'final','2025-11-28','2025-12-05'),(1,22,14,'final','2025-11-28','2025-12-05'),
  (1,23,10,'final','2025-11-28','2025-12-05'),(1,24,16,'final','2025-11-28','2025-12-05'),
  (1,25,4,'final','2025-11-28','2025-12-05'),(1,26,12,'final','2025-11-28','2025-12-05'),
  (1,27,11,'final','2025-11-28','2025-12-05'),(1,28,15,'final','2025-11-28','2025-12-05');

-- ══════════════════════════════════════════════
-- 18. ÉVALUATIONS COMPÉTENCES (6 élèves représentatifs)
-- ══════════════════════════════════════════════

-- DUPONT Léa (sub 9) — 14/20, bon profil
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (9,1,3,'manual'),(9,2,3,'manual'),(9,3,4,'manual'),(9,4,3,'manual'),(9,5,2,'manual');
-- MARTIN Arthur (sub 16) — 18/20, excellent
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (16,1,4,'manual'),(16,2,4,'manual'),(16,3,4,'manual'),(16,4,3,'manual'),(16,5,4,'manual');
-- BROSSARD Nathan (sub 4) — 8/20, difficultés
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (4,1,1,'manual'),(4,2,2,'manual'),(4,3,2,'manual'),(4,4,1,'manual'),(4,5,1,'manual');
-- BERNARD Emma (sub 3) — 16/20, très bon
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (3,1,3,'manual'),(3,2,4,'manual'),(3,3,3,'manual'),(3,4,3,'manual'),(3,5,3,'manual');
-- VIDAL Paul (sub 25) — 4/20, en grande difficulté
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (25,1,1,'manual'),(25,2,1,'manual'),(25,3,1,'manual'),(25,4,1,'manual'),(25,5,1,'manual');
-- CHEN Mei (sub 5) — 15/20, profil solide
INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source) VALUES
  (5,1,3,'manual'),(5,2,3,'manual'),(5,3,4,'manual'),(5,4,3,'manual'),(5,5,3,'manual');

-- Feedback qualitatif
INSERT INTO submission_feedback (submission_id, feedback_type, content, source, sort_order) VALUES
  (9,'strength','Bonne maîtrise des connaissances factuelles','manual',0),
  (9,'strength','Problématique claire et pertinente','manual',1),
  (9,'weakness','Analyse documentaire encore trop descriptive','manual',2),
  (16,'strength','Excellente capacité d''argumentation','manual',0),
  (16,'strength','Connaissances très précises et bien mobilisées','manual',1),
  (16,'weakness','Introduction un peu longue','manual',2),
  (4,'weakness','Plan confus, pas de problématique','manual',0),
  (4,'weakness','Connaissances imprécises','manual',1),
  (4,'strength','Effort de rédaction visible','manual',2),
  (25,'weakness','Hors-sujet partiel','manual',0),
  (25,'weakness','Aucune référence précise','manual',1),
  (25,'weakness','Expression très maladroite','manual',2);

-- ══════════════════════════════════════════════
-- 19. OBSERVATIONS COMPÉTENCES T1 (pour Dupont Léa)
-- ══════════════════════════════════════════════
INSERT INTO student_skill_observations (student_id, skill_id, report_period_id, level, source) VALUES
  (9,1,1,2,'computed'),(9,2,1,2,'computed'),(9,3,1,3,'computed'),(9,4,1,2,'computed'),(9,5,1,2,'computed'),
  (9,1,2,3,'computed'),(9,2,2,3,'computed'),(9,3,2,4,'computed'),(9,4,2,3,'computed'),(9,5,2,2,'computed');

-- MARTIN Arthur T1+T2
INSERT INTO student_skill_observations (student_id, skill_id, report_period_id, level, source) VALUES
  (16,1,1,3,'computed'),(16,2,1,3,'computed'),(16,3,1,4,'computed'),(16,4,1,3,'computed'),(16,5,1,3,'computed'),
  (16,1,2,4,'computed'),(16,2,2,4,'computed'),(16,3,2,4,'computed'),(16,4,2,3,'computed'),(16,5,2,4,'computed');

-- ══════════════════════════════════════════════
-- 20. PROFILS PÉRIODE + BULLETINS
-- ══════════════════════════════════════════════

-- Profils T1 pour quelques élèves
INSERT INTO student_period_profiles (student_id, report_period_id, behavior, work_ethic, participation, autonomy, methodology) VALUES
  (9,1,4,4,3,4,3),   -- Dupont Léa — bonne élève
  (16,1,5,5,5,4,4),  -- Martin Arthur — excellent
  (4,1,3,2,2,2,2),   -- Brossard Nathan — difficultés
  (25,1,2,1,1,1,1);  -- Vidal Paul — en grande difficulté

-- Bulletins T1
INSERT INTO bulletin_entries (student_id, report_period_id, entry_type, subject_id, content, status, source) VALUES
  (9,1,'discipline',3,'Léa fournit un travail régulier et sérieux. Ses connaissances sont solides et ses analyses gagnent en finesse. L''analyse documentaire reste à approfondir. Bon trimestre.','final','manual'),
  (16,1,'discipline',3,'Arthur est un élève brillant qui produit un travail d''excellente qualité. Ses dissertations sont remarquablement construites. À poursuivre ainsi.','final','manual'),
  (4,1,'discipline',3,'Nathan rencontre des difficultés méthodologiques importantes. La construction du plan et la formulation de la problématique doivent être retravaillées. Encouragements pour les efforts fournis.','final','manual'),
  (25,1,'discipline',3,'Paul est en grande difficulté. Le travail n''est pas suffisant et les connaissances sont trop lacunaires. Un travail régulier et un recours à l''aide au devoir sont indispensables.','final','manual');

-- Versions des appréciations
INSERT INTO bulletin_entry_versions (bulletin_entry_id, content, version_number, source) VALUES
  (1,'Léa fournit un travail régulier et sérieux. Ses connaissances sont solides et ses analyses gagnent en finesse. L''analyse documentaire reste à approfondir. Bon trimestre.',1,'manual'),
  (2,'Arthur est un élève brillant qui produit un travail d''excellente qualité. Ses dissertations sont remarquablement construites. À poursuivre ainsi.',1,'manual'),
  (3,'Nathan rencontre des difficultés méthodologiques importantes. La construction du plan et la formulation de la problématique doivent être retravaillées. Encouragements pour les efforts fournis.',1,'manual'),
  (4,'Paul est en grande difficulté. Le travail n''est pas suffisant et les connaissances sont trop lacunaires. Un travail régulier et un recours à l''aide au devoir sont indispensables.',1,'manual');

-- ══════════════════════════════════════════════
-- 21. NOTIFICATIONS
-- ══════════════════════════════════════════════
INSERT INTO notifications (notification_type, priority, title, message, link, is_read) VALUES
  ('alert','high','Séquence en retard','La séquence « Faire la guerre, faire la paix » a 2 semaines de retard.','/preparation/sequences/2',0),
  ('reminder','medium','Cahier de textes','Entrée du 17/11 non remplie pour Tle 2.','/cahier-de-textes/terminale-2',0),
  ('reminder','medium','Corrections en attente','3 copies Tle 2 restent à confirmer.','/evaluation/devoirs/1/correction-serie',0),
  ('info','low','Contenu IA prêt','La fiche de révision « Guerre froide » a été générée.','/preparation/ia/historique',1),
  ('system','low','Sauvegarde effectuée','Sauvegarde automatique du 01/12/2025 terminée.',NULL,1);

-- ══════════════════════════════════════════════
-- 22. EXPORT SETTINGS
-- ══════════════════════════════════════════════
INSERT INTO export_settings (teacher_name, teacher_title, school_name, school_address, footer_text, header_color) VALUES
  ('M. Durand', 'Professeur d''Histoire-Géographie', 'Lycée Victor Hugo', '12 rue des Lettres, 75005 Paris', 'Lycée Victor Hugo — Année 2025-2026', '#3DB4C6');
