/**
 * Admin Portfolio Dashboard
 * Administrative portfolio view with full access
 */
import React from 'react';
import { PortfolioSection } from '../../PortfolioSection';

export interface AdminPortfolioDashboardProps {
  sections: Array<{
    id: string;
    type: string;
    data?: any;
    logs?: any[];
  }>;
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
  role?: string;
}

export function AdminPortfolioDashboard({
  sections,
  onAction,
  showReasoningProps,
  role = 'Admin',
}: AdminPortfolioDashboardProps) {
  return (
    <div className="portfolio-dashboard admin-dashboard">
      <div className="dashboard-header">
        <h2>{role} Dashboard</h2>
        <p className="dashboard-subtitle">Administrative portfolio management with full system access</p>
      </div>
      {sections.map((section) => (
        <PortfolioSection
          key={section.id}
          type={section.type as any}
          data={section.data}
          logs={section.logs}
          onAction={onAction}
          showReasoningProps={showReasoningProps}
        />
      ))}
    </div>
  );
}

