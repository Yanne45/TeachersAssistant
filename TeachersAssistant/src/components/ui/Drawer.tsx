import React, { useEffect } from 'react';
import './Drawer.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Largeur : standard (480px) ou large (520px) */
  size?: 'standard' | 'large';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  size = 'standard',
  children,
  footer,
}) => {
  // Fermer sur Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className={`drawer drawer--${size} ${open ? 'drawer--open' : ''}`} role="dialog" aria-modal="true" aria-labelledby={title ? 'drawer-title' : undefined}>
        {title && (
          <div className="drawer__header">
            <h2 className="drawer__title" id="drawer-title">{title}</h2>
            <button className="drawer__close" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
        )}
        <div className="drawer__body">
          {children}
        </div>
        {footer && (
          <div className="drawer__footer">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};
