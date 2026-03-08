-- ============================================================================
-- Teacher Assistant — Migration 009 : Nettoyage des doublons levels/subjects
--
-- Corrige les doublons créés par l'ancien système de migrations qui rejouait
-- tous les INSERT à chaque ouverture de base.
-- Réaffecte les FK vers l'id canonique (MIN par code) puis supprime les extra.
-- Tables vérifiées d'après 001_initial_schema.sql.
-- ============================================================================

-- ── levels ──

UPDATE classes SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = classes.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE subject_hour_allocations SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = subject_hour_allocations.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE subject_program_structures SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = subject_program_structures.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE teaching_scopes SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = teaching_scopes.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE program_topics SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = program_topics.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE skills SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = skills.level_id))
  WHERE level_id IS NOT NULL AND level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE sequence_templates SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = sequence_templates.level_id))
  WHERE level_id IS NOT NULL AND level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE sequences SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = sequences.level_id))
  WHERE level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE documents SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = documents.level_id))
  WHERE level_id IS NOT NULL AND level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

UPDATE ai_generations SET level_id = (SELECT MIN(id) FROM levels WHERE code = (SELECT code FROM levels l2 WHERE l2.id = ai_generations.level_id))
  WHERE level_id IS NOT NULL AND level_id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

DELETE FROM levels WHERE id NOT IN (SELECT MIN(id) FROM levels GROUP BY code);

-- ── subjects ──

UPDATE program_topics SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = program_topics.subject_id))
  WHERE subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

UPDATE subject_program_structures SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = subject_program_structures.subject_id))
  WHERE subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

UPDATE skills SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = skills.subject_id))
  WHERE subject_id IS NOT NULL AND subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

UPDATE sequences SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = sequences.subject_id))
  WHERE subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

UPDATE documents SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = documents.subject_id))
  WHERE subject_id IS NOT NULL AND subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

UPDATE ai_generations SET subject_id = (SELECT MIN(id) FROM subjects WHERE code = (SELECT code FROM subjects s2 WHERE s2.id = ai_generations.subject_id))
  WHERE subject_id IS NOT NULL AND subject_id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);

DELETE FROM subjects WHERE id NOT IN (SELECT MIN(id) FROM subjects GROUP BY code);
