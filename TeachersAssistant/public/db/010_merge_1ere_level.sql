-- ============================================================================
-- Teacher Assistant — Migration 010 : Fusionner le level "1ERE" dans "PRE"
--
-- La base contient un level parasite code='1ERE' label='Première'
-- en plus du level canonique code='PRE' label='Première'.
-- On réaffecte toutes les FK vers PRE puis on supprime 1ERE.
-- Tables vérifiées d'après 001_initial_schema.sql.
-- ============================================================================

UPDATE classes SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE subject_hour_allocations SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE subject_program_structures SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE teaching_scopes SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE program_topics SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE skills SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id IS NOT NULL AND level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE sequence_templates SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id IS NOT NULL AND level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE sequences SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE documents SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id IS NOT NULL AND level_id = (SELECT id FROM levels WHERE code='1ERE');

UPDATE ai_generations SET level_id = (SELECT id FROM levels WHERE code='PRE')
  WHERE level_id IS NOT NULL AND level_id = (SELECT id FROM levels WHERE code='1ERE');

-- Supprimer le level parasite
DELETE FROM levels WHERE code = '1ERE';
