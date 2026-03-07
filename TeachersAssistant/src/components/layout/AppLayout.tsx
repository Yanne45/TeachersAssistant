import React from 'react';
import './AppLayout.css';

export interface AppLayoutProps {
  header: React.ReactNode;
  tabs: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  inspector?: React.ReactNode;
}

/**
 * Layout global de l'application
 * Spec §4.1 : Header (52px) → Tabs (42px) → [Sidebar | Main | Inspector]
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  header,
  tabs,
  sidebar,
  children,
  inspector,
}) => (
  <div className="app-layout">
    {/* Header fixe */}
    <div className="app-layout__header">
      {header}
    </div>

    {/* Tabs fixe */}
    <div className="app-layout__tabs">
      {tabs}
    </div>

    {/* Zone de contenu : sidebar + main + inspector */}
    <div className="app-layout__body">
      {sidebar && (
        <aside className="app-layout__sidebar">
          {sidebar}
        </aside>
      )}
      <main className="app-layout__main">
        {children}
      </main>
      {inspector && (
        <aside className="app-layout__inspector">
          {inspector}
        </aside>
      )}
    </div>
  </div>
);
