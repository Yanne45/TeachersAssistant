// ============================================================================
// CommandPalette — Ctrl+K quick navigation & search
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SIDEBAR_MENUS, APP_TABS } from '../../constants/navigation';
import type { TabId } from '../../stores';
import './CommandPalette.css';

// ── Navigation command built from sidebar menus ──

interface NavCommand {
  id: string;
  label: string;
  section: string;
  icon: string;
  tab: TabId;
  page: string;
  filter?: string;
}

function buildNavCommands(): NavCommand[] {
  const commands: NavCommand[] = [];
  for (const tabDef of APP_TABS) {
    const tab = tabDef.id;
    const items = SIDEBAR_MENUS[tab];
    for (const item of items) {
      if (item.isSection || !item.page) continue;
      commands.push({
        id: item.id,
        label: item.label,
        section: tabDef.label,
        icon: item.icon ?? tabDef.icon ?? '',
        tab,
        page: item.page,
        filter: item.filter,
      });
    }
    // Add tab itself if no sidebar items (dashboard)
    if (items.length === 0 || items.every(i => i.isSection)) {
      commands.push({
        id: `tab-${tab}`,
        label: tabDef.label,
        section: 'Navigation',
        icon: tabDef.icon ?? '',
        tab,
        page: 'default',
      });
    }
  }
  return commands;
}

const NAV_COMMANDS = buildNavCommands();

// ── Search result type ──

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: string;
  action: () => void;
}

// ── Props ──

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId, page: string, filter?: string, entityId?: number | string) => void;
  searchEntities?: (query: string) => Promise<Array<{
    id: number;
    type: string;
    typeLabel: string;
    typeIcon: string;
    title: string;
    subtitle: string;
    navigateTo?: { tab: TabId; page: string; entity?: number };
  }>>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
  searchEntities,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [entityResults, setEntityResults] = useState<PaletteItem[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchVersionRef = useRef(0);

  // Open/close dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      setQuery('');
      setActiveIndex(0);
      setEntityResults([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      dialog.close();
    }
  }, [open]);

  // Filter nav commands by query
  const filteredNav = query.trim()
    ? NAV_COMMANDS.filter(c => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q);
      })
    : NAV_COMMANDS;

  // Debounced entity search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchEntities || query.trim().length < 2) {
      setEntityResults([]);
      return;
    }
    const version = ++searchVersionRef.current;
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchEntities(query.trim());
        if (version !== searchVersionRef.current) return;
        setEntityResults(results.slice(0, 8).map(r => ({
          id: `entity-${r.type}-${r.id}`,
          label: r.title,
          section: r.typeLabel,
          icon: r.typeIcon,
          action: () => {
            if (r.navigateTo) {
              onNavigate(r.navigateTo.tab, r.navigateTo.page, undefined, r.navigateTo.entity);
            }
            onClose();
          },
        })));
      } catch {
        if (version !== searchVersionRef.current) return;
        setEntityResults([]);
      }
    }, 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, searchEntities, onNavigate, onClose]);

  // Build combined items list
  const navItems: PaletteItem[] = filteredNav.map(c => ({
    id: c.id,
    label: c.label,
    section: c.section,
    icon: c.icon,
    action: () => {
      onNavigate(c.tab, c.page, c.filter);
      onClose();
    },
  }));

  const allItems = [...entityResults, ...navItems];

  // Clamp active index
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[activeIndex];
      if (item) item.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [allItems, activeIndex, onClose]);

  // Scroll active item into view
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  // Group items by section
  const sections = new Map<string, PaletteItem[]>();
  for (const item of allItems) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }

  let globalIdx = 0;

  return (
    <dialog
      ref={dialogRef}
      className="cmd-palette"
      aria-modal="true"
      aria-label="Palette de commandes"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cmd-palette__container">
        <div className="cmd-palette__input-row">
          <span className="cmd-palette__icon">⌘</span>
          <input
            ref={inputRef}
            className="cmd-palette__input"
            type="text"
            placeholder="Aller à… (page, séquence, élève, devoir)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-palette__kbd">Esc</kbd>
        </div>

        <div className="cmd-palette__results" ref={listRef}>
          {allItems.length === 0 && (
            <div className="cmd-palette__empty">Aucun résultat</div>
          )}
          {Array.from(sections.entries()).map(([section, items]) => (
            <div key={section} className="cmd-palette__section">
              <div className="cmd-palette__section-label">{section}</div>
              {items.map((item) => {
                const idx = globalIdx++;
                return (
                  <button
                    key={item.id}
                    className="cmd-palette__item"
                    data-active={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.action}
                  >
                    <span className="cmd-palette__item-icon">{item.icon}</span>
                    <span className="cmd-palette__item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
};
