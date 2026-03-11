import React from 'react';
import './Badge.css';

export type BadgeVariant =
  | 'default'
  | 'subject'     // couleur matiere
  | 'status'      // couleur statut
  | 'info'        // gris info
  | 'filter'      // filtre actif/inactif
  | 'success'
  | 'warn'
  | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  /** Couleur hex directe - pour les badges matiere dynamiques */
  color?: string;
  /** Icone ou emoji en prefix */
  icon?: React.ReactNode;
  /** Filtre actif ou non (variant='filter' uniquement) */
  active?: boolean;
  /** Sous-statut optionnel pour variant='status' */
  status?: string;
  /** Style inline optionnel */
  style?: React.CSSProperties;
  /** Rend le badge cliquable */
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  color,
  icon,
  active = false,
  status,
  style,
  onClick,
  children,
  className = '',
}) => {
  const resolvedVariant = variant === 'default' ? 'info' : variant;

  const classes = [
    'badge',
    `badge--${resolvedVariant}`,
    active && 'badge--active',
    onClick && 'badge--clickable',
    className,
  ].filter(Boolean).join(' ');

  const statusColorMap: Record<string, string> = {
    active: 'var(--color-success)',
    completed: 'var(--color-success)',
    finalized: 'var(--color-success)',
    final: 'var(--color-success)',
    done: 'var(--color-success)',
    ready: 'var(--color-info)',
    queued: 'var(--color-info)',
    processing: 'var(--color-info)',
    ai_processing: 'var(--color-info)',
    to_confirm: 'var(--color-warn)',
    review: 'var(--color-warn)',
    warning: 'var(--color-warn)',
    pending: 'var(--color-text-muted)',
    not_started: 'var(--color-text-muted)',
    draft: 'var(--color-text-muted)',
    cancelled: 'var(--color-danger)',
    failed: 'var(--color-danger)',
    error: 'var(--color-danger)',
  };

  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
  const statusColor = resolvedVariant === 'status' && normalizedStatus ? statusColorMap[normalizedStatus] : undefined;
  const effectiveColor = color ?? statusColor;
  const computedStyle: React.CSSProperties = effectiveColor
    ? {
        color: effectiveColor,
        backgroundColor: `${effectiveColor}1A`,
      }
    : {};

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag className={classes} style={{ ...computedStyle, ...style }} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && <span className="badge__icon">{icon}</span>}
      <span className="badge__label">{children}</span>
    </Tag>
  );
};
