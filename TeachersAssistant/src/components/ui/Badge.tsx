import React from 'react';
import './Badge.css';

export type BadgeVariant =
  | 'subject'     // couleur matière
  | 'status'      // couleur statut
  | 'info'        // gris info
  | 'filter'      // filtre actif/inactif
  | 'success'
  | 'warn'
  | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  /** Couleur hex directe — pour les badges matière dynamiques */
  color?: string;
  /** Icône ou emoji en prefix */
  icon?: React.ReactNode;
  /** Filtre actif ou non (variant='filter' uniquement) */
  active?: boolean;
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
  onClick,
  children,
  className = '',
}) => {
  const classes = [
    'badge',
    `badge--${variant}`,
    active && 'badge--active',
    onClick && 'badge--clickable',
    className,
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = color
    ? {
        color: color,
        backgroundColor: `${color}1A`, // 10% opacité
      }
    : {};

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag className={classes} style={style} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && <span className="badge__icon">{icon}</span>}
      <span className="badge__label">{children}</span>
    </Tag>
  );
};
