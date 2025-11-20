/**
 * Architect Portfolio Dashboard
 * Architecture-specific portfolio view with technical focus
 */
import React from 'react';
import { PortfolioSection } from '../../PortfolioSection';

export interface ArchitectPortfolioDashboardProps {
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

export function ArchitectPortfolioDashboard({
  sections,
  onAction,
  showReasoningProps,
  role = 'Architect',
}: ArchitectPortfolioDashboardProps) {
  return (
    <div className="portfolio-dashboard architect-dashboard">
      <div className="dashboard-header">
        <h2>{role} Dashboard</h2>
        <p className="dashboard-subtitle">Technical portfolio analysis and system architecture insights</p>
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

