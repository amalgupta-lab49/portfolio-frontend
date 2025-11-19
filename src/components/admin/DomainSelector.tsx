/**
 * Domain Selector Component
 * UI for switching between domains
 */
import React from 'react';
import { useDomain } from '../../hooks/useDomain';
import { domainRegistry } from '../../config/DomainRegistry';

export interface DomainSelectorProps {
  className?: string;
}

export function DomainSelector({ className = '' }: DomainSelectorProps) {
  const { domainId, setDomain, isLoading } = useDomain();
  // Hardcode available domains for now - in production, this could come from a config file
  const [availableDomains] = React.useState<string[]>(['portfolio']);
  
  // Also check registry for any loaded domains
  React.useEffect(() => {
    const registeredDomains = domainRegistry.getDomainIds();
    if (registeredDomains.length > 0) {
      console.log('Available domains from registry:', registeredDomains);
    }
  }, [domainId]);

  const handleDomainChange = async (newDomainId: string) => {
    if (newDomainId !== domainId) {
      await setDomain(newDomainId);
    }
  };

  return (
    <div className={`domain-selector ${className}`}>
      <label htmlFor="domain-select">Domain:</label>
      <select
        id="domain-select"
        value={domainId || ''}
        onChange={(e) => handleDomainChange(e.target.value)}
        disabled={isLoading}
      >
        {availableDomains.length === 0 && <option value="">No domains available</option>}
        {availableDomains.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      {isLoading && <span className="domain-selector-loading">Loading...</span>}
    </div>
  );
}

