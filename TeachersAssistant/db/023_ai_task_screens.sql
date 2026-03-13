-- ============================================================================
-- Migration 023 : target_screens — Mapping declaratif tache IA → ecran(s)
-- Chaque tache IA declare sur quel(s) ecran(s) elle apparait via un JSON array.
-- Les ecrans utilisent getByScreen() pour decouvrir automatiquement leurs taches.
-- ============================================================================

ALTER TABLE ai_tasks ADD COLUMN target_screens TEXT NOT NULL DEFAULT '["generateur_ia"]';

-- ── Contenus : ecrans preparation ─────────────────────────────────────────

UPDATE ai_tasks SET target_screens = '["generateur_ia","sequence_detail"]'
  WHERE code IN ('generate_course', 'generate_activity', 'generate_written_trace', 'generate_session_outline');

UPDATE ai_tasks SET target_screens = '["generateur_ia","sequence_detail"]'
  WHERE code = 'generate_lesson_log';

UPDATE ai_tasks SET target_screens = '["generateur_ia"]'
  WHERE code IN ('generate_revision_sheet', 'generate_slideshow', 'generate_problematisation', 'convert_level', 'generate_croquis_legend');

-- ── Evaluations : ecrans devoir / correction ──────────────────────────────

UPDATE ai_tasks SET target_screens = '["generateur_ia","devoir_form"]'
  WHERE code IN ('generate_exam_subject', 'generate_exam_answer');

UPDATE ai_tasks SET target_screens = '["generateur_ia"]'
  WHERE code IN ('generate_jury_questions', 'evaluate_grand_oral');

-- ── Planification ─────────────────────────────────────────────────────────

UPDATE ai_tasks SET target_screens = '["generateur_ia","sequence_detail"]'
  WHERE code = 'generate_session_plan';

-- ── Correction & suivi ────────────────────────────────────────────────────

UPDATE ai_tasks SET target_screens = '["generateur_ia","correction_serie"]'
  WHERE code IN ('analyze_submission', 'generate_class_report');

UPDATE ai_tasks SET target_screens = '["generateur_ia","fiche_eleve"]'
  WHERE code IN ('generate_appreciation', 'generate_pp_appreciation', 'generate_orientation');

-- ── Systeme (generateur IA uniquement) ────────────────────────────────────

UPDATE ai_tasks SET target_screens = '["generateur_ia"]'
  WHERE code IN ('classify_document', 'parse_official_program');
