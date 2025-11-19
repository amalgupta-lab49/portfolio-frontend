/**
 * useDomainConfig hook
 * Access domain configuration with type safety
 */
import { useDomainContext } from '../contexts/DomainContext';
import { DomainConfig } from '../config/types/DomainConfig';

export function useDomainConfig(): DomainConfig {
  const context = useDomainContext();
  if (!context.domainConfig) {
    throw new Error('Domain configuration is not available. Ensure a domain is loaded.');
  }
  return context.domainConfig;
}

