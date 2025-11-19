/**
 * useDomain hook
 * Access current domain information
 */
import { useDomainContext } from '../contexts/DomainContext';

export function useDomain() {
  const context = useDomainContext();
  return {
    domainId: context.currentDomainId,
    config: context.domainConfig,
    setDomain: context.setDomain,
    isLoading: context.isLoading,
    error: context.error,
  };
}

