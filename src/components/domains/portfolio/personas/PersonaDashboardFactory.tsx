/**
 * Persona Dashboard Factory
 * Factory to get the appropriate dashboard component based on persona
 */
import React from 'react';
import { ArchitectPortfolioDashboard } from './Architect/ArchitectPortfolioDashboard';
import { BusinessPortfolioDashboard } from './Business/BusinessPortfolioDashboard';
import { AdminPortfolioDashboard } from './Admin/AdminPortfolioDashboard';
import { ViewerPortfolioDashboard } from './Viewer/ViewerPortfolioDashboard';
import { PortfolioDashboard } from '../PortfolioDashboard';

export interface PersonaDashboardProps {
  persona: string;
  role: string;
  sections: Array<{
    id: string;
    type: string;
    data?: any;
    logs?: any[];
  }>;
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
}

/**
 * Get the appropriate dashboard component based on persona
 */
export function PersonaDashboardFactory({
  persona,
  role,
  sections,
  onAction,
  showReasoningProps,
}: PersonaDashboardProps) {
  // Map personas to their respective dashboard components
  const personaMap: Record<string, React.ComponentType<any>> = {
    // Architect role personas
    'CTO': ArchitectPortfolioDashboard,
    'Architect': ArchitectPortfolioDashboard,
    'Developer': ArchitectPortfolioDashboard,
    'Platform': ArchitectPortfolioDashboard,
    
    // Business role personas
    'PM': BusinessPortfolioDashboard,
    'Analyst': BusinessPortfolioDashboard,
    'Trader': BusinessPortfolioDashboard,
    
    // Admin role personas
    'Admin': AdminPortfolioDashboard,
    
    // Viewer role personas
    'Auditor': ViewerPortfolioDashboard,
    'RegulatorReadOnly': ViewerPortfolioDashboard,
  };

  const DashboardComponent = personaMap[persona] || PortfolioDashboard;

  return (
    <DashboardComponent
      sections={sections}
      onAction={onAction}
      showReasoningProps={showReasoningProps}
      role={role}
      persona={persona}
    />
  );
}

