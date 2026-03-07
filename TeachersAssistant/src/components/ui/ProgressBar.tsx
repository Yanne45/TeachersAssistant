import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  /** Valeur 0-100 */
  value: number;
  /** Couleur de la barre (hex) — sinon primary */
  color?: string;
  /** Hauteur en px (défaut 6) */
  height?: number;
  /** Afficher le pourcentage */
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color,
  height = 6,
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`progress-bar ${className}`}>
      <div
        className="progress-bar__track"
        style={{ height: `${height}px` }}
      >
        <div
          className="progress-bar__fill"
          style={{
            width: `${clamped}%`,
            backgroundColor: color || 'var(--color-primary)',
          }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar__label" style={{ color: color || 'var(--color-primary)' }}>
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
};

/** Barre segmentée pour compétences 1-4 */
export interface SegmentedBarProps {
  /** Niveau actuel (1-4) */
  level: number;
  /** Nombre total de segments (défaut 4) */
  maxLevel?: number;
  /** Hauteur en px (défaut 8) */
  height?: number;
  color?: string;
}

export const SegmentedBar: React.FC<SegmentedBarProps> = ({
  level,
  maxLevel = 4,
  height = 8,
  color,
}) => (
  <div className="segmented-bar" style={{ height: `${height}px` }}>
    {Array.from({ length: maxLevel }, (_, i) => (
      <div
        key={i}
        className={`segmented-bar__segment ${i < level ? 'segmented-bar__segment--filled' : ''}`}
        style={i < level ? { backgroundColor: color || 'var(--color-primary)' } : {}}
      />
    ))}
  </div>
);
