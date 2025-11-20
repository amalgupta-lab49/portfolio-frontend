/**
 * usePersonaTabs Hook
 * Generates dynamic tabs based on current user's role and persona
 */
import { useMemo } from 'react';
import { usePersona } from '../contexts/PersonaContext';
import { useDomain } from './useDomain';
import { PersonaTabService } from '../services/PersonaTabService';
import { TabConfig } from '../config/types/DomainConfig';

export function usePersonaTabs(): TabConfig[] {
  const { role, persona, configuredAgents } = usePersona();
  const { config: domainConfig } = useDomain();

  const tabs = useMemo(() => {
    const baseTabs = domainConfig?.ui.tabs || [];

    return PersonaTabService.getTabsForPersona({
      userRole: role,
      userPersona: persona,
      configuredAgents,
      baseTabs,
    });
  }, [role, persona, configuredAgents, domainConfig?.ui.tabs]);

  return tabs;
}

