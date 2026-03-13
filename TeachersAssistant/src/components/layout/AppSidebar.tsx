// ============================================================================
// AppSidebar — Menu latéral dynamique par tab (spec §4.4)
// Connecté au RouterContext pour la navigation interne.
// Supporte les sections dépliables (collapsible) pour le tab Bibliothèque.
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from '../../stores';
import { SIDEBAR_MENUS, findActiveSidebarItem } from '../../constants/navigation';
import { useBibliothequeSidebar } from '../../hooks';
import type { SidebarItem } from '../../constants/navigation';
import type { TabId } from '../../stores';
import './AppSidebar.css';

interface Props {
  tab: TabId;
}

export const AppSidebar: React.FC<Props> = ({ tab }) => {
  const { route, setPage } = useRouter();
  const bibItems = useBibliothequeSidebar();

  // Use dynamic items for bibliotheque, static for others
  const items = tab === 'bibliotheque' ? bibItems : SIDEBAR_MENUS[tab];

  // Build initial collapsed state from collapsible sections AND sub-items
  const initialCollapsed = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.collapsible && !item.defaultOpen) {
        set.add(item.id);
      }
    }
    return set;
  }, [items]);

  const [collapsed, setCollapsed] = useState<Set<string>>(initialCollapsed);

  // Transitive closure: if a parent is collapsed, children are effectively hidden too
  const effectiveCollapsed = useMemo(() => {
    const eff = new Set(collapsed);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of items) {
        if (item.sectionId && eff.has(item.sectionId) && item.collapsible && !eff.has(item.id)) {
          eff.add(item.id);
          changed = true;
        }
      }
    }
    return eff;
  }, [collapsed, items]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  if (!items || items.length === 0) return null;

  const activeItemId = findActiveSidebarItem(tab, route.page, route.filter, tab === 'bibliotheque' ? items : undefined);

  const handleClick = (item: SidebarItem) => {
    if (item.isSection || !item.page) return;
    setPage(item.page, item.filter);
  };

  return (
    <nav className="app-sidebar">
      {items.map(item => {
        // Hide items whose parent section/item is collapsed (transitive)
        if (item.sectionId && effectiveCollapsed.has(item.sectionId)) {
          return null;
        }

        if (item.isSection) {
          const isCollapsible = item.collapsible;
          const isCollapsed = collapsed.has(item.id);

          return (
            <div
              key={item.id}
              className={`app-sidebar__section ${isCollapsible ? 'app-sidebar__section--collapsible' : ''}`}
              onClick={isCollapsible ? () => toggleSection(item.id) : undefined}
              role={isCollapsible ? 'button' : undefined}
              aria-expanded={isCollapsible ? !isCollapsed : undefined}
            >
              {item.label}
              {isCollapsible && (
                <span className="app-sidebar__chevron">
                  {isCollapsed ? '›' : '‹'}
                </span>
              )}
            </div>
          );
        }

        const isActive = item.id === activeItemId;
        const indent = item.indent ?? 0;
        const isCollapsible = item.collapsible;
        const isCollapsed = collapsed.has(item.id);

        return (
          <button
            key={item.id}
            className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''} ${isCollapsible ? 'app-sidebar__item--collapsible' : ''}`}
            style={{ paddingLeft: `${12 + indent * 16}px` }}
            onClick={() => handleClick(item)}
            title={item.label}
          >
            {item.icon && <span className="app-sidebar__icon">{item.icon}</span>}
            <span className="app-sidebar__label">{item.label}</span>
            {isCollapsible && (
              <span
                className="app-sidebar__chevron"
                onClick={(e) => { e.stopPropagation(); toggleSection(item.id); }}
                role="button"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? '›' : '‹'}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
