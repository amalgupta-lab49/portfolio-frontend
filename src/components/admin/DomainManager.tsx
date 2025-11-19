/**
 * Domain Manager Component
 * Admin panel for managing domains
 */
import React from 'react';
import { DomainSelector } from './DomainSelector';
import { DomainConfigEditor } from './DomainConfigEditor';

export interface DomainManagerProps {
  className?: string;
}

export function DomainManager({ className = '' }: DomainManagerProps) {
  return (
    <div className={`domain-manager ${className}`}>
      <h2>Domain Management</h2>
      <DomainSelector />
      <DomainConfigEditor />
    </div>
  );
}

