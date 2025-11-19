/**
 * Domain Context
 * React context for current domain state
 */
import { createContext, useContext } from 'react';
import { DomainConfig } from '../config/types/DomainConfig';

export interface DomainContextValue {
  currentDomainId: string | null;
  domainConfig: DomainConfig | null;
  setDomain: (domainId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const DomainContext = createContext<DomainContextValue | undefined>(undefined);

/**
 * Hook to access domain context
 */
export function useDomainContext(): DomainContextValue {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error('useDomainContext must be used within a DomainProvider');
  }
  return context;
}

