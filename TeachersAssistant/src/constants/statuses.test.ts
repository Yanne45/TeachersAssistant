import { describe, it, expect } from 'vitest';
import {
  SUBMISSION_STATUS_META,
  BULLETIN_STATUS_META,
  ASSIGNMENT_STATUS_META,
  SEQUENCE_STATUS_META,
  SESSION_STATUS_META,
  AI_TASK_STATUS_META,
  type StatusMeta,
} from './statuses';

/** Vérifie qu'un dictionnaire de statuts est complet et cohérent */
function assertStatusDict(name: string, dict: Record<string, StatusMeta>, expectedKeys: string[]) {
  describe(name, () => {
    it('contient toutes les clés attendues', () => {
      expect(Object.keys(dict).sort()).toEqual([...expectedKeys].sort());
    });

    for (const key of expectedKeys) {
      it(`${key} a un label non vide`, () => {
        expect(dict[key]!.label).toBeTruthy();
      });

      it(`${key} a une icon non vide`, () => {
        expect(dict[key]!.icon).toBeTruthy();
      });

      it(`${key} a une color définie`, () => {
        expect(dict[key]!.color).toBeTruthy();
      });

      it(`${key} a un bg défini`, () => {
        expect(dict[key]!.bg).toBeDefined();
      });
    }
  });
}

assertStatusDict('SUBMISSION_STATUS_META', SUBMISSION_STATUS_META, ['pending', 'ai_processing', 'to_confirm', 'final']);

assertStatusDict('BULLETIN_STATUS_META', BULLETIN_STATUS_META, ['draft', 'review', 'final', 'empty']);

assertStatusDict('ASSIGNMENT_STATUS_META', ASSIGNMENT_STATUS_META, ['draft', 'assigned', 'collecting', 'correcting', 'corrected', 'returned']);

assertStatusDict('SEQUENCE_STATUS_META', SEQUENCE_STATUS_META, ['draft', 'planned', 'in_progress', 'done']);

assertStatusDict('SESSION_STATUS_META', SESSION_STATUS_META, ['planned', 'ready', 'done', 'cancelled']);

assertStatusDict('AI_TASK_STATUS_META', AI_TASK_STATUS_META, ['queued', 'processing', 'completed', 'error']);

describe('Cohérence inter-dictionnaires', () => {
  it('les labels "Brouillon" sont cohérents entre dictionnaires', () => {
    const dicts = [BULLETIN_STATUS_META, ASSIGNMENT_STATUS_META, SEQUENCE_STATUS_META];
    for (const dict of dicts) {
      expect(dict['draft']!.label).toBe('Brouillon');
    }
  });

  it('les statuts finaux utilisent la couleur success', () => {
    expect(SUBMISSION_STATUS_META.final.color).toContain('success');
    expect(BULLETIN_STATUS_META.final.color).toContain('success');
    expect(ASSIGNMENT_STATUS_META.corrected.color).toContain('success');
    expect(SEQUENCE_STATUS_META.done.color).toContain('success');
    expect(SESSION_STATUS_META.done.color).toContain('success');
    expect(AI_TASK_STATUS_META.completed.color).toContain('success');
  });
});
