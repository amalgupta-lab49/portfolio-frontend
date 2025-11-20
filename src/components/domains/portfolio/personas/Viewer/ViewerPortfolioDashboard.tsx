/**
 * Viewer Portfolio Dashboard
 * Read-only portfolio view for Auditor and Regulator personas
 */
import React from 'react';
import { PortfolioSection } from '../../PortfolioSection';

export interface ViewerPortfolioDashboardProps {
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

export function ViewerPortfolioDashboard({
  sections,
  onAction,
  showReasoningProps,
  role = 'Viewer',
}: ViewerPortfolioDashboardProps) {
  return (
    <div className="portfolio-dashboard viewer-dashboard">
      <div className="dashboard-header">
        <h2>{role} Dashboard</h2>
        <p className="dashboard-subtitle">Read-only portfolio view for audit and regulatory purposes</p>
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

