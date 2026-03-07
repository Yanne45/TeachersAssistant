import React from 'react';
import './SkillLevelSelector.css';

export interface SkillLevelSelectorProps {
  /** Nom de la compétence */
  label: string;
  /** Niveau actuel (1-4 ou null si non évalué) */
  value: number | null;
  /** Nombre total de niveaux */
  maxLevel?: number;
  onChange: (level: number) => void;
  disabled?: boolean;
  className?: string;
}

export const SkillLevelSelector: React.FC<SkillLevelSelectorProps> = ({
  label,
  value,
  maxLevel = 4,
  onChange,
  disabled = false,
  className,
}) => (
  <div className={`skill-level ${className ?? ''}`}>
    <span className="skill-level__label">{label}</span>
    <div className="skill-level__buttons">
      {Array.from({ length: maxLevel }, (_, i) => {
        const level = i + 1;
        const isSelected = value === level;
        const isBelow = value !== null && level < value;

        let stateClass = 'skill-level__btn--above';
        if (isSelected) stateClass = 'skill-level__btn--selected';
        else if (isBelow) stateClass = 'skill-level__btn--below';

        return (
          <button
            key={level}
            className={`skill-level__btn ${stateClass}`}
            onClick={() => onChange(level)}
            disabled={disabled}
            type="button"
            title={`Niveau ${level}`}
          >
            {level}
          </button>
        );
      })}
    </div>
  </div>
);
