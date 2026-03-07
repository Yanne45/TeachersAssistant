import React from 'react';
import './Card.css';

export interface CardProps {
  /** Bordure gauche colorée (4px) — tagging matière/statut */
  borderLeftColor?: string;
  /** Bordure supérieure colorée (3px) — indicateurs */
  borderTopColor?: string;
  /** Padding réduit pour listes compactes */
  compact?: boolean;
  /** Désactive le hover effect */
  noHover?: boolean;
  /** Card cliquable */
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  borderLeftColor,
  borderTopColor,
  compact = false,
  noHover = false,
  onClick,
  children,
  className = '',
  style = {},
}) => {
  const classes = [
    'card',
    compact && 'card--compact',
    !noHover && 'card--hoverable',
    onClick && 'card--clickable',
    className,
  ].filter(Boolean).join(' ');

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(borderLeftColor ? { borderLeft: `4px solid ${borderLeftColor}` } : {}),
    ...(borderTopColor ? { borderTop: `3px solid ${borderTopColor}` } : {}),
  };

  return (
    <div className={classes} style={mergedStyle} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
};
