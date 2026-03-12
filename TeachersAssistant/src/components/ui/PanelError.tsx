// ============================================================================
// PanelError — Bloc d'erreur par panneau avec bouton Réessayer
// ============================================================================

import React from 'react';
import './PanelError.css';

export interface PanelErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const PanelError: React.FC<PanelErrorProps> = ({
  message = 'Une erreur est survenue lors du chargement.',
  onRetry,
  className = '',
}) => (
  <div className={`panel-error ${className}`} role="alert">
    <span className="panel-error__icon">⚠</span>
    <span className="panel-error__message">{message}</span>
    {onRetry && (
      <button className="panel-error__retry" onClick={onRetry} type="button">
        ↺ Réessayer
      </button>
    )}
  </div>
);
