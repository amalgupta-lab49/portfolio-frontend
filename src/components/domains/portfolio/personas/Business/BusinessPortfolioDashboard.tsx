/**
 * Business Portfolio Dashboard
 * Business-focused portfolio view for PM, Analyst, and Trader personas
 */
import React from 'react';
import { PortfolioSection } from '../../PortfolioSection';

export interface BusinessPortfolioDashboardProps {
  sections: Array<{
    id: string;
    type: string;
    data?: any;
    logs?: any[];
  }>;
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
  role?: string;
  persona?: string;
}

export function BusinessPortfolioDashboard({
  sections,
  onAction,
  showReasoningProps,
  role = 'Business',
  persona,
}: BusinessPortfolioDashboardProps) {
  // Portfolio dashboard naming only for Business-PM
  const dashboardTitle = persona === 'PM' && role === 'Business' 
    ? 'Portfolio Overview' 
    : `${role} Dashboard`;

  return (
    <div className="portfolio-dashboard business-dashboard">
      <div className="dashboard-header">
        <h2>{dashboardTitle}</h2>
        <p className="dashboard-subtitle">Business-focused portfolio management and analysis</p>
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

