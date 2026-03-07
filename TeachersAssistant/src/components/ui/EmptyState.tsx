import React from 'react';
import { Button } from './Button';
import './EmptyState.css';

export interface EmptyStateProps {
  /** Icône ou illustration (emoji, SVG) */
  icon?: React.ReactNode;
  /** Message principal */
  title: string;
  /** Message secondaire */
  description?: string;
  /** Label du bouton CTA */
  actionLabel?: string;
  /** Callback du CTA */
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="empty-state">
    {icon && <div className="empty-state__icon">{icon}</div>}
    <h3 className="empty-state__title">{title}</h3>
    {description && <p className="empty-state__desc">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" size="M" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
