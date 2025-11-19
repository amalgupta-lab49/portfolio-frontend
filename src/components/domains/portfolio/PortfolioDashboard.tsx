/**
 * Portfolio Dashboard Component
 * Portfolio-specific dashboard wrapper
 */
import React from 'react';
import { PortfolioSection } from './PortfolioSection';

export interface PortfolioDashboardProps {
  sections: Array<{
    id: string;
    type: string;
    data?: any;
    logs?: any[];
  }>;
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
}

export function PortfolioDashboard({
  sections,
  onAction,
  showReasoningProps,
}: PortfolioDashboardProps) {
  return (
    <div className="portfolio-dashboard">
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

