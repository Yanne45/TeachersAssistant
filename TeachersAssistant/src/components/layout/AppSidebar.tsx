// ============================================================================
// AppSidebar — Menu latéral dynamique par tab (spec §4.4)
// Connecté au RouterContext pour la navigation interne.
// ============================================================================

import React from 'react';
import { useRouter } from '../../stores';
import { SIDEBAR_MENUS, findActiveSidebarItem } from '../../constants/navigation';
import type { SidebarItem } from '../../constants/navigation';
import type { TabId } from '../../stores';
import './AppSidebar.css';

interface Props {
  tab: TabId;
}

export const AppSidebar: React.FC<Props> = ({ tab }) => {
  const { route, setPage } = useRouter();
  const items = SIDEBAR_MENUS[tab];

  if (!items || items.length === 0) return null;

  const activeItemId = findActiveSidebarItem(tab, route.page);

  const handleClick = (item: SidebarItem) => {
    if (item.isSection || !item.page) return;
    setPage(item.page, item.filter);
  };

  return (
    <nav className="app-sidebar">
      {items.map(item => {
        if (item.isSection) {
          return (
            <div key={item.id} className="app-sidebar__section">
              {item.label}
            </div>
          );
        }

        const isActive = item.id === activeItemId;
        const indent = item.indent ?? 0;

        return (
          <button
            key={item.id}
            className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
            style={{ paddingLeft: `${12 + indent * 16}px` }}
            onClick={() => handleClick(item)}
            title={item.label}
          >
            {item.icon && <span className="app-sidebar__icon">{item.icon}</span>}
            <span className="app-sidebar__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
