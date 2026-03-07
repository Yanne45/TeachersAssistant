import React from 'react';
import './Tabs.css';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => (
  <nav className={`tabs ${className}`} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`tabs__item ${activeTab === tab.id ? 'tabs__item--active' : ''}`}
        role="tab"
        aria-selected={activeTab === tab.id}
        onClick={() => onTabChange(tab.id)}
        type="button"
      >
        {tab.icon && <span className="tabs__icon">{tab.icon}</span>}
        <span className="tabs__label">{tab.label}</span>
      </button>
    ))}
  </nav>
);
