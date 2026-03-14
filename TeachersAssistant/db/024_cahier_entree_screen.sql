-- ============================================================================
-- Migration 024 : Ajouter l'ecran cahier_entree au mapping generate_lesson_log
-- ============================================================================

UPDATE ai_tasks SET target_screens = '["generateur_ia","sequence_detail","cahier_entree"]'
  WHERE code = 'generate_lesson_log';
