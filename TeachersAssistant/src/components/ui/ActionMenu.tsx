// ============================================================================
// ActionMenu — Dropdown "Actions" regroupant les actions secondaires
// Usage : <ActionMenu label="Actions" items={[...]} />
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import './ActionMenu.css';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Separator before this item */
  separator?: boolean;
  /** Danger style (red) */
  danger?: boolean;
}

export interface ActionMenuProps {
  label?: string;
  items: ActionMenuItem[];
  disabled?: boolean;
  size?: 'S' | 'M';
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  label = 'Actions ▾',
  items,
  disabled = false,
  size = 'S',
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const enabledItems = items.filter(i => !i.disabled || i.separator);

  return (
    <div className={`action-menu action-menu--${size}`} ref={wrapRef}>
      <button
        className="action-menu__trigger"
        onClick={() => setOpen(prev => !prev)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div className="action-menu__dropdown" role="menu">
          {enabledItems.map(item => (
            <React.Fragment key={item.id}>
              {item.separator && <div className="action-menu__separator" role="separator" />}
              <button
                className={`action-menu__item ${item.danger ? 'action-menu__item--danger' : ''}`}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick(); setOpen(false); }}
              >
                {item.icon && <span className="action-menu__item-icon">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
