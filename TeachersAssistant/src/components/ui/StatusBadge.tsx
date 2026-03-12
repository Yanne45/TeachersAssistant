// ============================================================================
// StatusBadge — Affichage unifié d'un statut métier (icon + label + couleur)
// ============================================================================

import React from 'react';
import type { StatusMeta } from '../../constants/statuses';
import './StatusBadge.css';

export interface StatusBadgeProps {
  meta: Record<string, StatusMeta>;
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ meta, value, className = '' }) => {
  const entry = meta[value];
  if (!entry) {
    return <span className={`status-badge ${className}`}>{value}</span>;
  }

  return (
    <span
      className={`status-badge ${className}`}
      style={{ color: entry.color, backgroundColor: entry.bg }}
    >
      <span className="status-badge__icon">{entry.icon}</span>
      {entry.label}
    </span>
  );
};
