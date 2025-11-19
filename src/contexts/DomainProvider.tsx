/**
 * Domain Provider
 * Provides domain configuration throughout the application
 */
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { DomainContext, DomainContextValue } from './DomainContext';
import { DomainConfig } from '../config/types/DomainConfig';
import { domainRegistry } from '../config/DomainRegistry';

export interface DomainProviderProps {
  children: ReactNode;
  defaultDomainId?: string;
  onDomainChange?: (domainId: string, config: DomainConfig) => void;
}

export function DomainProvider({
  children,
  defaultDomainId,
  onDomainChange,
}: DomainProviderProps) {
  const [currentDomainId, setCurrentDomainId] = useState<string | null>(null);
  const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const setDomain = useCallback(
    async (domainId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if domain is already loaded
        let config = domainRegistry.getDomain(domainId);

        // If not, try to load it
        if (!config) {
          console.log(`Loading domain: ${domainId}`);
          config = await domainRegistry.loadDomain(domainId);
          console.log(`Domain loaded successfully: ${domainId}`, config);
        }

        setCurrentDomainId(domainId);
        setDomainConfig(config);
        onDomainChange?.(domainId, config);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`Failed to load domain: ${err instanceof Error ? err.message : String(err)}`);
        setError(error);
        console.error('Error loading domain:', error);
        console.error('Error details:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [onDomainChange]
  );

  // Load default domain on mount
  useEffect(() => {
    if (defaultDomainId && !hasAttemptedLoad && !isLoading && !domainConfig) {
      console.log(`DomainProvider: Loading default domain: ${defaultDomainId}`);
      setHasAttemptedLoad(true);
      setDomain(defaultDomainId);
    }
  }, [defaultDomainId, hasAttemptedLoad, isLoading, domainConfig, setDomain]);

  const contextValue: DomainContextValue = {
    currentDomainId,
    domainConfig,
    setDomain,
    isLoading,
    error,
  };

  return (
    <DomainContext.Provider value={contextValue}>
      {children}
    </DomainContext.Provider>
  );
}

