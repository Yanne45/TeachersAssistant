import React from 'react';
import './SidebarItem.css';

export interface SidebarItemProps {
  /** Label affiché */
  label: string;
  /** Icône (emoji ou ReactNode) */
  icon?: React.ReactNode;
  /** Niveau d'indentation (0 = racine, 1 = enfant, etc.) */
  indent?: number;
  /** Item actif */
  active?: boolean;
  /** Est un label de section (uppercase, petit, non cliquable) */
  isSection?: boolean;
  /** Compteur/badge à droite */
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  icon,
  indent = 0,
  active = false,
  isSection = false,
  badge,
  onClick,
}) => {
  if (isSection) {
    return (
      <div className="sidebar-section" style={{ paddingLeft: `${12 + indent * 16}px` }}>
        {label}
      </div>
    );
  }

  const classes = [
    'sidebar-item',
    active && 'sidebar-item--active',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      style={{ paddingLeft: `${12 + indent * 16}px` }}
      onClick={onClick}
      type="button"
    >
      {icon && <span className="sidebar-item__icon">{icon}</span>}
      <span className="sidebar-item__label">{label}</span>
      {badge && <span className="sidebar-item__badge">{badge}</span>}
    </button>
  );
};
