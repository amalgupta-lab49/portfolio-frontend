/**
 * Configurable Tab Navigation Component
 */
import React from 'react';
import { TabConfig } from '../../config/types/DomainConfig';

export interface TabNavigationProps {
  tabs: TabConfig[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabNavigation({
  tabs,
  activeTabId,
  onTabChange,
  className = '',
}: TabNavigationProps) {
  return (
    <div className={`dashboard-tabs tab-navigation ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTabId === tab.id}
          type="button"
        >
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

