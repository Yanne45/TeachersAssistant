// ============================================================================
// PromptVariablePicker — Palette d'insertion de {{variables}} dans un template
// ============================================================================

import React, { useState } from 'react';
import type { AITaskVariable } from '../../services';
import './PromptVariablePicker.css';

interface Props {
  variables: AITaskVariable[];
  onInsert: (variableCode: string) => void;
  /** Valeurs actuelles des variables (pour preview) */
  values?: Record<string, string>;
}

export const PromptVariablePicker: React.FC<Props> = ({ variables, onInsert, values }) => {
  const [expanded, setExpanded] = useState(false);
  const required = variables.filter(v => v.is_required);
  const optional = variables.filter(v => !v.is_required);

  return (
    <div className="var-picker">
      <div className="var-picker__header">
        <span className="var-picker__title">Variables disponibles</span>
        <button
          className="var-picker__toggle"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? '▼ Réduire' : '▶ Tout afficher'}
        </button>
      </div>

      <div className="var-picker__list">
        {required.map(v => (
          (() => {
            const preview = values?.[v.variable_code];
            return (
              <button
                key={v.id}
                className="var-picker__chip var-picker__chip--required"
                onClick={() => onInsert(v.variable_code)}
                type="button"
                title={v.variable_description || v.variable_label}
              >
                <span className="var-picker__chip-code">{'{{' + v.variable_code + '}}'}</span>
                <span className="var-picker__chip-label">{v.variable_label}</span>
                {preview && (
                  <span className="var-picker__chip-preview">
                    = {preview.substring(0, 30)}
                    {(preview.length > 30) ? '...' : ''}
                  </span>
                )}
              </button>
            );
          })()
        ))}

        {expanded && optional.map(v => (
          (() => {
            const preview = values?.[v.variable_code];
            return (
              <button
                key={v.id}
                className="var-picker__chip var-picker__chip--optional"
                onClick={() => onInsert(v.variable_code)}
                type="button"
                title={v.variable_description || v.variable_label}
              >
                <span className="var-picker__chip-code">{'{{' + v.variable_code + '}}'}</span>
                <span className="var-picker__chip-label">{v.variable_label}</span>
                {preview && (
                  <span className="var-picker__chip-preview">
                    = {preview.substring(0, 30)}
                    {(preview.length > 30) ? '...' : ''}
                  </span>
                )}
              </button>
            );
          })()
        ))}
      </div>

      {!expanded && optional.length > 0 && (
        <span className="var-picker__more">+ {optional.length} optionnelles</span>
      )}
    </div>
  );
};
