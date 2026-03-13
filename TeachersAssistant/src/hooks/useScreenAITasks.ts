// ============================================================================
// useScreenAITasks — Hook declaratif : chaque ecran decouvre ses taches IA
// via la colonne target_screens de ai_tasks (JSON array).
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { aiTaskService, smartGenerate } from '../services';
import type { AITask, AIGenerationRequest } from '../services';
import type { ID } from '../types';

// ── Screen codes (doivent correspondre aux valeurs en DB) ────────────────

export const AI_SCREEN = {
  SEQUENCE_DETAIL: 'sequence_detail',
  DEVOIR_FORM: 'devoir_form',
  CORRECTION_SERIE: 'correction_serie',
  FICHE_ELEVE: 'fiche_eleve',
  GENERATEUR_IA: 'generateur_ia',
} as const;

export type AIScreenCode = (typeof AI_SCREEN)[keyof typeof AI_SCREEN];

// ── Context that screens provide ─────────────────────────────────────────

export interface ScreenAIContext {
  variables: Record<string, string>;
  subjectId?: ID;
  levelId?: ID;
  sequenceId?: ID;
  sessionId?: ID;
  contextEntityType?: string;
  contextEntityId?: ID;
}

// ── Action returned per task ─────────────────────────────────────────────

export interface ScreenAITaskAction {
  task: AITask;
  generating: boolean;
  execute: (extraVars?: Record<string, string>) => Promise<any>;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useScreenAITasks(
  screenCode: AIScreenCode,
  getContext: () => ScreenAIContext,
) {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    aiTaskService.getByScreen(screenCode).then(t => {
      if (!cancelled) setTasks(t);
    });
    return () => { cancelled = true; };
  }, [screenCode]);

  const execute = useCallback(async (taskCode: string, extraVars?: Record<string, string>) => {
    const ctx = getContext();
    setGeneratingCode(taskCode);
    try {
      const request: AIGenerationRequest = {
        taskCode,
        variables: { ...ctx.variables, ...extraVars },
        subjectId: ctx.subjectId,
        levelId: ctx.levelId,
        sequenceId: ctx.sequenceId,
        sessionId: ctx.sessionId,
        contextEntityType: ctx.contextEntityType,
        contextEntityId: ctx.contextEntityId,
      };
      return await smartGenerate(request);
    } finally {
      setGeneratingCode(null);
    }
  }, [getContext]);

  const actions: ScreenAITaskAction[] = tasks.map(task => ({
    task,
    generating: generatingCode === task.code,
    execute: (extraVars?: Record<string, string>) => execute(task.code, extraVars),
  }));

  return { tasks, actions, generatingCode, execute };
}
