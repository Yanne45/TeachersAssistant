// ============================================================================
// AITaskButtons — Rendu automatique des boutons IA pour un ecran donne
// Utilise useScreenAITasks pour decouvrir les taches depuis la DB.
// ============================================================================

import React from 'react';
import { Button } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';
import type { ScreenAITaskAction } from '../../hooks/useScreenAITasks';

interface AITaskButtonsProps {
  actions: ScreenAITaskAction[];
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Extra variables merged into the request (e.g. per-session context) */
  extraVars?: Record<string, string>;
  onResult?: (taskCode: string, result: any) => void;
  onError?: (taskCode: string, error: Error) => void;
}

export const AITaskButtons: React.FC<AITaskButtonsProps> = ({
  actions, size = 'S', variant = 'secondary', disabled, extraVars, onResult, onError,
}) => (
  <>
    {actions.map(({ task, generating, execute }) => (
      <Button
        key={task.code}
        variant={variant}
        size={size}
        disabled={disabled || generating}
        onClick={async () => {
          try {
            const result = await execute(extraVars);
            onResult?.(task.code, result);
          } catch (err) {
            onError?.(task.code, err as Error);
          }
        }}
      >
        {generating ? 'Génération…' : `${task.icon} ${task.label}`}
      </Button>
    ))}
  </>
);
